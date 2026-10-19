import { beforeEach, describe, expect, it, vi } from "vitest";
import { Item } from "@/models/Item";
import { createItem, setupTestDatabase } from "./helpers/db";

// The signed-in user is whatever this mock says; the route handlers must take
// the user from here, never from the request.
const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.userId, redirectToSignIn: () => { throw new Error("redirect"); } }),
}));

// Cloudinary is mocked: these tests are about who can do what, not about uploads.
const cloudinary = vi.hoisted(() => ({
  getStoredImage: vi.fn(),
  deleteImage: vi.fn(async () => {}),
}));
vi.mock("@/lib/cloudinary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cloudinary")>()),
  getStoredImage: cloudinary.getStoredImage,
  deleteImage: cloudinary.deleteImage,
}));

const itemsRoute = await import("@/app/api/items/route");
const decisionRoute = await import("@/app/api/items/[id]/decision/route");
const historyRoute = await import("@/app/api/history/route");
const settingsRoute = await import("@/app/api/settings/route");
const signatureRoute = await import("@/app/api/uploads/signature/route");

setupTestDatabase();

const ALICE = "user_alice";
const BOB = "user_bob";

const json = (body: unknown) =>
  new Request("http://test/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  session.userId = null;
  cloudinary.getStoredImage.mockReset();
  cloudinary.deleteImage.mockClear();
});

describe("signed out", () => {
  it("every API route answers 401", async () => {
    const id = (await createItem(ALICE)).id;
    const responses = await Promise.all([
      itemsRoute.GET(),
      itemsRoute.POST(json({})),
      decisionRoute.POST(json({ decision: "buy" }), ctx(id)),
      decisionRoute.DELETE(json({}), ctx(id)),
      historyRoute.GET(),
      settingsRoute.GET(),
      settingsRoute.PUT(json({})),
      settingsRoute.DELETE(),
      signatureRoute.POST(),
    ]);
    expect(responses.map((r) => r.status)).toEqual(Array(9).fill(401));
    expect((await Item.findById(id).lean())!.status).toBe("pending");
  });
});

describe("ownership", () => {
  it("a user cannot decide or undo another user's item, even naming them in the body", async () => {
    const pending = await createItem(ALICE);
    const reviewed = await createItem(ALICE, { status: "reviewed", decision: "skip" });
    session.userId = BOB;

    const decide = await decisionRoute.POST(json({ decision: "buy", userId: ALICE }), ctx(pending.id));
    const undo = await decisionRoute.DELETE(json({}), ctx(reviewed.id));

    expect(decide.status).toBe(404);
    expect(undo.status).toBe(404);
    expect(await Item.findById(pending.id).lean()).toMatchObject({ status: "pending", decision: null });
    expect(await Item.findById(reviewed.id).lean()).toMatchObject({ status: "reviewed", decision: "skip" });
  });

  it("queue and history only ever contain the signed-in user's items", async () => {
    await createItem(ALICE, { name: "alice-ready" });
    await createItem(ALICE, { name: "alice-done", status: "reviewed", decision: "skip", price: 30 });
    await createItem(BOB, { name: "bob-ready" });
    session.userId = BOB;

    const queue = await (await itemsRoute.GET()).json();
    const history = await (await historyRoute.GET()).json();
    expect(queue.items.map((i: { name: string }) => i.name)).toEqual(["bob-ready"]);
    expect(history.items).toEqual([]);
    expect(history.stats.moneySaved).toBe(0);
  });

  it("settings are private to each user", async () => {
    session.userId = ALICE;
    expect((await settingsRoute.PUT(json({ incomeType: "hourly", incomeAmount: 30 }))).status).toBe(200);
    session.userId = BOB;
    expect(await (await settingsRoute.GET()).json()).toEqual({ settings: null });
    await settingsRoute.DELETE();
    session.userId = ALICE;
    expect((await (await settingsRoute.GET()).json()).settings.incomeAmount).toBe(30);
  });
});

describe("decision endpoint validation", () => {
  it.each([
    ["not-an-id", { decision: "buy" }, 404],
    ["6ad5abb3e9881c4b77aea501", { decision: "maybe" }, 400],
    ["6ad5abb3e9881c4b77aea501", { decision: { $ne: null } }, 400],
  ])("id %s body %j -> %d", async (id, body, status) => {
    session.userId = ALICE;
    expect((await decisionRoute.POST(json(body), ctx(id))).status).toBe(status);
  });

  it("reports not_ready and already_reviewed with 409", async () => {
    session.userId = ALICE;
    const future = await createItem(ALICE, { availableInMs: 60_000 });
    const done = await createItem(ALICE, { status: "reviewed", decision: "buy" });
    const r1 = await decisionRoute.POST(json({ decision: "buy" }), ctx(future.id));
    const r2 = await decisionRoute.POST(json({ decision: "skip" }), ctx(done.id));
    expect([r1.status, (await r1.json()).code]).toEqual([409, "not_ready"]);
    expect([r2.status, (await r2.json()).code]).toEqual([409, "already_reviewed"]);
  });
});

describe("creating items", () => {
  const validImage = (publicId: string) => ({
    publicId,
    secureUrl: `https://res.cloudinary.com/test/image/upload/${publicId}.png`,
    bytes: 1000,
    format: "png",
  });

  it("uses the server's userId, status and 24h availability, ignoring client values", async () => {
    session.userId = ALICE;
    const publicId = `mindful-shopping/${ALICE}/abc`;
    cloudinary.getStoredImage.mockResolvedValue(validImage(publicId));
    const before = Date.now();

    const res = await itemsRoute.POST(
      json({
        name: "Lamp",
        price: 20,
        imagePublicId: publicId,
        userId: BOB,
        status: "reviewed",
        decision: "buy",
        availableAt: "2000-01-01T00:00:00Z",
        imageUrl: "https://evil.example/x.png",
      }),
    );
    expect(res.status).toBe(201);
    const saved = await Item.findOne({ imagePublicId: publicId }).lean();
    expect(saved).toMatchObject({ userId: ALICE, status: "pending", decision: null, currency: "USD" });
    expect(saved!.imageUrl).toBe(validImage(publicId).secureUrl);
    const waitMs = saved!.availableAt.getTime() - before;
    expect(waitMs).toBeGreaterThan(24 * 3600_000 - 5_000);
    expect(waitMs).toBeLessThan(24 * 3600_000 + 5_000);
  });

  it("rejects an image from another user's folder without looking it up", async () => {
    session.userId = BOB;
    const res = await itemsRoute.POST(json({ name: "x", price: 1, imagePublicId: `mindful-shopping/${ALICE}/abc` }));
    expect(res.status).toBe(400);
    expect(cloudinary.getStoredImage).not.toHaveBeenCalled();
  });

  it.each([
    [{ format: "gif" }, /JPEG, PNG, or WebP/],
    [{ bytes: 5 * 1024 * 1024 + 1 }, /5 MB/],
  ])("deletes and rejects an uploaded image with %j", async (override, message) => {
    session.userId = ALICE;
    const publicId = `mindful-shopping/${ALICE}/bad`;
    cloudinary.getStoredImage.mockResolvedValue({ ...validImage(publicId), ...override });
    const res = await itemsRoute.POST(json({ name: "x", price: 1, imagePublicId: publicId }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(message);
    expect(cloudinary.deleteImage).toHaveBeenCalledWith(publicId);
    expect(await Item.countDocuments()).toBe(0);
  });

  it("saves a submitted image only once", async () => {
    session.userId = ALICE;
    const publicId = `mindful-shopping/${ALICE}/dup`;
    cloudinary.getStoredImage.mockResolvedValue(validImage(publicId));
    const body = { name: "x", price: 1, imagePublicId: publicId };
    const statuses = (await Promise.all([itemsRoute.POST(json(body)), itemsRoute.POST(json(body))])).map((r) => r.status);
    expect(statuses.sort()).toEqual([201, 409]);
    expect(await Item.countDocuments()).toBe(1);
    expect(cloudinary.deleteImage).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getReviewQueue, snoozeItem } from "@/lib/items";
import { Item } from "@/models/Item";
import { createItem, setupTestDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/auth", () => ({
  auth: async () => (session.userId ? { user: { id: session.userId }, expires: "2099-01-01T00:00:00Z" } : null),
}));
const snoozeRoute = await import("@/app/api/items/[id]/snooze/route");

setupTestDatabase();

const ALICE = "user_alice";
const BOB = "user_bob";
const DAY = 24 * 60 * 60 * 1000;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (id: string) => snoozeRoute.POST(new Request("http://test", { method: "POST" }), ctx(id));

beforeEach(() => {
  session.userId = null;
  vi.unstubAllEnvs();
  vi.stubEnv("WAITING_PERIOD_SECONDS", "");
});

describe("snoozeItem (Need More Time)", () => {
  it("moves a ready item a day into the future and out of the queue", async () => {
    const item = await createItem(ALICE);
    const before = Date.now();
    const result = await snoozeItem(ALICE, item.id);

    expect(result.ok).toBe(true);
    const saved = await Item.findById(item.id).lean();
    expect(saved).toMatchObject({ status: "pending", decision: null, decidedAt: null });
    const delay = saved!.availableAt.getTime() - before;
    expect(delay).toBeGreaterThan(DAY - 5_000);
    expect(delay).toBeLessThan(DAY + 5_000);

    const queue = await getReviewQueue(ALICE);
    expect(queue.items).toHaveLength(0);
    expect(queue.nextAvailableAt).toBe(saved!.availableAt.toISOString());
  });

  it("follows WAITING_PERIOD_SECONDS like new items do", async () => {
    vi.stubEnv("WAITING_PERIOD_SECONDS", "60");
    const item = await createItem(ALICE);
    const before = Date.now();
    await snoozeItem(ALICE, item.id);
    const delay = (await Item.findById(item.id).lean())!.availableAt.getTime() - before;
    expect(delay).toBeGreaterThan(55_000);
    expect(delay).toBeLessThan(65_000);
  });

  it("does not stack: a second tap on the same item is rejected", async () => {
    const item = await createItem(ALICE);
    const results = await Promise.all([snoozeItem(ALICE, item.id), snoozeItem(ALICE, item.id), snoozeItem(ALICE, item.id)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.reason === "not_ready")).toBe(true);
    const delay = (await Item.findById(item.id).lean())!.availableAt.getTime() - Date.now();
    expect(delay).toBeLessThan(DAY + 5_000);
  });

  it("can't snooze another user's item", async () => {
    const item = await createItem(ALICE);
    expect(await snoozeItem(BOB, item.id)).toEqual({ ok: false, reason: "not_found" });
    expect((await getReviewQueue(ALICE)).items.map((i) => i.id)).toEqual([item.id]);
  });

  it("can't snooze a reviewed item or one that isn't ready", async () => {
    const reviewed = await createItem(ALICE, { status: "reviewed", decision: "buy" });
    const waiting = await createItem(ALICE, { availableInMs: 60_000 });
    expect(await snoozeItem(ALICE, reviewed.id)).toEqual({ ok: false, reason: "already_reviewed" });
    expect(await snoozeItem(ALICE, waiting.id)).toEqual({ ok: false, reason: "not_ready" });
  });
});

describe("POST /api/items/:id/snooze", () => {
  it("requires sign-in", async () => {
    const item = await createItem(ALICE);
    expect((await post(item.id)).status).toBe(401);
  });

  it("snoozes the signed-in user's item and returns it", async () => {
    session.userId = ALICE;
    const item = await createItem(ALICE);
    const res = await post(item.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.id).toBe(item.id);
    expect(new Date(body.item.availableAt).getTime()).toBeGreaterThan(Date.now() + DAY - 5_000);
  });

  it("answers 404 for another user's item and leaves it alone", async () => {
    const item = await createItem(ALICE);
    session.userId = BOB;
    expect((await post(item.id)).status).toBe(404);
    expect((await Item.findById(item.id).lean())!.availableAt.getTime()).toBeLessThan(Date.now());
  });

  it("answers 404 for a malformed id and 409 when already snoozed", async () => {
    session.userId = ALICE;
    expect((await post("not-an-id")).status).toBe(404);
    const item = await createItem(ALICE);
    await post(item.id);
    const again = await post(item.id);
    expect([again.status, (await again.json()).code]).toEqual([409, "not_ready"]);
  });
});

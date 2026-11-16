import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "@/lib/users";
import { User } from "@/models/User";
import { setupTestDatabase } from "./helpers/db";

// The signed-in user is whatever this mock says; routes must never take it from the request.
const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/auth", () => ({
  auth: async () => (session.userId ? { user: { id: session.userId }, expires: "2099-01-01T00:00:00Z" } : null),
}));

const cloudinary = vi.hoisted(() => ({
  getStoredImage: vi.fn(),
  deleteImage: vi.fn(async () => {}),
}));
vi.mock("@/lib/cloudinary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cloudinary")>()),
  getStoredImage: cloudinary.getStoredImage,
  deleteImage: cloudinary.deleteImage,
}));

const accountRoute = await import("@/app/api/account/route");
const passwordRoute = await import("@/app/api/account/password/route");
const avatarRoute = await import("@/app/api/account/avatar/route");
const itemsRoute = await import("@/app/api/items/route");

setupTestDatabase();

const PASSWORD = "first-password-1";
const req = (method: string, body?: unknown) =>
  new Request("http://test/api/account", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function makeUser(email: string) {
  const result = await registerUser({ name: "Ada", email, password: PASSWORD });
  if (!result.ok) throw new Error("setup failed");
  return result.user.id;
}

const hashOf = async (id: string) => (await User.findById(id).select("+passwordHash").lean())!.passwordHash!;
const avatarId = (userId: string, name = "a1") => `mindful-shopping/${userId}/avatar/${name}`;
const storedImage = (publicId: string, overrides = {}) => ({
  publicId,
  secureUrl: `https://res.cloudinary.com/test/image/upload/${publicId}.png`,
  bytes: 1000,
  format: "png",
  ...overrides,
});

let alice: string;
let bob: string;

beforeEach(async () => {
  session.userId = null;
  cloudinary.getStoredImage.mockReset();
  cloudinary.deleteImage.mockClear();
  alice = await makeUser("alice@example.com");
  bob = await makeUser("bob@example.com");
});

describe("signed out", () => {
  it("every account route answers 401 and changes nothing", async () => {
    const responses = await Promise.all([
      accountRoute.GET(),
      accountRoute.PATCH(req("PATCH", { name: "Hacker" })),
      passwordRoute.POST(req("POST", { currentPassword: PASSWORD, newPassword: "x".repeat(10), confirmPassword: "x".repeat(10) })),
      avatarRoute.PUT(req("PUT", { imagePublicId: avatarId(alice) })),
      avatarRoute.DELETE(),
    ]);
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    expect((await User.findById(alice).lean())!.name).toBe("Ada");
  });
});

describe("name", () => {
  it("changes only the signed-in user's name, ignoring ids in the body", async () => {
    session.userId = bob;
    const res = await accountRoute.PATCH(req("PATCH", { name: "  Robert  ", userId: alice, _id: alice }));
    expect(res.status).toBe(200);
    expect((await res.json()).account).toEqual({ name: "Robert", email: "bob@example.com", avatarUrl: null });
    expect((await User.findById(bob).lean())!.name).toBe("Robert");
    expect((await User.findById(alice).lean())!.name).toBe("Ada");
  });

  it.each([[{ name: "   " }], [{ name: "x".repeat(101) }], [{}]])("rejects %j", async (body) => {
    session.userId = alice;
    const res = await accountRoute.PATCH(req("PATCH", body));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors).toHaveProperty("name");
  });

  it("GET returns name, email and picture but never the hash", async () => {
    session.userId = alice;
    const body = await (await accountRoute.GET()).json();
    expect(body).toEqual({ account: { name: "Ada", email: "alice@example.com", avatarUrl: null } });
  });
});

describe("password", () => {
  const change = (body: Record<string, string>) => passwordRoute.POST(req("POST", body));
  const NEW = "second-password-2";

  it("changes the password only with the right current password, storing a new bcrypt hash", async () => {
    session.userId = alice;
    const before = await hashOf(alice);

    const wrong = await change({ currentPassword: "not-my-password", newPassword: NEW, confirmPassword: NEW });
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).fieldErrors.currentPassword).toBe("Your current password is incorrect.");
    expect(await hashOf(alice)).toBe(before);

    const ok = await change({ currentPassword: PASSWORD, newPassword: NEW, confirmPassword: NEW });
    expect(ok.status).toBe(200);
    const after = await hashOf(alice);
    expect(after).toMatch(/^\$2[aby]\$12\$/);
    expect(after).not.toContain(NEW);
    expect(await bcrypt.compare(NEW, after)).toBe(true);
    expect(await bcrypt.compare(PASSWORD, after)).toBe(false);
    // Bob is untouched.
    expect(await bcrypt.compare(PASSWORD, await hashOf(bob))).toBe(true);
  });

  it.each([
    [{ currentPassword: "", newPassword: NEW, confirmPassword: NEW }, "currentPassword"],
    [{ currentPassword: PASSWORD, newPassword: "short", confirmPassword: "short" }, "newPassword"],
    [{ currentPassword: PASSWORD, newPassword: NEW, confirmPassword: "different-123" }, "confirmPassword"],
    [{ currentPassword: PASSWORD, newPassword: PASSWORD, confirmPassword: PASSWORD }, "newPassword"],
  ])("validates %j -> error on %s", async (body, field) => {
    session.userId = alice;
    const before = await hashOf(alice);
    const res = await change(body);
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors).toHaveProperty(field);
    expect(await hashOf(alice)).toBe(before);
  });

  it("never echoes passwords back", async () => {
    session.userId = alice;
    const res = await change({ currentPassword: "wrong-secret-xyz", newPassword: NEW, confirmPassword: NEW });
    const text = await res.text();
    expect(text).not.toContain("wrong-secret-xyz");
    expect(text).not.toContain(NEW);
  });
});

describe("profile picture", () => {
  const put = (imagePublicId: string) => avatarRoute.PUT(req("PUT", { imagePublicId }));

  it("saves a verified upload from the user's avatar folder and deletes the previous one", async () => {
    session.userId = alice;
    cloudinary.getStoredImage.mockImplementation(async (id: string) => storedImage(id));

    expect((await put(avatarId(alice, "first"))).status).toBe(200);
    const res = await put(avatarId(alice, "second"));
    expect(res.status).toBe(200);
    expect((await res.json()).account.avatarUrl).toBe(storedImage(avatarId(alice, "second")).secureUrl);

    const saved = await User.findById(alice).lean();
    expect(saved).toMatchObject({ avatarPublicId: avatarId(alice, "second"), avatarUrl: storedImage(avatarId(alice, "second")).secureUrl });
    expect(cloudinary.deleteImage).toHaveBeenCalledTimes(1);
    expect(cloudinary.deleteImage).toHaveBeenCalledWith(avatarId(alice, "first"));
  });

  it.each([
    ["another user's avatar", (u: { bob: string }) => avatarId(u.bob)],
    ["an item photo (not the avatar folder)", (u: { alice: string }) => `mindful-shopping/${u.alice}/some-item`],
    ["an unrelated public id", () => "somewhere/else"],
  ])("rejects %s without looking it up", async (_label, idOf) => {
    session.userId = alice;
    const res = await put(idOf({ alice, bob }));
    expect(res.status).toBe(400);
    expect(cloudinary.getStoredImage).not.toHaveBeenCalled();
    expect((await User.findById(alice).lean())!.avatarUrl).toBeUndefined();
  });

  it.each([
    [{ format: "gif" }, /JPEG, PNG, or WebP/],
    [{ bytes: 5 * 1024 * 1024 + 1 }, /5 MB/],
  ])("deletes and rejects a stored image with %j", async (override, message) => {
    session.userId = alice;
    cloudinary.getStoredImage.mockImplementation(async (id: string) => storedImage(id, override));
    const res = await put(avatarId(alice));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(message);
    expect(cloudinary.deleteImage).toHaveBeenCalledWith(avatarId(alice));
    expect((await User.findById(alice).lean())!.avatarUrl).toBeUndefined();
  });

  it("can be removed, deleting the image", async () => {
    session.userId = alice;
    cloudinary.getStoredImage.mockImplementation(async (id: string) => storedImage(id));
    await put(avatarId(alice));
    const res = await avatarRoute.DELETE();
    expect(res.status).toBe(200);
    expect((await res.json()).account.avatarUrl).toBeNull();
    const saved = await User.findById(alice).lean();
    expect(saved!.avatarUrl).toBeUndefined();
    expect(saved!.avatarPublicId).toBeUndefined();
    expect(cloudinary.deleteImage).toHaveBeenCalledWith(avatarId(alice));
  });

  it("an avatar upload can't be turned into an item", async () => {
    session.userId = alice;
    const res = await itemsRoute.POST(req("POST", { name: "x", price: 1, imagePublicId: avatarId(alice) }));
    expect(res.status).toBe(400);
    expect(cloudinary.getStoredImage).not.toHaveBeenCalled();
  });
});

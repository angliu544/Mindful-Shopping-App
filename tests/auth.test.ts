import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { registerUser, verifyCredentials } from "@/lib/users";
import { safeCallbackUrl } from "@/lib/redirects";
import { registerSchema } from "@/lib/validations";
import { User } from "@/models/User";
import { setupTestDatabase } from "./helpers/db";

// next-auth imports next/server internals that don't load in plain Node; the
// config object (providers + callbacks) is what we test, not the NextAuth runtime.
vi.mock("next-auth", () => ({ default: () => ({}) }));
const { authConfig } = await import("@/auth");
const registerRoute = await import("@/app/api/register/route");

setupTestDatabase();

const PASSWORD = "correct horse battery";
const post = (body: unknown) =>
  registerRoute.POST(
    new Request("http://test/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
const validSignup = { name: "Ada", email: "  Ada@Example.COM ", password: PASSWORD, confirmPassword: PASSWORD };

describe("POST /api/register", () => {
  it("creates a user with a lowercase email and only a bcrypt hash", async () => {
    const res = await post(validSignup);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user).toEqual({ id: expect.any(String), name: "Ada", email: "ada@example.com" });
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    const saved = await User.findOne({ email: "ada@example.com" }).select("+passwordHash").lean();
    expect(saved!.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(saved!.passwordHash).not.toContain(PASSWORD);
    expect(JSON.stringify(saved)).not.toContain(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, saved!.passwordHash!)).toBe(true);
  });

  it("rejects a duplicate email regardless of case", async () => {
    await post(validSignup);
    const res = await post({ ...validSignup, email: "ADA@example.com" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already exists/);
    expect(await User.countDocuments()).toBe(1);
  });

  it("does not let a sign-up take over an existing account that has no password", async () => {
    // e.g. an account created by the removed Google sign-in.
    await User.create({ name: "Ada", email: "ada@example.com" });
    expect((await post(validSignup)).status).toBe(409);
    const user = await User.findOne({ email: "ada@example.com" }).select("+passwordHash").lean();
    expect(user!.passwordHash).toBeUndefined();
  });

  it.each([
    [{ ...validSignup, email: "not-an-email" }, "email"],
    [{ ...validSignup, password: "short", confirmPassword: "short" }, "password"],
    [{ ...validSignup, confirmPassword: "something else" }, "confirmPassword"],
    [{ ...validSignup, name: "  " }, "name"],
    [{ ...validSignup, password: "a".repeat(73), confirmPassword: "a".repeat(73) }, "password"],
  ])("validates %j -> error on %s", async (body, field) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors).toHaveProperty(field);
    expect(await User.countDocuments()).toBe(0);
  });

  it("never echoes the password back", async () => {
    const res = await post({ ...validSignup, confirmPassword: "mismatch-secret-123" });
    expect(await res.text()).not.toContain(PASSWORD);
  });
});

describe("email/password sign-in", () => {
  type WithAuthorize = { options: { authorize: (credentials: unknown) => Promise<unknown> } };
  const authorize = (authConfig.providers[0] as unknown as WithAuthorize).options.authorize;

  it("signs in with the right password (any email casing)", async () => {
    const { user } = (await registerUser({ name: "Ada", email: "ada@example.com", password: PASSWORD })) as { user: { id: string } };
    expect(await authorize({ email: " ADA@example.com", password: PASSWORD })).toMatchObject({ id: user.id, email: "ada@example.com" });
  });

  it("returns the same null for a wrong password and an unknown email", async () => {
    await registerUser({ name: "Ada", email: "ada@example.com", password: PASSWORD });
    expect(await authorize({ email: "ada@example.com", password: "wrong password" })).toBeNull();
    expect(await authorize({ email: "nobody@example.com", password: PASSWORD })).toBeNull();
    expect(await authorize({ email: "not-an-email", password: "" })).toBeNull();
  });

  it("refuses password sign-in for an account with no password", async () => {
    await User.create({ name: "Ada", email: "ada@example.com" });
    expect(await verifyCredentials("ada@example.com", "")).toBeNull();
    expect(await verifyCredentials("ada@example.com", PASSWORD)).toBeNull();
  });

  it("never returns the password hash", async () => {
    await registerUser({ name: "Ada", email: "ada@example.com", password: PASSWORD });
    const user = await verifyCredentials("ada@example.com", PASSWORD);
    expect(Object.keys(user!).sort()).toEqual(["email", "id", "name"]);
  });
});

describe("Auth.js config", () => {
  const { jwt, session } = authConfig.callbacks;

  it("offers email/password sign-in only", () => {
    expect(authConfig.providers.map((p) => (p as unknown as { id: string }).id)).toEqual(["credentials"]);
  });

  it("puts our MongoDB user id in the token and the session", async () => {
    const { user } = (await registerUser({ name: "Ada", email: "ada@example.com", password: PASSWORD })) as { user: { id: string } };
    const token = await jwt({ token: {}, user } as never);
    expect(token!.sub).toBe(user.id);
    // Later requests have no `user`; the id must stay in the token.
    expect((await jwt({ token } as never))!.sub).toBe(user.id);
    const s = await session({ session: { user: {}, expires: "" }, token } as never);
    expect((s as { user: { id: string } }).user.id).toBe(user.id);
  });
});

describe("validation and redirects", () => {
  it("normalizes email in the register schema", () => {
    expect(registerSchema.parse(validSignup).email).toBe("ada@example.com");
  });

  it.each([
    ["/history", "/history"],
    ["/upload?x=1", "/upload?x=1"],
    ["https://evil.example", "/review"],
    ["//evil.example", "/review"],
    ["/\\evil.example", "/review"],
    ["/sign-in", "/review"],
    [null, "/review"],
  ])("safeCallbackUrl(%j) -> %s", (input, expected) => {
    expect(safeCallbackUrl(input)).toBe(expected);
  });
});

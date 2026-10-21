import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { findOrCreateGoogleUser, registerUser, verifyCredentials } from "@/lib/users";
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

  it("rejects registering a password for an email used by a Google account", async () => {
    await findOrCreateGoogleUser({ googleId: "g-1", email: "ada@example.com", name: "Ada" });
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
  const authorize = (authConfig.providers[1] as unknown as WithAuthorize).options.authorize;

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

  it("refuses password sign-in for a Google-only account", async () => {
    await findOrCreateGoogleUser({ googleId: "g-1", email: "ada@example.com", name: "Ada" });
    expect(await verifyCredentials("ada@example.com", "")).toBeNull();
    expect(await verifyCredentials("ada@example.com", PASSWORD)).toBeNull();
  });

  it("never returns the password hash", async () => {
    await registerUser({ name: "Ada", email: "ada@example.com", password: PASSWORD });
    const user = await verifyCredentials("ada@example.com", PASSWORD);
    expect(Object.keys(user!).sort()).toEqual(["email", "id", "image", "name"]);
  });
});

describe("Google sign-in", () => {
  const { signIn, jwt, session } = authConfig.callbacks;
  const google = (sub: string) => ({ provider: "google", providerAccountId: sub, type: "oidc" }) as never;
  const profile = (email: string, verified = true) =>
    ({ email, email_verified: verified, name: "Ada", picture: "https://lh3.googleusercontent.com/a" }) as never;

  it("creates a user on first sign-in and reuses it after", async () => {
    expect(await signIn({ account: google("g-1"), profile: profile("Ada@Example.com") } as never)).toBe(true);
    expect(await signIn({ account: google("g-1"), profile: profile("ada@example.com") } as never)).toBe(true);
    const users = await User.find().lean();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: "ada@example.com", googleId: "g-1", name: "Ada" });
    expect(users[0]).not.toHaveProperty("passwordHash");
  });

  it("puts our MongoDB user id (not Google's id) in the session", async () => {
    await signIn({ account: google("g-1"), profile: profile("ada@example.com") } as never);
    const dbUser = await User.findOne({ googleId: "g-1" }).lean();
    const token = await jwt({ token: { sub: "g-1" }, user: { id: "g-1" }, account: google("g-1") } as never);
    expect(token.sub).toBe(dbUser!._id.toString());
    const s = await session({ session: { user: {}, expires: "" }, token } as never);
    expect((s as { user: { id: string } }).user.id).toBe(dbUser!._id.toString());
  });

  it("keeps a Google account separate from an existing password account", async () => {
    await registerUser({ name: "Ada", email: "ada@example.com", password: PASSWORD });
    expect(await signIn({ account: google("g-1"), profile: profile("ada@example.com") } as never)).toBe(
      "/sign-in?error=UsePassword",
    );
    const user = await User.findOne({ email: "ada@example.com" }).lean();
    expect(user!.googleId).toBeUndefined();
  });

  it("refuses an unverified Google email", async () => {
    expect(await signIn({ account: google("g-1"), profile: profile("ada@example.com", false) } as never)).toBe(
      "/sign-in?error=GoogleEmailUnverified",
    );
    expect(await User.countDocuments()).toBe(0);
  });

  it("lets credentials sign-ins through (checked in authorize)", async () => {
    expect(await signIn({ account: { provider: "credentials", type: "credentials" } } as never)).toBe(true);
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

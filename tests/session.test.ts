import { describe, expect, it, vi } from "vitest";
import { registerUser, userExists } from "@/lib/users";
import { setupTestDatabase } from "./helpers/db";

// next-auth's runtime doesn't load in plain Node; only the session check is tested here.
vi.mock("next-auth", () => ({ default: () => ({}) }));
const { verifySessionUser } = await import("@/auth");

setupTestDatabase();

const GHOST = "6aaaaaaaaaaaaaaaaaaaaaaa";

describe("userExists", () => {
  it("is true for an account that exists", async () => {
    const result = await registerUser({ name: "Ada", email: "ada@example.com", password: "correct horse 1" });
    expect(result.ok && (await userExists(result.user.id))).toBe(true);
  });

  it("is false for a well-formed id with no account (e.g. after switching databases)", async () => {
    expect(await userExists(GHOST)).toBe(false);
  });

  it("is false for a malformed id without querying", async () => {
    expect(await userExists("not-an-id")).toBe(false);
  });
});

describe("verifySessionUser (stale sign-in cookies)", () => {
  it("ends the session when its account no longer exists", async () => {
    expect(await verifySessionUser({ sub: GHOST })).toBeNull();
  });

  it("keeps a session whose account exists, and records when it was checked", async () => {
    const result = await registerUser({ name: "Ada", email: "ada@example.com", password: "correct horse 1" });
    if (!result.ok) throw new Error("setup failed");
    const token = await verifySessionUser({ sub: result.user.id });
    expect(token?.sub).toBe(result.user.id);
    expect(typeof token?.verifiedAt).toBe("number");
  });

  it("doesn't query again within 5 minutes", async () => {
    // A ghost id would be rejected if checked; a recent check means it isn't.
    expect(await verifySessionUser({ sub: GHOST, verifiedAt: Date.now() - 60_000 })).toEqual({
      sub: GHOST,
      verifiedAt: expect.any(Number),
    });
    expect(await verifySessionUser({ sub: GHOST, verifiedAt: Date.now() - 6 * 60_000 })).toBeNull();
  });

  it("keeps the session if the database can't be reached", async () => {
    const users = await import("@/lib/users");
    const spy = vi.spyOn(users, "userExists").mockRejectedValueOnce(new Error("bad auth"));
    expect(await verifySessionUser({ sub: GHOST })).toEqual({ sub: GHOST });
    spy.mockRestore();
  });
});

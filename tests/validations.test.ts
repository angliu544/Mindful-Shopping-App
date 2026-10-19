import { describe, expect, it } from "vitest";
import {
  createItemSchema,
  decisionBodySchema,
  fieldErrorsOf,
  incomeSettingsSchema,
  itemFieldsSchema,
  objectIdSchema,
  parsePriceInput,
  validateImageFile,
} from "@/lib/validations";

const MB = 1024 * 1024;

describe("item fields", () => {
  it("accepts and normalizes valid input", () => {
    expect(itemFieldsSchema.parse({ name: "  Lamp ", price: 49.99, description: "" })).toEqual({
      name: "Lamp",
      price: 49.99,
    });
  });

  it.each([
    [{ name: "   ", price: 1 }, "name"],
    [{ name: "a".repeat(101), price: 1 }, "name"],
    [{ name: "x", price: -1 }, "price"],
    [{ name: "x", price: 1.999 }, "price"],
    [{ name: "x", price: Number.NaN }, "price"],
    [{ name: "x", price: "5" }, "price"],
    [{ name: "x", price: 2_000_000 }, "price"],
    [{ name: "x", price: 1, description: "a".repeat(501) }, "description"],
  ])("rejects %j on %s", (input, field) => {
    const result = itemFieldsSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result.error!)).toHaveProperty(field);
  });

  it("accepts a zero price", () => {
    expect(itemFieldsSchema.parse({ name: "Free", price: 0 }).price).toBe(0);
  });

  it("strips fields the client must not control", () => {
    const parsed = createItemSchema.parse({
      name: "x",
      price: 1,
      imagePublicId: "p",
      userId: "attacker",
      status: "reviewed",
      decision: "buy",
      imageUrl: "https://evil.example",
      availableAt: "2000-01-01",
    });
    expect(Object.keys(parsed).sort()).toEqual(["imagePublicId", "name", "price"]);
  });
});

describe("parsePriceInput", () => {
  it.each([
    ["$1,299.50", 1299.5],
    ["12", 12],
    ["0.1", 0.1],
  ])("parses %s", (raw, expected) => expect(parsePriceInput(raw)).toBe(expected));

  it.each(["", "abc", "1.2.3", ".", "-5"])("rejects %j", (raw) => expect(parsePriceInput(raw)).toBeNaN());
});

describe("validateImageFile", () => {
  it("requires a file", () => expect(validateImageFile(null)).toMatch(/add a photo/));
  it("rejects other types", () => expect(validateImageFile({ type: "image/gif", size: 10 })).toMatch(/JPEG, PNG, or WebP/));
  it("rejects files over 5 MB", () => expect(validateImageFile({ type: "image/png", size: 5 * MB + 1 })).toMatch(/5 MB/));
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s up to 5 MB", (type) =>
    expect(validateImageFile({ type, size: 5 * MB })).toBeNull(),
  );
});

describe("ids and decisions", () => {
  it("accepts only 24-hex ObjectIds", () => {
    expect(objectIdSchema.safeParse("6ad5abb3e9881c4b77aea501").success).toBe(true);
    for (const bad of ["", "not-an-id", "6ad5abb3e9881c4b77aea50", "{\"$ne\":null}"]) {
      expect(objectIdSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("accepts only buy or skip", () => {
    expect(decisionBodySchema.safeParse({ decision: "buy" }).success).toBe(true);
    expect(decisionBodySchema.safeParse({ decision: "skip" }).success).toBe(true);
    for (const bad of ["maybe", null, 1, { $ne: null }]) {
      expect(decisionBodySchema.safeParse({ decision: bad }).success).toBe(false);
    }
  });
});

describe("income settings", () => {
  it("hourly pay is just the rate; hours are dropped", () => {
    expect(incomeSettingsSchema.parse({ incomeType: "hourly", incomeAmount: 25, hoursPerWeek: 40 })).toEqual({
      incomeType: "hourly",
      incomeAmount: 25,
      hoursPerWeek: null,
    });
  });

  it("salary requires hours per week", () => {
    const result = incomeSettingsSchema.safeParse({ incomeType: "salary", incomeAmount: 60000, hoursPerWeek: null });
    expect(fieldErrorsOf(result.error!)).toHaveProperty("hoursPerWeek");
  });

  it("flags an implausible hourly rate", () => {
    const result = incomeSettingsSchema.safeParse({ incomeType: "hourly", incomeAmount: 60000 });
    expect(fieldErrorsOf(result.error!).incomeAmount).toMatch(/yearly salary/);
  });

  it.each([
    { incomeType: "weekly", incomeAmount: 10 },
    { incomeType: "salary", incomeAmount: -1, hoursPerWeek: 40 },
    { incomeType: "salary", incomeAmount: 60000, hoursPerWeek: 0 },
    { incomeType: "salary", incomeAmount: 60000, hoursPerWeek: 500 },
  ])("rejects %j", (input) => expect(incomeSettingsSchema.safeParse(input).success).toBe(false));
});

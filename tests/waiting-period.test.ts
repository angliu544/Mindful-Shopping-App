import { afterEach, describe, expect, it, vi } from "vitest";
import { getWaitingPeriodMs } from "@/lib/items";

const DAY_MS = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getWaitingPeriodMs", () => {
  it("defaults to 24 hours", () => {
    vi.stubEnv("WAITING_PERIOD_SECONDS", "");
    expect(getWaitingPeriodMs()).toBe(DAY_MS);
  });

  it.each([
    ["0", 0],
    ["1", 1000],
    [" 60 ", 60_000],
  ])("uses WAITING_PERIOD_SECONDS=%j", (value, expected) => {
    vi.stubEnv("WAITING_PERIOD_SECONDS", value);
    expect(getWaitingPeriodMs()).toBe(expected);
  });

  it("applies in production builds too", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WAITING_PERIOD_SECONDS", "0");
    expect(getWaitingPeriodMs()).toBe(0);
  });

  it.each(["abc", "-5", "WAITING_PERIOD_SECONDS=0"])("falls back to 24 hours for %j", (value) => {
    vi.stubEnv("WAITING_PERIOD_SECONDS", value);
    expect(getWaitingPeriodMs()).toBe(DAY_MS);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { clearRateLimitsForTest, enforceRateLimit, requestIdentity } from "./rateLimit";

describe("public commerce rate limits", () => {
  beforeEach(() => clearRateLimitsForTest());
  it("allows the bounded number of actions and rejects the next action", () => {
    expect(enforceRateLimit("run:demo", { max: 2, windowMs: 60_000 }).remaining).toBe(1);
    expect(enforceRateLimit("run:demo", { max: 2, windowMs: 60_000 }).remaining).toBe(0);
    expect(() => enforceRateLimit("run:demo", { max: 2, windowMs: 60_000 })).toThrow("Rate limit exceeded");
  });
  it("derives a stable client identity from a forwarded address when present", () => {
    expect(requestIdentity({ "x-forwarded-for": "198.51.100.12, 10.0.0.1" })).toBe("198.51.100.12");
  });
});

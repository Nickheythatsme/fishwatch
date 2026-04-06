import { describe, it, expect } from "vitest";

describe("web smoke test", () => {
  it("passes a trivial assertion", () => {
    expect(1 + 1).toBe(2);
  });
});

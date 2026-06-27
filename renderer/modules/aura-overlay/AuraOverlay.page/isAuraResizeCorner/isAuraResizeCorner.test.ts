import { describe, expect, it } from "vitest";

import { isAuraResizeCorner } from "./isAuraResizeCorner";

describe("isAuraResizeCorner", () => {
  it("recognizes supported aura resize corners", () => {
    expect(isAuraResizeCorner("nw")).toBe(true);
    expect(isAuraResizeCorner("middle")).toBe(false);
    expect(isAuraResizeCorner(undefined)).toBe(false);
  });
});

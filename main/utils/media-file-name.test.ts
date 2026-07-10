import { describe, expect, it } from "vitest";

import { normalizeMediaFileStem } from "./media-file-name";

describe("normalizeMediaFileStem", () => {
  it("normalizes unsafe names and strips extensions", () => {
    expect(normalizeMediaFileStem(' bad<>:"|?*\u0000 name.mov ')).toBe(
      "bad name",
    );
  });

  it("supports bounded fallbacks", () => {
    expect(normalizeMediaFileStem("   ", { fallback: "Hinekora edit" })).toBe(
      "Hinekora edit",
    );
    expect(normalizeMediaFileStem(null)).toBeNull();
    expect(normalizeMediaFileStem("123456", { maxLength: 4 })).toBe("1234");
  });
});

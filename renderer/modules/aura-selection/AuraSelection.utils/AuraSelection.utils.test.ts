import { describe, expect, it } from "vitest";

import {
  auraSelectionShapes,
  getAuraSelectionTypeHelp,
} from "./AuraSelection.utils";

describe("AuraSelection utils", () => {
  it("provides shared labels and help copy for every aura selection shape", () => {
    expect(auraSelectionShapes).toEqual(["rect", "arc", "points"]);
    expect(getAuraSelectionTypeHelp("rect").name).toBe("Default aura");
    expect(getAuraSelectionTypeHelp("arc").overlayText).toContain(
      "energy shield",
    );
    expect(getAuraSelectionTypeHelp("points").selectorText).toContain("ward");
  });
});

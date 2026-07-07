import { describe, expect, it } from "vitest";

import { readKeybindChordParts } from "./KeybindChord.utils";

describe("KeybindChord utils", () => {
  it("formats accelerator parts without reparsing display separators", () => {
    expect(readKeybindChordParts("Alt+Shift+Plus")).toEqual([
      "Alt",
      "Shift",
      "+",
    ]);
  });

  it("formats punctuation and numpad accelerators", () => {
    expect(readKeybindChordParts("Alt+;")).toEqual(["Alt", ";"]);
    expect(readKeybindChordParts("Ctrl+numadd")).toEqual(["Ctrl", "NumAdd"]);
  });

  it("falls back for internal-only display shortcuts", () => {
    expect(readKeybindChordParts("Ctrl+Wheel")).toEqual(["Ctrl", "Wheel"]);
  });
});

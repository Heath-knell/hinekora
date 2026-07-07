import { formatKeybindDisplayPart, Keybind } from "~/types";

function formatKeybindChordPart(part: string): string {
  const normalized = part.trim();
  if (!normalized) {
    return "";
  }

  return formatKeybindDisplayPart(normalized, "title");
}

function readKeybindChordParts(accelerator: string): string[] {
  const keybind = Keybind.tryParse(accelerator);
  if (keybind) {
    return keybind.toDisplayParts("title");
  }

  return accelerator.split("+").map(formatKeybindChordPart).filter(Boolean);
}

export { readKeybindChordParts };

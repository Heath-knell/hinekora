import { basename, parse } from "node:path";

interface NormalizeMediaFileStemOptions {
  fallback?: string | null;
  maxLength?: number;
}

function normalizeMediaFileStem(
  fileName: string | null | undefined,
  options: NormalizeMediaFileStemOptions = {},
): string | null {
  const parsed = parse(basename(fileName ?? ""));
  const parsedName = parsed.name || parsed.base || "";
  const normalized = Array.from(parsedName.replace(/[<>:"/\\|?*]/g, " "))
    .map((character) => (character.charCodeAt(0) < 32 ? " " : character))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const fallback = options.fallback?.trim() || null;
  const safeName = normalized || fallback;

  return safeName?.slice(0, options.maxLength ?? 120) ?? null;
}

export { normalizeMediaFileStem };

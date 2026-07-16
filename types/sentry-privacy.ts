const PATH_ANCHORS = ["hinekora", "Path of Exile", "Path of Exile 2"] as const;
const PATH_SEGMENT =
  /[\p{L}\p{M}\p{N}_.%\-()]+(?:(?: [\p{L}\p{M}\p{N}_.%\-()]+)+(?=[/\\]))?/u;
const PATH_REGEX = new RegExp(
  `(?:[A-Z]:\\\\${PATH_SEGMENT.source}(?:\\\\${PATH_SEGMENT.source})*)` +
    "|" +
    `(?:\\/(?:home|Users|tmp)(?:\\/${PATH_SEGMENT.source})+)`,
  "giu",
);
const USERNAME_REGEX = /username=[^\s,)]+/giu;
const defaultMaxDepth = 8;
const defaultMaxNodes = 1_000;

interface ScrubState {
  maxDepth: number;
  maxNodes: number;
  seen: WeakSet<object>;
  visitedNodes: number;
}

function maskPath(fullPath: string, anchors: readonly string[]): string {
  if (!fullPath || anchors.length === 0) {
    return fullPath;
  }

  const normalized = fullPath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const separator = fullPath.includes("\\") ? "\\" : "/";
  const root = parts[0];
  const lowerAnchors = anchors.map((anchor) => anchor.toLowerCase());

  let anchorIndex = -1;
  for (let index = 1; index < parts.length; index += 1) {
    const part = parts[index];
    if (part && lowerAnchors.includes(part.toLowerCase())) {
      anchorIndex = index;
      break;
    }
  }

  if (anchorIndex > 1) {
    return [root, "**", ...parts.slice(anchorIndex)].join(separator);
  }
  if (anchorIndex === 1) {
    return fullPath;
  }

  const homeDirectoryIndex = findHomeDirectoryIdentityIndex(parts);
  if (homeDirectoryIndex >= 0) {
    return [root, "**", ...parts.slice(homeDirectoryIndex + 1)].join(separator);
  }
  if (parts.length > 3) {
    return [root, "**", ...parts.slice(-2)].join(separator);
  }

  return fullPath;
}

function findHomeDirectoryIdentityIndex(parts: readonly string[]): number {
  const homeContainer = parts[1]?.toLowerCase();
  return parts.length > 2 &&
    (homeContainer === "home" ||
      homeContainer === "users" ||
      homeContainer === "tmp")
    ? 2
    : -1;
}

function scrubSensitiveText(text: string): string {
  return text
    .replace(PATH_REGEX, (match) => maskPath(match, PATH_ANCHORS))
    .replace(USERNAME_REGEX, "username=[redacted]");
}

function scrubSentryValue(
  value: unknown,
  options: { maxDepth?: number; maxNodes?: number } = {},
): unknown {
  return scrubValue(value, 0, {
    maxDepth: options.maxDepth ?? defaultMaxDepth,
    maxNodes: options.maxNodes ?? defaultMaxNodes,
    seen: new WeakSet(),
    visitedNodes: 0,
  });
}

function scrubValue(value: unknown, depth: number, state: ScrubState): unknown {
  if (typeof value === "string") {
    return scrubSensitiveText(value);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (depth >= state.maxDepth) {
    return "[truncated]";
  }
  if (state.seen.has(value)) {
    return "[circular]";
  }
  if (state.visitedNodes >= state.maxNodes) {
    return "[truncated]";
  }

  state.seen.add(value);
  state.visitedNodes += 1;

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1, state));
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      scrubValue(item, depth + 1, state),
    ]),
  );
}

export { maskPath, scrubSensitiveText, scrubSentryValue };

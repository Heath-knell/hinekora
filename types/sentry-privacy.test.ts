import { describe, expect, it } from "vitest";

import {
  maskPath,
  scrubSensitiveText,
  scrubSentryValue,
} from "./sentry-privacy";

describe("Sentry privacy scrubbing", () => {
  it("masks anchored and unanchored paths while preserving short values", () => {
    expect(
      maskPath("C:\\Users\\seb\\AppData\\Hinekora\\data.db", ["Hinekora"]),
    ).toBe("C:\\**\\Hinekora\\data.db");
    expect(maskPath("C:\\Hinekora", ["Hinekora"])).toBe("C:\\Hinekora");
    expect(maskPath("/home/seb/downloads/capture.mp4", ["Hinekora"])).toBe(
      "/**/downloads/capture.mp4",
    );
    expect(maskPath("capture.mp4", ["Hinekora"])).toBe("capture.mp4");
    expect(maskPath("D:\\Games\\Path\\capture.mp4", ["Hinekora"])).toBe(
      "D:\\**\\Path\\capture.mp4",
    );
    expect(maskPath("", ["Hinekora"])).toBe("");
    expect(maskPath("C:\\Users\\seb\\capture.mp4", [])).toBe(
      "C:\\Users\\seb\\capture.mp4",
    );
  });

  it("redacts paths and usernames in one shared text pass", () => {
    expect(
      scrubSensitiveText(
        "file C:\\Users\\seb\\AppData\\Local\\Hinekora\\main.js username=SebAccount)",
      ),
    ).toBe("file C:\\**\\Hinekora\\main.js username=[redacted])");
    expect(
      scrubSensitiveText(
        "C:\\Users\\seb\\secret.txt /Users/alice/secret.txt /home/bob/secret.txt",
      ),
    ).toBe("C:\\**\\secret.txt /**/secret.txt /**/secret.txt");
  });

  it("redacts Unicode and percent-encoded home directory identities", () => {
    expect(
      scrubSensitiveText(
        "C:\\Users\\Łukasz\\AppData\\Local\\Hinekora\\main.js " +
          "/Users/山田/Library/Hinekora/main.js " +
          "/home/Jos%C3%A9/.config/hinekora/main.log",
      ),
    ).toBe(
      "C:\\**\\Hinekora\\main.js /**/Hinekora/main.js /**/hinekora/main.log",
    );
  });

  it("recursively scrubs arrays and records without mutating the input", () => {
    const input = {
      nested: {
        args: ["/Users/alice/Library/Hinekora/log.txt", 42, null],
      },
    };

    expect(scrubSentryValue(input)).toEqual({
      nested: { args: ["/**/Hinekora/log.txt", 42, null] },
    });
    expect(input.nested.args[0]).toContain("alice");
  });

  it("bounds recursive, circular, and non-plain values", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const date = new Date("2026-07-15T00:00:00.000Z");

    expect(scrubSentryValue(circular)).toEqual({ self: "[circular]" });
    expect(
      scrubSentryValue({ nested: { value: "secret" } }, { maxDepth: 1 }),
    ).toEqual({ nested: "[truncated]" });
    expect(
      scrubSentryValue([{ value: 1 }, { value: 2 }], { maxNodes: 2 }),
    ).toEqual([{ value: 1 }, "[truncated]"]);
    expect(scrubSentryValue(date)).toBe(date);
  });
});

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ATTRIBUTIONS } from "./attributions";

describe("attributions", () => {
  it("keeps README attribution links aligned with shared attribution data", () => {
    const readme = readFileSync("README.md", "utf8");

    for (const attribution of ATTRIBUTIONS) {
      expect(readme).toContain(`[${attribution.name}](${attribution.url})`);
    }
  });
});

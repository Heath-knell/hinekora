import { describe, expect, it } from "vitest";

import { readAuraVideoSize } from "./readAuraVideoSize";

describe("readAuraVideoSize", () => {
  it("reads available video dimensions from an aura video element", () => {
    expect(readAuraVideoSize({ videoWidth: 2560, videoHeight: 1440 })).toEqual({
      width: 2560,
      height: 1440,
    });
  });

  it("ignores aura video elements before dimensions are available", () => {
    expect(readAuraVideoSize({ videoWidth: 0, videoHeight: 0 })).toBeNull();
  });
});

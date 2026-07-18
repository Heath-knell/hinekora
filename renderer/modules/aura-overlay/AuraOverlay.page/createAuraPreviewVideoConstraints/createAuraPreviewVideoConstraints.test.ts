import { describe, expect, it } from "vitest";

import { createAuraPreviewVideoConstraints } from "./createAuraPreviewVideoConstraints";

describe("createAuraPreviewVideoConstraints", () => {
  it("requests a 60fps desktop capture stream for aura overlays", () => {
    expect(createAuraPreviewVideoConstraints()).toEqual({
      width: { max: 7680 },
      height: { max: 4320 },
      frameRate: { max: 60 },
    });
  });
});

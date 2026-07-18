import { describe, expect, it } from "vitest";

import { createAuraPreviewVideoConstraints } from "./createAuraPreviewVideoConstraints";

describe("createAuraPreviewVideoConstraints", () => {
  it("caps aura overlay capture at 30fps", () => {
    expect(createAuraPreviewVideoConstraints()).toEqual({
      width: { max: 7680 },
      height: { max: 4320 },
      frameRate: { max: 30 },
    });
  });
});

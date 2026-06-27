import { describe, expect, it } from "vitest";

import { readAuraRouteParams } from "./readAuraRouteParams";

describe("readAuraRouteParams", () => {
  it("reads aura overlay route query parameters from a hash", () => {
    const params = readAuraRouteParams(
      "#/aura-overlay?profileId=profile-1&startAddingAura=1",
    );

    expect(params.get("profileId")).toBe("profile-1");
    expect(params.get("startAddingAura")).toBe("1");
  });
});

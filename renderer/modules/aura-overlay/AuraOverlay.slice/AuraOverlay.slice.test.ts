import { describe, expect, it } from "vitest";

import { createBoundStoreForTests } from "~/renderer/test/createBoundStoreForTests";

import { createAuraOverlaySlice } from "./AuraOverlay.slice";

describe("AuraOverlay slice", () => {
  it("tracks pending add-aura requests and the active selection shape", () => {
    const store = createBoundStoreForTests((set, get, api) =>
      createAuraOverlaySlice(set, get, api),
    );

    expect(store.getState().auraOverlay.addAuraRequest).toBeNull();
    expect(store.getState().auraOverlay.addingAuraShape).toBeNull();

    store
      .getState()
      .auraOverlay.setAddAuraRequest({ requestId: "request-1", shape: "arc" });
    store.getState().auraOverlay.setAddingAuraShape("points");

    expect(store.getState().auraOverlay.addAuraRequest).toEqual({
      requestId: "request-1",
      shape: "arc",
    });
    expect(store.getState().auraOverlay.addingAuraShape).toBe("points");

    store.getState().auraOverlay.setAddAuraRequest(null);
    store.getState().auraOverlay.setAddingAuraShape(null);

    expect(store.getState().auraOverlay.addAuraRequest).toBeNull();
    expect(store.getState().auraOverlay.addingAuraShape).toBeNull();
  });
});

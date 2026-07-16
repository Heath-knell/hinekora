import { describe, expect, it } from "vitest";

import { setupEditorSliceTest } from "./Editor.slice.test-utils";

const { createTestStore } = setupEditorSliceTest();

describe("Editor view slice", () => {
  it("toggles one side panel at a time and closes the active panel", () => {
    const store = createTestStore();

    store.getState().editor.toggleSidePanel("history");
    expect(store.getState().editor.visibleSidePanel).toBe("history");

    store.getState().editor.toggleSidePanel("bookmarks");
    expect(store.getState().editor.visibleSidePanel).toBe("bookmarks");

    store.getState().editor.toggleSidePanel("bookmarks");
    expect(store.getState().editor.visibleSidePanel).toBeNull();

    store.getState().editor.toggleSidePanel("shortcuts");
    store.getState().editor.closeSidePanel();
    expect(store.getState().editor.visibleSidePanel).toBeNull();
  });
});

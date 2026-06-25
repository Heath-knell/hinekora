import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createReplayClip } from "~/main/test/factories/replayClip";

const storeMocks = vi.hoisted(() => ({
  hideClipPreview: vi.fn(),
  openClip: vi.fn(),
  openEditorClip: vi.fn(),
  revealClip: vi.fn(),
  trackEvent: vi.fn(),
  useReplayClipsShallow: vi.fn(),
}));

vi.mock("~/renderer/modules/umami", () => ({
  trackEvent: storeMocks.trackEvent,
}));

vi.mock("~/renderer/store", () => ({
  useReplayClipsShallow: storeMocks.useReplayClipsShallow,
}));

import { ClipPreviewOverlayPage } from "./ClipPreviewOverlay.page";

let container: HTMLDivElement;
let root: Root;

function findButton(label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label),
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find ${label} button`);
  }

  return button;
}

async function renderPage() {
  await act(async () => {
    root.render(<ClipPreviewOverlayPage />);
  });
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("ClipPreviewOverlayPage", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    window.location.hash = "#/clip-preview-overlay?clipId=clip-1";
    storeMocks.hideClipPreview.mockResolvedValue(undefined);
    storeMocks.openClip.mockResolvedValue(undefined);
    storeMocks.openEditorClip.mockResolvedValue(undefined);
    storeMocks.revealClip.mockResolvedValue(undefined);
    storeMocks.useReplayClipsShallow.mockImplementation((selector) =>
      selector({
        activeClip: null,
        items: [
          createReplayClip({
            id: "clip-1",
            processedClipPath: "C:\\clips\\clip-1.mp4",
          }),
        ],
        openClip: storeMocks.openClip,
        revealClip: storeMocks.revealClip,
      }),
    );

    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        mainWindow: {
          openEditorClip: storeMocks.openEditorClip,
        },
        overlayWindows: {
          hideClipPreview: storeMocks.hideClipPreview,
        },
      },
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.location.hash = "";
    vi.clearAllMocks();
  });

  it("routes overlay actions to fullscreen, editor, and explorer handlers", async () => {
    await renderPage();

    expect(container.textContent).toContain("Fullscreen");
    expect(container.textContent).toContain("Edit");
    expect(container.textContent).toContain("Show in Explorer");
    expect(container.textContent).not.toContain("Open");
    expect(container.textContent).not.toContain("Folder");

    await act(async () => {
      findButton("Fullscreen").click();
    });
    await act(async () => {
      findButton("Show in Explorer").click();
    });
    await act(async () => {
      findButton("Edit").click();
    });
    await flushPromises();

    expect(storeMocks.openClip).toHaveBeenCalledWith("clip-1");
    expect(storeMocks.revealClip).toHaveBeenCalledWith("clip-1");
    expect(storeMocks.openEditorClip).toHaveBeenCalledWith("clip-1");
    expect(storeMocks.hideClipPreview).toHaveBeenCalledTimes(1);
    expect(storeMocks.trackEvent).toHaveBeenCalledWith(
      "clip-preview-overlay-edit-opened",
    );
  });
});

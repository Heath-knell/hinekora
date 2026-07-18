import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  resetApplicationStatus: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCaptureGuideShallow: (selector: unknown) =>
    (selector as (captureGuide: unknown) => unknown)({
      resetApplicationStatus: storeMocks.resetApplicationStatus,
    }),
  useSettingsSelector: (selector: unknown) =>
    (selector as (settings: unknown) => unknown)({
      value: { activeGame: "poe1" },
    }),
}));
vi.mock(
  "~/renderer/modules/capture-guide/CaptureGuide.components/CaptureTemplatesView/CaptureTemplatesView",
  () => ({
    CaptureTemplatesView: ({
      canLoadEstimates,
      onFormatComparisonRequest,
    }: {
      canLoadEstimates: boolean;
      onFormatComparisonRequest: () => void;
    }) => (
      <div data-can-load-estimates={String(canLoadEstimates)}>
        <span>Templates view</span>
        <button type="button" onClick={onFormatComparisonRequest}>
          Open linked format comparison
        </button>
      </div>
    ),
  }),
);
vi.mock(
  "~/renderer/modules/capture-guide/CaptureGuide.components/CaptureStorageView/CaptureStorageView",
  () => ({ CaptureStorageView: () => <div>Storage view</div> }),
);
vi.mock(
  "~/renderer/modules/capture-guide/CaptureGuide.components/CaptureFormatComparisonView/CaptureFormatComparisonView",
  () => ({
    CaptureFormatComparisonView: () => <div>Format comparison view</div>,
  }),
);

import { CaptureGuidePage } from "./CaptureGuidePage";

let container: HTMLDivElement;
let root: Root;

describe("CaptureGuidePage", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
  });

  it("renders the guide views as page-action tabs", async () => {
    await act(async () => {
      root.render(<CaptureGuidePage />);
    });

    const templatesTab = container.querySelector<HTMLButtonElement>(
      "#capture-guide-tab-templates",
    );
    const storageTab = container.querySelector<HTMLButtonElement>(
      "#capture-guide-tab-storage",
    );
    const formatsTab = container.querySelector<HTMLButtonElement>(
      "#capture-guide-tab-formats",
    );
    const linkedFormatButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent === "Open linked format comparison");

    expect(container.textContent).toContain("Capture Guide");
    expect(container.textContent).toContain("Templates view");
    expect(
      container
        .querySelector('[aria-label="Capture guide sections"]')
        ?.classList.contains("tabs-xs"),
    ).toBe(true);
    expect(templatesTab?.getAttribute("aria-selected")).toBe("true");
    expect(templatesTab?.getAttribute("aria-controls")).toBe(
      "capture-guide-panel-templates",
    );

    await act(async () => {
      linkedFormatButton?.click();
    });
    expect(container.textContent).toContain("Format comparison view");

    await act(async () => {
      templatesTab?.click();
    });
    expect(container.textContent).toContain("Templates view");

    await act(async () => {
      storageTab?.click();
    });
    expect(container.textContent).toContain("Storage view");
    expect(
      container
        .querySelector("#capture-guide-panel-storage")
        ?.getAttribute("aria-labelledby"),
    ).toBe("capture-guide-tab-storage");

    await act(async () => {
      formatsTab?.click();
    });
    expect(container.textContent).toContain("Format comparison view");
  });

  it("clears template outcomes on route entry and exit", async () => {
    await act(async () => {
      root.render(<CaptureGuidePage />);
    });
    expect(storeMocks.resetApplicationStatus).toHaveBeenCalledOnce();

    await act(async () => {
      root.unmount();
    });
    expect(storeMocks.resetApplicationStatus).toHaveBeenCalledTimes(2);
    root = createRoot(container);
  });

  it("defers estimates until the page entrance animation completes", async () => {
    vi.useFakeTimers();

    try {
      await act(async () => {
        root.render(<CaptureGuidePage />);
      });
      const templatesView = container.querySelector(
        "[data-can-load-estimates]",
      );
      expect(templatesView?.getAttribute("data-can-load-estimates")).toBe(
        "false",
      );

      await act(async () => {
        vi.advanceTimersByTime(450);
      });
      expect(templatesView?.getAttribute("data-can-load-estimates")).toBe(
        "true",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ManagedRecordingStorageEstimate } from "~/main/modules/managed-recorder/ManagedRecorder.dto";

const storeMocks = vi.hoisted(() => ({
  error: null as string | null,
  estimate: undefined as ManagedRecordingStorageEstimate | undefined,
  isPending: false,
  loadEstimates: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCaptureGuideShallow: (selector: unknown) =>
    (selector as (captureGuide: unknown) => unknown)({
      errorsByKey: { "capture-storage-planner": storeMocks.error },
      estimatesByKey: { "capture-storage-planner": storeMocks.estimate },
      loadEstimates: storeMocks.loadEstimates,
      pendingKeys: { "capture-storage-planner": storeMocks.isPending },
    }),
}));

import { CaptureStorageView } from "./CaptureStorageView";

let container: HTMLDivElement;
let root: Root;

async function renderView(): Promise<void> {
  await act(async () => {
    root.render(<CaptureStorageView />);
  });
}

function get1080pEstimate(): string | null | undefined {
  const row = Array.from(container.querySelectorAll("tbody tr")).find(
    (candidate) => candidate.textContent?.includes("Full HD (1080p)"),
  );

  return row?.children[1]?.textContent;
}

describe("CaptureStorageView", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.error = null;
    storeMocks.isPending = false;
    storeMocks.estimate = {
      fps: 60,
      key: "capture-storage-planner",
      quality: "moderate",
      requestedEncoder: "hardware_h264",
      rows: [
        {
          estimates: [
            {
              durationMinutes: 10,
              estimatedBytes: 700_000_000,
            },
          ],
          height: 1080,
          resolution: "1920x1080",
          width: 1920,
        },
      ],
    };
    storeMocks.loadEstimates.mockResolvedValue(undefined);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
  });

  it("renders a TanStack table with a sticky resolution column", async () => {
    await renderView();
    const table = container.querySelector("table");
    const stickyHeader = table?.querySelector('th[data-sticky="left"]');
    const stickyCells = table?.querySelectorAll('td[data-sticky="left"]');

    expect(table?.getAttribute("aria-label")).toContain(
      "Estimated recording storage",
    );
    expect(table?.className).toContain("table-fixed");
    expect(table?.querySelector("col")?.className).toContain("w-40");
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(stickyHeader?.className).toContain("sticky");
    expect(stickyHeader?.className).toContain("left-0");
    expect(stickyCells).toHaveLength(5);
    expect(container.textContent).toContain("24 hr");
  });

  it("uses plain choices and updates estimates immediately", async () => {
    await renderView();
    const videoFormatSelect = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Storage estimate video format"]',
    );
    const detailSelect = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Storage estimate picture detail"]',
    );
    const standardButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent === "Standard (30 fps)");

    expect(get1080pEstimate()).toBe("700 MB");
    expect(container.textContent).toContain("Easy to share (H.264)");
    expect(container.textContent).toContain("Smallest files (AV1)");
    expect(
      Array.from(videoFormatSelect?.options ?? []).map((item) => item.text),
    ).toEqual([
      "Easy to share (H.264)",
      "Smaller files (H.265)",
      "Smallest files (AV1)",
      "Processor fallback (H.264)",
    ]);

    await act(async () => {
      standardButton?.click();
      if (!videoFormatSelect || !detailSelect) {
        throw new Error("Expected storage controls");
      }
      videoFormatSelect.value = "hardware_h265";
      videoFormatSelect.dispatchEvent(new Event("change", { bubbles: true }));
      detailSelect.value = "ultra";
      detailSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(storeMocks.loadEstimates).toHaveBeenLastCalledWith([
      {
        encoder: "hardware_h265",
        fps: 30,
        key: "capture-storage-planner",
        quality: "ultra",
      },
    ]);
  });

  it("distinguishes loading and failed states", async () => {
    storeMocks.estimate = undefined;
    storeMocks.isPending = true;
    await renderView();
    const table = container.querySelector("table");
    const loader = container.querySelector(
      '[role="status"][aria-label="Calculating storage estimates"]',
    );
    expect(table?.getAttribute("aria-busy")).toBe("true");
    expect(loader?.className).toContain("backdrop-blur-sm");
    expect(loader?.querySelector(".loading-spinner")).not.toBeNull();
    expect(container.textContent).not.toContain("Calculating...");

    storeMocks.isPending = false;
    storeMocks.error = "estimate offline";
    await renderView();
    expect(container.textContent).toContain("Unavailable");
    expect(container.textContent).not.toContain("Calculating...");
    expect(container.textContent).toContain("estimate offline");
    expect(table?.getAttribute("aria-busy")).toBe("false");
  });
});

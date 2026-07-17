import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ManagedRecordingStorageEstimate } from "~/main/modules/managed-recorder/ManagedRecorder.dto";

const storeMocks = vi.hoisted(() => ({
  applicationError: null as string | null,
  applicationMessage: null as string | null,
  applyingTemplateId: null as string | null,
  applyTemplate: vi.fn(),
  errorsByKey: {} as Record<string, string | undefined>,
  estimatesByKey: {} as Record<
    string,
    ManagedRecordingStorageEstimate | undefined
  >,
  isRecorderActive: false,
  loadEstimates: vi.fn(),
  pendingKeys: {} as Record<string, boolean | undefined>,
}));

vi.mock("~/renderer/store", () => ({
  useCaptureGuideShallow: (selector: unknown) =>
    (selector as (captureGuide: unknown) => unknown)({
      applicationError: storeMocks.applicationError,
      applicationMessage: storeMocks.applicationMessage,
      applyingTemplateId: storeMocks.applyingTemplateId,
      applyTemplate: storeMocks.applyTemplate,
      errorsByKey: storeMocks.errorsByKey,
      estimatesByKey: storeMocks.estimatesByKey,
      loadEstimates: storeMocks.loadEstimates,
      pendingKeys: storeMocks.pendingKeys,
    }),
}));
vi.mock(
  "~/renderer/modules/managed-recorder/ManagedRecorder.hooks/useManagedRecorderActive/useManagedRecorderActive",
  () => ({
    useManagedRecorderActive: () => storeMocks.isRecorderActive,
  }),
);

import { CaptureTemplatesView } from "./CaptureTemplatesView";

let container: HTMLDivElement;
let root: Root;

async function renderView(
  onFormatComparisonRequest?: () => void,
): Promise<void> {
  const props = onFormatComparisonRequest ? { onFormatComparisonRequest } : {};

  await act(async () => {
    root.render(<CaptureTemplatesView {...props} />);
  });
}

describe("CaptureTemplatesView", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.applicationError = null;
    storeMocks.applicationMessage = null;
    storeMocks.applyingTemplateId = null;
    storeMocks.applyTemplate.mockResolvedValue(undefined);
    storeMocks.errorsByKey = {};
    storeMocks.estimatesByKey = {};
    storeMocks.isRecorderActive = false;
    storeMocks.loadEstimates.mockResolvedValue(undefined);
    storeMocks.pendingKeys = {};
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("presents templates with explicit motion and linked format details", async () => {
    const onFormatComparisonRequest = vi.fn();
    storeMocks.estimatesByKey = {
      "capture-template:everyday-recording": {
        fps: 60,
        key: "capture-template:everyday-recording",
        quality: "moderate",
        requestedEncoder: "hardware_h264",
        rows: [
          {
            estimates: [
              {
                durationMinutes: 60,
                estimatedBytes: 5_486_400_000,
              },
            ],
            height: 1080,
            resolution: "1920x1080",
            width: 1920,
          },
        ],
      },
    };
    await renderView(onFormatComparisonRequest);
    const section = container.querySelector("section");
    const everydayTemplate = container.querySelector<HTMLElement>(
      'article[data-template-id="everyday-recording"]',
    );
    const formatButton = everydayTemplate?.querySelector<HTMLButtonElement>(
      'button[data-format-comparison-template-id="everyday-recording"]',
    );

    expect(section?.getAttribute("aria-label")).toBe("Capture templates");
    expect(container.textContent).not.toContain("Pick what sounds like you");
    expect(container.textContent).not.toContain(
      "Each option becomes a capture profile you can change later.",
    );
    expect(container.textContent).toContain("Everyday recording");
    expect(container.textContent).toContain("Full HD (1080p)");
    expect(container.textContent).toContain("Smooth (60 fps)");
    expect(everydayTemplate?.textContent).toContain("About 5.5 GB per hour");
    expect(everydayTemplate?.textContent).toContain(
      "Full HD (1080p) - 60 fps - H.264",
    );
    expect(formatButton?.getAttribute("aria-label")).toBe(
      "Open format comparison for H.264",
    );

    await act(async () => {
      formatButton?.click();
    });
    expect(onFormatComparisonRequest).toHaveBeenCalledOnce();
    expect(storeMocks.loadEstimates).toHaveBeenCalledWith(expect.any(Array));
  });

  it("delegates the chosen template to the guide workflow", async () => {
    await renderView();
    const everydayTemplate = container.querySelector<HTMLElement>(
      'article[data-template-id="everyday-recording"]',
    );
    const useButton = everydayTemplate?.querySelector<HTMLButtonElement>(
      'button[data-template-id="everyday-recording"]',
    );

    await act(async () => {
      useButton?.click();
    });

    expect(storeMocks.applyTemplate).toHaveBeenCalledWith("everyday-recording");
  });

  it("reports workflow failures and blocks changes while recording", async () => {
    storeMocks.applicationError = "Storage failed";
    await renderView();
    expect(container.textContent).toContain("Storage failed");

    storeMocks.isRecorderActive = true;
    await renderView();
    expect(
      Array.from(
        container.querySelectorAll<HTMLButtonElement>(
          "article button[data-template-id]",
        ),
      ).every((button) => button.disabled),
    ).toBe(true);
    expect(container.textContent).toContain(
      "Stop recording or rewind before choosing a template.",
    );
  });

  it("shows unavailable estimates and the planning disclaimer", async () => {
    storeMocks.errorsByKey = {
      "capture-template:long-sessions": "offline",
    };
    storeMocks.estimatesByKey = {
      "capture-template:everyday-recording": {
        fps: 60,
        key: "capture-template:everyday-recording",
        quality: "moderate",
        requestedEncoder: "hardware_h264",
        rows: [],
      },
    };

    await renderView();

    expect(container.textContent).toContain("Unavailable");
    expect(container.textContent).toContain("Storage numbers are estimates");
    expect(container.textContent).toContain(
      "Some storage estimates are unavailable",
    );
  });
});

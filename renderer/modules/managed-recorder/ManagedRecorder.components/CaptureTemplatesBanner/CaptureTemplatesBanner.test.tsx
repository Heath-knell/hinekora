import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isDismissed: false,
  navigate: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock("~/renderer/store", () => ({
  useSettingsShallow: (selector: unknown) =>
    (selector as (settings: unknown) => unknown)({
      update: mocks.updateSettings,
      value: { captureTemplatesBannerDismissed: mocks.isDismissed },
    }),
}));

import { CaptureTemplatesBanner } from "./CaptureTemplatesBanner";

let container: HTMLDivElement;
let root: Root;

async function renderBanner(): Promise<void> {
  await act(async () => {
    root.render(<CaptureTemplatesBanner />);
  });
}

describe("CaptureTemplatesBanner", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.isDismissed = false;
    mocks.updateSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("opens the capture guide from its call to action", async () => {
    await renderBanner();
    const banner = container.querySelector('[role="status"]');
    const openButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Templates"),
    );

    expect(container.querySelector("p")?.className).toContain(
      "whitespace-nowrap",
    );
    expect(
      (banner as HTMLElement | null)?.style.getPropertyValue(
        "--capture-guide-accent",
      ),
    ).toBe("oklch(43.7% 0.078 188.216)");
    await act(async () => {
      openButton?.click();
    });

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/capture-guide",
    });
  });

  it("persists dismissal and uses a DaisyUI tooltip", async () => {
    await renderBanner();
    const dismissButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Dismiss capture templates banner"]',
    );

    expect(dismissButton?.parentElement?.className).toContain("tooltip-left");
    await act(async () => {
      dismissButton?.click();
    });
    expect(mocks.updateSettings).toHaveBeenCalledWith({
      captureTemplatesBannerDismissed: true,
    });
  });

  it("does not render after dismissal", async () => {
    mocks.isDismissed = true;
    await renderBanner();

    expect(container.textContent).toBe("");
  });
});

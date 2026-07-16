import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TabsBoxTabs } from "./TabsBoxTabs";

let container: HTMLDivElement;
let root: Root;

describe("TabsBoxTabs", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
  });

  it("uses the primary settings-tab treatment and selects another tab", async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <div role="radiogroup">
          <TabsBoxTabs
            items={[
              { label: "Session Recording", value: "session" },
              { label: "Rewind", value: "rewind" },
            ]}
            selectionRole="radio"
            value="rewind"
            variant="primary"
            onChange={onChange}
          />
        </div>,
      );
    });

    const sessionTab = container.querySelector<HTMLButtonElement>(
      '[data-value="session"]',
    );
    const rewindTab = container.querySelector<HTMLButtonElement>(
      '[data-value="rewind"]',
    );

    expect(rewindTab?.getAttribute("aria-checked")).toBe("true");
    expect(sessionTab?.getAttribute("aria-checked")).toBe("false");

    await act(async () => {
      sessionTab?.click();
    });

    expect(onChange).toHaveBeenCalledWith("session");
  });

  it("supports segmented radio semantics without tab-panel attributes", async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <div role="radiogroup">
          <TabsBoxTabs
            items={[
              { label: "Session Recording", value: "session" },
              { label: "Rewind", value: "rewind" },
            ]}
            selectionRole="radio"
            value="session"
            onChange={onChange}
          />
        </div>,
      );
    });

    const session = container.querySelector<HTMLButtonElement>(
      '[data-value="session"]',
    );
    const rewind = container.querySelector<HTMLButtonElement>(
      '[data-value="rewind"]',
    );
    expect(session?.getAttribute("role")).toBe("radio");
    expect(session?.getAttribute("aria-checked")).toBe("true");
    expect(session?.hasAttribute("aria-selected")).toBe(false);
    expect(session?.hasAttribute("aria-controls")).toBe(false);

    session?.focus();
    await act(async () => {
      session?.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "ArrowRight",
        }),
      );
    });

    expect(onChange).toHaveBeenCalledWith("rewind");
    expect(document.activeElement).toBe(rewind);
  });

  it("supports roving keyboard selection and skips disabled tabs", async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <div role="tablist">
          <TabsBoxTabs
            items={[
              {
                label: "Recording",
                panelId: "recording-panel",
                tabId: "recording-tab",
                value: "recording",
              },
              {
                disabled: true,
                label: "Rewind",
                panelId: "rewind-panel",
                tabId: "rewind-tab",
                value: "rewind",
              },
              {
                label: "Capture",
                panelId: "capture-panel",
                tabId: "capture-tab",
                value: "capture",
              },
            ]}
            value="recording"
            onChange={onChange}
          />
        </div>,
      );
    });

    const recording = container.querySelector<HTMLButtonElement>(
      '[data-value="recording"]',
    );
    const capture = container.querySelector<HTMLButtonElement>(
      '[data-value="capture"]',
    );
    recording?.focus();

    await act(async () => {
      recording?.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "ArrowRight",
        }),
      );
    });

    expect(onChange).toHaveBeenLastCalledWith("capture");
    expect(document.activeElement).toBe(capture);

    await act(async () => {
      capture?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Home" }),
      );
    });
    expect(document.activeElement).toBe(recording);
    expect(onChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      recording?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "End" }),
      );
      recording?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }),
      );
      recording?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }),
      );
    });

    expect(onChange).toHaveBeenLastCalledWith("capture");
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});

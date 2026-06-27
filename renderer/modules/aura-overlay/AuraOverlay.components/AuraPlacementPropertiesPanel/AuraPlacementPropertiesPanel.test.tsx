import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OverlayPlacement } from "~/types";
import { AuraPlacementPropertiesPanel } from "./AuraPlacementPropertiesPanel";

const placement: OverlayPlacement = {
  id: "placement-1",
  cropRegionId: "crop-1",
  x: 30,
  y: 40,
  scale: 1,
  opacity: 1,
};

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("AuraPlacementPropertiesPanel", () => {
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
  });

  it("commits number fields while typing with one history entry per focus session", async () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <AuraPlacementPropertiesPanel
          displayHeight={80}
          displayWidth={120}
          placement={placement}
          side="right"
          visibleThickness={20}
          onChange={onChange}
        />,
      );
    });

    const widthInput = container.querySelector<HTMLInputElement>(
      'input[name="width"]',
    );
    expect(widthInput).toBeInstanceOf(HTMLInputElement);

    await act(async () => {
      widthInput?.focus();
      setInputValue(widthInput as HTMLInputElement, "150");
    });

    expect(onChange).toHaveBeenCalledWith("placement-1", {
      displayWidth: 150,
      recordHistory: true,
    });

    await act(async () => {
      setInputValue(widthInput as HTMLInputElement, "155");
    });

    expect(onChange).toHaveBeenCalledWith("placement-1", {
      displayWidth: 155,
      recordHistory: false,
    });
  });

  it("keeps scale edits at one or higher", async () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <AuraPlacementPropertiesPanel
          displayHeight={80}
          displayWidth={120}
          placement={{ ...placement, scale: 2 }}
          side="right"
          visibleThickness={20}
          onChange={onChange}
        />,
      );
    });

    const scaleInput = container.querySelector<HTMLInputElement>(
      'input[name="scale"]',
    );
    expect(scaleInput).toBeInstanceOf(HTMLInputElement);

    await act(async () => {
      scaleInput?.focus();
      setInputValue(scaleInput as HTMLInputElement, "0.5");
    });

    expect(scaleInput?.min).toBe("1");
    expect(onChange).toHaveBeenCalledWith("placement-1", {
      recordHistory: true,
      scale: 1,
    });
  });

  it("commits toggles and rotate actions as single discrete changes", async () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <AuraPlacementPropertiesPanel
          displayHeight={80}
          displayWidth={120}
          placement={placement}
          side="right"
          visibleThickness={20}
          onChange={onChange}
        />,
      );
    });

    const mirrorInput = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    const rotateButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Rotate"),
    );

    await act(async () => {
      mirrorInput?.click();
      rotateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith("placement-1", { mirrored: true });
    expect(onChange).toHaveBeenCalledWith("placement-1", {
      rotationDegrees: 90,
    });
  });
});

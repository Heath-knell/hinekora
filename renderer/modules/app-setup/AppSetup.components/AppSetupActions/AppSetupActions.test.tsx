import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SETUP_STEPS } from "~/main/modules/app-setup/AppSetup.types";

const analyticsMocks = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}));

const storeMocks = vi.hoisted(() => ({
  useAppSetup: vi.fn(),
}));

vi.mock("~/renderer/modules/umami", () => ({
  trackEvent: analyticsMocks.trackEvent,
}));

vi.mock("~/renderer/store", () => ({
  useAppSetup: storeMocks.useAppSetup,
}));

import AppSetupActions from "./AppSetupActions";

let container: HTMLDivElement;
let root: Root;

async function renderActions() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root.render(<AppSetupActions />);
  });
}

describe("AppSetupActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.useAppSetup.mockReturnValue({
      setupState: {
        currentStep: SETUP_STEPS.SELECT_GAME,
      },
      validation: { isValid: true, errors: [] },
      isLoading: true,
      advanceStep: vi.fn(),
      goBack: vi.fn(),
      completeSetup: vi.fn(),
    });
  });

  afterEach(() => {
    root?.unmount();
    document.body.replaceChildren();
  });

  it("keeps the action label stable while step navigation is loading", () => {
    const html = renderToStaticMarkup(<AppSetupActions />);

    expect(html).toContain("Next");
    expect(html).not.toContain("Loading");
    expect(html).not.toContain("loading-spinner");
  });

  it("tracks next clicks with the current setup step", async () => {
    const advanceStep = vi.fn();
    storeMocks.useAppSetup.mockReturnValue({
      setupState: {
        currentStep: SETUP_STEPS.SELECT_GAME,
      },
      validation: { isValid: true, errors: [] },
      isLoading: false,
      advanceStep,
      goBack: vi.fn(),
      completeSetup: vi.fn(),
    });

    await renderActions();

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button.btn-primary")?.click();
    });

    expect(advanceStep).toHaveBeenCalledTimes(1);
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "setup-next-clicked",
      {
        currentStep: SETUP_STEPS.SELECT_GAME,
        can_continue: true,
      },
    );
  });

  it("tracks back clicks with the current setup step", async () => {
    const goBack = vi.fn();
    storeMocks.useAppSetup.mockReturnValue({
      setupState: {
        currentStep: SETUP_STEPS.SELECT_CLIENT_PATH,
      },
      validation: { isValid: true, errors: [] },
      isLoading: false,
      advanceStep: vi.fn(),
      goBack,
      completeSetup: vi.fn(),
    });

    await renderActions();

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Back")
        ?.click();
    });

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "setup-back-clicked",
      {
        currentStep: SETUP_STEPS.SELECT_CLIENT_PATH,
        can_go_back: true,
      },
    );
  });

  it("tracks finish clicks with the current setup step", async () => {
    const completeSetup = vi.fn();
    storeMocks.useAppSetup.mockReturnValue({
      setupState: {
        currentStep: SETUP_STEPS.TELEMETRY_CONSENT,
      },
      validation: { isValid: true, errors: [] },
      isLoading: false,
      advanceStep: vi.fn(),
      goBack: vi.fn(),
      completeSetup,
    });

    await renderActions();

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button.btn-primary")?.click();
    });

    expect(completeSetup).toHaveBeenCalledTimes(1);
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "setup-finish-clicked",
      {
        currentStep: SETUP_STEPS.TELEMETRY_CONSENT,
        can_finish: true,
      },
    );
  });
});

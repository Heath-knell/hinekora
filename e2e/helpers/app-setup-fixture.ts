import type { Locator, Page } from "@playwright/test";

import type { AppSelectPathInput } from "../../main/modules/app/App.dto";
import {
  SETUP_STEPS,
  type SetupState,
  type StepValidationResult,
} from "../../main/modules/app-setup/AppSetup.types";
import type { ClientLogPathInput } from "../../main/modules/client-log/ClientLog.dto";
import type { AppSettings, GameId } from "../../types";
import {
  type AppSetupE2ETransition,
  expectNoUnexpectedDashboardBridgeCalls,
  getDashboardE2ECalls,
  setDashboardAppSetupValidation,
  setupDashboardE2E,
} from "./dashboard-fixture";

interface AppSetupE2ECalls {
  clientLogPathUpdates: ClientLogPathInput[];
  pathSelectionRequests: AppSelectPathInput[];
  settingsUpdates: Array<Partial<AppSettings>>;
}

interface AppSetupE2EOptions {
  appSetupTransitions?: AppSetupE2ETransition[];
  currentStep?: SetupState["currentStep"];
  initialValidation?: StepValidationResult;
  selectedGames?: GameId[];
  selectedPaths?: Array<string | null>;
}

const appSetupGameLabels: Record<GameId, string> = {
  poe1: "Path of Exile 1",
  poe2: "Path of Exile 2",
};

function getAppSetupGameButton(page: Page, game: GameId): Locator {
  return page.getByRole("button", {
    name: new RegExp(`^${appSetupGameLabels[game]}`),
  });
}

function getAppSetupClientLogButton(page: Page, game: GameId): Locator {
  return page.getByRole("button", {
    name: `Select ${appSetupGameLabels[game]} client log`,
  });
}

function getAppSetupClientLogInput(page: Page, game: GameId): Locator {
  return getAppSetupClientLogButton(page, game)
    .locator("..")
    .getByRole("textbox");
}

async function getAppSetupE2ECalls(page: Page): Promise<AppSetupE2ECalls> {
  const calls = await getDashboardE2ECalls(page);

  return {
    clientLogPathUpdates: calls.clientLogPathUpdates,
    pathSelectionRequests: calls.pathSelectionRequests,
    settingsUpdates: calls.settingsUpdates,
  };
}

async function setupAppSetupE2E(
  page: Page,
  options: AppSetupE2EOptions = {},
): Promise<void> {
  const selectedGames = options.selectedGames ?? ["poe1", "poe2"];

  await setupDashboardE2E(page, {
    activeGame: selectedGames[0] ?? "poe1",
    appSetupTransitions: options.appSetupTransitions ?? [],
    ...(options.initialValidation
      ? { appSetupValidation: options.initialValidation }
      : {}),
    initialHash: "/#/setup",
    selectedPaths: options.selectedPaths ?? [],
    setupState: {
      currentStep: options.currentStep ?? SETUP_STEPS.SELECT_GAME,
      isComplete: false,
      poe1ClientPath: null,
      poe2ClientPath: null,
      selectedGames,
    },
    skipDashboardShellChecks: true,
  });
}

async function setAppSetupValidation(
  page: Page,
  validation: StepValidationResult,
): Promise<void> {
  await setDashboardAppSetupValidation(page, validation);
}

export {
  type AppSetupE2ETransition,
  expectNoUnexpectedDashboardBridgeCalls as expectNoUnexpectedAppSetupBridgeCalls,
  getAppSetupClientLogButton,
  getAppSetupClientLogInput,
  getAppSetupE2ECalls,
  getAppSetupGameButton,
  setAppSetupValidation,
  setupAppSetupE2E,
};

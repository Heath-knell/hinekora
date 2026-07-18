import { expect, type Page, test } from "@playwright/test";

import { SETUP_STEPS } from "../../main/modules/app-setup/AppSetup.types";
import type { GameId } from "../../types";
import {
  type AppSetupE2ETransition,
  expectNoUnexpectedAppSetupBridgeCalls,
  getAppSetupClientLogButton,
  getAppSetupClientLogInput,
  getAppSetupE2ECalls,
  getAppSetupGameButton,
  setAppSetupValidation,
  setupAppSetupE2E,
} from "../helpers/app-setup-fixture";

const invalidClientLogValidation = {
  errors: ["Client log selection is required"],
  isValid: false,
};
const validSetupValidation = { errors: [], isValid: true };

function createSetupCompletionTransitions(
  includeBackNavigation: boolean,
): AppSetupE2ETransition[] {
  const transitions: AppSetupE2ETransition[] = [
    {
      action: "advanceStep",
      state: { currentStep: SETUP_STEPS.SELECT_CLIENT_PATH },
    },
    {
      action: "advanceStep",
      state: { currentStep: SETUP_STEPS.PRIVACY_INFO },
    },
  ];

  if (includeBackNavigation) {
    transitions.push(
      {
        action: `goToStep:${SETUP_STEPS.SELECT_CLIENT_PATH}`,
        state: { currentStep: SETUP_STEPS.SELECT_CLIENT_PATH },
      },
      {
        action: "advanceStep",
        state: { currentStep: SETUP_STEPS.PRIVACY_INFO },
      },
    );
  }

  transitions.push({
    action: "completeSetup",
    state: { isComplete: true },
  });

  return transitions;
}

const gameLabels: Record<GameId, string> = {
  poe1: "Path of Exile 1",
  poe2: "Path of Exile 2",
};
const otherGame: Record<GameId, GameId> = {
  poe1: "poe2",
  poe2: "poe1",
};

interface ClientLogCase {
  distribution: string;
  fileName: ClientLogFileName;
  game: GameId;
  path: string;
}

type ClientLogFileName = "Client.txt" | "KakaoClient.txt";

const clientDistributionScenarios: Array<{
  distribution: string;
  fileName: ClientLogFileName;
}> = [
  { distribution: "Steam or standalone", fileName: "Client.txt" },
  { distribution: "Kakao Games", fileName: "KakaoClient.txt" },
];
const clientLogPaths: Record<GameId, Record<ClientLogFileName, string>> = {
  poe1: {
    "Client.txt": String.raw`C:\Games\Path of Exile\logs\Client.txt`,
    "KakaoClient.txt": String.raw`C:\Kakao Games\Path of Exile\logs\KakaoClient.txt`,
  },
  poe2: {
    "Client.txt": String.raw`C:\Games\Path of Exile 2\logs\Client.txt`,
    "KakaoClient.txt": String.raw`C:\Kakao Games\Path of Exile 2\logs\KakaoClient.txt`,
  },
};
const clientLogCases: ClientLogCase[] = (["poe1", "poe2"] as const).flatMap(
  (game) =>
    clientDistributionScenarios.map((scenario) => ({
      distribution: scenario.distribution,
      fileName: scenario.fileName,
      game,
      path: clientLogPaths[game][scenario.fileName],
    })),
);

async function expectSelectedGames(
  page: Page,
  selectedGames: GameId[],
): Promise<void> {
  for (const game of ["poe1", "poe2"] as const) {
    const gameButton = getAppSetupGameButton(page, game);
    if (selectedGames.length === 1 && selectedGames[0] === game) {
      await expect(gameButton).toBeDisabled();
      await expect(gameButton).toHaveAttribute(
        "title",
        "At least one game must be selected",
      );
    } else {
      await expect(gameButton).toBeEnabled();
    }
  }

  const playingBoth = page.getByText("Playing both?", { exact: true });
  if (selectedGames.length === 2) {
    await expect(playingBoth).toBeVisible();
  } else {
    await expect(playingBoth).toBeHidden();
  }
  await expect
    .poll(async () => (await getAppSetupE2ECalls(page)).settingsUpdates)
    .toContainEqual({
      activeGame: selectedGames[0],
      installedGames: selectedGames,
    });
  await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();
}

test.afterEach(async ({ page }) => {
  await expectNoUnexpectedAppSetupBridgeCalls(page);
});

test("selects only Path of Exile 1", async ({ page }) => {
  await setupAppSetupE2E(page, {
    selectedGames: ["poe1", "poe2"],
  });

  await getAppSetupGameButton(page, "poe2").click();

  await expectSelectedGames(page, ["poe1"]);
});

test("selects only Path of Exile 2", async ({ page }) => {
  await setupAppSetupE2E(page, {
    selectedGames: ["poe1", "poe2"],
  });

  await getAppSetupGameButton(page, "poe1").click();

  await expectSelectedGames(page, ["poe2"]);
});

test("selects both Path of Exile games", async ({ page }) => {
  await setupAppSetupE2E(page, {
    selectedGames: ["poe1"],
  });

  await getAppSetupGameButton(page, "poe2").click();

  await expectSelectedGames(page, ["poe1", "poe2"]);
});

for (const clientLogCase of clientLogCases) {
  test(`selects ${clientLogCase.fileName} for ${gameLabels[clientLogCase.game]} ${clientLogCase.distribution}`, async ({
    page,
  }) => {
    await setupAppSetupE2E(page, {
      currentStep: SETUP_STEPS.SELECT_CLIENT_PATH,
      initialValidation: invalidClientLogValidation,
      selectedGames: [clientLogCase.game],
      selectedPaths: [clientLogCase.path],
    });

    await expect(
      page.getByRole("heading", { name: "Select client log location" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        clientLogCase.game === "poe1"
          ? String.raw`...\Path of Exile\logs\KakaoClient.txt`
          : String.raw`...\Path of Exile 2\logs\KakaoClient.txt`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      getAppSetupClientLogButton(page, otherGame[clientLogCase.game]),
    ).toHaveCount(0);

    const nextButton = page.getByRole("button", { name: "Next" });
    await expect(nextButton).toBeDisabled();

    await setAppSetupValidation(page, validSetupValidation);
    await getAppSetupClientLogButton(page, clientLogCase.game).click();

    await expect(
      getAppSetupClientLogInput(page, clientLogCase.game),
    ).toHaveValue(clientLogCase.path);
    await expect(page.getByLabel("Selected")).toBeVisible();
    await expect(nextButton).toBeEnabled();

    await expect
      .poll(() => getAppSetupE2ECalls(page))
      .toMatchObject({
        clientLogPathUpdates: [
          {
            game: clientLogCase.game,
            path: clientLogCase.path,
          },
        ],
        pathSelectionRequests: [
          {
            filters: [{ extensions: ["txt"], name: "Text Files" }],
            properties: ["openFile"],
            title: `Select ${gameLabels[clientLogCase.game]} client log`,
          },
        ],
      });
  });
}

for (const scenario of clientDistributionScenarios) {
  test(`configures both games for ${scenario.distribution}`, async ({
    page,
  }) => {
    const poe1Path = clientLogPaths.poe1[scenario.fileName];
    const poe2Path = clientLogPaths.poe2[scenario.fileName];
    await setupAppSetupE2E(page, {
      currentStep: SETUP_STEPS.SELECT_CLIENT_PATH,
      initialValidation: invalidClientLogValidation,
      selectedGames: ["poe1", "poe2"],
      selectedPaths: [poe1Path, poe2Path],
    });

    const nextButton = page.getByRole("button", { name: "Next" });
    await expect(nextButton).toBeDisabled();

    await getAppSetupClientLogButton(page, "poe1").click();
    await expect(getAppSetupClientLogInput(page, "poe1")).toHaveValue(poe1Path);
    await expect(nextButton).toBeDisabled();

    await setAppSetupValidation(page, validSetupValidation);
    await getAppSetupClientLogButton(page, "poe2").click();
    await expect(getAppSetupClientLogInput(page, "poe2")).toHaveValue(poe2Path);
    await expect(nextButton).toBeEnabled();

    await expect
      .poll(() => getAppSetupE2ECalls(page))
      .toMatchObject({
        clientLogPathUpdates: [{ game: "poe1", path: poe1Path }],
        settingsUpdates: expect.arrayContaining([
          { poe2ClientTxtPath: poe2Path },
        ]),
      });
  });
}

test("keeps the client log required when file selection is cancelled", async ({
  page,
}) => {
  await setupAppSetupE2E(page, {
    currentStep: SETUP_STEPS.SELECT_CLIENT_PATH,
    initialValidation: invalidClientLogValidation,
    selectedGames: ["poe1"],
    selectedPaths: [null],
  });

  const nextButton = page.getByRole("button", { name: "Next" });
  await expect(nextButton).toBeDisabled();

  await getAppSetupClientLogButton(page, "poe1").click();

  await expect(getAppSetupClientLogInput(page, "poe1")).toHaveValue("");
  await expect(page.getByText("Required", { exact: true })).toBeVisible();
  await expect(nextButton).toBeDisabled();
  await expect
    .poll(() => getAppSetupE2ECalls(page))
    .toMatchObject({
      clientLogPathUpdates: [],
      pathSelectionRequests: [
        expect.objectContaining({
          title: "Select Path of Exile 1 client log",
        }),
      ],
    });
});

for (const scenario of clientDistributionScenarios) {
  test(`completes setup for ${scenario.distribution}`, async ({ page }) => {
    const poe1Path = clientLogPaths.poe1[scenario.fileName];
    const poe2Path = clientLogPaths.poe2[scenario.fileName];
    await setupAppSetupE2E(page, {
      appSetupTransitions: createSetupCompletionTransitions(
        scenario.distribution === "Kakao Games",
      ),
      selectedGames: ["poe1", "poe2"],
      selectedPaths: [poe1Path, poe2Path],
    });

    const nextButton = page.getByRole("button", { name: "Next" });
    await expect(nextButton).toBeEnabled();
    await setAppSetupValidation(page, invalidClientLogValidation);
    await nextButton.click();
    await expect(
      page.getByRole("heading", { name: "Select client log location" }),
    ).toBeVisible();

    await getAppSetupClientLogButton(page, "poe1").click();
    await setAppSetupValidation(page, validSetupValidation);
    await getAppSetupClientLogButton(page, "poe2").click();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(
      page.getByRole("heading", { name: "Privacy & Telemetry" }),
    ).toBeVisible();

    if (scenario.distribution === "Kakao Games") {
      await page.getByRole("button", { name: "Back" }).click();
      await expect(getAppSetupClientLogInput(page, "poe1")).toHaveValue(
        poe1Path,
      );
      await expect(getAppSetupClientLogInput(page, "poe2")).toHaveValue(
        poe2Path,
      );
      await nextButton.click();
      await expect(
        page.getByRole("heading", { name: "Privacy & Telemetry" }),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: "Finish" }).click();

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });
}

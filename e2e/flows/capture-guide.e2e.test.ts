import { expect, test } from "@playwright/test";

import {
  expectNoUnexpectedDashboardBridgeCalls,
  getDashboardE2ECalls,
  setupDashboardE2E,
} from "../helpers/dashboard-fixture";

test.afterEach(async ({ page }) => {
  await expectNoUnexpectedDashboardBridgeCalls(page);
});

test("opens the capture guide, uses its simple views, and dismisses the banner", async ({
  page,
}) => {
  await setupDashboardE2E(page, {
    activeGame: "poe2",
    recordingStorageEstimateDelayMs: 300,
  });
  const captureSettings = page.locator('[data-onboarding="capture-settings"]');
  const templatesButton = captureSettings.getByRole("button", {
    exact: true,
    name: "Templates",
  });

  await expect(templatesButton).toBeVisible();
  await templatesButton.click();
  await expect(page).toHaveURL(/capture-guide/);
  await expect(
    page.getByRole("tab", { exact: true, name: "Templates" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Hardware H.264")).toHaveCount(0);

  const everydayTemplate = page.locator(
    'article[data-template-id="everyday-recording"]',
  );
  await expect(everydayTemplate).toContainText(
    "Full HD (1080p) - 60 fps - H.264",
  );
  await expect(everydayTemplate).toContainText("Smooth (60 fps)");
  await expect(
    page.getByText("Storage numbers are estimates", {
      exact: false,
    }),
  ).toBeVisible();
  await everydayTemplate.getByRole("button", { name: "Use template" }).click();
  await expect(everydayTemplate).toContainText("Everyday recording");
  await expect(
    page.getByText("Everyday recording was saved and selected", {
      exact: false,
    }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.captureProfileCreates.find(
        (profile) => profile.name === "Everyday Recording 1080p",
      );
    })
    .toMatchObject({
      captureTarget: {
        game: null,
        height: 1440,
        id: "1",
        kind: "display",
        label: "Screen 1 (Display Model)",
        width: 2560,
      },
      game: "poe2",
      deathClipSeconds: 10,
      recordingAudioInputDeviceId: null,
      recordingAutoStartMode: "off",
      recordingClipQuality: "moderate",
      recordingEncoder: "hardware_h264",
      recordingFps: 60,
      recordingOutputResolution: "1920x1080",
      recordingRunQuality: "moderate",
    });

  await everydayTemplate
    .getByRole("button", { name: "Open format comparison for H.264" })
    .click();
  await expect(
    page.getByRole("tab", { exact: true, name: "Format comparison" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Hardware H.264")).toBeVisible();

  await page.getByRole("tab", { exact: true, name: "Templates" }).click();
  await expect(
    page.getByRole("tab", { exact: true, name: "Templates" }),
  ).toHaveAttribute("aria-selected", "true");

  await page
    .getByRole("tab", { exact: true, name: "Estimated recording storage" })
    .click();
  const videoFormatSelect = page.getByRole("combobox", {
    name: "Storage estimate video format",
  });
  const detailSelect = page.getByRole("combobox", {
    name: "Storage estimate picture detail",
  });
  const estimateTable = page.getByRole("table", {
    name: "Estimated recording storage by resolution and duration",
  });
  await expect(videoFormatSelect.locator("option")).toHaveText([
    "Easy to share (H.264)",
    "Smaller files (H.265)",
    "Smallest files (AV1)",
    "Processor fallback (H.264)",
  ]);
  await expect(detailSelect.locator("option")).toHaveCount(4);
  await expect(estimateTable.locator("tbody tr")).toHaveCount(5);
  await expect(
    estimateTable
      .getByRole("row", { name: /Full HD \(1080p\)/ })
      .locator("td")
      .nth(1),
  ).toHaveText("2.0 GB");
  await expect(
    estimateTable.getByRole("columnheader", { name: "Resolution" }),
  ).toHaveAttribute("data-sticky", "left");
  await expect(
    estimateTable.getByRole("columnheader", { name: "24 hr" }),
  ).toBeVisible();
  await detailSelect.selectOption("high");
  const tableLoader = page.getByRole("status", {
    name: "Calculating storage estimates",
  });
  await expect(tableLoader).toBeVisible();
  await expect(tableLoader).toHaveClass(/backdrop-blur-sm/);
  await expect(estimateTable).toHaveAttribute("aria-busy", "true");
  await expect(estimateTable).not.toContainText("Calculating...");
  await expect(tableLoader).toBeHidden();
  await expect(estimateTable).toHaveAttribute("aria-busy", "false");
  const hoveredRow = estimateTable.getByRole("row", {
    name: /Full HD \(1080p\)/,
  });
  await hoveredRow.hover();
  const hoveredBackgrounds = await hoveredRow.evaluate((row) => ({
    row: getComputedStyle(row).backgroundColor,
    sticky: getComputedStyle(row.querySelector("td")!).backgroundColor,
  }));
  expect(hoveredBackgrounds.sticky).toBe(hoveredBackgrounds.row);
  await expect(page.getByText("Hardware H.264")).toHaveCount(0);
  await expect(
    page.getByText("Actual file size and recording format can vary", {
      exact: false,
    }),
  ).toBeVisible();

  await page
    .getByRole("tab", { exact: true, name: "Format comparison" })
    .click();
  const comparisonTable = page.getByRole("table", {
    name: "Recording format comparison",
  });
  await expect(comparisonTable.locator("tbody tr")).toHaveCount(4);
  await expect(comparisonTable.getByText("Hardware H.264")).toBeVisible();
  await expect(comparisonTable.getByText("Hardware AV1")).toBeVisible();

  await page.goBack();
  await expect(templatesButton).toBeVisible();
  await captureSettings
    .getByRole("button", { name: "Dismiss capture templates banner" })
    .click();
  await expect(templatesButton).toBeHidden();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.settingsUpdates.some(
        (update) => update.captureTemplatesBannerDismissed === true,
      );
    })
    .toBe(true);
});

test("shows unavailable storage estimates after a request failure", async ({
  page,
}) => {
  await setupDashboardE2E(page, {
    activeGame: "poe1",
    initialHash: "/#/capture-guide",
    recordingStorageEstimateError: "estimate offline",
    skipDashboardShellChecks: true,
  });

  await expect(
    page.getByText("Some storage estimates are unavailable"),
  ).toBeVisible();
  await expect(
    page.locator('article[data-template-id="long-sessions"]'),
  ).toContainText("Unavailable");

  await page
    .getByRole("tab", { exact: true, name: "Estimated recording storage" })
    .click();
  const estimateTable = page.getByRole("table", {
    name: "Estimated recording storage by resolution and duration",
  });
  await expect(page.getByRole("alert")).toContainText("estimate offline");
  await expect(estimateTable).toContainText("Unavailable");
  await expect(estimateTable).not.toContainText("Calculating...");
});

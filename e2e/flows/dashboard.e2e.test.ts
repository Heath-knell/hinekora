import { expect, test } from "@playwright/test";

import {
  expectNoUnexpectedDashboardBridgeCalls,
  getDashboardE2ECalls,
  setupDashboardE2E,
} from "../helpers/dashboard-fixture";

test.afterEach(async ({ page }) => {
  await expectNoUnexpectedDashboardBridgeCalls(page);
});

test("prevents Live Preview refresh loops and covers source preview controls", async ({
  page,
}) => {
  await setupDashboardE2E(page);

  const sourceSelect = page.getByRole("combobox", { name: /^Source$/ });
  await expect(sourceSelect).toHaveValue("screen:1:0");
  await expect(page.getByText("Preview stopped")).toBeVisible();

  const callsBeforeRefresh = await getDashboardE2ECalls(page);
  const sourceRequestCountBeforeRefresh =
    callsBeforeRefresh.captureSourceRequests.length;

  await page.getByRole("button", { exact: true, name: "Refresh" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return {
        duplicatePoeStateEmissions: calls.duplicatePoeStateEmissions,
        sourceRequestCount: calls.captureSourceRequests.length,
      };
    })
    .toEqual({
      duplicatePoeStateEmissions: 1,
      sourceRequestCount: sourceRequestCountBeforeRefresh + 1,
    });

  const callsAfterRefresh = await getDashboardE2ECalls(page);
  expect(callsAfterRefresh.captureSourceRequests).toHaveLength(
    sourceRequestCountBeforeRefresh + 1,
  );
  expect(callsAfterRefresh.captureSourceRequests.at(-1)).toBe(true);

  await sourceSelect.selectOption("window:poe2:1");
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.profileUpdates.at(-1)?.captureTarget;
    })
    .toMatchObject({
      id: "window:poe2:1",
      kind: "window",
      label: "Path of Exile 2",
    });

  await page.getByRole("button", { name: "Show Preview" }).click();
  await expect(
    page.getByRole("button", { name: "Stop Preview" }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.getUserMediaConstraints.length;
    })
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "Stop Preview" }).click();
  await expect(
    page.getByRole("button", { name: "Show Preview" }),
  ).toBeVisible();
});

test("covers recorder mode, capture settings, and audio settings interactions", async ({
  page,
}) => {
  await setupDashboardE2E(page);

  await expect(
    page.getByRole("heading", { name: "Capture Settings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Audio Settings" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Session Recording" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.captureModeChanges.at(-1);
    })
    .toBe("session");
  await expect(page.getByText("Session Recording selected.")).toBeVisible();

  await page.getByRole("button", { exact: true, name: "Start" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.startRunRecordingCount;
    })
    .toBe(1);
  await page.getByRole("button", { name: "Stop & Save Recording" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.stopRunRecordingCount;
    })
    .toBe(1);

  await page.getByRole("tab", { name: "Rewind" }).click();
  await page.getByRole("button", { exact: true, name: "Start" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.startBufferCount;
    })
    .toBe(1);
  await page.getByRole("button", { name: "Disable Rewind" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.stopBufferCount;
    })
    .toBe(1);

  await page
    .getByRole("combobox", { name: /^Resolution/ })
    .selectOption("1920x1080");
  await page.getByRole("button", { name: "30 FPS" }).click();
  await page
    .getByRole("combobox", { name: /^Video encoder/ })
    .selectOption("hardware_h265");
  await page
    .getByRole("combobox", { name: /^Recording quality/ })
    .selectOption("ultra");
  await page
    .getByRole("combobox", { name: /^Clip quality/ })
    .selectOption("low");
  await page
    .getByLabel("Hide Hinekora overlays from recordings and rewind")
    .check();
  await page
    .getByRole("combobox", { name: /^Audio input/ })
    .selectOption("device:0");
  await page
    .getByRole("combobox", { name: /^Audio output/ })
    .selectOption("device:0");
  await page.getByRole("button", { name: "Refresh audio devices" }).click();

  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.settingsUpdates;
    })
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recordingOutputResolution: "1920x1080" }),
        expect.objectContaining({ recordingFps: 30 }),
        expect.objectContaining({ recordingEncoder: "hardware_h265" }),
        expect.objectContaining({ recordingRunQuality: "ultra" }),
        expect.objectContaining({ recordingClipQuality: "low" }),
        expect.objectContaining({ recordingHideOverlaysFromCapture: true }),
        expect.objectContaining({ recordingAudioInputDeviceId: "{mic-1}" }),
        expect.objectContaining({
          recordingAudioOutputDeviceId: "{speakers-1}",
        }),
      ]),
    );
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.audioDeviceRequests.at(-1);
    })
    .toEqual({ forceRefresh: true });
});

test("covers dashboard app shell game, overlay, and window controls", async ({
  page,
}) => {
  await setupDashboardE2E(page);

  await page.getByRole("button", { name: /Path of Exile 1/ }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.clientLogActiveGames.at(-1);
    })
    .toEqual({ game: "poe1" });
  await page.getByLabel("poe1 league").selectOption("Mirage");
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.settingsUpdates;
    })
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activeGame: "poe1",
          activeLeague: "Standard",
          poe1SelectedLeague: "Standard",
        }),
        expect.objectContaining({
          activeLeague: "Mirage",
          poe1SelectedLeague: "Mirage",
        }),
      ]),
    );

  await page.getByTitle("Show Overlay").click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.recorderOverlayToggles;
    })
    .toBe(1);
  await expect(page.getByTitle("Hide Overlay")).toBeVisible();

  await page.getByTitle("Minimize").click();
  await page.getByTitle("Maximize").click();
  await page.getByTitle("Restore").click();
  await page.getByTitle("Close").click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.mainWindowActions;
    })
    .toEqual(["minimize", "maximize", "unmaximize", "close"]);
});

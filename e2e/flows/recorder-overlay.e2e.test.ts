import { expect, test } from "@playwright/test";

import {
  expectNoUnexpectedDashboardBridgeCalls,
  getDashboardE2ECalls,
  setupDashboardE2E,
} from "../helpers/dashboard-fixture";

test.afterEach(async ({ page }) => {
  await expectNoUnexpectedDashboardBridgeCalls(page);
});

test("renders and operates the recording controls overlay", async ({
  page,
}) => {
  await setupDashboardE2E(page, {
    initialHash: "/#/recorder-overlay",
    skipDashboardShellChecks: true,
  });

  await expect(page.getByLabel("Recording timer")).toHaveText("00:00");
  await expect(page.getByRole("tab", { name: "Recording" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Rewind" })).toBeVisible();
  await expect(page.getByText("Aura controls", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enable Rewind" }).click();
  await expect(
    page.getByRole("button", { name: "Disable Rewind" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await getDashboardE2ECalls(page)).startBufferCount)
    .toBe(1);

  await page.getByRole("button", { name: "Minimize overlay" }).click();
  await expect(
    page.getByRole("button", { name: "Expand overlay" }),
  ).toBeVisible();
  await expect(page.getByText("Aura controls", { exact: true })).toBeHidden();

  await page.getByRole("button", { name: "Expand overlay" }).click();
  await expect(page.getByText("Aura controls", { exact: true })).toBeVisible();
});

import { expect, test } from "@playwright/test";

import {
  expectNoUnexpectedAuraOverlayBridgeCalls,
  getAuraOverlayE2ECalls,
  setupAuraOverlayE2E,
} from "../helpers/aura-overlay-fixture";

test.afterEach(async ({ page }) => {
  await expectNoUnexpectedAuraOverlayBridgeCalls(page);
});

test("adds an arched aura through the overlay workflow", async ({ page }) => {
  await setupAuraOverlayE2E(page);

  await page.getByRole("button", { name: "Add arched aura" }).click();

  await expect
    .poll(async () => {
      const calls = await getAuraOverlayE2ECalls(page);

      return calls.selectCropRegionCalls;
    })
    .toEqual([{ shape: "arc" }]);
  await expect
    .poll(async () => {
      const calls = await getAuraOverlayE2ECalls(page);
      const update = calls.profileUpdates.at(-1);

      return {
        cropLabel: update?.cropRegions?.at(-1)?.label,
        cropShape: update?.cropRegions?.at(-1)?.shape,
        placementCount: update?.overlayPlacements?.length,
      };
    })
    .toEqual({
      cropLabel: "Arched aura 1",
      cropShape: "arc",
      placementCount: 1,
    });
});

test("adds a pointer aura through the overlay workflow", async ({ page }) => {
  await setupAuraOverlayE2E(page);

  await page.getByRole("button", { name: "Add pointer aura" }).click();

  await expect
    .poll(async () => {
      const calls = await getAuraOverlayE2ECalls(page);

      return calls.selectCropRegionCalls;
    })
    .toEqual([{ shape: "points" }]);
  await expect
    .poll(async () => {
      const calls = await getAuraOverlayE2ECalls(page);
      const update = calls.profileUpdates.at(-1);
      const crop = update?.cropRegions?.at(-1);
      const placement = update?.overlayPlacements?.at(-1);

      return {
        cropLabel: crop?.label,
        cropShape: crop?.shape,
        placementCount: update?.overlayPlacements?.length,
        pointCount: crop?.points?.length,
        pointGap: placement?.pointGap,
        pointSampleSize: placement?.pointSampleSize,
      };
    })
    .toEqual({
      cropLabel: "Pointer aura 1",
      cropShape: "points",
      placementCount: 1,
      pointCount: 3,
      pointGap: 20,
      pointSampleSize: 20,
    });
});

test("edits an arched aura through the overlay workflow", async ({ page }) => {
  await setupAuraOverlayE2E(page, { withArchedAura: true });

  await page
    .getByRole("navigation", { name: "Aura placements" })
    .getByRole("button", { name: "Arched aura 1" })
    .click();
  await expect(
    page.getByRole("region", { name: "Aura placement properties" }),
  ).toBeVisible();

  await page.getByLabel("Straighten").check();
  await expect
    .poll(async () => {
      const calls = await getAuraOverlayE2ECalls(page);

      return calls.profileUpdates.at(-1)?.overlayPlacements?.at(-1)
        ?.arcStraightened;
    })
    .toBe(true);

  const thicknessInput = page.getByLabel("Thickness");
  await thicknessInput.fill("32");
  await thicknessInput.press("Enter");
  await expect
    .poll(async () => {
      const calls = await getAuraOverlayE2ECalls(page);

      return calls.profileUpdates.at(-1)?.overlayPlacements?.at(-1)
        ?.arcVisibleThickness;
    })
    .toBe(32);
});

test("uses the persisted active game source for global aura profiles", async ({
  page,
}) => {
  await setupAuraOverlayE2E(page, {
    captureSources: [
      {
        available: true,
        displayId: null,
        game: "poe2",
        height: 1080,
        id: "window:poe2:game",
        kind: "window",
        name: "Path of Exile 2",
        thumbnailDataUrl: null,
        width: 1920,
      },
    ],
    noCaptureTarget: true,
    withArchedAura: true,
  });

  await expect
    .poll(async () => {
      const calls = await getAuraOverlayE2ECalls(page);

      return calls.captureConstraintSourceIds.at(-1);
    })
    .toBe("window:poe2:game");
});

test("keeps the aura overlay document transparent", async ({ page }) => {
  await setupAuraOverlayE2E(page, { withArchedAura: true });

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const root = document.getElementById("root");
        const overlay = document.querySelector<HTMLElement>(
          '[aria-label="Aura overlay"]',
        );

        return {
          body: getComputedStyle(document.body).backgroundColor,
          html: getComputedStyle(document.documentElement).backgroundColor,
          overlay: overlay ? getComputedStyle(overlay).backgroundColor : null,
          root: root ? getComputedStyle(root).backgroundColor : null,
        };
      }),
    )
    .toEqual({
      body: "rgba(0, 0, 0, 0)",
      html: "rgba(0, 0, 0, 0)",
      overlay: "rgba(0, 0, 0, 0)",
      root: "rgba(0, 0, 0, 0)",
    });
});

test("shows aura controls help above selected aura controls", async ({
  page,
}) => {
  await setupAuraOverlayE2E(page, {
    overlapHelpWithArchedAura: true,
    withArchedAura: true,
  });

  await page
    .getByRole("navigation", { name: "Aura placements" })
    .getByRole("button", { name: "Arched aura 1" })
    .click();
  await page.getByLabel("Show aura controls help").click();

  const helpPanel = page.getByLabel("Aura overlay controls");
  await expect(helpPanel).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Aura placement properties" }),
  ).toBeVisible();

  await expect
    .poll(async () =>
      helpPanel.evaluate((panel) => {
        const bounds = panel.getBoundingClientRect();
        const elementAtPanelCenter = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );

        return panel.contains(elementAtPanelCenter);
      }),
    )
    .toBe(true);
});

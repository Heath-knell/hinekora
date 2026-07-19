import { expect, test } from "@playwright/test";

import type { Profile } from "../../types";
import {
  expectNoUnexpectedDashboardBridgeCalls,
  getDashboardE2ECalls,
  setupDashboardE2E,
} from "../helpers/dashboard-fixture";

const auraManagerProfile: Profile = {
  captureTarget: {
    height: 1080,
    id: "1",
    kind: "display",
    label: "Screen 1 (Display Model)",
    width: 1920,
  },
  createdAt: new Date(0).toISOString(),
  cropRegions: [
    {
      arc: {
        controlX: 76,
        controlY: 8,
        endX: 150,
        endY: 260,
        startX: 2,
        startY: 260,
        thickness: 20,
      },
      height: 290,
      id: "crop-arc",
      label: "Arched aura 1",
      referenceHeight: 1440,
      referenceWidth: 2560,
      shape: "arc",
      width: 153,
      x: 155,
      y: 1152,
    },
    {
      height: 65,
      id: "crop-rect",
      label: "Aura 2",
      referenceHeight: 1440,
      referenceWidth: 2560,
      width: 67,
      x: 2178,
      y: 1270,
    },
  ],
  game: "poe2",
  id: "profile-1",
  name: "PoE 2",
  overlayPlacements: [
    {
      arcStraightened: true,
      arcVisibleThickness: 10,
      cropRegionId: "crop-arc",
      id: "placement-arc",
      opacity: 0.8,
      referenceHeight: 1440,
      referenceWidth: 2560,
      scale: 1.6,
      x: 1166,
      y: 210,
    },
    {
      cropRegionId: "crop-rect",
      id: "placement-rect",
      opacity: 1,
      referenceHeight: 1440,
      referenceWidth: 2560,
      scale: 1,
      x: 1434,
      y: 502,
    },
  ],
  targetFps: 60,
  updatedAt: new Date(0).toISOString(),
};

test.afterEach(async ({ page }) => {
  await expectNoUnexpectedDashboardBridgeCalls(page);
});

test("renders and edits the Aura Manager workflow", async ({ page }) => {
  await setupDashboardE2E(page, {
    activeGame: "poe2",
    initialHash: "/#/crop-overlay",
    profile: auraManagerProfile,
    skipDashboardShellChecks: true,
  });

  await expect(
    page.getByRole("heading", { exact: true, name: "Aura Manager" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Aura profile" }),
  ).toHaveValue("profile-1");

  const tabs = page.getByRole("tablist", { name: "Auras" });
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(
    tabs.getByRole("tab", { name: "Arched aura 1" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    tabs.getByRole("tab", { name: "Arched aura 1" }).locator("svg"),
  ).toBeVisible();

  const profileActionsButton = page.getByText("Profile actions", {
    exact: true,
  });
  await expect(profileActionsButton).toBeVisible();
  await profileActionsButton.click();
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Add new profile/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Edit current profile/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Duplicate profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Delete current profile/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete all profiles" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add aura", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("heading", { exact: true, name: "Aura Manager" })
    .click();
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).not.toBeVisible();

  await page.keyboard.press("Control+e");
  await expect(
    page.getByRole("heading", { name: "Edit current profile" }),
  ).toBeVisible();
  const profileNameInput = page.getByLabel("Profile name");
  await profileNameInput.fill("PoE 2 Updated");
  await page.getByLabel("Game availability").selectOption("all");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.profileUpdates.some(
        (update) =>
          update.id === auraManagerProfile.id &&
          update.name === "PoE 2 Updated" &&
          update.game === null,
      );
    })
    .toBe(true);
  await expect(
    page.getByRole("combobox", { name: "Aura profile" }),
  ).toHaveValue("profile-1");

  await profileActionsButton.click();
  await page.getByRole("button", { name: /Add new profile/ }).click();
  await page.getByLabel("Profile name").fill("Temporary PoE 2");
  await page.getByLabel("Game availability").selectOption("poe2");
  await page.getByRole("button", { name: "Add profile" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.profileCreates.find(
        (profile) => profile.name === "Temporary PoE 2",
      );
    })
    .toMatchObject({ game: "poe2", name: "Temporary PoE 2" });
  const temporaryProfile = (
    await getDashboardE2ECalls(page)
  ).profileCreates.find((profile) => profile.name === "Temporary PoE 2");
  expect(temporaryProfile).toBeDefined();
  await expect(
    page.getByRole("combobox", { name: "Aura profile" }),
  ).toHaveValue(temporaryProfile?.id ?? "");

  await page.keyboard.press("Control+d");
  await expect(
    page.getByRole("heading", { name: "Delete current profile?" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").locator(".badge")).toHaveText(
    "Temporary PoE 2",
  );
  await page.getByRole("button", { name: "Delete profile" }).click();
  await expect
    .poll(async () => (await getDashboardE2ECalls(page)).profileDeletes)
    .toContain(temporaryProfile?.id);
  await expect(
    page.getByRole("combobox", { name: "Aura profile" }),
  ).toHaveValue("profile-1");

  await profileActionsButton.click();
  await page.getByRole("button", { name: "Duplicate profile" }).click();
  await page.getByLabel("Profile name").fill("PoE 2 Duplicate");
  await page.getByRole("button", { name: "Duplicate profile" }).click();
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return calls.profileDuplicates.find(
        (profile) => profile.name === "PoE 2 Duplicate",
      );
    })
    .toMatchObject({ name: "PoE 2 Duplicate", sourceId: "profile-1" });
  const duplicatedProfile = (
    await getDashboardE2ECalls(page)
  ).profileDuplicates.find((profile) => profile.name === "PoE 2 Duplicate");
  expect(duplicatedProfile).toBeDefined();
  await expect(
    page.getByRole("combobox", { name: "Aura profile" }),
  ).toHaveValue(duplicatedProfile?.id ?? "");
  await page.keyboard.press("Control+d");
  await page.getByRole("button", { name: "Delete profile" }).click();
  await expect(
    page.getByRole("combobox", { name: "Aura profile" }),
  ).toHaveValue("profile-1");

  const auraPositionCard = page
    .getByRole("heading", { name: "Aura Position" })
    .locator("..");
  await expect(auraPositionCard.locator("svg").first()).toBeVisible();
  await expect(page.getByLabel("Opacity")).toHaveValue("0.8");
  await expect(page.getByLabel("Mirrored")).not.toBeChecked();
  await expect(page.getByLabel("Straightened")).toBeChecked();

  const scaleBounds = await page
    .getByLabel("Scale")
    .locator("..")
    .boundingBox();
  const thicknessBounds = await page
    .getByLabel("Thickness")
    .locator("..")
    .boundingBox();
  const opacityBounds = await page
    .getByLabel("Opacity")
    .locator("..")
    .boundingBox();
  const rotationBounds = await page
    .getByLabel("Rotation")
    .locator("..")
    .boundingBox();
  expect(
    Math.abs((scaleBounds?.y ?? 0) - (thicknessBounds?.y ?? 0)),
  ).toBeLessThan(3);
  expect(
    Math.abs((opacityBounds?.y ?? 0) - (rotationBounds?.y ?? 0)),
  ).toBeLessThan(3);

  const nameInput = page.getByLabel("Name");
  await nameInput.fill("Renamed aura");
  await nameInput.press("Tab");
  await page.getByLabel("Opacity").fill("0.65");
  await expect
    .poll(async () => {
      const calls = await getDashboardE2ECalls(page);

      return {
        labelPersisted: calls.profileUpdates.some((update) =>
          update.cropRegions?.some(
            (region) =>
              region.id === "crop-arc" && region.label === "Renamed aura",
          ),
        ),
        opacityPersisted: calls.profileUpdates.some((update) =>
          update.overlayPlacements?.some(
            (placement) =>
              placement.id === "placement-arc" && placement.opacity === 0.65,
          ),
        ),
      };
    })
    .toEqual({ labelPersisted: true, opacityPersisted: true });
  await expect(nameInput).toHaveValue("Renamed aura");
  await expect(page.getByLabel("Opacity")).toHaveValue("0.65");

  const preview = page.getByLabel("Aura layout preview");
  const previewStage = page.getByTestId("aura-layout-preview-stage");
  const previewAura = page.locator(
    '[data-preview-box-id="placement-arc"][data-preview-box-kind="aura"]',
  );
  await expect(preview).toBeVisible();
  const stageBounds = await previewStage.boundingBox();
  const auraBounds = await previewAura.boundingBox();
  expect(stageBounds).not.toBeNull();
  expect(auraBounds).not.toBeNull();
  expect((stageBounds?.width ?? 0) / (stageBounds?.height ?? 1)).toBeCloseTo(
    16 / 9,
    1,
  );
  expect(
    ((auraBounds?.x ?? 0) - (stageBounds?.x ?? 0)) / (stageBounds?.width ?? 1),
  ).toBeCloseTo(1166 / 2560, 2);
  expect(
    ((auraBounds?.y ?? 0) - (stageBounds?.y ?? 0)) / (stageBounds?.height ?? 1),
  ).toBeCloseTo(210 / 1440, 2);

  await tabs.getByRole("tab", { name: "Aura 2" }).click();
  await expect(tabs.getByRole("tab", { name: "Aura 2" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    tabs.getByRole("tab", { name: "Aura 2" }).locator("svg"),
  ).toBeVisible();
  const rectangularScaleBounds = await page
    .getByLabel("Scale")
    .locator("..")
    .boundingBox();
  const rectangularOpacityBounds = await page
    .getByLabel("Opacity")
    .locator("..")
    .boundingBox();
  const rectangularRotationBounds = await page
    .getByLabel("Rotation")
    .locator("..")
    .boundingBox();
  expect(rectangularScaleBounds).not.toBeNull();
  expect(
    Math.abs(
      (rectangularOpacityBounds?.y ?? 0) - (rectangularRotationBounds?.y ?? 0),
    ),
  ).toBeLessThan(3);
  expect(rectangularOpacityBounds?.y ?? 0).toBeGreaterThan(
    rectangularScaleBounds?.y ?? 0,
  );

  await profileActionsButton.click();
  await page.getByRole("button", { name: "Delete all profiles" }).click();
  await expect(
    page.getByText("available to both games", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete all profiles" }).click();
  await expect
    .poll(async () => (await getDashboardE2ECalls(page)).profileDeleteAll)
    .toContain("profile-1");
  await expect(
    page.getByRole("combobox", { name: "Aura profile" }),
  ).toHaveValue("profile-1");
});

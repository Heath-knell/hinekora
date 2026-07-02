import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BoundStore } from "~/renderer/store/store.types";

import type { CaptureProfile } from "~/types";
import { createCaptureProfileTestFixture } from "../../CaptureProfiles.test-utils";
import { CaptureProfileSelect } from "./CaptureProfileSelect";

const profile = createCaptureProfileTestFixture({
  game: "poe2",
  id: "profile-poe2",
  isDefault: true,
  name: "Default PoE 2 Profile",
  recordingClipQuality: "low",
  recordingRunQuality: "ultra",
});

const secondProfile: CaptureProfile = {
  ...profile,
  id: "profile-poe2-mapping",
  isDefault: false,
  name: "PoE 2 Mapping",
};

const storeMocks = vi.hoisted(() => ({
  isRewindActive: false,
  isRunRecordingActive: false,
  items: [] as CaptureProfile[],
  selectedProfileId: null as string | null,
  selectWithPreviewSource: vi.fn(),
}));

vi.mock("../CaptureProfileLockToggle/CaptureProfileLockToggle", () => ({
  CaptureProfileLockToggle: () => (
    <button aria-label="Capture profile lock" type="button" />
  ),
}));

vi.mock("~/renderer/store", () => ({
  useCaptureProfilesShallow: <T,>(
    selector: (captureProfiles: BoundStore["captureProfiles"]) => T,
  ) =>
    selector({
      items: storeMocks.items,
      selectedProfileId: storeMocks.selectedProfileId,
      selectWithPreviewSource: storeMocks.selectWithPreviewSource,
    } as unknown as BoundStore["captureProfiles"]),
  useManagedRecorderShallow: <T,>(
    selector: (managedRecorder: BoundStore["managedRecorder"]) => T,
  ) =>
    selector({
      status: {
        bufferActive: storeMocks.isRewindActive,
        recording: storeMocks.isRunRecordingActive,
        runRecordingActive: storeMocks.isRunRecordingActive,
      },
    } as unknown as BoundStore["managedRecorder"]),
}));

let container: HTMLDivElement;
let root: Root;

async function renderSelect(): Promise<void> {
  await act(async () => {
    root.render(<CaptureProfileSelect />);
  });
}

describe("CaptureProfileSelect", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.isRewindActive = false;
    storeMocks.isRunRecordingActive = false;
    storeMocks.items = [profile, secondProfile];
    storeMocks.selectedProfileId = profile.id;
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("selects capture profiles while the recorder is idle", async () => {
    await renderSelect();

    const select = container.querySelector<HTMLSelectElement>(
      "select[aria-label='Capture profile']",
    );

    expect(select?.disabled).toBe(false);

    await act(async () => {
      if (!select) {
        throw new Error("Missing capture profile select");
      }

      select.value = secondProfile.id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(storeMocks.selectWithPreviewSource).toHaveBeenCalledWith(
      secondProfile.id,
    );
  });

  it("disables and ignores capture profile switching while recording or rewind is active", async () => {
    storeMocks.isRewindActive = true;

    await renderSelect();

    const select = container.querySelector<HTMLSelectElement>(
      "select[aria-label='Capture profile']",
    );

    expect(select?.disabled).toBe(true);

    await act(async () => {
      if (!select) {
        throw new Error("Missing capture profile select");
      }

      select.value = secondProfile.id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(storeMocks.selectWithPreviewSource).not.toHaveBeenCalled();
  });
});

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCaptureProfileTestFixture } from "~/renderer/modules/capture-profiles/CaptureProfiles.test-utils";

import type { CapturePreviewSource, CaptureProfile, GameId } from "~/types";
import { useCapturePreviewSourcePersistence } from "./useCapturePreviewSourcePersistence";

const source: CapturePreviewSource = {
  displayId: null,
  game: "poe2",
  height: 1440,
  id: "window:poe2",
  kind: "window",
  name: "Path of Exile 2",
  thumbnailDataUrl: null,
  width: 2560,
};

const profile = createCaptureProfileTestFixture({
  game: "poe2",
  id: "poe2-profile",
  name: "PoE 2 Capture",
});

const storeMocks = vi.hoisted(() => ({
  activeGame: "poe2" as GameId,
  isProfileUnlocked: true,
  isRecorderActive: false,
  profileItems: [] as CaptureProfile[],
  selectedProfileId: "poe2-profile" as string | null,
  selectProfile: vi.fn(),
  updateProfile: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCaptureProfilesShallow: <T,>(
    selector: (captureProfiles: {
      isProfileUnlocked: boolean;
      items: CaptureProfile[];
      selectedProfileId: string | null;
      select: (id: string) => void;
      update: (
        input: Partial<CaptureProfile> & { id: string },
      ) => Promise<void>;
    }) => T,
  ) =>
    selector({
      isProfileUnlocked: storeMocks.isProfileUnlocked,
      items: storeMocks.profileItems,
      selectedProfileId: storeMocks.selectedProfileId,
      select: storeMocks.selectProfile,
      update: storeMocks.updateProfile,
    }),
  useManagedRecorderShallow: <T,>(
    selector: (managedRecorder: { status: unknown }) => T,
  ) =>
    selector({
      status: storeMocks.isRecorderActive ? { recording: true } : null,
    }),
  useSettingsShallow: <T,>(
    selector: (settings: {
      value: { activeGame: GameId };
      update: (input: { activeGame?: GameId }) => void;
    }) => T,
  ) =>
    selector({
      value: { activeGame: storeMocks.activeGame },
      update: storeMocks.updateSettings,
    }),
}));

let container: HTMLDivElement;
let root: Root;
let hookResult: ReturnType<typeof useCapturePreviewSourcePersistence> | null =
  null;

function Probe() {
  hookResult = useCapturePreviewSourcePersistence(source);

  return null;
}

async function renderHookProbe() {
  await act(async () => {
    root.render(<Probe />);
  });

  if (!hookResult) {
    throw new Error("Expected source persistence hook to render");
  }

  return hookResult;
}

describe("useCapturePreviewSourcePersistence", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    hookResult = null;
    storeMocks.activeGame = "poe2";
    storeMocks.isProfileUnlocked = true;
    storeMocks.isRecorderActive = false;
    storeMocks.profileItems = [profile];
    storeMocks.selectedProfileId = profile.id;
    storeMocks.updateProfile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("persists the selected source into an unlocked profile while idle", async () => {
    const result = await renderHookProbe();

    act(() => {
      result.persistCaptureTarget(source);
    });

    expect(storeMocks.updateProfile).toHaveBeenCalledWith({
      id: profile.id,
      captureTarget: {
        game: "poe2",
        height: 1440,
        id: "window:poe2",
        kind: "window",
        label: "Path of Exile 2",
        width: 2560,
      },
    });
  });

  it("does not persist source, settings, or profile selection while recording or rewind is active", async () => {
    storeMocks.isRecorderActive = true;
    const result = await renderHookProbe();

    act(() => {
      result.persistCaptureTarget(source);
    });

    expect(storeMocks.updateSettings).not.toHaveBeenCalled();
    expect(storeMocks.selectProfile).not.toHaveBeenCalled();
    expect(storeMocks.updateProfile).not.toHaveBeenCalled();
  });
});

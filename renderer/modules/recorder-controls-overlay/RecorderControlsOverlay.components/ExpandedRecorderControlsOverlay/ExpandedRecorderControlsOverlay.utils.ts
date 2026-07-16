import type { CropRegionSelectionShape } from "~/main/modules/overlay-windows/OverlayWindows.dto";

interface OpenRecorderAuraOverlayInput {
  addAuraShape?: CropRegionSelectionShape;
  gameRunning: boolean;
  isRecorderBusy: boolean;
  profileId: string | null;
  startAddingAura: boolean;
}

function openRecorderAuraOverlay({
  addAuraShape,
  gameRunning,
  isRecorderBusy,
  profileId,
  startAddingAura,
}: OpenRecorderAuraOverlayInput): void {
  if (!profileId || !gameRunning || isRecorderBusy) {
    return;
  }

  const showAuraOptions = startAddingAura
    ? ({ startAddingAura: true, addAuraShape: addAuraShape ?? "rect" } as const)
    : undefined;
  void window.electron.overlayWindows
    .setAuraLocked(false)
    .then(() =>
      showAuraOptions
        ? window.electron.overlayWindows.showAura(profileId, showAuraOptions)
        : window.electron.overlayWindows.showAura(profileId),
    )
    .catch((error: unknown) => {
      console.warn("[recorder-overlay] Aura overlay action failed", {
        error,
      });
    });
}

function closeRecorderOverlay(): void {
  void window.electron.overlayWindows.hideRecorder();
}

export { closeRecorderOverlay, openRecorderAuraOverlay };

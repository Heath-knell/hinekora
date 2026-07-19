import type { BoundStoreStateCreator } from "~/renderer/store/store.types";

type AuraProfileActionDialog =
  | "create"
  | "edit"
  | "duplicate"
  | "delete-current"
  | "delete-all";

interface CropEditorSlice {
  cropEditor: {
    auraOverlayLocked: boolean;
    profileActionDialog: AuraProfileActionDialog | null;
    selectedAuraCropRegionId: string | null;
    showAllAurasInPreview: boolean;
    hydrate: () => Promise<void>;
    startListening: () => () => void;
    setAuraOverlayLocked: (locked: boolean) => void;
    openProfileActionDialog: (dialog: AuraProfileActionDialog) => void;
    closeProfileActionDialog: () => void;
    selectAura: (cropRegionId: string | null) => void;
    setShowAllAurasInPreview: (showAllAurasInPreview: boolean) => void;
  };
}

export const createCropEditorSlice: BoundStoreStateCreator<CropEditorSlice> = (
  set,
) => ({
  cropEditor: {
    auraOverlayLocked: true,
    profileActionDialog: null,
    selectedAuraCropRegionId: null,
    showAllAurasInPreview: false,
    hydrate: async () => {
      const auraOverlayLocked =
        await window.electron.overlayWindows.isAuraLocked();
      set((state) => {
        state.cropEditor.auraOverlayLocked = auraOverlayLocked;
      });
    },
    startListening: () =>
      window.electron.overlayWindows.onAuraLockChanged((auraOverlayLocked) => {
        set((state) => {
          state.cropEditor.auraOverlayLocked = auraOverlayLocked;
        });
      }),
    setAuraOverlayLocked: (auraOverlayLocked) => {
      set((state) => {
        state.cropEditor.auraOverlayLocked = auraOverlayLocked;
      });
    },
    openProfileActionDialog: (profileActionDialog) => {
      set((state) => {
        state.cropEditor.profileActionDialog = profileActionDialog;
      });
    },
    closeProfileActionDialog: () => {
      set((state) => {
        state.cropEditor.profileActionDialog = null;
      });
    },
    selectAura: (selectedAuraCropRegionId) => {
      set((state) => {
        state.cropEditor.selectedAuraCropRegionId = selectedAuraCropRegionId;
      });
    },
    setShowAllAurasInPreview: (showAllAurasInPreview) => {
      set((state) => {
        state.cropEditor.showAllAurasInPreview = showAllAurasInPreview;
      });
    },
  },
});

export type { CropEditorSlice };

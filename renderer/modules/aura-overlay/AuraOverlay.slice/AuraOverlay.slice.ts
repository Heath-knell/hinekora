import type {
  AuraAddRequest,
  CropRegionSelectionShape,
} from "~/main/modules/overlay-windows/OverlayWindows.dto";
import type { BoundStoreStateCreator } from "~/renderer/store/store.types";

interface AuraOverlaySlice {
  auraOverlay: {
    addAuraRequest: AuraAddRequest | null;
    addingAuraShape: CropRegionSelectionShape | null;
    setAddAuraRequest: (request: AuraAddRequest | null) => void;
    setAddingAuraShape: (shape: CropRegionSelectionShape | null) => void;
  };
}

const createAuraOverlaySlice: BoundStoreStateCreator<AuraOverlaySlice> = (
  set,
) => ({
  auraOverlay: {
    addAuraRequest: null,
    addingAuraShape: null,
    setAddAuraRequest: (request) => {
      set((state) => {
        state.auraOverlay.addAuraRequest = request;
      });
    },
    setAddingAuraShape: (shape) => {
      set((state) => {
        state.auraOverlay.addingAuraShape = shape;
      });
    },
  },
});

export type { AuraOverlaySlice };
export { createAuraOverlaySlice };

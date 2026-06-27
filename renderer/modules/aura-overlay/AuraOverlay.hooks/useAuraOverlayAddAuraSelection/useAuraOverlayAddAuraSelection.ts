import { useCallback, useEffect, useRef } from "react";

import type { CropRegionSelectionShape } from "~/main/modules/overlay-windows/OverlayWindows.dto";
import { createAuraProfileUpdateFromSelection } from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import { useAuraOverlayShallow } from "~/renderer/store";
import type { ProfilesSlice } from "~/renderer/store/store.types";

import type { Profile } from "~/types";

type UpdateProfile = ProfilesSlice["profiles"]["update"];

interface StartAddAuraSelectionOptions {
  shape?: CropRegionSelectionShape;
  lockOnCancel?: boolean;
}

interface UseAuraOverlayAddAuraSelectionInput {
  lockAuraOverlay: () => Promise<void>;
  profile: Profile | null;
  recordAuraHistory: () => boolean;
  routeAddAuraRequestId: string | null;
  routeStartAddingAura: boolean;
  updateProfile: UpdateProfile;
}

function useAuraOverlayAddAuraSelection({
  lockAuraOverlay,
  profile,
  recordAuraHistory,
  routeAddAuraRequestId,
  routeStartAddingAura,
  updateProfile,
}: UseAuraOverlayAddAuraSelectionInput) {
  const handledAddAuraRequestRef = useRef<string | null>(null);
  const addingAuraRef = useRef(false);
  const { addAuraRequest, setAddAuraRequest, setAddingAuraShape } =
    useAuraOverlayShallow((auraOverlay) => ({
      addAuraRequest: auraOverlay.addAuraRequest,
      setAddAuraRequest: auraOverlay.setAddAuraRequest,
      setAddingAuraShape: auraOverlay.setAddingAuraShape,
    }));

  const startAddAuraSelection = useCallback(
    (options?: StartAddAuraSelectionOptions) => {
      if (!profile || addingAuraRef.current) {
        return false;
      }

      const lockOnCancel = options?.lockOnCancel === true;
      const shape = options?.shape ?? "rect";
      addingAuraRef.current = true;
      setAddingAuraShape(shape);
      void window.electron.overlayWindows
        .selectCropRegion({ shape })
        .then(async (selection) => {
          if (!selection) {
            if (lockOnCancel) {
              await lockAuraOverlay();
            }
            return;
          }

          const { profileUpdate } = createAuraProfileUpdateFromSelection(
            profile,
            selection,
          );

          recordAuraHistory();
          await updateProfile(profileUpdate);
        })
        .catch(() => {
          if (lockOnCancel) {
            void lockAuraOverlay();
          }
        })
        .finally(() => {
          addingAuraRef.current = false;
          setAddingAuraShape(null);
        });

      return true;
    },
    [
      lockAuraOverlay,
      profile,
      recordAuraHistory,
      setAddingAuraShape,
      updateProfile,
    ],
  );

  useEffect(
    () => window.electron.overlayWindows.onAuraAddRequested(setAddAuraRequest),
    [setAddAuraRequest],
  );

  useEffect(() => {
    const requestId = routeStartAddingAura
      ? (routeAddAuraRequestId ?? "initial")
      : addAuraRequest?.requestId;
    if (!requestId || !profile) {
      return;
    }

    if (handledAddAuraRequestRef.current === requestId) {
      return;
    }

    const shape = routeStartAddingAura
      ? readRouteAddAuraShape()
      : (addAuraRequest?.shape ?? "rect");

    if (startAddAuraSelection({ lockOnCancel: true, shape })) {
      handledAddAuraRequestRef.current = requestId;
      if (!routeStartAddingAura) {
        setAddAuraRequest(null);
      }
    }
  }, [
    addAuraRequest,
    profile,
    routeAddAuraRequestId,
    routeStartAddingAura,
    setAddAuraRequest,
    startAddAuraSelection,
  ]);

  return {
    startAddAuraSelection,
  };
}

function readRouteAddAuraShape(): CropRegionSelectionShape {
  const shape = new URLSearchParams(
    window.location.hash.split("?")[1] ?? "",
  ).get("addAuraShape");

  return shape === "arc" || shape === "points" ? shape : "rect";
}

export { useAuraOverlayAddAuraSelection };

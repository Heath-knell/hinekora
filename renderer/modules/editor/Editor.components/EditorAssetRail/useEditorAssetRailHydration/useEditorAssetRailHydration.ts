import { useEffect } from "react";

import { useEditorShallow, useSavedEditsShallow } from "~/renderer/store";

import type { EditorAssetRailPageModel } from "../useEditorAssetRailPageModel/useEditorAssetRailPageModel";

type EditorAssetRailHydrationModel = Pick<
  EditorAssetRailPageModel,
  "isSavedEditsFilter" | "mediaAssetsQuery" | "savedEditsQuery"
> & {
  isHydrationEnabled: boolean;
};

function useEditorAssetRailHydration({
  isHydrationEnabled,
  isSavedEditsFilter,
  mediaAssetsQuery,
  savedEditsQuery,
}: EditorAssetRailHydrationModel) {
  const { hydrateMediaAssets } = useEditorShallow((editor) => ({
    hydrateMediaAssets: editor.hydrateMediaAssets,
  }));
  const { hydrateLibrary } = useSavedEditsShallow((savedEdits) => ({
    hydrateLibrary: savedEdits.hydrateLibrary,
  }));

  useEffect(() => {
    if (!isHydrationEnabled || !isSavedEditsFilter) {
      return;
    }

    void hydrateLibrary(savedEditsQuery);
  }, [hydrateLibrary, isHydrationEnabled, isSavedEditsFilter, savedEditsQuery]);

  useEffect(() => {
    if (!isHydrationEnabled || !mediaAssetsQuery || isSavedEditsFilter) {
      return;
    }

    void hydrateMediaAssets(mediaAssetsQuery);
  }, [
    hydrateMediaAssets,
    isHydrationEnabled,
    isSavedEditsFilter,
    mediaAssetsQuery,
  ]);
}

export { useEditorAssetRailHydration };

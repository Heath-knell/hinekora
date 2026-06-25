import { resolveCapturePreviewSourceId } from "~/renderer/modules/capture-preview/CapturePreview.utils/CapturePreview.utils";
import { trackEvent } from "~/renderer/modules/umami";
import type {
  BoundStoreStateCreator,
  CapturePreviewSlice,
} from "~/renderer/store/store.types";

const MAX_CAPTURE_PREVIEW_THUMBNAILS = 16;

function pruneCapturePreviewThumbnails(
  thumbnailsBySourceId: Record<string, string | null | undefined>,
  sourceIds?: Set<string>,
): void {
  if (sourceIds) {
    for (const sourceId of Object.keys(thumbnailsBySourceId)) {
      if (!sourceIds.has(sourceId)) {
        delete thumbnailsBySourceId[sourceId];
      }
    }
  }

  const thumbnailSourceIds = Object.keys(thumbnailsBySourceId);
  const excessCount =
    thumbnailSourceIds.length - MAX_CAPTURE_PREVIEW_THUMBNAILS;
  if (excessCount <= 0) {
    return;
  }

  for (const sourceId of thumbnailSourceIds.slice(0, excessCount)) {
    delete thumbnailsBySourceId[sourceId];
  }
}

export const createCapturePreviewSlice: BoundStoreStateCreator<
  CapturePreviewSlice
> = (set, get) => ({
  capturePreview: {
    sources: [],
    thumbnailsBySourceId: {},
    selectedSourceId: null,
    isLoading: false,
    error: null,
    hydrate: async () => {
      await get().capturePreview.refresh();
    },
    refresh: async (options = {}) => {
      set((state) => {
        state.capturePreview.isLoading = true;
        state.capturePreview.error = null;
      });

      try {
        const sources = await window.electron.capturePreview.listSources(
          options.force === true,
        );
        const profiles = get().profiles;
        const selectedProfile =
          profiles.items.find(
            (profile) => profile.id === profiles.selectedProfileId,
          ) ?? null;
        const selectedSourceId = resolveCapturePreviewSourceId(
          selectedProfile?.captureTarget ?? null,
          sources,
          get().capturePreview.selectedSourceId,
        );

        set((state) => {
          state.capturePreview.sources = sources;
          state.capturePreview.selectedSourceId = selectedSourceId;
          if (options.force === true) {
            state.capturePreview.thumbnailsBySourceId = {};
          } else {
            pruneCapturePreviewThumbnails(
              state.capturePreview.thumbnailsBySourceId,
              new Set(sources.map((source) => source.id)),
            );
          }
          state.capturePreview.isLoading = false;
          state.capturePreview.error = null;
        });
        if (options.force === true) {
          trackEvent("capture-sources-refreshed", {
            count: sources.length,
          });
        }
      } catch (error) {
        set((state) => {
          state.capturePreview.isLoading = false;
          state.capturePreview.error =
            error instanceof Error
              ? error.message
              : "Unable to list capture sources";
        });
      }
    },
    getThumbnail: async (sourceId) => {
      const cached = get().capturePreview.thumbnailsBySourceId[sourceId];
      if (cached !== undefined) {
        return cached;
      }

      const thumbnailDataUrl =
        await window.electron.capturePreview.getSourceThumbnail(sourceId);
      set((state) => {
        state.capturePreview.thumbnailsBySourceId[sourceId] = thumbnailDataUrl;
        pruneCapturePreviewThumbnails(
          state.capturePreview.thumbnailsBySourceId,
        );
      });

      return thumbnailDataUrl;
    },
    select: (id: string) => {
      set((state) => {
        state.capturePreview.selectedSourceId = id;
      });
      trackEvent("capture-source-selected");
    },
  },
});

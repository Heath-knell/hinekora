import {
  createCapturePreviewSourcesWithGameFallback,
  resolveCapturePreviewSourceId,
} from "~/renderer/modules/capture-preview/CapturePreview.utils/CapturePreview.utils";
import { resolveActiveGameCaptureProfile } from "~/renderer/modules/capture-profiles/CaptureProfiles.utils/CaptureProfiles.utils";
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
> = (set, get) => {
  let recoveryRequest: Promise<void> | null = null;
  const thumbnailRequests = new Map<string, Promise<string | null>>();
  const thumbnailRequestVersions = new Map<string, number>();
  const invalidateThumbnailRequests = (sourceIds: Iterable<string>) => {
    for (const sourceId of sourceIds) {
      thumbnailRequestVersions.set(
        sourceId,
        (thumbnailRequestVersions.get(sourceId) ?? 0) + 1,
      );
      thumbnailRequests.delete(sourceId);
    }
  };
  const recoverSources = (): Promise<void> => {
    if (recoveryRequest) {
      return recoveryRequest;
    }

    const request = get().capturePreview.refresh({ force: true });
    recoveryRequest = request;
    const releaseRequest = () => {
      if (recoveryRequest === request) {
        recoveryRequest = null;
      }
    };
    void request.then(releaseRequest, releaseRequest);

    return request;
  };

  return {
    capturePreview: {
      sources: [],
      thumbnailsBySourceId: {},
      selectedSourceId: null,
      isLoading: false,
      error: null,
      hydrate: async () => {
        await get().capturePreview.refresh();
      },
      recoverSources,
      startListening: (options = {}) => {
        const unsubscribe = window.electron.capturePreview.onRefreshRequested(
          () => {
            void recoverSources();
          },
        );
        if (options.refreshOnStart === true) {
          void recoverSources();
        }

        return () => {
          unsubscribe();
        };
      },
      refresh: async (options = {}) => {
        set((state) => {
          state.capturePreview.isLoading = true;
          state.capturePreview.error = null;
        });

        try {
          const liveSources = await window.electron.capturePreview.listSources(
            options.force === true,
          );
          const profiles = get().captureProfiles;
          const activeGame = get().settings.value?.activeGame ?? "poe1";
          const sources =
            createCapturePreviewSourcesWithGameFallback(liveSources);
          const selectedProfile = resolveActiveGameCaptureProfile(
            profiles.items,
            profiles.selectedProfileId,
            activeGame,
          );
          const selectedSourceId = resolveCapturePreviewSourceId(
            selectedProfile?.captureTarget ?? null,
            sources,
            get().capturePreview.selectedSourceId,
            activeGame,
          );
          const sourceIds = new Set(sources.map((source) => source.id));
          invalidateThumbnailRequests(
            options.force === true
              ? thumbnailRequests.keys()
              : [...thumbnailRequests.keys()].filter(
                  (sourceId) => !sourceIds.has(sourceId),
                ),
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

        const pendingRequest = thumbnailRequests.get(sourceId);
        if (pendingRequest) {
          return pendingRequest;
        }

        const requestVersion =
          (thumbnailRequestVersions.get(sourceId) ?? 0) + 1;
        thumbnailRequestVersions.set(sourceId, requestVersion);
        const request = window.electron.capturePreview
          .getSourceThumbnail(sourceId)
          .then((thumbnailDataUrl) => {
            if (thumbnailRequestVersions.get(sourceId) === requestVersion) {
              set((state) => {
                state.capturePreview.thumbnailsBySourceId[sourceId] =
                  thumbnailDataUrl;
                pruneCapturePreviewThumbnails(
                  state.capturePreview.thumbnailsBySourceId,
                );
              });
            }

            return thumbnailDataUrl;
          })
          .finally(() => {
            if (thumbnailRequests.get(sourceId) === request) {
              thumbnailRequests.delete(sourceId);
              thumbnailRequestVersions.delete(sourceId);
            } else if (!thumbnailRequests.has(sourceId)) {
              thumbnailRequestVersions.delete(sourceId);
            }
          });
        thumbnailRequests.set(sourceId, request);

        return request;
      },
      select: (id: string) => {
        set((state) => {
          state.capturePreview.selectedSourceId = id;
        });
      },
    },
  };
};

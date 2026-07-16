import clsx from "clsx";
import { useMemo } from "react";
import { FiTrash2 as Trash2 } from "react-icons/fi";

import type { ReplayClipLibraryQuery } from "~/main/modules/replay-clips";
import { PageContainer } from "~/renderer/components/PageContainer/PageContainer";
import { PageContent } from "~/renderer/components/PageContent/PageContent";
import { PageHeader } from "~/renderer/components/PageHeader/PageHeader";
import { MediaLibraryLeagueControl } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryLeagueControl/MediaLibraryLeagueControl";
import { MediaLibraryPageActions } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryPageActions/MediaLibraryPageActions";
import { useMediaLibraryScope } from "~/renderer/modules/media-library/MediaLibrary.hooks/useMediaLibraryScope/useMediaLibraryScope";
import { ALL_LEAGUES_VALUE } from "~/renderer/modules/media-library/MediaLibrary.utils/MediaLibrary.utils";
import { ReplayClipsPanel } from "~/renderer/modules/replay-clips/ReplayClips.components/ReplayClipsPanel/ReplayClipsPanel";
import { useReplayClipsShallow, useSettingsShallow } from "~/renderer/store";

import type { ReplayClipKind } from "~/types";

function ClipsLibraryPage() {
  const { clipError, clipKind, updatePreference } = useSettingsShallow(
    (settings) => ({
      clipError: settings.preferenceErrors.clipsLibraryView ?? null,
      clipKind: settings.value?.clipsLibraryView ?? "death",
      updatePreference: settings.updatePreference,
    }),
  );
  const {
    clearSelectedClips,
    deleteSelectedClips,
    libraryLeagues,
    selectedClipCount,
  } = useReplayClipsShallow((replayClips) => ({
    clearSelectedClips: replayClips.clearSelectedClips,
    deleteSelectedClips: replayClips.deleteSelectedClips,
    libraryLeagues: replayClips.libraryLeagues,
    selectedClipCount: Object.values(replayClips.selectedClipIds).filter(
      Boolean,
    ).length,
  }));
  const { isReady: isMediaScopeReady, scope } = useMediaLibraryScope();
  const libraryQuery = useMemo<ReplayClipLibraryQuery>(() => {
    const query: ReplayClipLibraryQuery = {
      game: scope.game,
      kind: clipKind,
    };
    if (scope.league !== ALL_LEAGUES_VALUE) {
      query.league = scope.league;
    }

    return query;
  }, [clipKind, scope.game, scope.league]);
  const showLeagueColumn = scope.league === ALL_LEAGUES_VALUE;
  const tableQueryKey = `${scope.game}:${scope.league}:${clipKind}`;

  const handleDeleteSelected = () => {
    void deleteSelectedClips();
  };

  const selectClipKind = (nextClipKind: ReplayClipKind) => {
    clearSelectedClips();
    void updatePreference("clipsLibraryView", nextClipKind);
  };

  const handleDeathClipsTab = () => {
    selectClipKind("death");
  };

  const handleManualReplaysTab = () => {
    selectClipKind("manual");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Clips"
        subtitle="Death clips and manual replay saves filtered by this page."
        actions={
          <MediaLibraryPageActions
            leadingAction={
              <div className="flex min-w-0 items-center gap-2">
                <div
                  aria-label="Clip type"
                  className="tabs tabs-box tabs-xs no-drag shrink-0 bg-base-200 p-1"
                  role="tablist"
                >
                  <button
                    aria-selected={clipKind === "death"}
                    className={clsx(
                      "tab px-3 font-semibold",
                      clipKind === "death" && "tab-active text-primary",
                    )}
                    role="tab"
                    type="button"
                    onClick={handleDeathClipsTab}
                  >
                    Death Clips
                  </button>
                  <button
                    aria-selected={clipKind === "manual"}
                    className={clsx(
                      "tab px-3 font-semibold",
                      clipKind === "manual" && "tab-active text-primary",
                    )}
                    role="tab"
                    type="button"
                    onClick={handleManualReplaysTab}
                  >
                    Manual Replays
                  </button>
                </div>
                {clipError && (
                  <span
                    className="max-w-64 truncate text-error text-xs"
                    title={clipError}
                  >
                    {clipError}
                  </span>
                )}
              </div>
            }
            bulkAction={
              selectedClipCount > 0 ? (
                <button
                  className="btn btn-error btn-sm no-drag"
                  type="button"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 size={14} />
                  Delete selected ({selectedClipCount})
                </button>
              ) : null
            }
            leagueControl={
              <MediaLibraryLeagueControl savedLeagues={libraryLeagues} />
            }
          />
        }
      />
      <PageContent className="grid h-full min-h-0 grid-cols-12 items-stretch gap-4 [grid-auto-flow:dense]">
        <ReplayClipsPanel
          isQueryEnabled={isMediaScopeReady}
          query={libraryQuery}
          queryKey={tableQueryKey}
          showLeagueColumn={showLeagueColumn}
        />
      </PageContent>
    </PageContainer>
  );
}

export { ClipsLibraryPage };

import { PageContainer } from "~/renderer/components/PageContainer/PageContainer";
import { PageContent } from "~/renderer/components/PageContent/PageContent";
import { PageHeader } from "~/renderer/components/PageHeader/PageHeader";
import { BookmarkRenameDialog } from "~/renderer/modules/bookmarks/Bookmarks.components/BookmarkRenameDialog/BookmarkRenameDialog";
import { BookmarksTable } from "~/renderer/modules/bookmarks/Bookmarks.components/BookmarksTable/BookmarksTable";
import { MediaLibraryLeagueControl } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryLeagueControl/MediaLibraryLeagueControl";
import { MediaLibraryPageActions } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryPageActions/MediaLibraryPageActions";
import { useMediaLibraryScope } from "~/renderer/modules/media-library/MediaLibrary.hooks/useMediaLibraryScope/useMediaLibraryScope";
import { useBookmarksShallow } from "~/renderer/store";

function BookmarksPage() {
  const { isReady: isMediaScopeReady, scope } = useMediaLibraryScope();
  const { availableLeagues, refresh } = useBookmarksShallow((bookmarks) => ({
    availableLeagues: bookmarks.availableLeagues,
    refresh: bookmarks.refresh,
  }));

  const handleRefresh = () => {
    void refresh();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Bookmarks"
        subtitle="Gameplay markers for locations, deaths, manual bookmarks, and manual replays."
        actions={
          <MediaLibraryPageActions
            leagueControl={
              <MediaLibraryLeagueControl savedLeagues={availableLeagues} />
            }
            onRefresh={handleRefresh}
          />
        }
      />
      <PageContent className="grid h-full min-h-0 grid-cols-12 items-stretch gap-4 [grid-auto-flow:dense]">
        <BookmarksTable isScopeReady={isMediaScopeReady} scope={scope} />
      </PageContent>
      <BookmarkRenameDialog />
    </PageContainer>
  );
}

export { BookmarksPage };

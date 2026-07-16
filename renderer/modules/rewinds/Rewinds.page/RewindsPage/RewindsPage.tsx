import { PageContainer } from "~/renderer/components/PageContainer/PageContainer";
import { PageContent } from "~/renderer/components/PageContent/PageContent";
import { PageHeader } from "~/renderer/components/PageHeader/PageHeader";
import { MediaLibraryLeagueControl } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryLeagueControl/MediaLibraryLeagueControl";
import { MediaLibraryPageActions } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryPageActions/MediaLibraryPageActions";
import { useMediaLibraryScope } from "~/renderer/modules/media-library/MediaLibrary.hooks/useMediaLibraryScope/useMediaLibraryScope";
import { useRewindsShallow } from "~/renderer/store";

import { RewindsPanel } from "../../Rewinds.components/RewindsPanel/RewindsPanel";

function RewindsPage() {
  const { isReady: isMediaScopeReady, scope } = useMediaLibraryScope();
  const availableLeagues = useRewindsShallow(
    (rewinds) => rewinds.availableLeagues,
  );

  return (
    <PageContainer>
      <PageHeader
        title="Rewinds"
        subtitle="Tracked rewind activity sessions with bookmarks and linked replay clips."
        actions={
          <MediaLibraryPageActions
            leagueControl={
              <MediaLibraryLeagueControl savedLeagues={availableLeagues} />
            }
          />
        }
      />
      <PageContent className="grid h-full min-h-0 grid-cols-12 items-stretch gap-4 [grid-auto-flow:dense]">
        <RewindsPanel isScopeReady={isMediaScopeReady} scope={scope} />
      </PageContent>
    </PageContainer>
  );
}

export { RewindsPage };

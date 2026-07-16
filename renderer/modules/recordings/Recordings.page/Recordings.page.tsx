import { FiTrash2 as Trash2 } from "react-icons/fi";

import { PageContainer } from "~/renderer/components/PageContainer/PageContainer";
import { PageContent } from "~/renderer/components/PageContent/PageContent";
import { PageHeader } from "~/renderer/components/PageHeader/PageHeader";
import { MediaLibraryLeagueControl } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryLeagueControl/MediaLibraryLeagueControl";
import { MediaLibraryPageActions } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryPageActions/MediaLibraryPageActions";
import { useMediaLibraryScope } from "~/renderer/modules/media-library/MediaLibrary.hooks/useMediaLibraryScope/useMediaLibraryScope";
import { RecordingsPanel } from "~/renderer/modules/recording-storage/RecordingStorage.components/RecordingsPanel/RecordingsPanel";
import { useRecordingStorageShallow } from "~/renderer/store";

function RecordingsPage() {
  const { deleteSelectedRecordings, recordingLeagues, selectedRecordingCount } =
    useRecordingStorageShallow((recordingStorage) => ({
      deleteSelectedRecordings: recordingStorage.deleteSelectedRecordings,
      recordingLeagues: recordingStorage.recordingLeagues,
      selectedRecordingCount: Object.values(
        recordingStorage.selectedRecordingIds,
      ).filter(Boolean).length,
    }));
  const { isReady: isMediaScopeReady, scope } = useMediaLibraryScope();

  const handleDeleteSelected = () => {
    void deleteSelectedRecordings();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Recordings"
        subtitle="Full-run recordings filtered by this page."
        actions={
          <MediaLibraryPageActions
            bulkAction={
              selectedRecordingCount > 0 ? (
                <button
                  className="btn btn-error btn-sm no-drag"
                  type="button"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 size={14} />
                  Delete selected ({selectedRecordingCount})
                </button>
              ) : null
            }
            leagueControl={
              <MediaLibraryLeagueControl savedLeagues={recordingLeagues} />
            }
          />
        }
      />
      <PageContent className="grid h-full min-h-0 grid-cols-12 items-stretch gap-4 [grid-auto-flow:dense]">
        <RecordingsPanel isScopeReady={isMediaScopeReady} scope={scope} />
      </PageContent>
    </PageContainer>
  );
}

export { RecordingsPage };

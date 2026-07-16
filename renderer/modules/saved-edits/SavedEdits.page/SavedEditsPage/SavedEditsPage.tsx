import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";

import { PageContainer } from "~/renderer/components/PageContainer/PageContainer";
import { PageContent } from "~/renderer/components/PageContent/PageContent";
import { PageHeader } from "~/renderer/components/PageHeader/PageHeader";
import { EditorDeleteConfirmationModal } from "~/renderer/modules/editor/Editor.components/EditorDeleteConfirmationModal/EditorDeleteConfirmationModal";
import { MediaLibraryLeagueControl } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryLeagueControl/MediaLibraryLeagueControl";
import { MediaLibraryPageActions } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryPageActions/MediaLibraryPageActions";
import { useMediaLibraryScope } from "~/renderer/modules/media-library/MediaLibrary.hooks/useMediaLibraryScope/useMediaLibraryScope";
import { SavedEditsPanel } from "~/renderer/modules/saved-edits/SavedEdits.components/SavedEditsPanel/SavedEditsPanel";
import { useSavedEditsShallow } from "~/renderer/store";

function SavedEditsPage() {
  const [isDeleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const { isReady: isMediaScopeReady, scope } = useMediaLibraryScope();
  const { deleteAllEdits, libraryPage } = useSavedEditsShallow(
    (savedEdits) => ({
      deleteAllEdits: savedEdits.deleteAllEdits,
      libraryPage: savedEdits.libraryPage,
    }),
  );
  const hasSavedEdits = (libraryPage?.globalTotalCount ?? 0) > 0;

  const handleOpenDeleteAllConfirm = () => {
    if (!hasSavedEdits) {
      return;
    }

    setDeleteAllConfirmOpen(true);
  };

  const handleCloseDeleteAllConfirm = () => {
    setDeleteAllConfirmOpen(false);
  };

  const handleConfirmDeleteAll = () => {
    void deleteAllEdits();
    setDeleteAllConfirmOpen(false);
  };

  const pageActions = (
    <MediaLibraryPageActions
      bulkAction={
        hasSavedEdits && (
          <>
            <button
              className="btn btn-error btn-sm"
              type="button"
              onClick={handleOpenDeleteAllConfirm}
            >
              <FiTrash2 size={15} />
              Delete all edits
            </button>
            <EditorDeleteConfirmationModal
              confirmLabel="Delete all edits"
              description="This will remove every saved editor edit. Source recordings and clips will not be deleted."
              isOpen={isDeleteAllConfirmOpen}
              title="Delete all edits?"
              onClose={handleCloseDeleteAllConfirm}
              onConfirm={handleConfirmDeleteAll}
            />
          </>
        )
      }
      leagueControl={
        <MediaLibraryLeagueControl
          savedLeagues={libraryPage?.availableLeagues ?? []}
        />
      }
    />
  );

  return (
    <PageContainer className="gap-4">
      <PageHeader
        actions={pageActions}
        subtitle="Saved editor timelines. Open an edit to continue working from its latest saved state."
        title="Saved Edits"
      />
      <PageContent className="grid min-h-0 grid-cols-12">
        <SavedEditsPanel isScopeReady={isMediaScopeReady} scope={scope} />
      </PageContent>
    </PageContainer>
  );
}

export { SavedEditsPage };

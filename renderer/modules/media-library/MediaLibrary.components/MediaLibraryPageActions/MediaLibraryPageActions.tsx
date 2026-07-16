import type { ReactNode } from "react";
import { FiRefreshCw as RefreshCw } from "react-icons/fi";

interface MediaLibraryPageActionsProps {
  bulkAction?: ReactNode;
  leadingAction?: ReactNode;
  leagueControl: ReactNode;
  onRefresh?: () => void;
}

function MediaLibraryPageActions({
  bulkAction,
  leadingAction,
  leagueControl,
  onRefresh,
}: MediaLibraryPageActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {leadingAction}

      {leagueControl}

      {bulkAction}

      {onRefresh && (
        <button
          className="btn btn-primary btn-sm no-drag"
          type="button"
          onClick={onRefresh}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      )}
    </div>
  );
}

export { MediaLibraryPageActions };

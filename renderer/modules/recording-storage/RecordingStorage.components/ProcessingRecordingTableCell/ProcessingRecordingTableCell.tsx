import { formatDurationSeconds } from "~/renderer/modules/media-library/MediaLibrary.utils/MediaLibrary.utils";

import type {
  RecordingTableColumnId,
  RecordingTableRow,
} from "../RecordingsPanel/RecordingsPanel.utils";
import { RecordingTableActions } from "../RecordingTableActions/RecordingTableActions";

interface ProcessingRecordingTableCellProps {
  columnId: RecordingTableColumnId;
  recording: RecordingTableRow;
}

function ProcessingRecordingTableCell({
  columnId,
  recording,
}: ProcessingRecordingTableCellProps) {
  switch (columnId) {
    case "select":
      return (
        <input
          aria-label="Active recording cannot be selected yet"
          className="checkbox checkbox-sm"
          disabled
          type="checkbox"
        />
      );
    case "fileName":
      return (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate" title={recording.path}>
            {recording.fileName}
          </span>
        </div>
      );
    case "tableStatus":
      return <span className="badge badge-warning badge-xs">Processing</span>;
    case "createdAt":
    case "sizeBytes":
      return "--";
    case "sourceLeague":
      return recording.sourceLeague;
    case "durationSeconds":
      return formatDurationSeconds(recording.durationSeconds);
    case "actions":
      return <RecordingTableActions disabled recording={recording} />;
  }
}

export { ProcessingRecordingTableCell };

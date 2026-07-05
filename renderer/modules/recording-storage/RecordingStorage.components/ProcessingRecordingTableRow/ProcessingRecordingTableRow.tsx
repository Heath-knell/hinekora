import { ProcessingRecordingTableCell } from "../ProcessingRecordingTableCell/ProcessingRecordingTableCell";
import {
  getCellClassName,
  getRecordingRowClassName,
  type RecordingTableRow,
  resolveRecordingTableColumnIds,
} from "../RecordingsPanel/RecordingsPanel.utils";

interface ProcessingRecordingTableRowProps {
  recording: RecordingTableRow;
  showLeagueColumn: boolean;
}

function ProcessingRecordingTableRow({
  recording,
  showLeagueColumn,
}: ProcessingRecordingTableRowProps) {
  return (
    <tr
      aria-disabled="true"
      className={getRecordingRowClassName(recording)}
      data-testid="processing-recording-row"
    >
      {resolveRecordingTableColumnIds(showLeagueColumn).map((columnId) => (
        <td className={getCellClassName(columnId)} key={columnId}>
          <ProcessingRecordingTableCell
            columnId={columnId}
            recording={recording}
          />
        </td>
      ))}
    </tr>
  );
}

export { ProcessingRecordingTableRow };

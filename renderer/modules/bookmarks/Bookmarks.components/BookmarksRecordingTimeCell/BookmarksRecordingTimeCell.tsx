import type { BookmarkLibraryItem } from "~/main/modules/bookmarks";
import { formatDurationSeconds } from "~/renderer/modules/media-library/MediaLibrary.utils/MediaLibrary.utils";

import { resolveBookmarkLibraryTarget } from "../BookmarksTable/BookmarksTable.utils";
import { calculateBookmarkRecordingProgressPercent } from "./BookmarksRecordingTimeCell.utils";

interface BookmarksRecordingTimeCellProps {
  bookmark: BookmarkLibraryItem;
}

function BookmarksRecordingTimeCell({
  bookmark,
}: BookmarksRecordingTimeCellProps) {
  const target = resolveBookmarkLibraryTarget(bookmark);

  if (target?.kind === "recording") {
    const progressPercent = calculateBookmarkRecordingProgressPercent({
      durationSeconds: target.durationSeconds,
      offsetSeconds: target.offsetSeconds,
    });

    return (
      <div className="min-w-0">
        <div>{formatDurationSeconds(target.offsetSeconds)}</div>
        {progressPercent !== null && (
          <div className="text-base-content/50 text-xs">
            {progressPercent}% into recording
          </div>
        )}
      </div>
    );
  }

  if (target?.kind === "rewind") {
    const progressPercent = calculateBookmarkRecordingProgressPercent({
      durationSeconds: target.durationSeconds,
      offsetSeconds: target.offsetSeconds,
    });

    return (
      <div className="min-w-0">
        <div>{formatDurationSeconds(target.offsetSeconds)}</div>
        <div className="text-base-content/50 text-xs">
          {progressPercent !== null
            ? `${progressPercent}% into rewind`
            : "into rewind"}
        </div>
      </div>
    );
  }

  if (target?.kind === "archived-recording") {
    return <span className="badge badge-outline badge-xs">Archived</span>;
  }

  return <span className="text-base-content/45">--</span>;
}

export { BookmarksRecordingTimeCell };

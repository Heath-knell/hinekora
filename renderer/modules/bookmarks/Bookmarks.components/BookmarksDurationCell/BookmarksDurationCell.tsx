import clsx from "clsx";

import type { BookmarkLibraryItem } from "~/main/modules/bookmarks";
import { formatDurationSeconds } from "~/renderer/modules/media-library/MediaLibrary.utils/MediaLibrary.utils";

import { resolveBookmarkLibraryTarget } from "../BookmarksTable/BookmarksTable.utils";

interface BookmarksDurationCellProps {
  bookmark: BookmarkLibraryItem;
}

function BookmarksDurationCell({ bookmark }: BookmarksDurationCellProps) {
  const durationSeconds =
    resolveBookmarkLibraryTarget(bookmark)?.bookmarkDurationSeconds ?? null;

  return (
    <span className={clsx(durationSeconds === null && "text-base-content/45")}>
      {formatDurationSeconds(durationSeconds)}
    </span>
  );
}

export { BookmarksDurationCell };

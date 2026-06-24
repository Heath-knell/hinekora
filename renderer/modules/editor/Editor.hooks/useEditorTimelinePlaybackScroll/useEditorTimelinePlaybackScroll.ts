import { type RefObject, useEffect } from "react";

import { resolveEditorTimelineFollowScroll } from "../../Editor.components/EditorTimeline/EditorTimeline.utils";

interface UseEditorTimelinePlaybackScrollInput {
  isPreviewPlaying: boolean;
  paddingPixels: number;
  playbackSeconds: number;
  railPaddingPixels: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  timelineGridRef: RefObject<HTMLDivElement | null>;
  visibleDurationSeconds: number;
}

function useEditorTimelinePlaybackScroll({
  isPreviewPlaying,
  paddingPixels,
  playbackSeconds,
  railPaddingPixels,
  scrollContainerRef,
  timelineGridRef,
  visibleDurationSeconds,
}: UseEditorTimelinePlaybackScrollInput) {
  useEffect(() => {
    if (!isPreviewPlaying) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const timelineGrid = timelineGridRef.current;
    if (!scrollContainer || !timelineGrid) {
      return;
    }

    const nextScrollLeft = resolveEditorTimelineFollowScroll({
      paddingPixels,
      playbackSeconds,
      railPaddingPixels,
      scrollClientWidth: scrollContainer.clientWidth,
      scrollLeft: scrollContainer.scrollLeft,
      scrollWidth: scrollContainer.scrollWidth,
      timelineGridWidth: timelineGrid.getBoundingClientRect().width,
      visibleDurationSeconds,
    });

    if (nextScrollLeft !== null) {
      scrollContainer.scrollLeft = nextScrollLeft;
    }
  }, [
    isPreviewPlaying,
    paddingPixels,
    playbackSeconds,
    railPaddingPixels,
    scrollContainerRef,
    timelineGridRef,
    visibleDurationSeconds,
  ]);
}

export { useEditorTimelinePlaybackScroll };

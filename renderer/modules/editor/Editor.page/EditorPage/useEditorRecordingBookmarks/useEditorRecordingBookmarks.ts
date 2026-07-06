import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  RecordingBookmark,
  RecordingBookmarksPage,
} from "~/main/modules/bookmarks";
import type { EditorProject } from "~/main/modules/editor";
import {
  allRecordingBookmarkCategoriesValue,
  type RecordingBookmarkCategoryFilter,
  type RecordingBookmarkCategoryToggleState,
  recordingBookmarksPanelPageSize,
  resolveRecordingBookmarkCategories,
  resolveRecordingBookmarkCategoryToggle,
} from "~/renderer/modules/bookmarks/Bookmarks.components/RecordingBookmarksPanel/RecordingBookmarksPanel.utils";

import {
  isEditorBookmarkInTimelineRange,
  resolveEditorBookmarkTimelineHighlightItem,
  resolveEditorBookmarkTimelineItem,
  resolveEditorBookmarkTimelineItems,
  resolveEditorBookmarkTimelineSeconds,
  resolveEditorRecordingBookmarkSource,
} from "./useEditorRecordingBookmarks.utils";

interface UseEditorRecordingBookmarksInput {
  project: EditorProject | null;
  selectedClipId: string | null;
}

interface EditorRecordingBookmarksState {
  error: string | null;
  isLoading: boolean;
  page: RecordingBookmarksPage | null;
  sourceId: string | null;
}

const initialBookmarksState: EditorRecordingBookmarksState = {
  error: null,
  isLoading: false,
  page: null,
  sourceId: null,
};
const initialBookmarkCategoryState: RecordingBookmarkCategoryToggleState = {
  categoryFilter: allRecordingBookmarkCategoriesValue,
  hasInteracted: false,
};

function compareBookmarksByLatest(
  firstBookmark: RecordingBookmark,
  secondBookmark: RecordingBookmark,
): number {
  const firstOccurredAt = Date.parse(firstBookmark.occurredAt);
  const secondOccurredAt = Date.parse(secondBookmark.occurredAt);
  if (Number.isFinite(firstOccurredAt) && Number.isFinite(secondOccurredAt)) {
    const occurredAtDiff = secondOccurredAt - firstOccurredAt;
    if (occurredAtDiff !== 0) {
      return occurredAtDiff;
    }
  }

  const firstOffsetSeconds = firstBookmark.offsetSeconds ?? 0;
  const secondOffsetSeconds = secondBookmark.offsetSeconds ?? 0;

  return secondOffsetSeconds - firstOffsetSeconds;
}

function useEditorRecordingBookmarks({
  project,
  selectedClipId,
}: UseEditorRecordingBookmarksInput) {
  const requestIdRef = useRef(0);
  const [bookmarkCategoryState, setBookmarkCategoryState] =
    useState<RecordingBookmarkCategoryToggleState>(
      initialBookmarkCategoryState,
    );
  const [hoveredBookmarkId, setHoveredBookmarkId] = useState<string | null>(
    null,
  );
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(
    null,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [state, setState] = useState<EditorRecordingBookmarksState>(
    initialBookmarksState,
  );
  const source = useMemo(
    () => resolveEditorRecordingBookmarkSource({ project, selectedClipId }),
    [project, selectedClipId],
  );
  const { categoryFilter, hasInteracted } = bookmarkCategoryState;
  const sourceId = source?.id ?? null;
  const sourceAssetKey = source?.assetKey ?? null;
  const sourceClipId = source?.clipId ?? null;
  const isCurrentSourceState = state.sourceId === sourceId;
  const currentPage = isCurrentSourceState ? state.page : null;

  useEffect(() => {
    if (!sourceId) {
      setBookmarkCategoryState(initialBookmarkCategoryState);
      setHoveredBookmarkId(null);
      setSelectedBookmarkId(null);
      setPageIndex(0);
      setState(initialBookmarksState);
      return;
    }

    setBookmarkCategoryState(initialBookmarkCategoryState);
    setHoveredBookmarkId(null);
    setSelectedBookmarkId(null);
    setPageIndex(0);
    setState(initialBookmarksState);
  }, [sourceId]);

  useEffect(() => {
    if (!sourceId) {
      requestIdRef.current += 1;
      setState(initialBookmarksState);
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const query = {
      includeTimeline: true,
      pageIndex: 0,
      pageSize: recordingBookmarksPanelPageSize,
    };

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      page: current.sourceId === sourceId ? current.page : null,
      sourceId,
    }));

    void window.electron.bookmarks
      .listRecording(sourceId, query)
      .then((page) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setState({
          error: null,
          isLoading: false,
          page,
          sourceId,
        });
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setState({
          error:
            error instanceof Error
              ? error.message
              : "Recording bookmarks failed",
          isLoading: false,
          page: null,
          sourceId,
        });
      });
  }, [sourceId]);

  const rawTimelineBookmarks = currentPage?.timelineItems ?? [];
  const rawPageBookmarks = currentPage?.items ?? [];
  const clipBookmarks = useMemo(
    () =>
      rawTimelineBookmarks.filter((bookmark) =>
        isEditorBookmarkInTimelineRange({
          bookmark,
          project,
          recordingAssetKey: sourceAssetKey,
          recordingClipId: sourceClipId,
        }),
      ),
    [project, rawTimelineBookmarks, sourceAssetKey, sourceClipId],
  );
  const timelineBookmarks = useMemo(
    () =>
      resolveEditorBookmarkTimelineItems({
        bookmarks: rawTimelineBookmarks,
        project,
        recordingAssetKey: sourceAssetKey,
        recordingClipId: sourceClipId,
      }),
    [project, rawTimelineBookmarks, sourceAssetKey, sourceClipId],
  );
  const clipCategorySet = useMemo(
    () => new Set(resolveRecordingBookmarkCategories(clipBookmarks)),
    [clipBookmarks],
  );
  const categories = useMemo(
    () =>
      currentPage?.availableCategories.length
        ? currentPage.availableCategories.filter((category) =>
            clipCategorySet.has(category),
          )
        : Array.from(clipCategorySet),
    [clipCategorySet, currentPage?.availableCategories],
  );
  const categoryBookmarks = useMemo(
    () =>
      (categoryFilter === allRecordingBookmarkCategoriesValue
        ? clipBookmarks
        : clipBookmarks.filter(
            (bookmark) => bookmark.category === categoryFilter,
          )
      )
        .slice()
        .sort(compareBookmarksByLatest),
    [categoryFilter, clipBookmarks],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(categoryBookmarks.length / recordingBookmarksPanelPageSize),
  );
  const activePageIndex = Math.min(pageIndex, pageCount - 1);
  const latestBookmarks = useMemo(() => {
    const startIndex = activePageIndex * recordingBookmarksPanelPageSize;

    return categoryBookmarks.slice(
      startIndex,
      startIndex + recordingBookmarksPanelPageSize,
    );
  }, [activePageIndex, categoryBookmarks]);
  const markerBookmarks = useMemo(
    () =>
      categoryFilter === allRecordingBookmarkCategoriesValue
        ? timelineBookmarks
        : timelineBookmarks.filter(
            (bookmark) => bookmark.category === categoryFilter,
          ),
    [categoryFilter, timelineBookmarks],
  );
  useEffect(() => {
    setPageIndex((currentPageIndex) =>
      Math.min(currentPageIndex, pageCount - 1),
    );
  }, [pageCount]);
  useEffect(() => {
    if (
      !hasInteracted ||
      categoryFilter === allRecordingBookmarkCategoriesValue
    ) {
      return;
    }

    if (!clipCategorySet.has(categoryFilter)) {
      setBookmarkCategoryState(initialBookmarkCategoryState);
      setPageIndex(0);
    }
  }, [categoryFilter, clipCategorySet, hasInteracted]);
  useEffect(() => {
    if (!isCurrentSourceState || state.isLoading) {
      return;
    }

    const clipBookmarkIds = new Set(
      clipBookmarks.map((bookmark) => bookmark.id),
    );
    if (hoveredBookmarkId && !clipBookmarkIds.has(hoveredBookmarkId)) {
      setHoveredBookmarkId(null);
    }
    if (selectedBookmarkId && !clipBookmarkIds.has(selectedBookmarkId)) {
      setSelectedBookmarkId(null);
    }
  }, [
    clipBookmarks,
    hoveredBookmarkId,
    isCurrentSourceState,
    selectedBookmarkId,
    state.isLoading,
  ]);
  const resolveRawBookmark = useCallback(
    (bookmarkId: string | null) =>
      bookmarkId
        ? (rawTimelineBookmarks.find(
            (bookmark) => bookmark.id === bookmarkId,
          ) ??
          rawPageBookmarks.find((bookmark) => bookmark.id === bookmarkId) ??
          null)
        : null,
    [rawPageBookmarks, rawTimelineBookmarks],
  );
  const hoveredBookmark = useMemo(() => {
    const rawBookmark = resolveRawBookmark(hoveredBookmarkId);

    return rawBookmark
      ? resolveEditorBookmarkTimelineItem({
          bookmark: rawBookmark,
          project,
          recordingAssetKey: sourceAssetKey,
          recordingClipId: sourceClipId,
        })
      : null;
  }, [
    hoveredBookmarkId,
    project,
    resolveRawBookmark,
    sourceAssetKey,
    sourceClipId,
  ]);
  const hoveredHighlightBookmark = useMemo(() => {
    const rawBookmark = resolveRawBookmark(hoveredBookmarkId);

    return rawBookmark
      ? resolveEditorBookmarkTimelineHighlightItem({
          bookmark: rawBookmark,
          project,
          recordingAssetKey: sourceAssetKey,
          recordingClipId: sourceClipId,
        })
      : null;
  }, [
    hoveredBookmarkId,
    project,
    resolveRawBookmark,
    sourceAssetKey,
    sourceClipId,
  ]);
  const selectedBookmark = useMemo(() => {
    const rawBookmark = resolveRawBookmark(selectedBookmarkId);

    return rawBookmark
      ? resolveEditorBookmarkTimelineItem({
          bookmark: rawBookmark,
          project,
          recordingAssetKey: sourceAssetKey,
          recordingClipId: sourceClipId,
        })
      : null;
  }, [
    project,
    resolveRawBookmark,
    selectedBookmarkId,
    sourceAssetKey,
    sourceClipId,
  ]);
  const selectedHighlightBookmark = useMemo(() => {
    const rawBookmark = resolveRawBookmark(selectedBookmarkId);

    return rawBookmark
      ? resolveEditorBookmarkTimelineHighlightItem({
          bookmark: rawBookmark,
          project,
          recordingAssetKey: sourceAssetKey,
          recordingClipId: sourceClipId,
        })
      : null;
  }, [
    project,
    resolveRawBookmark,
    selectedBookmarkId,
    sourceAssetKey,
    sourceClipId,
  ]);

  const selectCategory = useCallback(
    (category: RecordingBookmarkCategoryFilter) => {
      setBookmarkCategoryState((currentState) =>
        resolveRecordingBookmarkCategoryToggle(currentState, category),
      );
      setPageIndex(0);
    },
    [],
  );

  const nextPage = useCallback(() => {
    setPageIndex((currentPageIndex) =>
      Math.min(currentPageIndex + 1, pageCount - 1),
    );
  }, [pageCount]);

  const previousPage = useCallback(() => {
    setPageIndex((currentPageIndex) => Math.max(currentPageIndex - 1, 0));
  }, []);

  const resolveTimelineSeconds = useCallback(
    (bookmark: RecordingBookmark) => {
      const timelineSeconds = resolveEditorBookmarkTimelineSeconds({
        bookmark,
        project,
        recordingAssetKey: sourceAssetKey,
        recordingClipId: sourceClipId,
      });

      if (timelineSeconds !== null) {
        return timelineSeconds;
      }

      return (
        resolveEditorBookmarkTimelineHighlightItem({
          bookmark,
          project,
          recordingAssetKey: sourceAssetKey,
          recordingClipId: sourceClipId,
        })?.offsetSeconds ?? null
      );
    },
    [project, sourceAssetKey, sourceClipId],
  );

  return {
    categories,
    categoryFilter,
    error: isCurrentSourceState ? state.error : null,
    hasInteracted,
    highlightedBookmark: hoveredHighlightBookmark ?? selectedHighlightBookmark,
    hoveredBookmark,
    isLoading: Boolean(sourceId) && (!isCurrentSourceState || state.isLoading),
    latestBookmarks,
    markerBookmarks,
    pageCount,
    pageIndex: activePageIndex,
    previousPage,
    nextPage,
    recordingSource: source,
    pinnedBookmark: hoveredBookmark ?? selectedBookmark,
    resolveTimelineSeconds,
    selectCategory,
    selectedBookmarkId,
    setHoveredBookmarkId,
    setSelectedBookmarkId,
    showBookmarkMarkers: isCurrentSourceState && hasInteracted,
    timelineBookmarks,
    timelineItemsTruncated: currentPage?.timelineItemsTruncated ?? false,
    totalCount: categoryBookmarks.length,
  };
}

type EditorRecordingBookmarks = ReturnType<typeof useEditorRecordingBookmarks>;

export type { EditorRecordingBookmarks };
export { useEditorRecordingBookmarks };

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RecordingBookmark } from "~/main/modules/bookmarks";

import { RecordingBookmarkTimeline } from "./RecordingBookmarkTimeline";

vi.mock(
  "~/renderer/modules/media-playback/useMediaClipThumbnails/useMediaClipThumbnails",
  () => ({
    useMediaClipThumbnails: () => [],
  }),
);

function createBookmark(
  overrides: Partial<RecordingBookmark> = {},
): RecordingBookmark {
  return {
    category: "rewind-manual-replay",
    createdAt: "2026-07-03T10:00:00.000Z",
    durationSeconds: 10,
    id: "bookmark-1",
    label: "Manual replay",
    note: null,
    occurredAt: "2026-07-03T10:00:10.000Z",
    offsetSeconds: 50,
    sceneName: "Qimah Reservoir",
    source: "system",
    sourceGame: "poe2",
    sourceLeague: "Standard",
    subcategory: null,
    updatedAt: "2026-07-03T10:00:00.000Z",
    ...overrides,
  };
}

function createPointerLikeEvent(
  type: "pointerdown" | "pointermove",
  eventInit: MouseEventInit,
): PointerEvent {
  const event = new MouseEvent(type, eventInit) as PointerEvent;

  Object.defineProperty(event, "pointerId", { value: 1 });

  return event;
}

describe("RecordingBookmarkTimeline", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("seeks from pointer position and selects clip marker targets", () => {
    const bookmark = createBookmark();
    const onClipTargetSelect = vi.fn();
    const onSeek = vi.fn();

    act(() => {
      root.render(
        <RecordingBookmarkTimeline
          markers={{
            bookmarks: [bookmark],
            clipTargetsByBookmarkId: {
              [bookmark.id]: {
                durationSeconds: 12,
                targetDurationSeconds: 60,
                targetId: "clip-1",
              },
            },
            onClipTargetSelect,
          }}
          playback={{
            durationSeconds: 100,
            isPlaying: false,
            mediaUrl: "hinekora-media://recording/recording-1",
            playbackSeconds: 0,
            volume: 1,
            onJumpToStart: vi.fn(),
            onSeek,
            onSeekBackward: vi.fn(),
            onSeekForward: vi.fn(),
            onTogglePlayback: vi.fn(),
            onVolumeChange: vi.fn(),
          }}
        />,
      );
    });

    const timelineGrid = container.querySelector<HTMLElement>(
      "[data-recording-timeline-grid='true']",
    );
    expect(timelineGrid).not.toBeNull();
    if (!timelineGrid) {
      return;
    }

    vi.spyOn(timelineGrid, "getBoundingClientRect").mockReturnValue({
      bottom: 120,
      height: 120,
      left: 100,
      right: 300,
      toJSON: () => ({}),
      top: 0,
      width: 200,
      x: 100,
      y: 0,
    });

    act(() => {
      timelineGrid.dispatchEvent(
        createPointerLikeEvent("pointerdown", {
          bubbles: true,
          clientX: 200,
        }),
      );
    });
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek.mock.calls[0]?.[0]).toBeCloseTo(50, 1);

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          "button[aria-label='Preview Manual replay clip']",
        )
        ?.click();
    });

    expect(onClipTargetSelect).toHaveBeenCalledWith("clip-1");
  });
});

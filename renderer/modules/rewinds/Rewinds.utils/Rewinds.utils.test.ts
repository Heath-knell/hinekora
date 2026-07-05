import { describe, expect, it } from "vitest";

import type {
  ActivitySessionBookmark,
  ActivitySessionClip,
} from "~/main/modules/bookmarks/Bookmarks.dto";

import {
  resolveRewindBookmarkSeekSeconds,
  resolveRewindClipSegment,
} from "./Rewinds.utils";

const baseBookmark = {
  createdAt: "2026-07-03T10:00:00.000Z",
  note: null,
  sceneName: null,
  source: "client-log",
  sourceGame: "poe2",
  sourceLeague: "Standard",
  subcategory: null,
  updatedAt: "2026-07-03T10:00:00.000Z",
} satisfies Partial<ActivitySessionBookmark>;

function createBookmark(
  input: Pick<
    ActivitySessionBookmark,
    "category" | "id" | "label" | "occurredAt" | "offsetSeconds" | "source"
  >,
): ActivitySessionBookmark {
  return {
    ...baseBookmark,
    ...input,
  } as ActivitySessionBookmark;
}

function createClip(
  input: Pick<
    ActivitySessionClip,
    | "bookmarkId"
    | "durationSeconds"
    | "id"
    | "offsetSeconds"
    | "targetDurationSeconds"
    | "targetId"
  >,
): ActivitySessionClip {
  return {
    activitySessionId: "rewind-1",
    createdAt: "2026-07-03T10:00:00.000Z",
    targetKind: "replay-clip",
    updatedAt: "2026-07-03T10:00:00.000Z",
    ...input,
  };
}

describe("Rewinds utils", () => {
  it("seeks linked clip bookmarks to the clip segment start", () => {
    const bookmark = createBookmark({
      category: "death",
      id: "death-1",
      label: "Death",
      occurredAt: "2026-07-03T10:02:18.000Z",
      offsetSeconds: 138,
      source: "client-log",
    });

    expect(
      resolveRewindBookmarkSeekSeconds({
        bookmark,
        clips: [
          createClip({
            bookmarkId: "death-1",
            durationSeconds: 11,
            id: "clip-link-1",
            offsetSeconds: 138,
            targetDurationSeconds: 11,
            targetId: "clip-death",
          }),
        ],
      }),
    ).toBe(127);
  });

  it("extends early replay clips only to the finalized media duration", () => {
    const clip = createClip({
      bookmarkId: "death-1",
      durationSeconds: 34.5,
      id: "clip-link-1",
      offsetSeconds: 30,
      targetDurationSeconds: 50,
      targetId: "clip-death",
    });

    expect(resolveRewindClipSegment(clip)).toEqual({
      startSeconds: 0,
      endSeconds: 34.5,
    });
  });

  it("keeps early replay clips event-only until finalized media duration is known", () => {
    const clip = createClip({
      bookmarkId: "death-1",
      durationSeconds: null,
      id: "clip-link-1",
      offsetSeconds: 30,
      targetDurationSeconds: 50,
      targetId: "clip-death",
    });

    expect(resolveRewindClipSegment(clip)).toEqual({
      startSeconds: 0,
      endSeconds: 30,
    });
  });

  it("falls back to bookmark offset for non-clip bookmarks", () => {
    const bookmark = createBookmark({
      category: "map",
      id: "map-1",
      label: "Kriar Village",
      occurredAt: "2026-07-03T10:00:00.000Z",
      offsetSeconds: 22,
      source: "client-log",
    });

    expect(
      resolveRewindBookmarkSeekSeconds({
        bookmark,
        clips: [
          createClip({
            bookmarkId: "death-1",
            durationSeconds: 11,
            id: "clip-link-1",
            offsetSeconds: 138,
            targetDurationSeconds: 11,
            targetId: "clip-death",
          }),
        ],
      }),
    ).toBe(22);
  });
});

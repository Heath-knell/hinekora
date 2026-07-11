import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ActivitySessionClip,
  ActivitySessionTimeline,
} from "~/main/modules/bookmarks";
import {
  resolveRewindClipSegment,
  resolveRewindClipVisualOffsetSeconds,
} from "~/renderer/modules/rewinds/Rewinds.utils/Rewinds.utils";

import { useRewindTimelinePlayback } from "./useRewindTimelinePlayback";

const timestamp = "2026-07-11T10:00:00.000Z";
const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

function createSelectClipMock() {
  return vi.fn(
    (
      _clipId: string | null,
      _options?: { play?: boolean; seekSeconds?: number },
    ): void => {},
  );
}

function createSetVolumeMock() {
  return vi.fn((_volume: number): void => {});
}

function createClip(): ActivitySessionClip {
  return {
    activitySessionId: "rewind-1",
    bookmarkId: null,
    createdAt: timestamp,
    durationSeconds: 8,
    id: "linked-clip-1",
    offsetSeconds: 35,
    targetDurationSeconds: 20,
    targetId: "clip-1",
    targetKind: "replay-clip",
    updatedAt: timestamp,
  };
}

function createTimeline(clip: ActivitySessionClip): ActivitySessionTimeline {
  return {
    bookmarks: [],
    bookmarkTimelineItemsTruncated: false,
    clips: [clip],
    clipTimelineItemsTruncated: false,
    session: {
      createdAt: timestamp,
      id: "rewind-1",
      mode: "rewind",
      sourceGame: "poe2",
      sourceLeague: "Standard",
      startedAt: timestamp,
      stoppedAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

describe("useRewindTimelinePlayback", () => {
  let container: HTMLDivElement;
  let root: Root;
  let result: ReturnType<typeof useRewindTimelinePlayback> | null;
  let livePlaybackSeconds: number;
  let selectClip: ReturnType<typeof createSelectClipMock>;
  let setVolume: ReturnType<typeof createSetVolumeMock>;
  const clip = createClip();
  const timeline = createTimeline(clip);
  const selectedClipSegment = resolveRewindClipSegment(clip);
  const visualPlaybackOffsetSeconds =
    resolveRewindClipVisualOffsetSeconds(clip);

  function Probe() {
    result = useRewindTimelinePlayback({
      durationSeconds: 120,
      initialPlaybackSeconds: null,
      mediaUrl: "hinekora-media://replay-clip/clip-1",
      playback: {
        getPlaybackSeconds: () => livePlaybackSeconds,
        isPlaying: true,
        playbackSeconds: 12,
        setVolume,
      },
      rewindId: "rewind-1",
      selectClip,
      selectedClipSegment,
      selectedClipTarget: clip,
      timeline,
      visualPlaybackOffsetSeconds,
    });

    return null;
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    result = null;
    livePlaybackSeconds = 12;
    selectClip = createSelectClipMock();
    setVolume = createSetVolumeMock();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });

  async function renderProbe() {
    await act(async () => {
      root.render(<Probe />);
    });
    selectClip.mockClear();
    if (!result) {
      throw new Error("Expected rewind playback hook to render");
    }

    return result;
  }

  it("uses live media time for navigation while playback is active", async () => {
    const playback = await renderProbe();
    livePlaybackSeconds = 3;

    act(() => {
      playback.handleSeekForward();
    });
    expect(selectClip).toHaveBeenLastCalledWith("clip-1", {
      play: true,
      seekSeconds: 8,
    });

    livePlaybackSeconds = 3;
    act(() => {
      playback.handleSeekBackward();
    });
    expect(selectClip).toHaveBeenLastCalledWith(null);
  });

  it("keeps gap seeks and unknown clip targets deterministic", async () => {
    const playback = await renderProbe();

    act(() => {
      playback.handleSeek(60);
    });
    expect(selectClip).toHaveBeenLastCalledWith(null);
    expect(result?.playbackSeconds).toBe(60);

    act(() => {
      playback.handleClipTargetSelect("missing-clip");
      playback.handleVolumeChange(0.4);
    });
    expect(selectClip).toHaveBeenLastCalledWith("missing-clip");
    expect(setVolume).toHaveBeenCalledWith(0.4);
  });

  it("jumps to the selected clip start without starting playback", async () => {
    const playback = await renderProbe();

    act(() => {
      playback.handleJumpToStart();
    });
    expect(selectClip).toHaveBeenLastCalledWith("clip-1", {
      play: false,
      seekSeconds: 0,
    });
  });
});

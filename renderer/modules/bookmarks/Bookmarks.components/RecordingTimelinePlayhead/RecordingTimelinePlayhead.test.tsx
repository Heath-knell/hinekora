import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { VisualPlaybackSubscriber } from "~/renderer/modules/media-playback/useVisualPlaybackPublisher/useVisualPlaybackPublisher";

import { RecordingTimelinePlayhead } from "./RecordingTimelinePlayhead";

describe("RecordingTimelinePlayhead", () => {
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

  it("moves independently with a compositor transform", () => {
    let publishVisualTime: ((seconds: number) => void) | null = null;
    const subscribeVisualPlaybackTime: VisualPlaybackSubscriber = (
      listener,
    ) => {
      publishVisualTime = listener;
      return () => {
        publishVisualTime = null;
      };
    };

    act(() => {
      root.render(
        <RecordingTimelinePlayhead
          durationSeconds={100}
          playbackSeconds={25}
          railWidthPixels={200}
          subscribeVisualPlaybackTime={subscribeVisualPlaybackTime}
          visualPlaybackOffsetSeconds={10}
        />,
      );
    });

    const playhead = container.firstElementChild as HTMLDivElement | null;
    expect(playhead?.style.left).toBe("24px");
    expect(playhead?.style.transform).toContain("translate3d(50px");

    act(() => {
      publishVisualTime?.(50);
    });

    expect(playhead?.style.transform).toContain("translate3d(120px");
  });
});

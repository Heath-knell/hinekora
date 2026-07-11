import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { VisualPlaybackSubscriber } from "~/renderer/modules/media-playback/useVisualPlaybackPublisher/useVisualPlaybackPublisher";

import { RecordingPlaybackTime } from "./RecordingPlaybackTime";

describe("RecordingPlaybackTime", () => {
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

  it("renders state time and independently follows presented video time", () => {
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
        <RecordingPlaybackTime
          durationSeconds={100}
          playbackSeconds={25}
          subscribeVisualPlaybackTime={subscribeVisualPlaybackTime}
          visualPlaybackOffsetSeconds={10}
        />,
      );
    });

    expect(container.textContent).toBe("0:25.00 / 1:40.00");

    act(() => {
      publishVisualTime?.(30.25);
    });

    expect(container.textContent).toBe("0:40.25 / 1:40.00");
  });
});

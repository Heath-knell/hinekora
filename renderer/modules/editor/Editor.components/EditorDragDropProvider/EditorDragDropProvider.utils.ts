import type { DragEndEvent } from "@dnd-kit/react";

import { resolveTimelineSecondsFromClientX } from "../../Editor.utils/Editor.utils";

function resolveDropTimelineSeconds(input: {
  event: DragEndEvent;
  railPaddingPixels: number;
  timelineDurationSeconds: number;
  visibleDurationSeconds: number;
}): number {
  const bounds = input.event.operation.target?.shape?.boundingRectangle;
  const nativeEvent = input.event.nativeEvent;
  if (!bounds || !hasClientX(nativeEvent)) {
    return input.timelineDurationSeconds;
  }

  return resolveTimelineSecondsFromClientX({
    clientX: nativeEvent.clientX,
    timelineLeft: bounds.left + input.railPaddingPixels,
    timelineWidth: bounds.width - input.railPaddingPixels * 2,
    visibleDurationSeconds: input.visibleDurationSeconds,
  });
}

function hasClientX(event: Event | undefined): event is Event & {
  clientX: number;
} {
  return typeof event === "object" && event !== null && "clientX" in event;
}

export { resolveDropTimelineSeconds };

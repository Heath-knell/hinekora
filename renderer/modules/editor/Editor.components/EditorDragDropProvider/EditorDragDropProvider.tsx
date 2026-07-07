import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import type { PropsWithChildren } from "react";

import { useEditorShallow } from "~/renderer/store";

import {
  calculateEditorTimelineDuration,
  isEditorMediaAssetDragData,
  isEditorVideoTrackDropData,
} from "../../Editor.utils/Editor.utils";
import {
  editorTimelineRailPaddingPixels,
  resolveEditorTimelineVisibleDuration,
} from "../EditorTimeline/EditorTimeline.utils";
import { resolveDropTimelineSeconds } from "./EditorDragDropProvider.utils";

function EditorDragDropProvider({ children }: PropsWithChildren) {
  const { addAssetToTimelineAt, isTimelineFitToEdit, project } =
    useEditorShallow((editor) => ({
      addAssetToTimelineAt: editor.addAssetToTimelineAt,
      isTimelineFitToEdit: editor.isTimelineFitToEdit,
      project: editor.project,
    }));

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled) {
      return;
    }

    const sourceData = event.operation.source?.data;
    const targetData = event.operation.target?.data;
    if (
      !isEditorMediaAssetDragData(sourceData) ||
      !isEditorVideoTrackDropData(targetData)
    ) {
      return;
    }

    const timelineDurationSeconds = calculateEditorTimelineDuration(project);
    const timelineSeconds = resolveDropTimelineSeconds({
      event,
      railPaddingPixels: editorTimelineRailPaddingPixels,
      timelineDurationSeconds,
      visibleDurationSeconds: resolveEditorTimelineVisibleDuration({
        isTimelineFitToEdit,
        project,
      }),
    });
    addAssetToTimelineAt(sourceData.assetKey, timelineSeconds);
  };

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>{children}</DragDropProvider>
  );
}

export { EditorDragDropProvider };

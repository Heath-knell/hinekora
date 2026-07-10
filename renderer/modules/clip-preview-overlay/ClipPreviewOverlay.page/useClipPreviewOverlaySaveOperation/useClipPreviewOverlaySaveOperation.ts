import { useCallback, useRef } from "react";

import type { ReplayClipView } from "~/main/modules/replay-clips";
import { trackEvent } from "~/renderer/modules/umami";
import { useClipPreviewOverlayShallow } from "~/renderer/store";

import {
  type ClipPreviewTrimRange,
  roundClipPreviewSeconds,
} from "../../ClipPreviewOverlay.utils/ClipPreviewOverlay.utils";

function useClipPreviewOverlaySaveOperation(input: {
  canSave: boolean;
  clip: ReplayClipView | null;
  durationSeconds: number;
  hasTitleChange: boolean;
  hasTrimChanges: boolean;
  isMuted: boolean;
  resetCopiedState: () => void;
  trim: ClipPreviewTrimRange;
  trimmedTitle: string;
}) {
  const operationRequestRef = useRef<string | null>(null);
  const {
    incrementMediaVersion,
    resetLoadedClipState,
    setDetail,
    setDurationOverrideSeconds,
    setHasSavedClip,
    setOperationProgress,
    setSaveMessage,
    setSaving,
  } = useClipPreviewOverlayShallow((clipPreviewOverlay) => ({
    incrementMediaVersion: clipPreviewOverlay.incrementMediaVersion,
    resetLoadedClipState: clipPreviewOverlay.resetLoadedClipState,
    setDetail: clipPreviewOverlay.setDetail,
    setDurationOverrideSeconds: clipPreviewOverlay.setDurationOverrideSeconds,
    setHasSavedClip: clipPreviewOverlay.setHasSavedClip,
    setOperationProgress: clipPreviewOverlay.setOperationProgress,
    setSaveMessage: clipPreviewOverlay.setSaveMessage,
    setSaving: clipPreviewOverlay.setSaving,
  }));

  const handleSaveClip = useCallback(() => {
    if (!input.clip || !input.canSave) {
      return;
    }

    setSaving(true);
    setOperationProgress(0.02);
    setSaveMessage(null);
    const requestId = globalThis.crypto.randomUUID();
    operationRequestRef.current = requestId;
    const unsubscribeProgress = window.electron.replayClips.onOperationProgress(
      ({ operationRequestId, progress }) => {
        if (operationRequestId === requestId) {
          setOperationProgress(Math.min(Math.max(progress, 0), 0.98));
        }
      },
    );
    void window.electron.replayClips
      .update({
        id: input.clip.id,
        operationRequestId: requestId,
        ...(input.isMuted ? { muteAudio: true } : {}),
        ...(input.hasTitleChange ? { name: input.trimmedTitle } : {}),
        ...(input.hasTrimChanges
          ? {
              trim: {
                inSeconds: input.trim.inSeconds,
                outSeconds: input.trim.outSeconds,
              },
            }
          : {}),
      })
      .then((result) => {
        if (operationRequestRef.current !== requestId) {
          return;
        }
        if (!result.ok || !result.detail) {
          setSaveMessage({
            text: result.error ?? "Could not save clip.",
            tone: "error",
          });
          return;
        }

        const nextDurationSeconds = roundClipPreviewSeconds(
          result.detail.durationSeconds ?? input.durationSeconds,
        );
        trackEvent("clip-updated");
        setOperationProgress(1);
        setHasSavedClip(true);
        setDetail(result.detail);
        setDurationOverrideSeconds(result.detail.durationSeconds);
        incrementMediaVersion();
        input.resetCopiedState();
        resetLoadedClipState({ inSeconds: 0, outSeconds: nextDurationSeconds });
        setSaveMessage({ text: "Clip saved.", tone: "success" });
      })
      .catch((error: unknown) => {
        if (operationRequestRef.current === requestId) {
          setSaveMessage({
            text:
              error instanceof Error ? error.message : "Could not save clip.",
            tone: "error",
          });
        }
      })
      .finally(() => {
        unsubscribeProgress();
        if (operationRequestRef.current === requestId) {
          operationRequestRef.current = null;
          setSaving(false);
        }
      });
  }, [
    incrementMediaVersion,
    input.canSave,
    input.clip,
    input.durationSeconds,
    input.hasTitleChange,
    input.hasTrimChanges,
    input.isMuted,
    input.resetCopiedState,
    input.trim.inSeconds,
    input.trim.outSeconds,
    input.trimmedTitle,
    resetLoadedClipState,
    setDetail,
    setDurationOverrideSeconds,
    setHasSavedClip,
    setOperationProgress,
    setSaveMessage,
    setSaving,
  ]);

  return { handleSaveClip };
}

export { useClipPreviewOverlaySaveOperation };

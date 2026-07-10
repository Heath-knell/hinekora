import { useCallback, useEffect, useRef } from "react";

import type { ReplayClipView } from "~/main/modules/replay-clips";
import { trackEvent } from "~/renderer/modules/umami";
import { useClipPreviewOverlayShallow } from "~/renderer/store";

import type { ClipPreviewTrimRange } from "../../ClipPreviewOverlay.utils/ClipPreviewOverlay.utils";

function useClipPreviewOverlayCopyOperation(input: {
  canCopy: boolean;
  clip: ReplayClipView | null;
  hasTrimChanges: boolean;
  isMuted: boolean;
  trim: ClipPreviewTrimRange;
}) {
  const copiedTimeoutRef = useRef<number | null>(null);
  const operationRequestRef = useRef<string | null>(null);
  const {
    hasCopied,
    setCopied,
    setCopying,
    setOperationProgress,
    setSaveMessage,
  } = useClipPreviewOverlayShallow((clipPreviewOverlay) => ({
    hasCopied: clipPreviewOverlay.hasCopied,
    setCopied: clipPreviewOverlay.setCopied,
    setCopying: clipPreviewOverlay.setCopying,
    setOperationProgress: clipPreviewOverlay.setOperationProgress,
    setSaveMessage: clipPreviewOverlay.setSaveMessage,
  }));

  const resetCopiedState = useCallback(() => {
    if (copiedTimeoutRef.current !== null) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }
    setCopied(false);
  }, [setCopied]);

  useEffect(
    () => () => {
      if (copiedTimeoutRef.current !== null) {
        clearTimeout(copiedTimeoutRef.current);
      }
    },
    [],
  );

  const handleCopyClip = useCallback(() => {
    if (!input.clip || !input.canCopy) {
      return;
    }

    setCopying(true);
    setOperationProgress(0.02);
    resetCopiedState();
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
      .copy({
        id: input.clip.id,
        operationRequestId: requestId,
        ...(input.isMuted ? { muteAudio: true } : {}),
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
        if (result.ok) {
          trackEvent("clip-copied");
          setOperationProgress(1);
          setCopied(true);
          copiedTimeoutRef.current = window.setTimeout(() => {
            setCopied(false);
            copiedTimeoutRef.current = null;
          }, 3_000);
          return;
        }
        setSaveMessage({
          text: result.error ?? "Could not copy clip.",
          tone: "error",
        });
      })
      .catch((error: unknown) => {
        if (operationRequestRef.current === requestId) {
          setSaveMessage({
            text:
              error instanceof Error ? error.message : "Could not copy clip.",
            tone: "error",
          });
        }
      })
      .finally(() => {
        unsubscribeProgress();
        if (operationRequestRef.current === requestId) {
          operationRequestRef.current = null;
          setCopying(false);
        }
      });
  }, [
    input.canCopy,
    input.clip,
    input.hasTrimChanges,
    input.isMuted,
    input.trim.inSeconds,
    input.trim.outSeconds,
    resetCopiedState,
    setCopied,
    setCopying,
    setOperationProgress,
    setSaveMessage,
  ]);

  return { handleCopyClip, hasCopied, resetCopiedState };
}

export { useClipPreviewOverlayCopyOperation };

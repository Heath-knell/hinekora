import type { ChangeEvent } from "react";
import { useCallback } from "react";

import { trackEvent } from "~/renderer/modules/umami";
import { useClipPreviewOverlayShallow } from "~/renderer/store";

import { useClipPreviewOverlayCopyOperation } from "../useClipPreviewOverlayCopyOperation/useClipPreviewOverlayCopyOperation";
import type { ClipPreviewOverlayDetail } from "../useClipPreviewOverlayDetail/useClipPreviewOverlayDetail";
import { useClipPreviewOverlaySaveOperation } from "../useClipPreviewOverlaySaveOperation/useClipPreviewOverlaySaveOperation";

function useClipPreviewOverlayOperations({
  clip,
  durationSeconds,
  fileTitle,
}: ClipPreviewOverlayDetail) {
  const {
    hasSavedClip,
    isCopying,
    isMuted,
    isSaving,
    operationProgress,
    saveMessage,
    setHasSavedClip,
    setSaveMessage,
    setTitleDraft,
    titleDraft,
    trim,
  } = useClipPreviewOverlayShallow((clipPreviewOverlay) => ({
    hasSavedClip: clipPreviewOverlay.hasSavedClip,
    isCopying: clipPreviewOverlay.isCopying,
    isMuted: clipPreviewOverlay.isMuted,
    isSaving: clipPreviewOverlay.isSaving,
    operationProgress: clipPreviewOverlay.operationProgress,
    saveMessage: clipPreviewOverlay.saveMessage,
    setHasSavedClip: clipPreviewOverlay.setHasSavedClip,
    setSaveMessage: clipPreviewOverlay.setSaveMessage,
    setTitleDraft: clipPreviewOverlay.setTitleDraft,
    titleDraft: clipPreviewOverlay.titleDraft,
    trim: clipPreviewOverlay.trim,
  }));
  const hasTrimChanges =
    durationSeconds > 0 &&
    (Math.abs(trim.inSeconds) > 0.001 ||
      Math.abs(trim.outSeconds - durationSeconds) > 0.001);
  const trimmedTitle = titleDraft.trim();
  const hasTitleChange =
    trimmedTitle.length > 0 && trimmedTitle !== fileTitle.trim();
  const canUseClip = Boolean(clip?.hasMediaFile && durationSeconds > 0);
  const isProcessing = isCopying || isSaving;
  const canCopy = Boolean(clip?.hasMediaFile) && !isProcessing;
  const canEdit = canUseClip && !isProcessing;
  const canSave =
    canUseClip &&
    (hasTrimChanges || hasTitleChange || isMuted) &&
    !isProcessing;
  const canOpenSavedClip = Boolean(clip) && hasSavedClip && !isProcessing;
  const { handleCopyClip, hasCopied, resetCopiedState } =
    useClipPreviewOverlayCopyOperation({
      canCopy,
      clip,
      hasTrimChanges,
      isMuted,
      trim,
    });
  const { handleSaveClip } = useClipPreviewOverlaySaveOperation({
    canSave,
    clip,
    durationSeconds,
    hasTitleChange,
    hasTrimChanges,
    isMuted,
    resetCopiedState,
    trim,
    trimmedTitle,
  });

  const handleClose = useCallback(() => {
    trackEvent("clip-preview-overlay-closed");
    void window.electron.overlayWindows.hideClipPreview();
  }, []);

  const handleEditClip = useCallback(() => {
    if (!clip || !canEdit) {
      return;
    }

    void window.electron.mainWindow
      .openEditorClip(clip.id, {
        ...(trimmedTitle.length > 0 ? { title: trimmedTitle } : {}),
        trim: {
          inSeconds: trim.inSeconds,
          outSeconds: trim.outSeconds,
        },
      })
      .then(async () => {
        trackEvent("clip-preview-overlay-edit-opened");
        await window.electron.overlayWindows.hideClipPreview();
      })
      .catch((error: unknown) => {
        console.warn("[clip-preview] Could not open clip in editor", {
          clipId: clip.id,
          error,
        });
      });
  }, [canEdit, clip, trim.inSeconds, trim.outSeconds, trimmedTitle]);

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (isProcessing) {
        return;
      }

      setTitleDraft(event.currentTarget.value.replace(/\.mp4$/i, ""));
      setHasSavedClip(false);
      resetCopiedState();
      setSaveMessage(null);
    },
    [
      isProcessing,
      resetCopiedState,
      setHasSavedClip,
      setSaveMessage,
      setTitleDraft,
    ],
  );

  const handleOpenSavedClipInEditor = useCallback(() => {
    if (!clip || !canOpenSavedClip) {
      return;
    }

    void window.electron.mainWindow
      .openClip(clip.id)
      .then(async () => {
        trackEvent("clip-preview-overlay-edit-saved-opened");
        await window.electron.overlayWindows.hideClipPreview();
      })
      .catch((error: unknown) => {
        console.warn("[clip-preview] Could not open saved clip in clips view", {
          clipId: clip.id,
          error,
        });
      });
  }, [canOpenSavedClip, clip]);

  return {
    canCopy,
    canEdit,
    canOpenSavedClip,
    canSave,
    canUseClip,
    handleClose,
    handleCopyClip,
    handleEditClip,
    handleOpenSavedClipInEditor,
    handleSaveClip,
    handleTitleChange,
    hasCopied,
    isCopying,
    isProcessing,
    isSaving,
    operationProgress,
    saveMessage,
    titleDraft,
    titlePlaceholder: fileTitle || "2026-07-08 01-18-40",
    trim,
  };
}

export { useClipPreviewOverlayOperations };

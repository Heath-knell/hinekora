import { useEffect, useMemo } from "react";

import { resolveRunningPoeGameFromStates } from "~/main/modules/poe-process/PoeProcess.dto";
import { createAuraPreviewVideoConstraints } from "~/renderer/modules/aura-overlay/AuraOverlay.page/AuraOverlay.page.utils";
import { useDesktopCaptureStream } from "~/renderer/modules/capture-preview/CapturePreview.hooks/useDesktopCaptureStream/useDesktopCaptureStream";
import { resolveCapturePreviewSourceId } from "~/renderer/modules/capture-preview/CapturePreview.utils/CapturePreview.utils";
import {
  useCapturePreviewShallow,
  usePoeProcessSelector,
  useSettingsSelector,
} from "~/renderer/store";

import type { Profile } from "~/types";

interface UseAuraOverlayCaptureStreamInput {
  enabled: boolean;
  profile: Profile | null;
}

function useAuraOverlayCaptureStream({
  enabled,
  profile,
}: UseAuraOverlayCaptureStreamInput) {
  const activeGame = useSettingsSelector(
    (settings) => settings.value?.activeGame ?? "poe1",
  );
  const runningGame = usePoeProcessSelector((poeProcess) => {
    return resolveRunningPoeGameFromStates(poeProcess.state, poeProcess.states);
  });
  const { recoverSources, selectedSourceId, sources } =
    useCapturePreviewShallow((capturePreview) => ({
      recoverSources: capturePreview.recoverSources,
      selectedSourceId: capturePreview.selectedSourceId,
      sources: capturePreview.sources,
    }));
  const captureGame = runningGame ?? activeGame;
  const captureSourceId = useMemo(
    () =>
      resolveCapturePreviewSourceId(
        profile?.captureTarget,
        sources,
        selectedSourceId,
        captureGame,
      ),
    [captureGame, profile, selectedSourceId, sources],
  );
  const captureSource =
    sources.find((source) => source.id === captureSourceId) ?? null;
  const fallbackVideoSize =
    captureSource?.width && captureSource.height
      ? { width: captureSource.width, height: captureSource.height }
      : null;
  const { error, isStarting, stream } = useDesktopCaptureStream({
    sourceId: captureSourceId,
    enabled: Boolean(enabled && captureSourceId),
    createVideoConstraints: createAuraPreviewVideoConstraints,
    recoverSources,
  });

  useEffect(() => {
    if (!captureSourceId || !error || isStarting) {
      return;
    }

    window.electron.capturePreview.reportFailure(captureSourceId, error);
  }, [captureSourceId, error, isStarting]);

  return { captureSourceId, fallbackVideoSize, stream };
}

export { useAuraOverlayCaptureStream };

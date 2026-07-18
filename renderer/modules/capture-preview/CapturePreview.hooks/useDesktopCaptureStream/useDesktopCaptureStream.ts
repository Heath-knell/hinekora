import { useCallback, useEffect, useRef, useState } from "react";

const RECONNECT_DELAYS_MS = [500, 1_500, 3_000] as const;
const STABLE_STREAM_RESET_MS = 10_000;
const TRACK_MUTE_GRACE_MS = 1_500;

interface UseDesktopCaptureStreamInput {
  sourceId: string | null;
  enabled: boolean;
  createVideoConstraints: () => MediaTrackConstraints;
  recoverSources: () => Promise<void>;
}

interface UseDesktopCaptureStreamResult {
  stream: MediaStream | null;
  error: string | null;
  isStarting: boolean;
  stop: () => void;
}

function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function getCaptureErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Capture preview failed";
}

export function useDesktopCaptureStream({
  sourceId,
  enabled,
  createVideoConstraints,
  recoverSources,
}: UseDesktopCaptureStreamInput): UseDesktopCaptureStreamResult {
  const streamRef = useRef<MediaStream | null>(null);
  const streamGenerationRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const stableStreamTimerRef = useRef<number | null>(null);
  const captureSourceKeyRef = useRef<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [restartToken, setRestartToken] = useState(0);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearStableStreamTimer = useCallback(() => {
    if (stableStreamTimerRef.current !== null) {
      window.clearTimeout(stableStreamTimerRef.current);
      stableStreamTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearReconnectTimer();
    clearStableStreamTimer();
    reconnectAttemptRef.current = 0;
    streamGenerationRef.current += 1;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsStarting(false);
  }, [clearReconnectTimer, clearStableStreamTimer]);

  const requestReconnect = useCallback(
    (message: string) => {
      if (!enabled || !sourceId || reconnectTimerRef.current !== null) {
        return;
      }

      clearStableStreamTimer();
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
      const delay = RECONNECT_DELAYS_MS[reconnectAttemptRef.current];
      if (delay === undefined) {
        setError(message);
        setIsStarting(false);
        return;
      }

      reconnectAttemptRef.current += 1;
      streamGenerationRef.current += 1;
      const reconnectGeneration = streamGenerationRef.current;
      setError(`${message}; reconnecting`);
      setIsStarting(true);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        void recoverSources()
          .catch(() => undefined)
          .then(() => {
            if (streamGenerationRef.current === reconnectGeneration) {
              setRestartToken((value) => value + 1);
            }
          });
      }, delay);
    },
    [clearStableStreamTimer, enabled, recoverSources, sourceId],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: restartToken intentionally starts a fresh capture attempt.
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let disposed = false;
    let muteTimer: number | null = null;
    const captureSourceKey = `${enabled}:${sourceId ?? ""}`;
    if (captureSourceKeyRef.current !== captureSourceKey) {
      captureSourceKeyRef.current = captureSourceKey;
      clearReconnectTimer();
      clearStableStreamTimer();
      reconnectAttemptRef.current = 0;
    }

    streamGenerationRef.current += 1;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setError(null);
    const streamGeneration = streamGenerationRef.current;

    if (!enabled || !sourceId) {
      return () => {
        disposed = true;
      };
    }

    setIsStarting(true);

    void window.electron.capturePreview
      .prepareDisplayMediaSource(sourceId)
      .then((sourceAvailable) => {
        if (!sourceAvailable) {
          throw new Error("Capture source unavailable");
        }

        return navigator.mediaDevices.getDisplayMedia({
          audio: false,
          video: createVideoConstraints(),
        });
      })
      .then((mediaStream) => {
        if (disposed || streamGenerationRef.current !== streamGeneration) {
          stopMediaStream(mediaStream);
          return;
        }

        const handleUnavailable = () => {
          if (disposed) {
            return;
          }

          requestReconnect("Capture source closed");
        };
        const handleTrackMute = () => {
          if (muteTimer !== null) {
            window.clearTimeout(muteTimer);
          }

          muteTimer = window.setTimeout(handleUnavailable, TRACK_MUTE_GRACE_MS);
        };
        const handleTrackUnmute = () => {
          if (muteTimer !== null) {
            window.clearTimeout(muteTimer);
            muteTimer = null;
          }
        };

        mediaStream.addEventListener("inactive", handleUnavailable, {
          once: true,
        });
        for (const track of mediaStream.getVideoTracks()) {
          track.addEventListener("ended", handleUnavailable, { once: true });
          track.addEventListener("mute", handleTrackMute);
          track.addEventListener("unmute", handleTrackUnmute);
        }

        activeStream = mediaStream;
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setError(null);
        setIsStarting(false);
        clearStableStreamTimer();
        stableStreamTimerRef.current = window.setTimeout(() => {
          stableStreamTimerRef.current = null;
          reconnectAttemptRef.current = 0;
        }, STABLE_STREAM_RESET_MS);
      })
      .catch((captureError) => {
        if (!disposed && streamGenerationRef.current === streamGeneration) {
          requestReconnect(getCaptureErrorMessage(captureError));
        }
      });

    return () => {
      disposed = true;
      if (muteTimer !== null) {
        window.clearTimeout(muteTimer);
      }
      stopMediaStream(activeStream);
      if (streamRef.current === activeStream) {
        streamRef.current = null;
        setStream(null);
      }
    };
  }, [
    clearStableStreamTimer,
    createVideoConstraints,
    enabled,
    requestReconnect,
    restartToken,
    sourceId,
  ]);

  useEffect(
    () => () => {
      clearReconnectTimer();
      clearStableStreamTimer();
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    },
    [clearReconnectTimer, clearStableStreamTimer],
  );

  return { stream, error, isStarting, stop };
}

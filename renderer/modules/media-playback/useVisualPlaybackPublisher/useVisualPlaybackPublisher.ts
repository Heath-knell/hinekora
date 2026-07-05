import { useCallback, useRef } from "react";

type VisualPlaybackSubscriber = (
  listener: (seconds: number) => void,
) => () => void;

function useVisualPlaybackPublisher() {
  const listenersRef = useRef(new Set<(seconds: number) => void>());

  const publishVisualPlaybackTime = useCallback((seconds: number) => {
    for (const listener of listenersRef.current) {
      listener(seconds);
    }
  }, []);

  const subscribeVisualPlaybackTime = useCallback<VisualPlaybackSubscriber>(
    (listener) => {
      listenersRef.current.add(listener);

      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  return { publishVisualPlaybackTime, subscribeVisualPlaybackTime };
}

export type { VisualPlaybackSubscriber };
export { useVisualPlaybackPublisher };

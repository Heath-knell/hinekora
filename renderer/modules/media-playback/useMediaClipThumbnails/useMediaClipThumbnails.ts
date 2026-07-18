import { useEffect, useMemo, useState } from "react";

import {
  createClipThumbnails,
  createThumbnailCacheKey,
} from "./useMediaClipThumbnails.utils";

const thumbnailWidthPixels = 96;
const maxThumbnails = 8;
const maxThumbnailCacheEntries = 80;
const thumbnailLoadDelayMs = 250;

const thumbnailCache = new Map<string, string[]>();
let thumbnailQueue: Promise<unknown> = Promise.resolve();

interface UseMediaClipThumbnailsInput {
  durationSeconds: number;
  enabled?: boolean;
  inSeconds: number;
  mediaUrl: string | null;
  outSeconds: number;
  widthPixels: number;
}

function useMediaClipThumbnails({
  durationSeconds,
  enabled = true,
  inSeconds,
  mediaUrl,
  outSeconds,
  widthPixels,
}: UseMediaClipThumbnailsInput): string[] {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const thumbnailCount = useMemo(
    () => calculateMediaThumbnailCount(widthPixels),
    [widthPixels],
  );

  useEffect(() => {
    if (!mediaUrl || thumbnailCount <= 0 || durationSeconds <= 0) {
      setThumbnails([]);
      return;
    }
    if (!enabled) {
      return;
    }

    const cacheKey = createThumbnailCacheKey({
      count: thumbnailCount,
      inSeconds,
      mediaUrl,
      outSeconds,
    });
    const cachedThumbnails = thumbnailCache.get(cacheKey);
    if (cachedThumbnails) {
      setThumbnails(cachedThumbnails);
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;
    const timeoutId = window.setTimeout(() => {
      const loadThumbnails = async () => {
        const nextThumbnails = await queueClipThumbnails(
          {
            count: thumbnailCount,
            inSeconds,
            mediaUrl,
            outSeconds,
          },
          signal,
        );
        if (!signal.aborted && nextThumbnails.length > 0) {
          cacheThumbnails(cacheKey, nextThumbnails);
          setThumbnails(nextThumbnails);
        }
      };

      void loadThumbnails().catch(() => {
        if (!signal.aborted) {
          setThumbnails([]);
        }
      });
    }, thumbnailLoadDelayMs);

    return () => {
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    durationSeconds,
    enabled,
    inSeconds,
    mediaUrl,
    outSeconds,
    thumbnailCount,
  ]);

  return thumbnails;
}

function calculateMediaThumbnailCount(widthPixels: number): number {
  if (!Number.isFinite(widthPixels) || widthPixels <= 0) {
    return 0;
  }

  return Math.min(
    Math.max(Math.ceil(widthPixels / thumbnailWidthPixels), 1),
    maxThumbnails,
  );
}

function queueClipThumbnails(
  input: {
    count: number;
    inSeconds: number;
    mediaUrl: string;
    outSeconds: number;
  },
  signal: AbortSignal,
): Promise<string[]> {
  const task = thumbnailQueue
    .catch(() => undefined)
    .then(() => (signal.aborted ? [] : createClipThumbnails(input, signal)));
  thumbnailQueue = task.catch(() => undefined);

  return task;
}

function cacheThumbnails(cacheKey: string, thumbnails: string[]) {
  thumbnailCache.set(cacheKey, thumbnails);
  if (thumbnailCache.size <= maxThumbnailCacheEntries) {
    return;
  }

  const oldestKey = thumbnailCache.keys().next().value;
  if (oldestKey) {
    thumbnailCache.delete(oldestKey);
  }
}

export { calculateMediaThumbnailCount, useMediaClipThumbnails };

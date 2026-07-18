import { session } from "electron";

const DISPLAY_MEDIA_SOURCE_REQUEST_TTL_MS = 5_000;

interface PreparedDisplayMediaSource {
  expiresAtMs: number;
  sourceId: string;
}

class CapturePreviewDisplayMediaAuthorizer {
  private availableSources = new Map<string, Electron.Video>();
  private preparedSources = new Map<string, PreparedDisplayMediaSource>();

  replaceAvailableSources(sources: Iterable<Electron.Video>): void {
    const availableSources = new Map<string, Electron.Video>();
    for (const source of sources) {
      availableSources.set(source.id, source);
    }
    this.availableSources = availableSources;
  }

  prepare(
    processId: number,
    frameId: number,
    sourceId: string,
    now = Date.now(),
  ): boolean {
    const source = this.availableSources.get(sourceId);
    if (!source) {
      return false;
    }

    this.prune(now);
    this.preparedSources.set(createDisplayMediaRequestKey(processId, frameId), {
      expiresAtMs: now + DISPLAY_MEDIA_SOURCE_REQUEST_TTL_MS,
      sourceId: source.id,
    });
    return true;
  }

  consume(
    processId: number,
    frameId: number,
    now = Date.now(),
  ): Electron.Video | null {
    const key = createDisplayMediaRequestKey(processId, frameId);
    const preparedSource = this.preparedSources.get(key) ?? null;
    this.preparedSources.delete(key);

    if (!preparedSource || preparedSource.expiresAtMs < now) {
      return null;
    }

    return this.availableSources.get(preparedSource.sourceId) ?? null;
  }

  private prune(now: number): void {
    for (const [key, preparedSource] of this.preparedSources) {
      if (preparedSource.expiresAtMs < now) {
        this.preparedSources.delete(key);
      }
    }
  }
}

function registerCapturePreviewDisplayMediaHandler(
  authorizer: CapturePreviewDisplayMediaAuthorizer,
  targetSession: Pick<
    Electron.Session,
    "setDisplayMediaRequestHandler"
  > = session.defaultSession,
): void {
  targetSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      const frame = request.frame;
      const source = frame
        ? authorizer.consume(frame.processId, frame.routingId)
        : null;
      callback(request.videoRequested && source ? { video: source } : {});
    },
    { useSystemPicker: false },
  );
}

function createDisplayMediaRequestKey(
  processId: number,
  frameId: number,
): string {
  return `${processId}:${frameId}`;
}

export {
  CapturePreviewDisplayMediaAuthorizer,
  registerCapturePreviewDisplayMediaHandler,
};

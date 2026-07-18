import { app, desktopCapturer, screen } from "electron";

import { WindowName } from "~/main/modules/main-window/MainWindow.types";
import { PoeProcessService } from "~/main/modules/poe-process";
import {
  getPoeProcessStateForGame,
  isPoeProcessSnapshotRunningForGame,
  POE_PROCESS_GAMES,
  type PoeProcessSnapshot,
} from "~/main/modules/poe-process/PoeProcess.dto";
import { logWarn } from "~/main/utils/app-log";
import {
  createDisplayDimensionsLookup,
  getNativeDisplayDimensions,
} from "~/main/utils/display-geometry";
import {
  assertOptionalBoolean,
  assertString,
  handleValidationError,
} from "~/main/utils/ipc-validation";
import { registerGuardedIpcHandler } from "~/main/utils/ipc-window-roles";

import {
  type CapturePreviewSource,
  CapturePreviewSourceSchema,
  type GameId,
} from "~/types";
import { CapturePreviewChannel } from "./CapturePreview.channels";
import {
  CapturePreviewDisplayMediaAuthorizer,
  registerCapturePreviewDisplayMediaHandler,
} from "./CapturePreview.display-media";
import {
  detectPathOfExileWindowTitle,
  normalizeCapturePreviewSources,
} from "./CapturePreview.sources";

const SOURCE_THUMBNAIL_CACHE_MS = 10_000;
const SOURCE_THUMBNAIL_CACHE_MAX_ENTRIES = 16;
const SLOW_SOURCE_LIST_MS = 250;
const CAPTURE_FAILURE_LOG_INTERVAL_MS = 30_000;

interface CapturePreviewListSourcesOptions {
  forceRefresh?: boolean;
}

class CapturePreviewService {
  private static instance: CapturePreviewService | null = null;
  private sourceListCache: CapturePreviewSource[] | null = null;
  private sourceListRequest: Promise<CapturePreviewSource[]> | null = null;
  private sourceListRequestForceRefresh = false;
  private sourceThumbnailCache = new Map<
    string,
    { checkedAtMs: number; dataUrl: string | null }
  >();
  private sourceThumbnailRequests = new Map<string, Promise<string | null>>();
  private readonly displayMediaAuthorizer =
    new CapturePreviewDisplayMediaAuthorizer();
  private nextCaptureFailureLogAtMs = 0;

  static getInstance(): CapturePreviewService {
    if (!CapturePreviewService.instance) {
      CapturePreviewService.instance = new CapturePreviewService();
    }

    return CapturePreviewService.instance;
  }

  constructor() {
    this.setupHandlers();
    this.setupDisplayMediaRequestHandlerWhenReady();
  }

  async listSources(
    options: CapturePreviewListSourcesOptions = {},
  ): Promise<CapturePreviewSource[]> {
    const forceRefresh = options.forceRefresh === true;
    if (this.sourceListRequest) {
      if (forceRefresh && !this.sourceListRequestForceRefresh) {
        const refreshAfterCurrentRequest = () =>
          this.listSources({ forceRefresh: true });

        return this.sourceListRequest.then(
          refreshAfterCurrentRequest,
          refreshAfterCurrentRequest,
        );
      }

      return this.sourceListRequest;
    }

    if (!forceRefresh && this.sourceListCache) {
      return this.sourceListCache;
    }

    if (forceRefresh) {
      this.sourceThumbnailCache.clear();
    }

    const request = this.collectSources(forceRefresh).finally(() => {
      this.sourceListRequest = null;
      this.sourceListRequestForceRefresh = false;
    });
    this.sourceListRequest = request;
    this.sourceListRequestForceRefresh = forceRefresh;

    return request;
  }

  private async collectSources(
    forceRefresh: boolean,
  ): Promise<CapturePreviewSource[]> {
    const startedAtMs = Date.now();
    const displays = screen.getAllDisplays();
    const displayDimensions = createDisplayDimensionsLookup(displays);
    const displayLabels = this.createDisplayLabelLookup(displays);
    const primaryDisplayDimensions = getNativeDisplayDimensions(
      screen.getPrimaryDisplay(),
    );
    const poeProcessService = PoeProcessService.getInstance();
    const [sources, poeProcessSnapshot] = await Promise.all([
      desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 0, height: 0 },
      }),
      forceRefresh
        ? poeProcessService.refreshSnapshot({
            requestCapturePreviewRefresh: false,
          })
        : Promise.resolve(poeProcessService.getSnapshot()),
    ]);

    const sourceInputs = sources.slice(0, 64).map((source) => {
      const displayId = source.display_id || null;
      const poeGame = detectCapturePreviewSourceGame(
        source.name,
        poeProcessSnapshot,
      );
      const displayLabel = displayId
        ? (displayLabels.get(displayId) ?? null)
        : null;
      const dimensions = displayId
        ? (displayDimensions.get(displayId) ?? null)
        : poeGame
          ? primaryDisplayDimensions
          : null;

      return {
        id: source.id,
        name: source.name,
        game: poeGame,
        displayId,
        displayLabel,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        thumbnailDataUrl: null,
      };
    });
    const filteredSourceInputs = sourceInputs.filter((source) => {
      if (source.id.startsWith("screen:")) {
        return true;
      }

      const game = source.game;

      return (
        game !== null &&
        isPoeProcessSnapshotRunningForGame(poeProcessSnapshot, game)
      );
    });

    const normalizedSources = normalizeCapturePreviewSources(
      filteredSourceInputs,
    ).map((source) => CapturePreviewSourceSchema.parse(source));
    const normalizedSourceIds = new Set(
      normalizedSources.map((source) => source.id),
    );
    this.displayMediaAuthorizer.replaceAvailableSources(
      sources
        .filter((source) => normalizedSourceIds.has(source.id))
        .map((source) => ({ id: source.id, name: source.name })),
    );
    const completedAtMs = Date.now();

    this.pruneSourceThumbnailCache({
      now: completedAtMs,
      sourceIds: new Set(normalizedSources.map((source) => source.id)),
    });
    this.sourceListCache = normalizedSources;
    const elapsedMs = Math.max(0, completedAtMs - startedAtMs);
    if (elapsedMs >= SLOW_SOURCE_LIST_MS) {
      logWarn("capture-preview", "Capture source listing was slow", {
        elapsedMs,
        forceRefresh,
        inputSources: sources.length,
        returnedSources: normalizedSources.length,
      });
    }

    return normalizedSources;
  }

  async getSourceThumbnail(sourceId: string): Promise<string | null> {
    const now = Date.now();
    this.pruneSourceThumbnailCache({ now });
    const cached = this.sourceThumbnailCache.get(sourceId);
    if (cached && now - cached.checkedAtMs < SOURCE_THUMBNAIL_CACHE_MS) {
      this.sourceThumbnailCache.delete(sourceId);
      this.sourceThumbnailCache.set(sourceId, cached);
      return cached.dataUrl;
    }

    const existingRequest = this.sourceThumbnailRequests.get(sourceId);
    if (existingRequest) {
      return existingRequest;
    }

    const request = desktopCapturer
      .getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 360, height: 204 },
      })
      .then((sources) => {
        const source = sources.find((item) => item.id === sourceId) ?? null;
        const dataUrl =
          source && !source.thumbnail.isEmpty()
            ? source.thumbnail.toDataURL()
            : null;

        this.setSourceThumbnailCache(sourceId, dataUrl);

        return dataUrl;
      })
      .finally(() => {
        this.sourceThumbnailRequests.delete(sourceId);
      });

    this.sourceThumbnailRequests.set(sourceId, request);

    return request;
  }

  private setSourceThumbnailCache(
    sourceId: string,
    dataUrl: string | null,
  ): void {
    this.sourceThumbnailCache.delete(sourceId);
    this.sourceThumbnailCache.set(sourceId, {
      checkedAtMs: Date.now(),
      dataUrl,
    });
    this.pruneSourceThumbnailCache();
  }

  private prepareDisplayMediaSource(
    event: Electron.IpcMainInvokeEvent,
    sourceId: string,
  ): boolean {
    const processId = event.senderFrame?.processId ?? event.processId;
    const frameId = event.senderFrame?.routingId ?? event.frameId;

    return this.displayMediaAuthorizer.prepare(processId, frameId, sourceId);
  }

  private setupDisplayMediaRequestHandler(): void {
    registerCapturePreviewDisplayMediaHandler(this.displayMediaAuthorizer);
  }

  private reportCaptureFailure(sourceId: string, error: string): void {
    const now = Date.now();
    if (now < this.nextCaptureFailureLogAtMs) {
      return;
    }

    this.nextCaptureFailureLogAtMs = now + CAPTURE_FAILURE_LOG_INTERVAL_MS;
    logWarn("capture-preview", "Renderer capture stream stopped", {
      error,
      sourceId,
    });
  }

  private setupDisplayMediaRequestHandlerWhenReady(): void {
    if (app.isReady()) {
      this.setupDisplayMediaRequestHandler();
      return;
    }

    void app.whenReady().then(() => {
      this.setupDisplayMediaRequestHandler();
    });
  }

  private createDisplayLabelLookup(
    displays: Electron.Display[],
  ): Map<string, string> {
    return new Map(
      displays.flatMap((display) => {
        const label = display.label.trim();

        return label ? [[String(display.id), label]] : [];
      }),
    );
  }

  private pruneSourceThumbnailCache(
    options: { now?: number; sourceIds?: Set<string> } = {},
  ): void {
    const now = options.now ?? Date.now();

    for (const [sourceId, cached] of this.sourceThumbnailCache) {
      const isStale = now - cached.checkedAtMs >= SOURCE_THUMBNAIL_CACHE_MS;
      const isUnavailable =
        options.sourceIds !== undefined && !options.sourceIds.has(sourceId);

      if (isStale || isUnavailable) {
        this.sourceThumbnailCache.delete(sourceId);
      }
    }

    while (
      this.sourceThumbnailCache.size > SOURCE_THUMBNAIL_CACHE_MAX_ENTRIES
    ) {
      const oldestSourceId = this.sourceThumbnailCache.keys().next().value;
      this.sourceThumbnailCache.delete(oldestSourceId as string);
    }
  }

  private setupHandlers(): void {
    registerGuardedIpcHandler(
      CapturePreviewChannel.GetSourceThumbnail,
      [WindowName.Main],
      (_event, sourceId) => {
        try {
          assertString(
            sourceId,
            "sourceId",
            CapturePreviewChannel.GetSourceThumbnail,
            {
              min: 1,
              max: 512,
            },
          );

          return this.getSourceThumbnail(sourceId);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      CapturePreviewChannel.ListSources,
      [WindowName.Main, WindowName.AuraOverlay],
      (_event, forceRefresh) => {
        try {
          assertOptionalBoolean(
            forceRefresh,
            "forceRefresh",
            CapturePreviewChannel.ListSources,
          );

          return this.listSources(
            forceRefresh === true ? { forceRefresh: true } : {},
          );
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      CapturePreviewChannel.PrepareDisplayMediaSource,
      [WindowName.Main, WindowName.AuraOverlay],
      (event, sourceId) => {
        try {
          assertString(
            sourceId,
            "sourceId",
            CapturePreviewChannel.PrepareDisplayMediaSource,
            {
              min: 1,
              max: 512,
            },
          );

          return this.prepareDisplayMediaSource(event, sourceId);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      CapturePreviewChannel.ReportFailure,
      [WindowName.AuraOverlay],
      (_event, sourceId, error) => {
        try {
          assertString(
            sourceId,
            "sourceId",
            CapturePreviewChannel.ReportFailure,
            { min: 1, max: 512 },
          );
          assertString(error, "error", CapturePreviewChannel.ReportFailure, {
            min: 1,
            max: 512,
          });
          this.reportCaptureFailure(sourceId, error);
        } catch (validationError) {
          return handleValidationError(validationError);
        }
      },
    );
  }
}

function detectCapturePreviewSourceGame(
  sourceName: string,
  poeProcessSnapshot: PoeProcessSnapshot,
): GameId | null {
  const titleGame = detectPathOfExileWindowTitle(sourceName);
  if (titleGame) {
    return titleGame;
  }

  // Electron can sometimes expose only the running Path of Exile executable
  // name as the source name. Running PoE1 and PoE2 at the same time with the
  // same executable name is intentionally unsupported; exact window titles
  // remain authoritative.
  for (const game of POE_PROCESS_GAMES) {
    const state = getPoeProcessStateForGame(poeProcessSnapshot, game);
    if (
      state.isRunning &&
      isMatchingPoeProcessSourceName(sourceName, state.processName)
    ) {
      return game;
    }
  }

  return null;
}

function isMatchingPoeProcessSourceName(
  sourceName: string,
  processName: string,
): boolean {
  const normalizedSourceName = normalizeProcessSourceName(sourceName);
  const normalizedProcessName = normalizeProcessSourceName(processName);

  return (
    normalizedProcessName.length > 0 &&
    (normalizedSourceName === normalizedProcessName ||
      normalizedSourceName === `[${normalizedProcessName}]`)
  );
}

function normalizeProcessSourceName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export { CapturePreviewService };

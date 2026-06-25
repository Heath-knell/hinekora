import { desktopCapturer, screen } from "electron";

import { WindowName } from "~/main/modules/main-window/MainWindow.types";
import { PoeProcessService } from "~/main/modules/poe-process";
import { isPoeProcessStateForGame } from "~/main/pollers";
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
  detectPathOfExileWindowTitle,
  normalizeCapturePreviewSources,
} from "./CapturePreview.sources";

const SOURCE_ID_CACHE_MS = 1_500;
const SOURCE_THUMBNAIL_CACHE_MS = 10_000;
const SOURCE_THUMBNAIL_CACHE_MAX_ENTRIES = 16;
const GAME_RUNNING_CACHE_MS = 1_500;
const SLOW_SOURCE_LIST_MS = 250;

interface CapturePreviewListSourcesOptions {
  forceRefresh?: boolean;
}

class CapturePreviewService {
  private static instance: CapturePreviewService | null = null;
  private sourceListCache: CapturePreviewSource[] | null = null;
  private sourceListRequest: Promise<CapturePreviewSource[]> | null = null;
  private sourceIdCache: { checkedAtMs: number; ids: Set<string> } | null =
    null;
  private sourceIdRequest: Promise<Set<string>> | null = null;
  private sourceThumbnailCache = new Map<
    string,
    { checkedAtMs: number; dataUrl: string | null }
  >();
  private sourceThumbnailRequests = new Map<string, Promise<string | null>>();
  private gameRunningCache: {
    checkedAtMs: number;
    runningGames: Set<GameId>;
  } | null = null;
  private gameRunningRequest: Promise<Set<GameId>> | null = null;

  static getInstance(): CapturePreviewService {
    if (!CapturePreviewService.instance) {
      CapturePreviewService.instance = new CapturePreviewService();
    }

    return CapturePreviewService.instance;
  }

  constructor() {
    this.setupHandlers();
  }

  async listSources(
    options: CapturePreviewListSourcesOptions = {},
  ): Promise<CapturePreviewSource[]> {
    if (!options.forceRefresh && this.sourceListCache) {
      return this.sourceListCache;
    }

    if (options.forceRefresh) {
      this.sourceThumbnailCache.clear();
    }

    if (this.sourceListRequest) {
      return this.sourceListRequest;
    }

    this.sourceListRequest = this.collectSources(
      options.forceRefresh === true,
    ).finally(() => {
      this.sourceListRequest = null;
    });

    return this.sourceListRequest;
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
    const [sources, poeProcessState] = await Promise.all([
      desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 0, height: 0 },
      }),
      forceRefresh
        ? poeProcessService.refreshState()
        : Promise.resolve(poeProcessService.getState()),
    ]);

    const sourceInputs = sources.slice(0, 64).map((source) => {
      const displayId = source.display_id || null;
      const poeGame = detectPathOfExileWindowTitle(source.name);
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

      const game = detectPathOfExileWindowTitle(source.name);

      return game !== null && isPoeProcessStateForGame(poeProcessState, game);
    });

    const normalizedSources = normalizeCapturePreviewSources(
      filteredSourceInputs,
    ).map((source) => CapturePreviewSourceSchema.parse(source));
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

  async sourceExists(sourceId: string): Promise<boolean> {
    const ids = await this.listSourceIds();

    return ids.has(sourceId);
  }

  async isGameRunning(
    game: GameId,
    options: CapturePreviewListSourcesOptions = {},
  ): Promise<boolean> {
    const runningGames = await this.listRunningGames(options);

    return runningGames.has(game);
  }

  private async listRunningGames(
    options: CapturePreviewListSourcesOptions = {},
  ): Promise<Set<GameId>> {
    const now = Date.now();
    if (
      !options.forceRefresh &&
      this.gameRunningCache &&
      now - this.gameRunningCache.checkedAtMs < GAME_RUNNING_CACHE_MS
    ) {
      return this.gameRunningCache.runningGames;
    }

    if (!options.forceRefresh && this.gameRunningRequest) {
      return this.gameRunningRequest;
    }

    const poeProcessService = PoeProcessService.getInstance();
    this.gameRunningRequest = (
      options.forceRefresh
        ? poeProcessService.refreshState()
        : Promise.resolve(poeProcessService.getState())
    )
      .then(async (poeProcessState) => {
        const runningGames = new Set<GameId>();
        if (!poeProcessState.isRunning) {
          this.gameRunningCache = { checkedAtMs: Date.now(), runningGames };

          return runningGames;
        }

        const sources = await desktopCapturer.getSources({
          types: ["window"],
          thumbnailSize: { width: 0, height: 0 },
        });

        for (const source of sources) {
          const game = detectPathOfExileWindowTitle(source.name);
          if (game && isPoeProcessStateForGame(poeProcessState, game)) {
            runningGames.add(game);
          }
        }
        this.gameRunningCache = { checkedAtMs: Date.now(), runningGames };

        return runningGames;
      })
      .finally(() => {
        this.gameRunningRequest = null;
      });

    return this.gameRunningRequest;
  }

  private async listSourceIds(): Promise<Set<string>> {
    const now = Date.now();
    if (
      this.sourceIdCache &&
      now - this.sourceIdCache.checkedAtMs < SOURCE_ID_CACHE_MS
    ) {
      return this.sourceIdCache.ids;
    }

    if (this.sourceIdRequest) {
      return this.sourceIdRequest;
    }

    this.sourceIdRequest = desktopCapturer
      .getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 0, height: 0 },
      })
      .then((sources) => {
        const ids = new Set(sources.map((source) => source.id));
        this.sourceIdCache = { checkedAtMs: Date.now(), ids };

        return ids;
      })
      .finally(() => {
        this.sourceIdRequest = null;
      });

    return this.sourceIdRequest;
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
      CapturePreviewChannel.SourceExists,
      [WindowName.Main, WindowName.AuraOverlay],
      (_event, sourceId) => {
        try {
          assertString(
            sourceId,
            "sourceId",
            CapturePreviewChannel.SourceExists,
            {
              min: 1,
              max: 512,
            },
          );

          return this.sourceExists(sourceId);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
  }
}

export { CapturePreviewService };

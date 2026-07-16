import { BrowserWindow } from "electron";

import { DatabaseService } from "~/main/modules/database";
import { WindowName } from "~/main/modules/main-window/MainWindow.types";
import { logInfo, logWarn } from "~/main/utils/app-log";
import {
  handleValidationError,
  IpcValidationError,
  safeErrorMessage,
} from "~/main/utils/ipc-validation";
import {
  getIpcWindowRole,
  registerGuardedIpcHandler,
} from "~/main/utils/ipc-window-roles";

import {
  type GameId,
  GameIdSchema,
  gameIds,
  type PoeLeague,
  type PoeLeagueProviderRecord,
  type PoeLeaguesSyncStatus,
} from "~/types";
import { PoeLeaguesChannel } from "./PoeLeagues.channels";
import type { PoeLeaguesChangedEvent } from "./PoeLeagues.dto";
import {
  createPoeLeaguesProvider,
  type PoeLeaguesProvider,
} from "./PoeLeagues.provider";
import {
  createLeagueRefreshPlan,
  getNextLeagueRefreshAt,
} from "./PoeLeagues.refresh";
import { PoeLeaguesRepository } from "./PoeLeagues.repository";
import {
  formatLeagueNames,
  getCurrentLeagueName,
  validateProviderLeagues,
} from "./PoeLeagues.validation";

interface PoeLeaguesServiceOptions {
  failedRefreshRetryMs?: number;
  now?: () => Date;
  provider?: PoeLeaguesProvider;
  providerRequestTimeoutMs?: number;
  repository?: PoeLeaguesRepository;
}

type PoeLeaguesChangeListener = (event: PoeLeaguesChangedEvent) => void;
const defaultProviderRequestTimeoutMs = 10_000;
const defaultFailedRefreshRetryMs = 15 * 60 * 1_000;

class PoeLeaguesService {
  private static instance: PoeLeaguesService | null = null;

  private readonly changeListeners = new Set<PoeLeaguesChangeListener>();
  private readonly failedRefreshRetryMs: number;
  private readonly fetchingGames = new Set<GameId>();
  private readonly inFlightRefreshes = new Map<GameId, Promise<PoeLeague[]>>();
  private isDisposed = false;
  private readonly now: () => Date;
  private readonly provider: PoeLeaguesProvider;
  private readonly providerRequestTimeoutMs: number;
  private readonly refreshErrors = new Map<GameId, string>();
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly repository: PoeLeaguesRepository;

  static getInstance(): PoeLeaguesService {
    if (!PoeLeaguesService.instance) {
      PoeLeaguesService.instance = new PoeLeaguesService();
    }

    return PoeLeaguesService.instance;
  }

  static resetForTests(): void {
    PoeLeaguesService.instance?.dispose();
    PoeLeaguesService.instance = null;
  }

  constructor(options: PoeLeaguesServiceOptions = {}) {
    this.failedRefreshRetryMs = Math.max(
      1,
      options.failedRefreshRetryMs ?? defaultFailedRefreshRetryMs,
    );
    this.now = options.now ?? (() => new Date());
    this.provider = options.provider ?? createPoeLeaguesProvider();
    this.providerRequestTimeoutMs =
      options.providerRequestTimeoutMs ?? defaultProviderRequestTimeoutMs;
    this.repository =
      options.repository ??
      new PoeLeaguesRepository(DatabaseService.getInstance());
    this.setupHandlers();
  }

  list(game: GameId): PoeLeague[] {
    return this.repository.listActive(game);
  }

  status(game: GameId): PoeLeaguesSyncStatus {
    const syncState = this.repository.getSyncState(game);
    return {
      error: this.refreshErrors.get(game) ?? null,
      isFetching: this.fetchingGames.has(game),
      lastSyncedAt: syncState?.lastSyncedAt ?? null,
      provider: syncState?.provider ?? this.provider.id,
    };
  }

  getSessionUserId(): string | null {
    return this.provider.getSessionUserId();
  }

  getPreviousSessionUserIds(): readonly string[] {
    return this.provider.getPreviousSessionUserIds();
  }

  onDidChange(listener: PoeLeaguesChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  async initialize(): Promise<void> {
    this.isDisposed = false;
    try {
      await Promise.all(gameIds.map((game) => this.refreshIfStale(game)));
    } finally {
      this.scheduleAutoRefresh();
    }
  }

  dispose(): void {
    this.isDisposed = true;
    this.clearRefreshTimer();
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async refreshIfStale(game: GameId): Promise<PoeLeague[]> {
    const syncState = this.repository.getSyncState(game);
    const refreshPlan = this.createRefreshPlan(syncState);

    if (refreshPlan.isStale) {
      logInfo("poe-leagues", "League catalog refresh check requires fetch", {
        cacheMaxAgeMs: this.provider.cacheMaxAgeMs,
        game,
        lastSyncedAt: refreshPlan.lastSyncedAt,
        nextRefreshAt: refreshPlan.nextRefreshAt,
        previousProvider: refreshPlan.previousProvider,
        provider: this.provider.id,
        refreshReason: refreshPlan.reason,
      });
    }

    return refreshPlan.isStale ? this.refresh(game) : this.list(game);
  }

  async refresh(game: GameId): Promise<PoeLeague[]> {
    const existing = this.inFlightRefreshes.get(game);
    if (existing) {
      logInfo("poe-leagues", "League provider fetch joined in-flight request", {
        game,
        provider: this.provider.id,
      });
      return existing;
    }

    const request = this.performRefresh(game);
    this.inFlightRefreshes.set(game, request);
    try {
      return await request;
    } finally {
      this.inFlightRefreshes.delete(game);
    }
  }

  private async performRefresh(game: GameId): Promise<PoeLeague[]> {
    this.fetchingGames.add(game);
    this.publishCurrentStateSafely(game);
    logInfo("poe-leagues", "League provider fetch started", {
      cacheMaxAgeMs: this.provider.cacheMaxAgeMs,
      game,
      provider: this.provider.id,
      requestTimeoutMs: this.providerRequestTimeoutMs,
    });

    let activeLeagues: PoeLeague[] = [];
    try {
      const leagues = validateProviderLeagues(
        await this.fetchProviderLeagues(game),
      );
      const syncedAt = this.now().toISOString();
      this.repository.replaceActive(game, leagues, this.provider.id, syncedAt);
      this.refreshErrors.delete(game);
      activeLeagues = this.list(game);
      logInfo("poe-leagues", "League provider fetch succeeded", {
        currentLeague: getCurrentLeagueName(leagues),
        game,
        leagueCount: leagues.length,
        leagues: formatLeagueNames(leagues),
        nextRefreshAt: getNextLeagueRefreshAt(
          syncedAt,
          this.provider.cacheMaxAgeMs,
        ),
        provider: this.provider.id,
        syncedAt,
      });
    } catch (error) {
      activeLeagues = this.listSafely(game);
      const syncState = this.getSyncStateSafely(game);
      this.refreshErrors.set(
        game,
        "Could not refresh the league catalog. Using cached data.",
      );
      logWarn("poe-leagues", "League provider fetch failed", {
        cachedCurrentLeague: getCurrentLeagueName(activeLeagues),
        cachedLeagueCount: activeLeagues.length,
        cachedLeagues: formatLeagueNames(activeLeagues),
        game,
        lastSyncedAt: syncState?.lastSyncedAt ?? null,
        nextAutomaticCheckAt: this.getNextAutomaticCheckAt(),
        nextRefreshAt: getNextLeagueRefreshAt(
          syncState?.lastSyncedAt ?? null,
          this.provider.cacheMaxAgeMs,
        ),
        provider: this.provider.id,
        reason: safeErrorMessage(error),
      });
    } finally {
      this.fetchingGames.delete(game);
      this.publishCurrentStateSafely(game);
    }

    return activeLeagues;
  }

  private async fetchProviderLeagues(
    game: GameId,
  ): Promise<readonly PoeLeagueProviderRecord[]> {
    const controller = new AbortController();
    let timeout!: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error("League provider request timed out"));
      }, this.providerRequestTimeoutMs);
    });

    try {
      return await Promise.race([
        this.provider.fetchLeagues(game, controller.signal),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  private scheduleAutoRefresh(): void {
    this.clearRefreshTimer();
    if (this.isDisposed) {
      return;
    }

    if (this.provider.cacheMaxAgeMs <= 0) {
      logInfo("poe-leagues", "League catalog auto refresh disabled", {
        cacheMaxAgeMs: this.provider.cacheMaxAgeMs,
        provider: this.provider.id,
      });
      return;
    }

    const delayMs = this.getNextAutomaticCheckDelayMs();
    const nextAutomaticCheckAt = new Date(
      this.now().getTime() + delayMs,
    ).toISOString();
    logInfo("poe-leagues", "League catalog auto refresh scheduled", {
      delayMs,
      nextAutomaticCheckAt,
      provider: this.provider.id,
    });

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.runAutomaticRefresh();
    }, delayMs);
    this.refreshTimer.unref?.();
  }

  private async runAutomaticRefresh(): Promise<void> {
    try {
      await Promise.all(gameIds.map((game) => this.refreshIfStale(game)));
    } catch (error) {
      logWarn("poe-leagues", "Automatic league refresh check failed", {
        provider: this.provider.id,
        reason: safeErrorMessage(error),
      });
    } finally {
      this.scheduleAutoRefresh();
    }
  }

  private publishChanged(event: PoeLeaguesChangedEvent): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (
        window.isDestroyed() ||
        window.webContents.isDestroyed() ||
        getIpcWindowRole({ sender: window.webContents }) !== WindowName.Main
      ) {
        continue;
      }

      window.webContents.send(PoeLeaguesChannel.Changed, event);
    }

    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        logWarn("poe-leagues", "League change listener failed", {
          reason: safeErrorMessage(error),
        });
      }
    }
  }

  private publishCurrentState(game: GameId): void {
    this.publishChanged({
      game,
      leagues: this.list(game),
      status: this.status(game),
    });
  }

  private publishCurrentStateSafely(game: GameId): void {
    try {
      this.publishCurrentState(game);
    } catch (error) {
      logWarn("poe-leagues", "Could not publish league catalog state", {
        game,
        reason: safeErrorMessage(error),
      });
    }
  }

  private listSafely(game: GameId): PoeLeague[] {
    try {
      return this.list(game);
    } catch (error) {
      logWarn("poe-leagues", "Could not read cached league catalog", {
        game,
        reason: safeErrorMessage(error),
      });
      return [];
    }
  }

  private getSyncStateSafely(
    game: GameId,
  ): ReturnType<PoeLeaguesRepository["getSyncState"]> {
    try {
      return this.repository.getSyncState(game);
    } catch (error) {
      logWarn("poe-leagues", "Could not read league synchronization state", {
        game,
        reason: safeErrorMessage(error),
      });
      return null;
    }
  }

  private setupHandlers(): void {
    registerGuardedIpcHandler(
      PoeLeaguesChannel.List,
      [WindowName.Main],
      async (_event, game: unknown) => {
        try {
          const parsedGame = parseGameInput(game, PoeLeaguesChannel.List);
          return this.list(parsedGame);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      PoeLeaguesChannel.Status,
      [WindowName.Main],
      async (_event, game: unknown) => {
        try {
          const parsedGame = parseGameInput(game, PoeLeaguesChannel.Status);

          return this.status(parsedGame);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      PoeLeaguesChannel.UserId,
      [WindowName.Main],
      async () => ({
        previousUserIds: this.getPreviousSessionUserIds(),
        userId: this.getSessionUserId(),
      }),
    );
  }

  private createRefreshPlan(
    syncState: ReturnType<PoeLeaguesRepository["getSyncState"]>,
  ) {
    return createLeagueRefreshPlan({
      cacheMaxAgeMs: this.provider.cacheMaxAgeMs,
      nowMs: this.now().getTime(),
      providerId: this.provider.id,
      syncState,
    });
  }

  private getNextAutomaticCheckAt(): string | null {
    if (this.provider.cacheMaxAgeMs <= 0) {
      return null;
    }

    return new Date(
      this.now().getTime() + this.getNextAutomaticCheckDelayMs(),
    ).toISOString();
  }

  private getNextAutomaticCheckDelayMs(): number {
    try {
      if (gameIds.some((game) => this.refreshErrors.has(game))) {
        return Math.min(this.failedRefreshRetryMs, this.provider.cacheMaxAgeMs);
      }

      return Math.min(
        ...gameIds.map((game) => {
          const refreshPlan = this.createRefreshPlan(
            this.repository.getSyncState(game),
          );
          if (refreshPlan.isStale || !refreshPlan.nextRefreshAt) {
            return 0;
          }

          return Math.max(
            0,
            Date.parse(refreshPlan.nextRefreshAt) - this.now().getTime(),
          );
        }),
      );
    } catch (error) {
      logWarn("poe-leagues", "Could not calculate next league refresh", {
        provider: this.provider.id,
        reason: safeErrorMessage(error),
      });
      return Math.min(this.failedRefreshRetryMs, this.provider.cacheMaxAgeMs);
    }
  }
}

function parseGameInput(value: unknown, channel: string): GameId {
  const parsedGame = GameIdSchema.safeParse(value);
  if (!parsedGame.success) {
    throw new IpcValidationError(channel, "game must be poe1 or poe2");
  }

  return parsedGame.data;
}

export { PoeLeaguesService };

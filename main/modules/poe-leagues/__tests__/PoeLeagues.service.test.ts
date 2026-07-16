import { afterEach, describe, expect, it, vi } from "vitest";

import { DatabaseService } from "~/main/modules/database";
import { WindowName } from "~/main/modules/main-window/MainWindow.types";
import { mockIpcMainHandlers } from "~/main/test/ipc";
import {
  clearIpcWindowRolesForTests,
  registerIpcWindowRole,
} from "~/main/utils/ipc-window-roles";

import type { PoeLeagueProviderRecord } from "~/types";
import { PoeLeaguesChannel } from "../PoeLeagues.channels";
import type { PoeLeaguesProvider } from "../PoeLeagues.provider";
import { PoeLeaguesRepository } from "../PoeLeagues.repository";
import { PoeLeaguesService } from "../PoeLeagues.service";
import { validateProviderLeagues } from "../PoeLeagues.validation";

const electronMocks = vi.hoisted(() => ({
  getAllWindows: vi.fn(() => []),
}));
const appLogMocks = vi.hoisted(() => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: () => "C:\\test",
    getVersion: () => "0.19.1",
  },
  BrowserWindow: { getAllWindows: electronMocks.getAllWindows },
  safeStorage: {
    decryptString: (buffer: Buffer) =>
      buffer.toString("utf8").replace(/^encrypted:/u, ""),
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`, "utf8"),
    isEncryptionAvailable: () => true,
  },
}));
vi.mock("~/main/utils/app-log", () => appLogMocks);

const nextLeague: PoeLeagueProviderRecord[] = [
  {
    endAt: null,
    id: "Next League",
    isCurrent: true,
    name: "Next League",
    startAt: null,
    updatedAt: null,
  },
  {
    endAt: null,
    id: "Standard",
    isCurrent: false,
    name: "Standard",
    startAt: null,
    updatedAt: null,
  },
];

function createProvider(
  fetchLeagues: PoeLeaguesProvider["fetchLeagues"],
  options: {
    cacheMaxAgeMs?: number;
    id?: string;
    previousSessionUserIds?: readonly string[];
    sessionUserId?: string | null;
  } = {},
): PoeLeaguesProvider {
  return {
    cacheMaxAgeMs: options.cacheMaxAgeMs ?? 0,
    fetchLeagues,
    getPreviousSessionUserIds: () => options.previousSessionUserIds ?? [],
    getSessionUserId: () => options.sessionUserId ?? null,
    id: options.id ?? "test-provider",
  };
}

describe("PoeLeaguesService", () => {
  afterEach(() => {
    appLogMocks.logInfo.mockReset();
    appLogMocks.logWarn.mockReset();
    electronMocks.getAllWindows.mockReset();
    electronMocks.getAllWindows.mockReturnValue([]);
    clearIpcWindowRolesForTests();
    PoeLeaguesService.resetForTests();
    DatabaseService.resetForTests();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("syncs an injected provider into SQLite and retains it as the UI source", async () => {
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const provider = createProvider(vi.fn().mockResolvedValue(nextLeague));
    const service = new PoeLeaguesService({
      now: () => new Date("2026-08-01T00:00:00.000Z"),
      provider,
      repository: new PoeLeaguesRepository(database),
    });

    await expect(service.refresh("poe1")).resolves.toEqual([
      expect.objectContaining({ id: "Next League", isCurrent: true }),
      expect.objectContaining({ id: "Standard", isCurrent: false }),
    ]);
    expect(service.list("poe1")[0]?.id).toBe("Next League");
  });

  it("creates and resets the singleton service", () => {
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");

    const first = PoeLeaguesService.getInstance();
    const second = PoeLeaguesService.getInstance();
    PoeLeaguesService.resetForTests();
    const third = PoeLeaguesService.getInstance();

    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });

  it("logs refresh decisions, fetched leagues, and next refresh eligibility", async () => {
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const fetchLeagues = vi.fn().mockResolvedValue(nextLeague);
    const provider = createProvider(fetchLeagues, {
      cacheMaxAgeMs: 24 * 60 * 60 * 1_000,
    });
    const service = new PoeLeaguesService({
      now: () => new Date("2026-08-01T00:00:00.000Z"),
      provider,
      repository: new PoeLeaguesRepository(database),
    });

    await service.refreshIfStale("poe1");

    expect(appLogMocks.logInfo).toHaveBeenCalledWith(
      "poe-leagues",
      "League catalog refresh check requires fetch",
      expect.objectContaining({
        game: "poe1",
        lastSyncedAt: null,
        nextRefreshAt: null,
        provider: "test-provider",
        refreshReason: "missing-sync-state",
      }),
    );
    expect(appLogMocks.logInfo).toHaveBeenCalledWith(
      "poe-leagues",
      "League provider fetch started",
      expect.objectContaining({
        game: "poe1",
        provider: "test-provider",
        requestTimeoutMs: 10_000,
      }),
    );
    expect(appLogMocks.logInfo).toHaveBeenCalledWith(
      "poe-leagues",
      "League provider fetch succeeded",
      expect.objectContaining({
        currentLeague: "Next League",
        game: "poe1",
        leagueCount: 2,
        leagues: "Next League, Standard",
        nextRefreshAt: "2026-08-02T00:00:00.000Z",
        provider: "test-provider",
        syncedAt: "2026-08-01T00:00:00.000Z",
      }),
    );

    appLogMocks.logInfo.mockClear();
    await service.refreshIfStale("poe1");

    expect(fetchLeagues).toHaveBeenCalledTimes(1);
    expect(appLogMocks.logInfo).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent refreshes per game", async () => {
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    let resolveProvider!: (value: PoeLeagueProviderRecord[]) => void;
    const fetchLeagues = vi.fn(
      () =>
        new Promise<PoeLeagueProviderRecord[]>((resolve) => {
          resolveProvider = resolve;
        }),
    );
    const service = new PoeLeaguesService({
      provider: createProvider(fetchLeagues),
    });

    const first = service.refresh("poe1");
    const second = service.refresh("poe1");
    resolveProvider(nextLeague);

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(fetchLeagues).toHaveBeenCalledTimes(1);
  });

  it("uses the SQLite catalog when a provider refresh fails", async () => {
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const service = new PoeLeaguesService({
      now: () => new Date("2026-08-01T00:00:00.000Z"),
      provider: createProvider(
        vi.fn().mockRejectedValue(new Error("offline")),
        {
          cacheMaxAgeMs: 24 * 60 * 60 * 1_000,
        },
      ),
    });

    await expect(service.refresh("poe2")).resolves.toEqual([
      expect.objectContaining({ id: "Standard", isCurrent: true }),
    ]);
    expect(service.status("poe2")).toMatchObject({
      error: "Could not refresh the league catalog. Using cached data.",
      provider: "test-provider",
    });
    expect(appLogMocks.logWarn).toHaveBeenCalledWith(
      "poe-leagues",
      "League provider fetch failed",
      expect.objectContaining({
        cachedCurrentLeague: "Standard",
        cachedLeagueCount: 1,
        cachedLeagues: "Standard",
        game: "poe2",
        lastSyncedAt: null,
        nextAutomaticCheckAt: "2026-08-01T00:15:00.000Z",
        nextRefreshAt: null,
        provider: "test-provider",
        reason: "offline",
      }),
    );
  });

  it("logs null cached current league when refresh fails against a non-current cache", async () => {
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    database.db
      .prepare("UPDATE poe_leagues SET is_current = 0 WHERE game = ?")
      .run("poe1");
    const service = new PoeLeaguesService({
      now: () => new Date("2026-08-01T00:00:00.000Z"),
      provider: createProvider(vi.fn().mockRejectedValue(new Error("offline"))),
    });

    await service.refresh("poe1");

    expect(appLogMocks.logWarn).toHaveBeenCalledWith(
      "poe-leagues",
      "League provider fetch failed",
      expect.objectContaining({
        cachedCurrentLeague: null,
        cachedLeagueCount: 1,
        game: "poe1",
      }),
    );
  });

  it("skips a fresh cache owned by the same provider", async () => {
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    repository.replaceActive(
      "poe1",
      nextLeague,
      "test-provider",
      "2026-08-01T00:00:00.000Z",
    );
    const fetchLeagues = vi.fn().mockResolvedValue(nextLeague);
    const service = new PoeLeaguesService({
      now: () => new Date("2026-08-01T01:00:00.000Z"),
      provider: createProvider(fetchLeagues, {
        cacheMaxAgeMs: 24 * 60 * 60 * 1_000,
      }),
      repository,
    });

    await service.refreshIfStale("poe1");

    expect(fetchLeagues).not.toHaveBeenCalled();
  });

  it("refreshes caches with changed providers, expired timestamps, or invalid sync state", async () => {
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    repository.replaceActive(
      "poe1",
      nextLeague,
      "old-provider",
      "2026-08-01T00:00:00.000Z",
    );
    repository.replaceActive("poe2", nextLeague, "test-provider", "not-a-date");
    const fetchLeagues = vi.fn().mockResolvedValue(nextLeague);
    const service = new PoeLeaguesService({
      now: () => new Date("2026-08-03T00:00:00.000Z"),
      provider: createProvider(fetchLeagues, {
        cacheMaxAgeMs: 24 * 60 * 60 * 1_000,
      }),
      repository,
    });

    await service.refreshIfStale("poe1");
    await service.refreshIfStale("poe2");
    repository.replaceActive(
      "poe1",
      nextLeague,
      "test-provider",
      "2026-08-01T00:00:00.000Z",
    );
    await service.refreshIfStale("poe1");

    expect(fetchLeagues).toHaveBeenCalledTimes(3);
    expect(appLogMocks.logInfo).toHaveBeenCalledWith(
      "poe-leagues",
      "League catalog refresh check requires fetch",
      expect.objectContaining({
        game: "poe1",
        previousProvider: "old-provider",
        refreshReason: "provider-changed",
      }),
    );
    expect(appLogMocks.logInfo).toHaveBeenCalledWith(
      "poe-leagues",
      "League catalog refresh check requires fetch",
      expect.objectContaining({
        game: "poe2",
        nextRefreshAt: null,
        refreshReason: "invalid-sync-state",
      }),
    );
    expect(appLogMocks.logInfo).toHaveBeenCalledWith(
      "poe-leagues",
      "League catalog refresh check requires fetch",
      expect.objectContaining({
        game: "poe1",
        refreshReason: "cache-expired",
      }),
    );
  });

  it("validates IPC game inputs", async () => {
    const { handlers } = mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    new PoeLeaguesService({
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague), {
        cacheMaxAgeMs: 24 * 60 * 60 * 1_000,
      }),
    });

    expect(await handlers.get(PoeLeaguesChannel.List)?.({}, "poe1")).toEqual([
      expect.objectContaining({ id: "Standard" }),
    ]);
    expect(await handlers.get(PoeLeaguesChannel.List)?.({}, "diablo")).toEqual({
      error: "game must be poe1 or poe2",
      ok: false,
    });
    expect(
      await handlers.get(PoeLeaguesChannel.Status)?.({}, "poe1"),
    ).toMatchObject({ error: null, provider: "test-provider" });
    expect(
      await handlers.get(PoeLeaguesChannel.Status)?.({}, "diablo"),
    ).toEqual({
      error: "game must be poe1 or poe2",
      ok: false,
    });
  });

  it("returns the cached IPC list without starting a provider refresh", async () => {
    const { handlers } = mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    const listActive = vi.spyOn(repository, "listActive");
    new PoeLeaguesService({
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague), {
        cacheMaxAgeMs: 24 * 60 * 60 * 1_000,
      }),
      repository,
    });

    await expect(
      handlers.get(PoeLeaguesChannel.List)?.({}, "poe1"),
    ).resolves.toEqual([expect.objectContaining({ id: "Standard" })]);

    expect(listActive).toHaveBeenCalledTimes(1);
  });

  it("returns status without triggering a refresh check", async () => {
    const { handlers } = mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const fetchLeagues = vi.fn().mockResolvedValue(nextLeague);
    new PoeLeaguesService({
      provider: createProvider(fetchLeagues, {
        cacheMaxAgeMs: 24 * 60 * 60 * 1_000,
      }),
    });

    await expect(
      handlers.get(PoeLeaguesChannel.Status)?.({}, "poe1"),
    ).resolves.toMatchObject({ error: null, provider: "test-provider" });

    expect(fetchLeagues).not.toHaveBeenCalled();
  });

  it("does not log fresh-cache reads", async () => {
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    repository.replaceActive(
      "poe1",
      nextLeague,
      "test-provider",
      "2026-08-01T00:00:00.000Z",
    );
    const service = new PoeLeaguesService({
      now: () => new Date("2026-08-01T01:00:00.000Z"),
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague), {
        cacheMaxAgeMs: 24 * 60 * 60 * 1_000,
      }),
      repository,
    });

    await service.refreshIfStale("poe1");

    expect(appLogMocks.logInfo).not.toHaveBeenCalledWith(
      "poe-leagues",
      "League catalog refresh skipped; cache is fresh",
      expect.anything(),
    );
  });

  it("allows catalog reads only from the main window", async () => {
    const { handlers } = mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    new PoeLeaguesService({
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague)),
    });
    const mainEvent = createIpcEvent(1, WindowName.Main);
    const overlayEvent = createIpcEvent(2, WindowName.RecorderOverlay);

    expect(
      await handlers.get(PoeLeaguesChannel.List)?.(mainEvent, "poe1"),
    ).toEqual([expect.objectContaining({ id: "Standard" })]);
    expect(() =>
      handlers.get(PoeLeaguesChannel.List)?.(overlayEvent, "poe1"),
    ).toThrow("poe-leagues:list is not available from this window");
    expect(() =>
      handlers.get(PoeLeaguesChannel.Status)?.(overlayEvent, "poe1"),
    ).toThrow("poe-leagues:status is not available from this window");
  });

  it("exposes the pseudonymous identity only to the main window", async () => {
    const { handlers } = mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    new PoeLeaguesService({
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague), {
        previousSessionUserIds: ["previous-session-user-id"],
        sessionUserId: "session-user-id",
      }),
    });
    const mainEvent = createIpcEvent(1, WindowName.Main);
    const overlayEvent = createIpcEvent(2, WindowName.RecorderOverlay);

    await expect(
      handlers.get(PoeLeaguesChannel.UserId)?.(mainEvent),
    ).resolves.toEqual({
      previousUserIds: ["previous-session-user-id"],
      userId: "session-user-id",
    });
    expect(() =>
      handlers.get(PoeLeaguesChannel.UserId)?.(overlayEvent),
    ).toThrow("poe-leagues:user-id is not available from this window");
  });

  it("publishes refreshed catalogs only to live main windows", async () => {
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const mainWindow = createMockWindow(10, WindowName.Main);
    const overlayWindow = createMockWindow(11, WindowName.RecorderOverlay);
    const destroyedWindow = createMockWindow(12, WindowName.Main, true);
    const destroyedWebContentsWindow = createMockWindow(
      13,
      WindowName.Main,
      false,
      true,
    );
    electronMocks.getAllWindows.mockReturnValue([
      mainWindow,
      overlayWindow,
      destroyedWindow,
      destroyedWebContentsWindow,
    ] as never);
    const service = new PoeLeaguesService({
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague)),
    });
    const publicationOrder: string[] = [];
    mainWindow.webContents.send.mockImplementation(() => {
      publicationOrder.push("catalog");
    });
    const changeListener = vi.fn();
    changeListener.mockImplementation(() => {
      publicationOrder.push("defaults");
    });
    const stopListening = service.onDidChange(changeListener);

    await service.refresh("poe1");

    expect(changeListener).toHaveBeenCalledWith(
      expect.objectContaining({ game: "poe1" }),
    );
    expect(publicationOrder).toEqual([
      "catalog",
      "defaults",
      "catalog",
      "defaults",
    ]);
    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      PoeLeaguesChannel.Changed,
      expect.objectContaining({ game: "poe1" }),
    );
    expect(overlayWindow.webContents.send).not.toHaveBeenCalled();
    expect(destroyedWindow.webContents.send).not.toHaveBeenCalled();
    expect(destroyedWebContentsWindow.webContents.send).not.toHaveBeenCalled();
    stopListening();
    await service.refresh("poe2");
    expect(changeListener).toHaveBeenCalledTimes(2);
  });

  it("logs league listener failures without interrupting publication", async () => {
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const service = new PoeLeaguesService({
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague)),
    });
    service.onDidChange(() => {
      throw new Error("listener failed");
    });

    await service.refresh("poe1");

    expect(appLogMocks.logWarn).toHaveBeenCalledWith(
      "poe-leagues",
      "League change listener failed",
      { reason: "listener failed" },
    );
  });

  it("times out a provider that never settles and keeps the SQLite catalog", async () => {
    vi.useFakeTimers();
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const fetchLeagues = vi.fn(
      () => new Promise<readonly PoeLeagueProviderRecord[]>(() => undefined),
    );
    const service = new PoeLeaguesService({
      provider: createProvider(fetchLeagues),
      providerRequestTimeoutMs: 50,
    });

    const request = service.refresh("poe1");
    await vi.advanceTimersByTimeAsync(50);

    await expect(request).resolves.toEqual([
      expect.objectContaining({ id: "Standard" }),
    ]);
  });

  it("always clears fetching state when publication and cache reads fail", async () => {
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    const listActive = vi
      .spyOn(repository, "listActive")
      .mockImplementation(() => {
        throw new Error("catalog read failed");
      });
    const getSyncState = vi
      .spyOn(repository, "getSyncState")
      .mockImplementation(() => {
        throw new Error("sync read failed");
      });
    const service = new PoeLeaguesService({
      provider: createProvider(
        vi.fn().mockRejectedValue(new Error("offline")),
        {
          cacheMaxAgeMs: 100,
        },
      ),
      repository,
    });

    await expect(service.refresh("poe1")).resolves.toEqual([]);
    expect(appLogMocks.logWarn).toHaveBeenCalledWith(
      "poe-leagues",
      "Could not publish league catalog state",
      expect.objectContaining({ game: "poe1" }),
    );
    expect(appLogMocks.logWarn).toHaveBeenCalledWith(
      "poe-leagues",
      "Could not read cached league catalog",
      expect.objectContaining({ game: "poe1" }),
    );
    expect(appLogMocks.logWarn).toHaveBeenCalledWith(
      "poe-leagues",
      "Could not read league synchronization state",
      expect.objectContaining({ game: "poe1" }),
    );

    listActive.mockRestore();
    getSyncState.mockRestore();
    expect(service.status("poe1").isFetching).toBe(false);
  });

  it("refreshes stale remote catalogs while the app remains open", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const fetchLeagues = vi.fn().mockResolvedValue(nextLeague);
    const service = new PoeLeaguesService({
      now: () => new Date(Date.now()),
      provider: createProvider(fetchLeagues, { cacheMaxAgeMs: 100 }),
    });

    await service.initialize();
    expect(fetchLeagues).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(100);
    expect(fetchLeagues).toHaveBeenCalledTimes(4);
    service.dispose();
  });

  it("schedules the next check from the earliest cached expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    const syncedAt = "2026-07-31T23:59:59.910Z";
    repository.replaceActive("poe1", nextLeague, "test-provider", syncedAt);
    repository.replaceActive("poe2", nextLeague, "test-provider", syncedAt);
    const fetchLeagues = vi.fn().mockResolvedValue(nextLeague);
    const service = new PoeLeaguesService({
      now: () => new Date(Date.now()),
      provider: createProvider(fetchLeagues, { cacheMaxAgeMs: 100 }),
      repository,
    });

    await service.initialize();
    expect(fetchLeagues).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(9);
    expect(fetchLeagues).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchLeagues).toHaveBeenCalledTimes(2);
    service.dispose();
  });

  it("retries failed automatic refreshes before the full cache window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const fetchLeagues = vi.fn().mockRejectedValue(new Error("offline"));
    const service = new PoeLeaguesService({
      failedRefreshRetryMs: 25,
      now: () => new Date(Date.now()),
      provider: createProvider(fetchLeagues, { cacheMaxAgeMs: 100 }),
    });

    await service.initialize();
    expect(fetchLeagues).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(24);
    expect(fetchLeagues).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchLeagues).toHaveBeenCalledTimes(4);
    service.dispose();
  });

  it("reschedules after an unexpected automatic refresh exception", async () => {
    vi.useFakeTimers();
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    vi.spyOn(repository, "getSyncState").mockImplementationOnce(() => {
      throw new Error("unexpected read failure");
    });
    const service = new PoeLeaguesService({
      failedRefreshRetryMs: 25,
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague), {
        cacheMaxAgeMs: 100,
      }),
      repository,
    });

    await invokeRunAutomaticRefresh(service);

    expect(appLogMocks.logWarn).toHaveBeenCalledWith(
      "poe-leagues",
      "Automatic league refresh check failed",
      expect.objectContaining({ reason: "unexpected read failure" }),
    );
    expect(vi.getTimerCount()).toBe(1);
    service.dispose();
  });

  it("uses the retry window when scheduling cannot read sync state", () => {
    vi.useFakeTimers();
    mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    vi.spyOn(repository, "getSyncState").mockImplementation(() => {
      throw new Error("sync unavailable");
    });
    const service = new PoeLeaguesService({
      failedRefreshRetryMs: 25,
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague), {
        cacheMaxAgeMs: 100,
      }),
      repository,
    });

    invokeScheduleAutoRefresh(service);

    expect(appLogMocks.logWarn).toHaveBeenCalledWith(
      "poe-leagues",
      "Could not calculate next league refresh",
      expect.objectContaining({ reason: "sync unavailable" }),
    );
    expect(vi.getTimerCount()).toBe(1);
    service.dispose();
  });

  it("disables automatic refresh when the provider has no cache window", async () => {
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const service = new PoeLeaguesService({
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague), {
        cacheMaxAgeMs: 0,
      }),
    });

    await service.initialize();

    expect(appLogMocks.logInfo).toHaveBeenCalledWith(
      "poe-leagues",
      "League catalog auto refresh disabled",
      {
        cacheMaxAgeMs: 0,
        provider: "test-provider",
      },
    );
  });

  it("does not schedule another check after disposal", () => {
    vi.useFakeTimers();
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const service = new PoeLeaguesService({
      provider: createProvider(vi.fn().mockResolvedValue(nextLeague), {
        cacheMaxAgeMs: 100,
      }),
    });

    service.dispose();
    invokeScheduleAutoRefresh(service);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("checks immediately when automatic scheduling finds a stale cache", async () => {
    vi.useFakeTimers();
    mockIpcMainHandlers();
    DatabaseService.getInstance(":memory:");
    const fetchLeagues = vi.fn().mockResolvedValue(nextLeague);
    const service = new PoeLeaguesService({
      now: () => new Date(Date.now()),
      provider: createProvider(fetchLeagues, { cacheMaxAgeMs: 100 }),
    });

    invokeScheduleAutoRefresh(service);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchLeagues).toHaveBeenCalledTimes(2);
    service.dispose();
  });

  it("rejects ambiguous and duplicate provider catalogs", () => {
    expect(() =>
      validateProviderLeagues(
        nextLeague.map((league) => ({ ...league, isCurrent: false })),
      ),
    ).toThrow("exactly one current league");
    expect(() =>
      validateProviderLeagues([nextLeague[0]!, nextLeague[0]!]),
    ).toThrow("duplicate ids");
    expect(() =>
      validateProviderLeagues([
        nextLeague[0]!,
        { ...nextLeague[1]!, name: nextLeague[0]!.name },
      ]),
    ).toThrow("duplicate names");
    expect(() =>
      validateProviderLeagues(
        Array.from({ length: 51 }, (_value, index) => ({
          ...nextLeague[1]!,
          id: `league-${index}`,
          isCurrent: index === 0,
          name: `League ${index}`,
        })),
      ),
    ).toThrow();
    expect(() =>
      validateProviderLeagues([
        { ...nextLeague[0]!, name: "" },
        nextLeague[1]!,
      ]),
    ).toThrow();
    expect(() =>
      validateProviderLeagues([
        { ...nextLeague[0]!, startAt: "2026-09-01" },
        nextLeague[1]!,
      ]),
    ).toThrow();
  });
});

function invokeScheduleAutoRefresh(service: PoeLeaguesService): void {
  (
    service as unknown as {
      scheduleAutoRefresh(): void;
    }
  ).scheduleAutoRefresh();
}

async function invokeRunAutomaticRefresh(
  service: PoeLeaguesService,
): Promise<void> {
  await (
    service as unknown as {
      runAutomaticRefresh(): Promise<void>;
    }
  ).runAutomaticRefresh();
}

function createIpcEvent(id: number, role: WindowName) {
  const webContents = { id };
  registerIpcWindowRole(webContents, role);
  return { sender: webContents };
}

function createMockWindow(
  id: number,
  role: WindowName,
  destroyed = false,
  webContentsDestroyed = false,
) {
  const webContents = {
    id,
    isDestroyed: vi.fn(() => webContentsDestroyed),
    send: vi.fn(),
  };
  registerIpcWindowRole(webContents, role);
  return {
    isDestroyed: vi.fn(() => destroyed),
    webContents,
  };
}

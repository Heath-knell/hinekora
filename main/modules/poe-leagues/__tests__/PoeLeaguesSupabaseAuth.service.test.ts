import { afterEach, describe, expect, it, vi } from "vitest";

import type { GameId } from "~/types";
import { SupabasePoeLeaguesProvider } from "../PoeLeagues.provider";
import {
  maxSupabaseSessionTokenLength,
  maxSupabaseUserIdLength,
} from "../PoeLeaguesSessionStorage.service";
import { PoeLeaguesSupabaseAuthService } from "../PoeLeaguesSupabaseAuth.service";
import {
  createLeagueRow,
  createSupabasePoeLeaguesProviderFixture as createProvider,
  createSessionStorage,
  jsonResponse,
  type TestStoredSession,
} from "./PoeLeaguesSupabase.test-fixtures";

vi.mock("electron", () => ({
  app: {
    getPath: () => "C:\\test",
    getVersion: () => "0.19.1",
  },
  safeStorage: {
    decryptString: (buffer: Buffer) =>
      buffer.toString("utf8").replace(/^encrypted:/u, ""),
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`, "utf8"),
    isEncryptionAvailable: () => true,
  },
}));
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

describe("PoeLeaguesSupabaseAuthService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes the persisted pseudonymous identity before authentication", () => {
    const provider = createProvider(
      vi.fn<typeof fetch>(),
      createSessionStorage({
        load: vi.fn(() => ({
          refresh_token: "stored-refresh-token",
          user_id: "stored-user-id",
        })),
        loadUserIds: vi.fn(() => [
          "stored-user-id",
          "previous-user-id",
          "previous-user-id",
        ]),
      }),
    );

    expect(provider.getSessionUserId()).toBe("stored-user-id");
    expect(provider.getPreviousSessionUserIds()).toEqual(["previous-user-id"]);
  });

  it("returns no pseudonymous identity before a session exists", () => {
    expect(createProvider(vi.fn<typeof fetch>()).getSessionUserId()).toBeNull();
    expect(
      createProvider(vi.fn<typeof fetch>()).getPreviousSessionUserIds(),
    ).toEqual([]);
  });

  it("invalidates only the access token that was rejected", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "refreshed-access-token",
          expires_in: 3600,
          refresh_token: "refreshed-token",
          user: { id: "anon-user-id" },
        }),
      );
    const auth = new PoeLeaguesSupabaseAuthService({
      fetch: fetchImpl,
      now: () => new Date("2026-07-14T00:00:00.000Z"),
      publicApiKey: "public-api-key",
      sessionStorage: createSessionStorage(),
      supabaseUrl: "https://project.supabase.co",
    });

    await expect(auth.getAccessToken()).resolves.toBe("access-token");
    auth.invalidateAccessToken("newer-token");
    await expect(auth.getAccessToken()).resolves.toBe("access-token");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    auth.invalidateAccessToken("access-token");
    await expect(auth.getAccessToken()).resolves.toBe("refreshed-access-token");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("times out Supabase authentication independently of callers", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      });
    });
    const provider = new SupabasePoeLeaguesProvider({
      appVersion: "0.19.1",
      authRequestTimeoutMs: 5,
      fetch: fetchImpl,
      publicApiKey: "public-api-key",
      supabaseUrl: "https://project.supabase.co",
    });

    const request = provider.fetchLeagues("poe1");
    const rejection = expect(request).rejects.toThrow(
      "Supabase authentication timed out",
    );
    await vi.advanceTimersByTimeAsync(5);

    await rejection;
    vi.useRealTimers();
  });

  it("uses the default clock for relative Supabase auth expiry", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ leagues: [createLeagueRow({})] }));
    const provider = new SupabasePoeLeaguesProvider({
      appVersion: "0.19.1",
      fetch: fetchImpl,
      publicApiKey: "public-api-key",
      sessionStorage: createSessionStorage(),
      supabaseUrl: "https://project.supabase.co/",
    });

    await provider.fetchLeagues("poe2");

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("authenticates anonymously and calls the v2-get-leagues function", async () => {
    const sessionStorage = createSessionStorage();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          user: {
            id: "anon-user-id",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          leagues: [
            createLeagueRow({
              leagueId: "Standard",
              name: "Standard",
            }),
            createLeagueRow({
              leagueId: "Runes of Aldur",
              name: "Runes of Aldur",
              startAt: "2026-06-01T00:00:00.000Z",
            }),
          ],
        }),
      );
    const provider = createProvider(fetchImpl, sessionStorage);

    await expect(provider.fetchLeagues("poe2")).resolves.toEqual([
      expect.objectContaining({ id: "Standard", isCurrent: false }),
      expect.objectContaining({ id: "Runes of Aldur", isCurrent: true }),
    ]);

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/auth/v1/signup",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer public-api-key",
          apikey: "public-api-key",
        }),
        method: "POST",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/functions/v1/v2-get-leagues",
      expect.objectContaining({
        body: JSON.stringify({ game: "poe2" }),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          apikey: "public-api-key",
          "x-app-version": "hinekora: 0.19.1",
        }),
        method: "POST",
      }),
    );
    expect(sessionStorage.save).toHaveBeenCalledWith({
      refresh_token: "refresh-token",
      user_id: "anon-user-id",
    });
  });

  it("reuses the in-memory access token while it remains fresh", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          user: {
            id: "anon-user-id",
          },
        }),
      )
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ leagues: [createLeagueRow({})] })),
      );
    const provider = createProvider(fetchImpl);

    await provider.fetchLeagues("poe2");
    await provider.fetchLeagues("poe2");

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/signup",
      expect.anything(),
    );
  });

  it("does not persist anonymous auth sessions without refresh token or user id", async () => {
    const sessionStorage = createSessionStorage();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-token",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          leagues: [createLeagueRow({})],
        }),
      );
    const provider = createProvider(fetchImpl, sessionStorage);

    await provider.fetchLeagues("poe2");

    expect(sessionStorage.save).not.toHaveBeenCalled();
  });

  it("accepts absolute Supabase auth expiry timestamps", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-token",
          expires_at: 1_783_987_200,
          refresh_token: "refresh-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ leagues: [createLeagueRow({})] }));
    const provider = createProvider(fetchImpl);

    await provider.fetchLeagues("poe2");

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight anonymous auth request across concurrent fetches", async () => {
    const auth = createDeferred<Response>();
    const fetchImpl = vi.fn<typeof fetch>((url, init) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/auth/v1/signup")) {
        return auth.promise;
      }
      const body = JSON.parse(String(init?.body)) as { game: GameId };

      return Promise.resolve(
        jsonResponse({
          leagues: [createLeagueRow({ game: body.game })],
        }),
      );
    });
    const provider = createProvider(fetchImpl);

    const poe1Request = provider.fetchLeagues("poe1");
    const poe2Request = provider.fetchLeagues("poe2");
    await Promise.resolve();
    auth.resolve(
      jsonResponse({
        access_token: "access-token",
        expires_in: 3600,
        refresh_token: "refresh-token",
        user: { id: "anon-user-id" },
      }),
    );

    await expect(Promise.all([poe1Request, poe2Request])).resolves.toHaveLength(
      2,
    );
    expect(
      fetchImpl.mock.calls.filter(([url]) =>
        String(url).includes("/auth/v1/signup"),
      ),
    ).toHaveLength(1);
  });

  it("does not let one caller abort shared anonymous authentication", async () => {
    const auth = createDeferred<Response>();
    const fetchImpl = vi.fn<typeof fetch>((url, init) => {
      if (String(url).includes("/auth/v1/signup")) {
        return auth.promise;
      }
      const body = JSON.parse(String(init?.body)) as { game: GameId };
      return Promise.resolve(
        jsonResponse({ leagues: [createLeagueRow({ game: body.game })] }),
      );
    });
    const provider = createProvider(fetchImpl);
    const firstController = new AbortController();

    const first = provider.fetchLeagues("poe1", firstController.signal);
    const second = provider.fetchLeagues("poe2");
    firstController.abort(new Error("caller canceled"));
    auth.resolve(
      jsonResponse({
        access_token: "access-token",
        expires_in: 3600,
        refresh_token: "refresh-token",
        user: { id: "stable-user-id" },
      }),
    );

    await expect(first).rejects.toThrow("caller canceled");
    await expect(second).resolves.toHaveLength(1);
    expect(provider.getSessionUserId()).toBe("stable-user-id");
  });

  it("rejects an already-aborted caller without starting auth", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const provider = createProvider(fetchImpl);
    const controller = new AbortController();
    controller.abort(new Error("already canceled"));

    await expect(
      provider.fetchLeagues("poe1", controller.signal),
    ).rejects.toThrow("already canceled");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects when a caller aborts while shared authentication starts", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>(() => {
      controller.abort(new Error("canceled during auth"));
      return Promise.resolve(
        jsonResponse({ access_token: "access-token", expires_in: 3600 }),
      );
    });
    const provider = createProvider(fetchImpl);

    await expect(
      provider.fetchLeagues("poe1", controller.signal),
    ).rejects.toThrow("canceled during auth");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to anonymous auth when an expired in-memory session is rejected", async () => {
    let now = new Date("2026-07-14T00:00:00.000Z").getTime();
    const sessionStorage = createSessionStorage();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ leagues: [createLeagueRow({})] }))
      .mockResolvedValueOnce(jsonResponse({ error: "expired" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "new-access-token",
          expires_in: 3600,
          refresh_token: "new-refresh-token",
          user: { id: "new-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ leagues: [createLeagueRow({})] }));
    const provider = new SupabasePoeLeaguesProvider({
      appVersion: "0.19.1",
      fetch: fetchImpl,
      now: () => new Date(now),
      publicApiKey: "public-api-key",
      sessionStorage,
      supabaseUrl: "https://project.supabase.co/",
    });

    await provider.fetchLeagues("poe2");
    now += 3_700_000;
    await provider.fetchLeagues("poe2");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "https://project.supabase.co/auth/v1/token?grant_type=refresh_token",
      expect.anything(),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      "https://project.supabase.co/auth/v1/signup",
      expect.anything(),
    );
    expect(sessionStorage.clearSession).toHaveBeenCalledWith("anon-user-id");
    expect(sessionStorage.delete).not.toHaveBeenCalled();
  });

  it("keeps an expired in-memory session when refresh fails transiently", async () => {
    let now = new Date("2026-07-14T00:00:00.000Z").getTime();
    const sessionStorage = createSessionStorage();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ leagues: [createLeagueRow({})] }))
      .mockResolvedValueOnce(jsonResponse({ error: "server error" }, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "retried-access-token",
          expires_in: 3600,
          refresh_token: "retried-refresh-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ leagues: [createLeagueRow({})] }));
    const provider = new SupabasePoeLeaguesProvider({
      appVersion: "0.19.1",
      fetch: fetchImpl,
      now: () => new Date(now),
      publicApiKey: "public-api-key",
      sessionStorage,
      supabaseUrl: "https://project.supabase.co/",
    });

    await provider.fetchLeagues("poe2");
    now += 3_700_000;

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow(
      "Supabase auth refresh failed (500)",
    );
    await expect(provider.fetchLeagues("poe2")).resolves.toHaveLength(1);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      "https://project.supabase.co/auth/v1/token?grant_type=refresh_token",
      expect.objectContaining({
        body: JSON.stringify({ refresh_token: "refresh-token" }),
      }),
    );
    expect(sessionStorage.delete).not.toHaveBeenCalled();
  });

  it("refreshes a stored Supabase session before calling v2-get-leagues", async () => {
    const sessionStorage = createSessionStorage({
      load: vi.fn<() => TestStoredSession | null>(() => ({
        refresh_token: "stored-refresh-token",
        user_id: "stored-user-id",
      })),
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "refreshed-access-token",
          expires_in: 3600,
          refresh_token: "refreshed-refresh-token",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          leagues: [createLeagueRow({})],
        }),
      );
    const provider = createProvider(fetchImpl, sessionStorage);

    await provider.fetchLeagues("poe2");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/auth/v1/token?grant_type=refresh_token",
      expect.objectContaining({
        body: JSON.stringify({ refresh_token: "stored-refresh-token" }),
        method: "POST",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/functions/v1/v2-get-leagues",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer refreshed-access-token",
        }),
      }),
    );
    expect(sessionStorage.delete).not.toHaveBeenCalled();
    expect(sessionStorage.save).toHaveBeenCalledWith({
      refresh_token: "refreshed-refresh-token",
      user_id: "stored-user-id",
    });
  });

  it("archives a stale stored identity and signs in anonymously", async () => {
    const sessionStorage = createSessionStorage({
      load: vi.fn<() => TestStoredSession | null>(() => ({
        refresh_token: "stale-refresh-token",
        user_id: "stored-user-id",
      })),
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "invalid refresh" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "new-access-token",
          expires_in: 3600,
          refresh_token: "new-refresh-token",
          user: {
            id: "new-user-id",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          leagues: [createLeagueRow({})],
        }),
      );
    const provider = createProvider(fetchImpl, sessionStorage);

    await provider.fetchLeagues("poe2");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/auth/v1/token?grant_type=refresh_token",
      expect.anything(),
    );
    expect(sessionStorage.clearSession).toHaveBeenCalledWith("stored-user-id");
    expect(sessionStorage.delete).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/auth/v1/signup",
      expect.anything(),
    );
    expect(sessionStorage.save).toHaveBeenCalledWith({
      refresh_token: "new-refresh-token",
      user_id: "new-user-id",
    });
  });

  it("keeps a stored Supabase session when refresh fails transiently", async () => {
    const sessionStorage = createSessionStorage({
      load: vi.fn<() => TestStoredSession | null>(() => ({
        refresh_token: "stored-refresh-token",
        user_id: "stored-user-id",
      })),
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "server error" }, 500));
    const provider = createProvider(fetchImpl, sessionStorage);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow(
      "Supabase auth refresh failed (500)",
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/auth/v1/token?grant_type=refresh_token",
      expect.anything(),
    );
    expect(sessionStorage.delete).not.toHaveBeenCalled();
    expect(sessionStorage.save).not.toHaveBeenCalled();
  });

  it("rejects oversized anonymous auth responses", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("x".repeat(128 * 1024 + 1)));
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow(
      "Supabase anonymous auth failed: response body exceeds 131072 bytes",
    );
  });

  it.each([
    [
      "access token",
      {
        access_token: "x".repeat(maxSupabaseSessionTokenLength + 1),
        expires_in: 3600,
      },
    ],
    [
      "refresh token",
      {
        access_token: "access-token",
        expires_in: 3600,
        refresh_token: "x".repeat(maxSupabaseSessionTokenLength + 1),
      },
    ],
    [
      "user ID",
      {
        access_token: "access-token",
        expires_in: 3600,
        user: { id: "x".repeat(maxSupabaseUserIdLength + 1) },
      },
    ],
  ])("rejects an oversized Supabase auth %s", async (_field, response) => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(response));
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPoeLeaguesProvider,
  SupabasePoeLeaguesProvider,
  UnconfiguredPoeLeaguesProvider,
} from "../PoeLeagues.provider";
import {
  createLeagueRow,
  createSupabasePoeLeaguesProviderFixture as createProvider,
  createSessionStorage,
  jsonResponse,
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
describe("PoeLeaguesProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails refreshes when Supabase is not configured", async () => {
    const provider = new UnconfiguredPoeLeaguesProvider();

    expect(provider.getSessionUserId()).toBeNull();
    expect(provider.getPreviousSessionUserIds()).toEqual([]);

    await expect(provider.fetchLeagues("poe1")).rejects.toThrow(
      "Supabase league provider is not configured",
    );
  });

  it("creates an unconfigured provider when Supabase environment is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    const provider = createPoeLeaguesProvider();

    expect(provider).toBeInstanceOf(UnconfiguredPoeLeaguesProvider);
    await expect(provider.fetchLeagues("poe1")).rejects.toThrow(
      "Supabase league provider is not configured",
    );
  });

  it("creates Supabase providers only from the publishable environment key", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    expect(createPoeLeaguesProvider()).toBeInstanceOf(
      SupabasePoeLeaguesProvider,
    );

    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    expect(createPoeLeaguesProvider()).toBeInstanceOf(
      UnconfiguredPoeLeaguesProvider,
    );
  });

  it("requires non-empty Supabase provider configuration", () => {
    expect(
      () =>
        new SupabasePoeLeaguesProvider({
          publicApiKey: " ",
          supabaseUrl: "https://project.supabase.co",
        }),
    ).toThrow("Supabase public API key is required");
    expect(
      () =>
        new SupabasePoeLeaguesProvider({
          publicApiKey: "public-api-key",
          supabaseUrl: " ",
        }),
    ).toThrow("Supabase URL is required");
  });

  it("requires HTTPS outside loopback development", () => {
    expect(
      () =>
        new SupabasePoeLeaguesProvider({
          isPackaged: true,
          publicApiKey: "public-api-key",
          supabaseUrl: "http://project.supabase.co",
        }),
    ).toThrow("Supabase URL must use HTTPS");
    expect(
      () =>
        new SupabasePoeLeaguesProvider({
          isPackaged: false,
          publicApiKey: "public-api-key",
          supabaseUrl: "not a URL",
        }),
    ).toThrow("Supabase URL must be a valid URL");
    expect(
      () =>
        new SupabasePoeLeaguesProvider({
          isPackaged: false,
          publicApiKey: "public-api-key",
          supabaseUrl: "http://localhost:54321",
        }),
    ).not.toThrow();
  });

  it("uses default Supabase provider dependencies when options are omitted", () => {
    const provider = new SupabasePoeLeaguesProvider({
      publicApiKey: "public-api-key",
      supabaseUrl: "https://project.supabase.co/",
    });

    expect(provider.cacheMaxAgeMs).toBe(24 * 60 * 60 * 1_000);
  });

  it("labels blank app versions as unknown", async () => {
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
      appVersion: " ",
      fetch: fetchImpl,
      now: () => new Date("2026-07-14T00:00:00.000Z"),
      publicApiKey: "public-api-key",
      sessionStorage: createSessionStorage(),
      supabaseUrl: "https://project.supabase.co/",
    });

    await provider.fetchLeagues("poe2");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/functions/v1/v2-get-leagues",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-app-version": "hinekora: unknown",
        }),
      }),
    );
  });

  it("rejects invalid JSON from the league function", async () => {
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
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow(
      "PoE leagues function request failed: invalid JSON response",
    );
  });

  it("rejects oversized league function responses before parsing", async () => {
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
        new Response("{}", {
          headers: { "content-length": String(128 * 1024 + 1) },
          status: 200,
        }),
      );
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow(
      "PoE leagues function request failed: response body exceeds 131072 bytes",
    );
  });

  it("ignores invalid content-length headers and reads the bounded body", async () => {
    const functionResponse = () =>
      new Response(JSON.stringify({ leagues: [createLeagueRow({})] }), {
        headers: { "content-length": "-1" },
        status: 200,
      });
    const invalidContentLengthResponse = () =>
      new Response(JSON.stringify({ leagues: [createLeagueRow({})] }), {
        headers: { "content-length": "not-a-number" },
        status: 200,
      });
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
      .mockResolvedValueOnce(functionResponse())
      .mockResolvedValueOnce(invalidContentLengthResponse());
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).resolves.toEqual([
      expect.objectContaining({ id: "Standard" }),
    ]);
    await expect(provider.fetchLeagues("poe2")).resolves.toEqual([
      expect.objectContaining({ id: "Standard" }),
    ]);
  });

  it("rejects empty JSON responses from the league function", async () => {
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
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow();
  });

  it("treats a missing league function body as an empty JSON object", async () => {
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
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow();
  });

  it("refreshes authentication once when the league function rejects its token", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "rejected-access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "refreshed-access-token",
          expires_in: 3600,
          refresh_token: "refreshed-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ leagues: [createLeagueRow({})] }));
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).resolves.toEqual([
      expect.objectContaining({ id: "Standard" }),
    ]);

    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "https://project.supabase.co/auth/v1/token?grant_type=refresh_token",
      expect.objectContaining({
        body: JSON.stringify({ refresh_token: "refresh-token" }),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      "https://project.supabase.co/functions/v1/v2-get-leagues",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer refreshed-access-token",
        }),
      }),
    );
  });

  it("retries a rejected league function token only once", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "rejected-access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "forbidden" }, 403))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "second-rejected-access-token",
          expires_in: 3600,
          refresh_token: "refreshed-token",
          user: { id: "anon-user-id" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401));
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow(
      "PoE leagues function request failed (401)",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("does not reauthenticate for non-authorization function errors", async () => {
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
      .mockResolvedValueOnce(jsonResponse({ error: "unavailable" }, 500));
    const provider = createProvider(fetchImpl);

    await expect(provider.fetchLeagues("poe2")).rejects.toThrow(
      "PoE leagues function request failed (500)",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

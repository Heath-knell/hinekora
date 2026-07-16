import { app } from "electron";

import type { GameId, PoeLeagueProviderRecord } from "~/types";
import {
  isAuthorizationResponseError,
  parseJsonResponse,
} from "./PoeLeagues.http";
import type { PoeLeaguesSessionStorage } from "./PoeLeaguesSessionStorage.service";
import { mapSupabaseLeagueResponse } from "./PoeLeaguesSupabase.mapper";
import { PoeLeaguesSupabaseAuthService } from "./PoeLeaguesSupabaseAuth.service";

interface PoeLeaguesProvider {
  readonly cacheMaxAgeMs: number;
  readonly id: string;
  fetchLeagues(
    game: GameId,
    signal?: AbortSignal,
  ): Promise<readonly PoeLeagueProviderRecord[]>;
  getPreviousSessionUserIds(): readonly string[];
  getSessionUserId(): string | null;
}

interface SupabasePoeLeaguesProviderOptions {
  appVersion?: string;
  authRequestTimeoutMs?: number;
  cacheMaxAgeMs?: number;
  fetch?: typeof fetch;
  isPackaged?: boolean;
  now?: () => Date;
  publicApiKey: string;
  sessionStorage?: PoeLeaguesSessionStorage;
  supabaseUrl: string;
}

const oneDayMs = 24 * 60 * 60 * 1_000;
const appVersionHeaderName = "x-app-version";
const appVersionHeaderPrefix = "hinekora";
const unconfiguredProviderId = "supabase:unconfigured";
const supabaseProviderId = "supabase:v2-get-leagues";

class UnconfiguredPoeLeaguesProvider implements PoeLeaguesProvider {
  readonly cacheMaxAgeMs = oneDayMs;
  readonly id = unconfiguredProviderId;

  async fetchLeagues(_game: GameId, _signal?: AbortSignal): Promise<never> {
    throw new Error("Supabase league provider is not configured");
  }

  getPreviousSessionUserIds(): readonly string[] {
    return [];
  }

  getSessionUserId(): null {
    return null;
  }
}

class SupabasePoeLeaguesProvider implements PoeLeaguesProvider {
  readonly cacheMaxAgeMs: number;
  readonly id = supabaseProviderId;

  private readonly appVersionHeader: string;
  private readonly auth: PoeLeaguesSupabaseAuthService;
  private readonly fetchImpl: typeof fetch;
  private readonly publicApiKey: string;
  private readonly supabaseUrl: string;

  constructor(options: SupabasePoeLeaguesProviderOptions) {
    this.appVersionHeader = createAppVersionHeader(
      options.appVersion ?? app.getVersion(),
    );
    this.cacheMaxAgeMs = options.cacheMaxAgeMs ?? oneDayMs;
    this.fetchImpl = options.fetch ?? fetch;
    this.publicApiKey = normalizeRequiredConfigValue(
      options.publicApiKey,
      "Supabase public API key",
    );
    this.supabaseUrl = normalizeSupabaseUrl(
      options.supabaseUrl,
      options.isPackaged ?? app.isPackaged,
    );
    this.auth = new PoeLeaguesSupabaseAuthService({
      fetch: this.fetchImpl,
      publicApiKey: this.publicApiKey,
      supabaseUrl: this.supabaseUrl,
      ...(options.authRequestTimeoutMs === undefined
        ? {}
        : { requestTimeoutMs: options.authRequestTimeoutMs }),
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.sessionStorage === undefined
        ? {}
        : { sessionStorage: options.sessionStorage }),
    });
  }

  async fetchLeagues(
    game: GameId,
    signal?: AbortSignal,
  ): Promise<readonly PoeLeagueProviderRecord[]> {
    let accessToken = await this.auth.getAccessToken(signal);
    try {
      return await this.fetchLeaguesWithAccessToken(game, accessToken, signal);
    } catch (error) {
      if (!isAuthorizationResponseError(error)) {
        throw error;
      }

      this.auth.invalidateAccessToken(accessToken);
      accessToken = await this.auth.getAccessToken(signal);
      return this.fetchLeaguesWithAccessToken(game, accessToken, signal);
    }
  }

  getSessionUserId(): string | null {
    return this.auth.getSessionUserId();
  }

  getPreviousSessionUserIds(): readonly string[] {
    return this.auth.getPreviousSessionUserIds();
  }

  private async fetchLeaguesWithAccessToken(
    game: GameId,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<readonly PoeLeagueProviderRecord[]> {
    const response = await this.fetchImpl(
      `${this.supabaseUrl}/functions/v1/v2-get-leagues`,
      {
        body: JSON.stringify({ game }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          apikey: this.publicApiKey,
          [appVersionHeaderName]: this.appVersionHeader,
        },
        method: "POST",
        signal: signal ?? null,
      },
    );
    const data = await parseJsonResponse(
      response,
      "PoE leagues function request failed",
    );

    return mapSupabaseLeagueResponse(data, game);
  }
}

function createPoeLeaguesProvider(): PoeLeaguesProvider {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publicApiKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
  ).trim();

  if (!supabaseUrl || !publicApiKey) {
    return new UnconfiguredPoeLeaguesProvider();
  }

  return new SupabasePoeLeaguesProvider({ publicApiKey, supabaseUrl });
}

function normalizeSupabaseUrl(value: string, isPackaged: boolean): string {
  const normalized = normalizeRequiredConfigValue(value, "Supabase URL");
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Supabase URL must be a valid URL");
  }

  const isLoopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  const allowsLocalHttp = !isPackaged && url.protocol === "http:" && isLoopback;
  if (url.protocol !== "https:" && !allowsLocalHttp) {
    throw new Error(
      "Supabase URL must use HTTPS (HTTP is only allowed for local development)",
    );
  }

  return normalized.replace(/\/+$/, "");
}

function createAppVersionHeader(version: string): string {
  const normalized = version.trim();
  return `${appVersionHeaderPrefix}: ${normalized || "unknown"}`;
}

function normalizeRequiredConfigValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

export type { PoeLeaguesProvider };
export {
  createPoeLeaguesProvider,
  SupabasePoeLeaguesProvider,
  UnconfiguredPoeLeaguesProvider,
};

import { z } from "zod";

import {
  isRejectedAuthSessionError,
  parseJsonResponse,
} from "./PoeLeagues.http";
import {
  EncryptedPoeLeaguesSessionStorage,
  maxSupabaseSessionTokenLength,
  maxSupabaseUserIdLength,
  type PoeLeaguesSessionStorage,
} from "./PoeLeaguesSessionStorage.service";

interface PoeLeaguesSupabaseAuthOptions {
  fetch: typeof fetch;
  now?: () => Date;
  publicApiKey: string;
  requestTimeoutMs?: number;
  sessionStorage?: PoeLeaguesSessionStorage;
  supabaseUrl: string;
}

interface SupabaseSession {
  accessToken: string;
  expiresAtMs: number;
  refreshToken: string | null;
  userId: string | null;
}

const authRefreshBufferMs = 60 * 1_000;
const defaultAuthRequestTimeoutMs = 10_000;
const SupabaseAuthSessionSchema = z
  .object({
    access_token: z.string().min(1).max(maxSupabaseSessionTokenLength),
    expires_at: z.number().positive().optional(),
    expires_in: z.number().positive().optional(),
    refresh_token: z
      .string()
      .min(1)
      .max(maxSupabaseSessionTokenLength)
      .nullable()
      .optional(),
    user: z
      .object({
        id: z.string().min(1).max(maxSupabaseUserIdLength),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

class PoeLeaguesSupabaseAuthService {
  private authPromise: Promise<SupabaseSession> | null = null;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly publicApiKey: string;
  private readonly requestTimeoutMs: number;
  private session: SupabaseSession | null = null;
  private readonly sessionStorage: PoeLeaguesSessionStorage;
  private readonly supabaseUrl: string;

  constructor(options: PoeLeaguesSupabaseAuthOptions) {
    this.fetchImpl = options.fetch;
    this.now = options.now ?? (() => new Date());
    this.publicApiKey = options.publicApiKey;
    this.requestTimeoutMs = Math.max(
      1,
      options.requestTimeoutMs ?? defaultAuthRequestTimeoutMs,
    );
    this.sessionStorage =
      options.sessionStorage ?? new EncryptedPoeLeaguesSessionStorage();
    this.supabaseUrl = options.supabaseUrl;
  }

  async getAccessToken(signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) {
      throw signal.reason;
    }

    if (
      this.session &&
      this.session.expiresAtMs - authRefreshBufferMs > this.now().getTime()
    ) {
      return this.session.accessToken;
    }

    if (!this.authPromise) {
      const authPromise = this.createSession().then((session) => {
        this.session = session;
        this.persistSession(session);
        return session;
      });
      this.authPromise = authPromise;
      void authPromise.then(
        () => this.clearAuthPromise(),
        () => this.clearAuthPromise(),
      );
    }

    const session = await waitForPromiseWithSignal(this.authPromise, signal);
    return session.accessToken;
  }

  getSessionUserId(): string | null {
    if (this.session) {
      return this.session.userId;
    }

    return this.sessionStorage.load()?.user_id ?? null;
  }

  getPreviousSessionUserIds(): readonly string[] {
    const currentUserId = this.getSessionUserId();
    return [
      ...new Set(
        this.sessionStorage
          .loadUserIds()
          .filter((userId) => userId !== currentUserId),
      ),
    ].slice(0, 5);
  }

  invalidateAccessToken(accessToken: string): void {
    if (this.session?.accessToken === accessToken) {
      this.session.expiresAtMs = 0;
    }
  }

  private clearAuthPromise(): void {
    this.authPromise = null;
  }

  private async createSession(): Promise<SupabaseSession> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("Supabase authentication timed out")),
      this.requestTimeoutMs,
    );
    timeout.unref();

    try {
      return await this.createSessionRequest(controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async createSessionRequest(
    signal: AbortSignal,
  ): Promise<SupabaseSession> {
    if (this.session?.refreshToken) {
      try {
        return await this.refreshSession(
          this.session.refreshToken,
          signal,
          this.session.userId,
        );
      } catch (error) {
        if (!isRejectedAuthSessionError(error)) {
          throw error;
        }

        const rejectedUserId = this.session.userId;
        this.session = null;
        this.sessionStorage.clearSession(rejectedUserId);
      }
    }

    const storedSession = this.sessionStorage.load();
    if (storedSession) {
      try {
        return await this.refreshSession(
          storedSession.refresh_token,
          signal,
          storedSession.user_id,
        );
      } catch (error) {
        if (!isRejectedAuthSessionError(error)) {
          throw error;
        }

        this.sessionStorage.clearSession(storedSession.user_id);
      }
    }

    return this.signInAnonymously(signal);
  }

  private createAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.publicApiKey}`,
      "Content-Type": "application/json",
      apikey: this.publicApiKey,
    };
  }

  private normalizeAuthSession(
    value: unknown,
    fallbackUserId: string | null = null,
  ): SupabaseSession {
    const session = SupabaseAuthSessionSchema.parse(value);
    const expiresAtMs =
      typeof session.expires_at === "number"
        ? session.expires_at * 1_000
        : this.now().getTime() + (session.expires_in ?? 3_600) * 1_000;

    return {
      accessToken: session.access_token,
      expiresAtMs,
      refreshToken: session.refresh_token ?? null,
      userId: session.user?.id ?? fallbackUserId,
    };
  }

  private persistSession(session: SupabaseSession): void {
    if (!session.refreshToken || !session.userId) {
      return;
    }

    this.sessionStorage.save({
      refresh_token: session.refreshToken,
      user_id: session.userId,
    });
  }

  private async refreshSession(
    refreshToken: string,
    signal: AbortSignal,
    fallbackUserId: string | null = null,
  ): Promise<SupabaseSession> {
    const response = await this.fetchImpl(
      `${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        body: JSON.stringify({ refresh_token: refreshToken }),
        headers: this.createAuthHeaders(),
        method: "POST",
        signal,
      },
    );
    const data = await parseJsonResponse(
      response,
      "Supabase auth refresh failed",
    );

    return this.normalizeAuthSession(data, fallbackUserId);
  }

  private async signInAnonymously(
    signal: AbortSignal,
  ): Promise<SupabaseSession> {
    const response = await this.fetchImpl(
      `${this.supabaseUrl}/auth/v1/signup`,
      {
        body: JSON.stringify({
          data: {},
          gotrue_meta_security: {},
        }),
        headers: this.createAuthHeaders(),
        method: "POST",
        signal,
      },
    );
    const data = await parseJsonResponse(
      response,
      "Supabase anonymous auth failed",
    );

    return this.normalizeAuthSession(data);
  }
}

function waitForPromiseWithSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      reject(signal.reason);
    };
    signal.addEventListener("abort", handleAbort, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", handleAbort);
    });
  });
}

export { PoeLeaguesSupabaseAuthService };

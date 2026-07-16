import { vi } from "vitest";

import type { GameId } from "~/types";
import { SupabasePoeLeaguesProvider } from "../PoeLeagues.provider";

interface TestStoredSession {
  refresh_token: string;
  user_id: string;
}

interface TestSessionStorage {
  clearSession: ReturnType<typeof vi.fn<(userId: string | null) => void>>;
  delete: ReturnType<typeof vi.fn<() => void>>;
  load: ReturnType<typeof vi.fn<() => TestStoredSession | null>>;
  loadUserIds: ReturnType<typeof vi.fn<() => string[]>>;
  save: ReturnType<typeof vi.fn<(session: TestStoredSession) => void>>;
}

interface SupabaseLeagueRowFixture {
  endAt: string | null;
  game: GameId;
  id: string;
  isActive: boolean;
  isCurrent?: boolean;
  leagueId: string;
  name: string;
  startAt: string | null;
  updatedAt: string | null;
}

interface TestProviderOverrides {
  appVersion?: string;
  authRequestTimeoutMs?: number;
  isPackaged?: boolean;
  now?: () => Date;
  publicApiKey?: string;
  supabaseUrl?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function createSessionStorage(
  overrides: Partial<TestSessionStorage> = {},
): TestSessionStorage {
  return {
    clearSession: vi.fn<(userId: string | null) => void>(),
    delete: vi.fn<() => void>(),
    load: vi.fn<() => TestStoredSession | null>(() => null),
    loadUserIds: vi.fn<() => string[]>(() => []),
    save: vi.fn<(session: TestStoredSession) => void>(),
    ...overrides,
  };
}

function createSupabasePoeLeaguesProviderFixture(
  fetchImpl: typeof fetch,
  sessionStorage = createSessionStorage(),
  overrides: TestProviderOverrides = {},
): SupabasePoeLeaguesProvider {
  return new SupabasePoeLeaguesProvider({
    appVersion: "0.19.1",
    fetch: fetchImpl,
    now: () => new Date("2026-07-14T00:00:00.000Z"),
    publicApiKey: "public-api-key",
    sessionStorage,
    supabaseUrl: "https://project.supabase.co/",
    ...overrides,
  });
}

function createLeagueRow(
  overrides: Partial<SupabaseLeagueRowFixture> = {},
): SupabaseLeagueRowFixture {
  return {
    endAt: null,
    game: "poe2",
    id: "row-standard",
    isActive: true,
    leagueId: "Standard",
    name: "Standard",
    startAt: null,
    updatedAt: null,
    ...overrides,
  };
}

export type { TestSessionStorage, TestStoredSession };
export {
  createLeagueRow,
  createSessionStorage,
  createSupabasePoeLeaguesProviderFixture,
  jsonResponse,
};

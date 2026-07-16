type RefreshReason =
  | "cache-expired"
  | "fresh"
  | "invalid-sync-state"
  | "missing-sync-state"
  | "provider-changed";

interface LeagueSyncState {
  lastSyncedAt: string;
  provider: string;
}

interface LeagueRefreshPlan {
  isStale: boolean;
  lastSyncedAt: string | null;
  nextRefreshAt: string | null;
  previousProvider: string | null;
  reason: RefreshReason;
}

function createLeagueRefreshPlan(input: {
  cacheMaxAgeMs: number;
  nowMs: number;
  providerId: string;
  syncState: LeagueSyncState | null;
}): LeagueRefreshPlan {
  const lastSyncedAt = input.syncState?.lastSyncedAt ?? null;
  const lastSyncedAtMs = lastSyncedAt ? Date.parse(lastSyncedAt) : Number.NaN;
  const isLastSyncedAtValid = Number.isFinite(lastSyncedAtMs);
  const isProviderChanged =
    !!input.syncState && input.syncState.provider !== input.providerId;
  const isCacheExpired =
    isLastSyncedAtValid && input.nowMs - lastSyncedAtMs >= input.cacheMaxAgeMs;
  const reason: RefreshReason = !input.syncState
    ? "missing-sync-state"
    : isProviderChanged
      ? "provider-changed"
      : !isLastSyncedAtValid
        ? "invalid-sync-state"
        : isCacheExpired
          ? "cache-expired"
          : "fresh";

  return {
    isStale: reason !== "fresh",
    lastSyncedAt,
    nextRefreshAt: getNextLeagueRefreshAt(lastSyncedAt, input.cacheMaxAgeMs),
    previousProvider: input.syncState?.provider ?? null,
    reason,
  };
}

function getNextLeagueRefreshAt(
  lastSyncedAt: string | null,
  cacheMaxAgeMs: number,
): string | null {
  if (!lastSyncedAt) {
    return null;
  }

  const lastSyncedAtMs = Date.parse(lastSyncedAt);
  if (!Number.isFinite(lastSyncedAtMs)) {
    return null;
  }

  return new Date(lastSyncedAtMs + cacheMaxAgeMs).toISOString();
}

export { createLeagueRefreshPlan, getNextLeagueRefreshAt };

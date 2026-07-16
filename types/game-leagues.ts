import { z } from "zod";

const gameIds = ["poe1", "poe2"] as const;
type GameIdValue = (typeof gameIds)[number];

type LeagueSettingKey = `${GameIdValue}SelectedLeague`;
type MediaLibraryLeagueSettingKey = `${GameIdValue}MediaLibraryLeague`;

const PoeLeagueTimestampSchema = z.string().datetime({ offset: true }).max(64);
const NullablePoeLeagueTimestampSchema = PoeLeagueTimestampSchema.nullable();
const PoeLeagueSchema = z.object({
  endAt: NullablePoeLeagueTimestampSchema,
  id: z.string().min(1).max(80),
  isActive: z.boolean(),
  isCurrent: z.boolean(),
  name: z.string().min(1).max(80),
  startAt: NullablePoeLeagueTimestampSchema,
  updatedAt: NullablePoeLeagueTimestampSchema,
});
type PoeLeague = z.infer<typeof PoeLeagueSchema>;

const PoeLeaguesIpcErrorSchema = z
  .object({
    error: z.string().min(1).max(256),
    ok: z.literal(false),
  })
  .strict();
const PoeLeaguesListResultSchema = z.union([
  PoeLeagueSchema.array().max(50),
  PoeLeaguesIpcErrorSchema,
]);
type PoeLeaguesListResult = z.infer<typeof PoeLeaguesListResultSchema>;

const PoeLeaguesSyncStatusSchema = z
  .object({
    error: z.string().min(1).max(256).nullable(),
    isFetching: z.boolean(),
    lastSyncedAt: NullablePoeLeagueTimestampSchema,
    provider: z.string().min(1).max(80),
  })
  .strict();
type PoeLeaguesSyncStatus = z.infer<typeof PoeLeaguesSyncStatusSchema>;
const PoeLeaguesStatusResultSchema = z.union([
  PoeLeaguesSyncStatusSchema,
  PoeLeaguesIpcErrorSchema,
]);
type PoeLeaguesStatusResult = z.infer<typeof PoeLeaguesStatusResultSchema>;

const PoeLeaguesUserIdSchema = z
  .object({
    previousUserIds: z.array(z.string().min(1).max(256)).max(5),
    userId: z.string().min(1).max(256).nullable(),
  })
  .strict();
const PoeLeaguesUserIdResultSchema = z.union([
  PoeLeaguesUserIdSchema,
  PoeLeaguesIpcErrorSchema,
]);
type PoeLeaguesUserIdResult = z.infer<typeof PoeLeaguesUserIdResultSchema>;

const PoeLeaguesChangedEventSchema = z
  .object({
    game: z.enum(gameIds),
    leagues: PoeLeagueSchema.array().max(50),
    status: PoeLeaguesSyncStatusSchema,
  })
  .strict();
type PoeLeaguesChangedEvent = z.infer<typeof PoeLeaguesChangedEventSchema>;

const PoeLeagueProviderRecordSchema = PoeLeagueSchema.omit({
  isActive: true,
});
type PoeLeagueProviderRecord = z.infer<typeof PoeLeagueProviderRecordSchema>;

const fallbackPoeLeagues = {
  poe1: [
    {
      endAt: null,
      id: "Standard",
      isCurrent: true,
      name: "Standard",
      startAt: null,
      updatedAt: null,
    },
  ],
  poe2: [
    {
      endAt: null,
      id: "Standard",
      isCurrent: true,
      name: "Standard",
      startAt: null,
      updatedAt: null,
    },
  ],
} as const satisfies Record<GameIdValue, readonly PoeLeagueProviderRecord[]>;

const currentLeagueOptions: Record<GameIdValue, readonly string[]> = {
  poe1: createOrderedLeagueNames(fallbackPoeLeagues.poe1),
  poe2: createOrderedLeagueNames(fallbackPoeLeagues.poe2),
};

function createOrderedLeagueNames(
  leagues: readonly PoeLeagueProviderRecord[],
): string[] {
  return [
    ...leagues.filter((league) => league.isCurrent),
    ...leagues.filter((league) => !league.isCurrent),
  ].map((league) => league.name);
}

function createActivePoeLeagueCatalog(): Record<GameIdValue, PoeLeague[]> {
  return {
    poe1: fallbackPoeLeagues.poe1.map((league) => ({
      ...league,
      isActive: true,
    })),
    poe2: fallbackPoeLeagues.poe2.map((league) => ({
      ...league,
      isActive: true,
    })),
  };
}

function resolveCurrentLeagueName(
  leagues: readonly Pick<PoeLeagueProviderRecord, "isCurrent" | "name">[],
): string {
  return leagues.find((league) => league.isCurrent)?.name ?? "Standard";
}

function canNormalizePoeLeagueSelection(
  status: PoeLeaguesSyncStatus | undefined,
): boolean {
  return (
    status?.error === null &&
    status.isFetching === false &&
    status.lastSyncedAt !== null
  );
}

function getCurrentLeague(game: GameIdValue): string {
  return resolveCurrentLeagueName(fallbackPoeLeagues[game]);
}

function getLeagueSettingKey(game: GameIdValue): LeagueSettingKey {
  return game === "poe1" ? "poe1SelectedLeague" : "poe2SelectedLeague";
}

function getMediaLibraryLeagueSettingKey(
  game: GameIdValue,
): MediaLibraryLeagueSettingKey {
  return game === "poe1" ? "poe1MediaLibraryLeague" : "poe2MediaLibraryLeague";
}

export type {
  PoeLeague,
  PoeLeagueProviderRecord,
  PoeLeaguesChangedEvent,
  PoeLeaguesListResult,
  PoeLeaguesStatusResult,
  PoeLeaguesSyncStatus,
  PoeLeaguesUserIdResult,
};
export {
  canNormalizePoeLeagueSelection,
  createActivePoeLeagueCatalog,
  currentLeagueOptions,
  fallbackPoeLeagues,
  gameIds,
  getCurrentLeague,
  getLeagueSettingKey,
  getMediaLibraryLeagueSettingKey,
  PoeLeagueProviderRecordSchema,
  PoeLeagueSchema,
  PoeLeaguesChangedEventSchema,
  PoeLeaguesListResultSchema,
  PoeLeaguesStatusResultSchema,
  PoeLeaguesSyncStatusSchema,
  PoeLeaguesUserIdResultSchema,
  resolveCurrentLeagueName,
};

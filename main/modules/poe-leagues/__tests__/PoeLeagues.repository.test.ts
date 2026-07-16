import { afterEach, describe, expect, it } from "vitest";

import { DatabaseService } from "~/main/modules/database";

import { PoeLeaguesRepository } from "../PoeLeagues.repository";

describe("PoeLeaguesRepository", () => {
  afterEach(() => {
    DatabaseService.resetForTests();
  });

  it("lists seeded active leagues with the current league first", () => {
    const repository = new PoeLeaguesRepository(
      DatabaseService.getInstance(":memory:"),
    );

    expect(repository.listActive("poe1")).toEqual([
      expect.objectContaining({ id: "Standard", isCurrent: true }),
    ]);
    expect(repository.getCurrent("poe1")).toEqual(
      expect.objectContaining({ id: "Standard", isCurrent: true }),
    );
  });

  it("filters malformed SQLite league rows at the repository boundary", () => {
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);

    database.db
      .prepare(
        "UPDATE poe_leagues SET source_updated_at = ? WHERE game = ? AND id = ?",
      )
      .run("not-an-iso-date", "poe1", "Standard");

    expect(repository.getCurrent("poe1")).toBeNull();
    expect(repository.listActive("poe1")).toEqual([]);
  });

  it("returns null when no active league is marked current", () => {
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);

    database.db
      .prepare("UPDATE poe_leagues SET is_current = 0 WHERE game = ?")
      .run("poe1");

    expect(repository.getCurrent("poe1")).toBeNull();
  });

  it("atomically replaces active leagues while retaining historical rows", () => {
    const database = DatabaseService.getInstance(":memory:");
    const repository = new PoeLeaguesRepository(database);
    database.db
      .prepare(
        `
          INSERT INTO poe_leagues (
            game,
            id,
            name,
            start_at,
            end_at,
            is_active,
            is_current,
            source_updated_at,
            synced_at,
            created_at
          )
          VALUES (?, ?, ?, NULL, NULL, 1, 0, NULL, ?, ?)
        `,
      )
      .run(
        "poe1",
        "Previous League",
        "Previous League",
        "2026-07-01T00:00:00.000Z",
        "2026-07-01T00:00:00.000Z",
      );

    repository.replaceActive(
      "poe1",
      [
        {
          endAt: null,
          id: "Next League",
          isCurrent: true,
          name: "Next League",
          startAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          endAt: null,
          id: "Standard",
          isCurrent: false,
          name: "Standard",
          startAt: null,
          updatedAt: null,
        },
      ],
      "test-provider",
      "2026-08-01T00:00:00.000Z",
    );

    expect(repository.listActive("poe1")).toEqual([
      expect.objectContaining({ id: "Next League", isCurrent: true }),
      expect.objectContaining({ id: "Standard", isCurrent: false }),
    ]);
    expect(repository.getCurrent("poe1")).toEqual(
      expect.objectContaining({ id: "Next League", isCurrent: true }),
    );
    expect(
      database.queryOne(
        database.kysely
          .selectFrom("poe_leagues")
          .select(["is_active", "is_current"])
          .where("game", "=", "poe1")
          .where("id", "=", "Previous League"),
      ),
    ).toEqual({ is_active: 0, is_current: 0 });
    expect(repository.getSyncState("poe1")).toEqual({
      lastSyncedAt: "2026-08-01T00:00:00.000Z",
      provider: "test-provider",
    });
  });
});

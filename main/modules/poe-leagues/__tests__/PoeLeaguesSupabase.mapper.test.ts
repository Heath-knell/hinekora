import { describe, expect, it } from "vitest";

import { normalizeSupabaseLeagueRows } from "../PoeLeaguesSupabase.mapper";
import { createLeagueRow } from "./PoeLeaguesSupabase.test-fixtures";

describe("PoE leagues Supabase mapper", () => {
  it("chooses the latest active non-Standard league as current", () => {
    expect(
      normalizeSupabaseLeagueRows(
        [
          createLeagueRow({}),
          createLeagueRow({
            id: "row-old",
            leagueId: "Old League",
            name: "Old League",
            startAt: "2026-01-01T00:00:00.000Z",
          }),
          createLeagueRow({
            id: "row-current",
            leagueId: "Runes of Aldur",
            name: "Runes of Aldur",
            startAt: "2026-06-01T00:00:00.000Z",
          }),
          createLeagueRow({
            id: "row-inactive",
            isActive: false,
            leagueId: "Inactive League",
            name: "Inactive League",
          }),
          createLeagueRow({
            game: "poe1",
            id: "row-other-game",
            leagueId: "Mirage",
            name: "Mirage",
          }),
        ],
        "poe2",
      ),
    ).toEqual([
      expect.objectContaining({ id: "Standard", isCurrent: false }),
      expect.objectContaining({ id: "Old League", isCurrent: false }),
      expect.objectContaining({ id: "Runes of Aldur", isCurrent: true }),
    ]);
  });

  it("marks Standard as current when it is the only active league", () => {
    expect(normalizeSupabaseLeagueRows([createLeagueRow({})], "poe2")).toEqual([
      expect.objectContaining({ id: "Standard", isCurrent: true }),
    ]);
  });

  it("trusts endpoint-provided current flags", () => {
    expect(
      normalizeSupabaseLeagueRows(
        [
          createLeagueRow({ isCurrent: false }),
          createLeagueRow({
            id: "row-newer",
            isCurrent: false,
            leagueId: "Newer League",
            name: "Newer League",
            startAt: "2026-07-01T00:00:00.000Z",
          }),
          createLeagueRow({
            id: "row-current",
            isCurrent: true,
            leagueId: "Runes of Aldur",
            name: "Runes of Aldur",
            startAt: "2026-06-01T00:00:00.000Z",
          }),
        ],
        "poe2",
      ),
    ).toEqual([
      expect.objectContaining({ id: "Standard", isCurrent: false }),
      expect.objectContaining({ id: "Newer League", isCurrent: false }),
      expect.objectContaining({ id: "Runes of Aldur", isCurrent: true }),
    ]);

    expect(
      normalizeSupabaseLeagueRows(
        [
          createLeagueRow({ isCurrent: false }),
          createLeagueRow({
            id: "row-newer",
            isCurrent: false,
            leagueId: "Newer League",
            name: "Newer League",
          }),
        ],
        "poe2",
      ),
    ).toEqual([
      expect.objectContaining({ id: "Standard", isCurrent: false }),
      expect.objectContaining({ id: "Newer League", isCurrent: false }),
    ]);
  });

  it("handles empty catalogs and candidate ordering", () => {
    expect(normalizeSupabaseLeagueRows([], "poe2")).toEqual([]);
    expect(
      normalizeSupabaseLeagueRows(
        [
          createLeagueRow({
            id: "row-no-date",
            leagueId: "No Date League",
            name: "No Date League",
          }),
          createLeagueRow({
            id: "row-dated",
            leagueId: "Dated League",
            name: "Dated League",
            startAt: "2026-07-01T00:00:00.000Z",
          }),
        ],
        "poe2",
      ),
    ).toEqual([
      expect.objectContaining({ id: "No Date League", isCurrent: false }),
      expect.objectContaining({ id: "Dated League", isCurrent: true }),
    ]);
    expect(
      normalizeSupabaseLeagueRows(
        [
          createLeagueRow({
            id: "row-newer",
            leagueId: "Newer League",
            name: "Newer League",
            startAt: "2026-07-01T00:00:00.000Z",
          }),
          createLeagueRow({
            id: "row-older",
            leagueId: "Older League",
            name: "Older League",
            startAt: "2026-06-01T00:00:00.000Z",
          }),
        ],
        "poe2",
      ),
    ).toEqual([
      expect.objectContaining({ id: "Newer League", isCurrent: true }),
      expect.objectContaining({ id: "Older League", isCurrent: false }),
    ]);
  });

  it("recognizes Standard by name even when the endpoint id differs", () => {
    expect(
      normalizeSupabaseLeagueRows(
        [
          createLeagueRow({
            id: "row-standard-alias",
            leagueId: "standard-poe2",
            name: "Standard",
            startAt: "2026-07-01T00:00:00.000Z",
          }),
          createLeagueRow({
            id: "row-league",
            leagueId: "Runes of Aldur",
            name: "Runes of Aldur",
            startAt: "2026-06-01T00:00:00.000Z",
          }),
        ],
        "poe2",
      ),
    ).toEqual([
      expect.objectContaining({ id: "standard-poe2", isCurrent: false }),
      expect.objectContaining({ id: "Runes of Aldur", isCurrent: true }),
    ]);
  });
});

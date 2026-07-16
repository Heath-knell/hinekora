import { describe, expect, it } from "vitest";

import { mapPoeLeagueRow } from "../PoeLeagues.mapper";

describe("PoeLeagues mapper", () => {
  it("rejects malformed SQLite rows before mapping", () => {
    expect(mapPoeLeagueRow(null)).toBeNull();
    expect(
      mapPoeLeagueRow({
        end_at: null,
        id: "",
        is_active: 1,
        is_current: 1,
        name: "Standard",
        source_updated_at: null,
        start_at: null,
      }),
    ).toBeNull();
  });
});

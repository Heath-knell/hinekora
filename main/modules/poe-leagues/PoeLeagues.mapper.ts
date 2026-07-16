import { z } from "zod";

import type { PoeLeague } from "~/types";
import { PoeLeagueSchema } from "~/types";

const PoeLeagueRowSchema = z.object({
  end_at: z.string().max(64).nullable(),
  id: z.string().min(1).max(80),
  is_active: z.union([z.literal(0), z.literal(1)]),
  is_current: z.union([z.literal(0), z.literal(1)]),
  name: z.string().min(1).max(80),
  source_updated_at: z.string().max(64).nullable(),
  start_at: z.string().max(64).nullable(),
});

function mapPoeLeagueRow(row: unknown): PoeLeague | null {
  const parsedRow = PoeLeagueRowSchema.safeParse(row);
  if (!parsedRow.success) {
    return null;
  }

  const rowData = parsedRow.data;
  const parsedLeague = PoeLeagueSchema.safeParse({
    endAt: rowData.end_at,
    id: rowData.id,
    isActive: rowData.is_active === 1,
    isCurrent: rowData.is_current === 1,
    name: rowData.name,
    startAt: rowData.start_at,
    updatedAt: rowData.source_updated_at,
  });

  return parsedLeague.success ? parsedLeague.data : null;
}

export { mapPoeLeagueRow };

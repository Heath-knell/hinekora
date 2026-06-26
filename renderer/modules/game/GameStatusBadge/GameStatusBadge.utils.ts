import type { PoeProcessState } from "~/main/modules/poe-process/PoeProcess.dto";
import { resolvePathOfExileProcessGame } from "~/types/path-of-exile-process";

import type { GameId } from "~/types";

function isPoeProcessStateForGame(
  state: PoeProcessState | null,
  game: GameId,
): boolean {
  return (
    state?.isRunning === true &&
    (state.game ?? resolvePathOfExileProcessGame(state.processName)) === game
  );
}

export { isPoeProcessStateForGame };

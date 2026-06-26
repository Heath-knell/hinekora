import type { GameId } from "~/types";

interface PoeProcessState {
  game?: GameId | null;
  isRunning: boolean;
  processName: string;
}

interface PoeProcessError {
  error: string;
}

export type { PoeProcessError, PoeProcessState };

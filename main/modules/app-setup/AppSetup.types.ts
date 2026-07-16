import type { AppSetupStep, GameId } from "~/types";

const SETUP_STEPS = {
  NOT_STARTED: 0,
  SELECT_GAME: 1,
  SELECT_CLIENT_PATH: 2,
  PRIVACY_INFO: 3,
} as const satisfies Record<string, AppSetupStep>;

type SetupState = {
  currentStep: AppSetupStep;
  isComplete: boolean;
  selectedGames: GameId[];
  poe1ClientPath: string | null;
  poe2ClientPath: string | null;
};

type StepValidationResult = {
  isValid: boolean;
  errors: string[];
};

type AppSetupResult = {
  success: boolean;
  error?: string;
};

export type { AppSetupResult, SetupState, StepValidationResult };
export { SETUP_STEPS };

import { describe, expect, it } from "vitest";

import {
  createPoeProcessSnapshot,
  createStoppedPoeProcessStates,
  type PoeProcessRunningState,
} from "~/main/modules/poe-process/PoeProcess.dto";

import {
  type E2EPoeProcessSnapshotFactory,
  e2ePoeProcessSnapshotFactoryScript,
} from "~/e2e/helpers/poe-process-fixture";
import type { GameId } from "~/types";

const games = ["poe1", "poe2"] as const satisfies readonly GameId[];

function createE2EPoeProcessSnapshotFactory(): E2EPoeProcessSnapshotFactory {
  const createFactory = Function(
    e2ePoeProcessSnapshotFactoryScript,
  )() as () => E2EPoeProcessSnapshotFactory;

  return createFactory();
}

function createRunningPoeProcessState(game: GameId): PoeProcessRunningState {
  return {
    game,
    isRunning: true,
    pid: game === "poe2" ? 4242 : 4241,
    processName: game === "poe2" ? "PathOfExileSteam.exe" : "PathOfExile.exe",
    windowTitle: game === "poe2" ? "Path of Exile 2" : "Path of Exile",
  };
}

describe("E2E PoE process fixture", () => {
  it("matches the stopped process snapshot DTO contract", () => {
    const factory = createE2EPoeProcessSnapshotFactory();
    const stoppedStates = createStoppedPoeProcessStates();

    expect(factory.createStoppedPoeProcessStates()).toEqual(stoppedStates);
    expect(factory.createPoeProcessSnapshot()).toEqual(
      createPoeProcessSnapshot(),
    );
    expect(factory.createPoeProcessSnapshot(stoppedStates, "poe2")).toEqual(
      createPoeProcessSnapshot(stoppedStates, "poe2"),
    );
  });

  it.each(games)("matches the %s running process snapshot contract", (game) => {
    const factory = createE2EPoeProcessSnapshotFactory();
    const runningState = createRunningPoeProcessState(game);
    const states = createStoppedPoeProcessStates();
    states[game] = runningState;

    expect(factory.createRunningPoeProcessState(game)).toEqual(runningState);
    expect(factory.createRunningPoeProcessState({ game })).toEqual(
      runningState,
    );
    expect(factory.createPoeProcessSnapshot(states, game)).toEqual(
      createPoeProcessSnapshot(states, game),
    );
    expect(
      factory.createPoeProcessSnapshotFromState(runningState, game),
    ).toEqual(createPoeProcessSnapshot(states, game));
  });

  it("matches the active-state fallback when no active game is selected", () => {
    const factory = createE2EPoeProcessSnapshotFactory();
    const states = createStoppedPoeProcessStates();
    states.poe2 = createRunningPoeProcessState("poe2");

    expect(factory.createPoeProcessSnapshot(states)).toEqual(
      createPoeProcessSnapshot(states),
    );
  });
});

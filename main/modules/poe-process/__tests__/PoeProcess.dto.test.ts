import { describe, expect, it } from "vitest";

import {
  createStoppedPoeProcessState,
  createStoppedPoeProcessStates,
  resolveRunningPoeGameFromStates,
} from "../PoeProcess.dto";

describe("resolveRunningPoeGameFromStates", () => {
  it("prefers the active running game", () => {
    const states = createStoppedPoeProcessStates();
    states.poe1 = {
      game: "poe1",
      isRunning: true,
      pid: 1,
      processName: "PathOfExile.exe",
      windowTitle: "Path of Exile",
    };
    states.poe2 = {
      game: "poe2",
      isRunning: true,
      pid: 2,
      processName: "PathOfExileSteam.exe",
      windowTitle: "Path of Exile 2",
    };

    expect(resolveRunningPoeGameFromStates(states.poe2, states)).toBe("poe2");
  });

  it("falls back to another running game", () => {
    const states = createStoppedPoeProcessStates();
    states.poe2 = {
      game: "poe2",
      isRunning: true,
      pid: 2,
      processName: "PathOfExileSteam.exe",
      windowTitle: "Path of Exile 2",
    };

    expect(
      resolveRunningPoeGameFromStates(
        createStoppedPoeProcessState("poe1"),
        states,
      ),
    ).toBe("poe2");
  });

  it("returns null when every game is stopped", () => {
    const states = createStoppedPoeProcessStates();

    expect(resolveRunningPoeGameFromStates(null, states)).toBeNull();
  });

  it("returns null when the per-game state map is unavailable", () => {
    expect(resolveRunningPoeGameFromStates(null, undefined)).toBeNull();
  });
});

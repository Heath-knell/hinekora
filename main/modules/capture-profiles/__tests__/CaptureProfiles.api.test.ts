import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultCaptureProfile } from "~/types";

const electronMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcRenderer: electronMocks,
}));

import { CaptureProfilesAPI } from "../CaptureProfiles.api";

describe("CaptureProfilesAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["create", () => CaptureProfilesAPI.create({ game: "poe1", name: "A" })],
    [
      "update",
      () => CaptureProfilesAPI.update({ id: "profile-1", name: "Updated" }),
    ],
    ["delete", () => CaptureProfilesAPI.delete("profile-1")],
  ])("rejects %s validation failures", async (_operation, request) => {
    electronMocks.invoke.mockResolvedValue({
      error: "Invalid capture profile",
      ok: false,
    });

    await expect(request()).rejects.toThrow("Invalid capture profile");
  });

  it("returns a successfully created profile unchanged", async () => {
    const profile = createDefaultCaptureProfile({
      game: "poe1",
      name: "Everyday recording",
    });
    electronMocks.invoke.mockResolvedValue(profile);

    await expect(
      CaptureProfilesAPI.create({ game: "poe1", name: "Everyday recording" }),
    ).resolves.toBe(profile);
  });
});

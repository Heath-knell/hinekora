import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultProfile } from "~/types";

const electronMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcRenderer: electronMocks,
}));

import { ProfilesAPI } from "../Profiles.api";
import { ProfilesChannel } from "../Profiles.channels";

describe("ProfilesAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["create", () => ProfilesAPI.create({ name: "Mapping" })],
    [
      "duplicate",
      () =>
        ProfilesAPI.duplicate({ name: "Mapping Copy", sourceId: "profile-1" }),
    ],
    ["update", () => ProfilesAPI.update({ id: "profile-1", name: "Bossing" })],
    ["delete", () => ProfilesAPI.delete("profile-1")],
    ["deleteAll", () => ProfilesAPI.deleteAll("profile-1")],
    ["select", () => ProfilesAPI.select("profile-1")],
  ])("rejects %s validation failures", async (_operation, request) => {
    electronMocks.invoke.mockResolvedValue({
      error: "Invalid aura profile",
      ok: false,
    });

    await expect(request()).rejects.toThrow("Invalid aura profile");
  });

  it("routes lifecycle mutations through their dedicated channels", async () => {
    const profile = createDefaultProfile({ name: "Mapping" });
    electronMocks.invoke.mockResolvedValueOnce(profile);

    await expect(
      ProfilesAPI.duplicate({ name: "Mapping Copy", sourceId: profile.id }),
    ).resolves.toBe(profile);
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(
      ProfilesChannel.Duplicate,
      { name: "Mapping Copy", sourceId: profile.id },
    );

    electronMocks.invoke.mockResolvedValueOnce([profile]);
    await expect(ProfilesAPI.delete(profile.id)).resolves.toEqual([profile]);
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(
      ProfilesChannel.Delete,
      profile.id,
    );

    electronMocks.invoke.mockResolvedValueOnce([profile]);
    await expect(ProfilesAPI.deleteAll(profile.id)).resolves.toEqual([profile]);
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(
      ProfilesChannel.DeleteAll,
      profile.id,
    );
  });

  it("subscribes to profile changes and removes the same listener", () => {
    const callback = vi.fn();
    const profile = createDefaultProfile({ name: "Mapping" });
    const unsubscribe = ProfilesAPI.onChanged(callback);
    const listener = electronMocks.on.mock.calls[0]?.[1];

    listener?.({}, [profile]);
    unsubscribe();

    expect(callback).toHaveBeenCalledWith([profile]);
    expect(electronMocks.removeListener).toHaveBeenCalledWith(
      ProfilesChannel.Changed,
      listener,
    );
  });
});

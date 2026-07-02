import { afterEach, describe, expect, it, vi } from "vitest";

import { WindowName } from "~/main/modules/main-window/MainWindow.types";
import { mockIpcMainHandlers } from "~/main/test/ipc";
import {
  clearIpcWindowRolesForTests,
  registerIpcWindowRole,
} from "~/main/utils/ipc-window-roles";

import { createDefaultSettings } from "~/types";
import { DatabaseService } from "../../database";
import { SettingsStoreChannel } from "../SettingsStore.channels";
import { SettingsStoreRepository } from "../SettingsStore.repository";
import { SettingsStoreService } from "../SettingsStore.service";

const electronMocks = vi.hoisted(() => ({
  getAllWindows: vi.fn<() => unknown[]>(() => []),
  ipcMainHandle: vi.fn(),
  setLoginItemSettings: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    setLoginItemSettings: electronMocks.setLoginItemSettings,
  },
  BrowserWindow: {
    getAllWindows: electronMocks.getAllWindows,
  },
  ipcMain: {
    handle: electronMocks.ipcMainHandle,
  },
}));

describe("SettingsStoreService", () => {
  afterEach(() => {
    clearIpcWindowRolesForTests();
    electronMocks.getAllWindows.mockReset();
    electronMocks.getAllWindows.mockReturnValue([]);
    electronMocks.ipcMainHandle.mockReset();
    electronMocks.setLoginItemSettings.mockReset();
    vi.restoreAllMocks();
    SettingsStoreService.resetForTests();
    DatabaseService.resetForTests();
  });

  it("merges validated settings updates through the repository", () => {
    const database = DatabaseService.getInstance(":memory:");
    const service = new SettingsStoreService();

    try {
      expect(service.get()).toMatchObject({
        activeGame: "poe1",
        activeLeague: "Standard",
      });
      expect(
        service.update({
          activeGame: "poe2",
          activeLeague: "Mercenaries",
          deathClipSeconds: 12,
          groupPlayDeathAlertDismissed: true,
          onboardingDismissedBeacons: ["game-selector"],
          poe1CharacterName: "Ailucannon",
          poe2CharacterName: "Ailumonk",
          recorderSettingsInfoAlertDismissed: true,
        }),
      ).toMatchObject({
        activeGame: "poe2",
        activeLeague: "Mercenaries",
        deathClipSeconds: 12,
        groupPlayDeathAlertDismissed: true,
        onboardingDismissedBeacons: ["game-selector"],
        poe1CharacterName: "Ailucannon",
        poe2CharacterName: "Ailumonk",
        recorderSettingsInfoAlertDismissed: true,
      });
      expect(() => service.update({ deathClipSeconds: 61 })).toThrow();
    } finally {
      database.close();
    }
  });

  it("caches settings reads and refreshes the cache after updates", () => {
    const database = DatabaseService.getInstance(":memory:");
    const get = vi.spyOn(SettingsStoreRepository.prototype, "get");
    const service = new SettingsStoreService();

    try {
      expect(service.get().activeGame).toBe("poe1");
      expect(service.get().activeGame).toBe("poe1");
      expect(get).toHaveBeenCalledTimes(1);

      service.update({ activeGame: "poe2" });
      expect(service.get().activeGame).toBe("poe2");
      expect(get).toHaveBeenCalledTimes(2);
    } finally {
      database.close();
    }
  });

  it("creates and reuses the singleton instance until reset", () => {
    const database = DatabaseService.getInstance(":memory:");

    try {
      const first = SettingsStoreService.getInstance();
      const second = SettingsStoreService.getInstance();

      expect(first).toBe(second);

      SettingsStoreService.resetForTests();
      const replacement = SettingsStoreService.getInstance();

      expect(replacement).not.toBe(first);
    } finally {
      database.close();
    }
  });

  it("replaces all settings with a validated snapshot", () => {
    const database = DatabaseService.getInstance(":memory:");
    const service = new SettingsStoreService();

    try {
      service.update({ activeGame: "poe2", activeLeague: "Mercenaries" });

      expect(
        service.replace({
          ...createDefaultSettings(),
          activeGame: "poe1",
          activeLeague: "Hardcore",
        }),
      ).toMatchObject({
        activeGame: "poe1",
        activeLeague: "Hardcore",
      });
    } finally {
      database.close();
    }
  });

  it("notifies subscribers when settings change", () => {
    const database = DatabaseService.getInstance(":memory:");
    const service = new SettingsStoreService();
    const listener = vi.fn();
    const unsubscribe = service.onDidChange(listener);

    try {
      const updatedSettings = service.update({ activeGame: "poe2" });

      expect(listener).toHaveBeenCalledWith(updatedSettings);

      listener.mockClear();
      const replacedSettings = service.replace({
        ...createDefaultSettings(),
        activeLeague: "Hardcore",
      });

      expect(listener).toHaveBeenCalledWith(replacedSettings);

      listener.mockClear();
      unsubscribe();
      service.update({ activeGame: "poe1" });

      expect(listener).not.toHaveBeenCalled();
    } finally {
      database.close();
    }
  });

  it("publishes settings changes to main and overlay windows", () => {
    const database = DatabaseService.getInstance(":memory:");
    const service = new SettingsStoreService();
    const mainWindow = createMockWindow(1, WindowName.Main);
    const auraOverlay = createMockWindow(2, WindowName.AuraOverlay);
    const recorderOverlay = createMockWindow(3, WindowName.RecorderOverlay);
    const clipPreviewOverlay = createMockWindow(
      4,
      WindowName.ClipPreviewOverlay,
    );
    const destroyedMainWindow = createMockWindow(5, WindowName.Main);
    destroyedMainWindow.isDestroyed.mockReturnValue(true);
    electronMocks.getAllWindows.mockReturnValue([
      mainWindow,
      auraOverlay,
      recorderOverlay,
      clipPreviewOverlay,
      destroyedMainWindow,
    ]);

    try {
      const updatedSettings = service.update({ activeGame: "poe2" });

      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        SettingsStoreChannel.Changed,
        updatedSettings,
      );
      expect(auraOverlay.webContents.send).toHaveBeenCalledWith(
        SettingsStoreChannel.Changed,
        updatedSettings,
      );
      expect(recorderOverlay.webContents.send).toHaveBeenCalledWith(
        SettingsStoreChannel.Changed,
        updatedSettings,
      );
      expect(clipPreviewOverlay.webContents.send).not.toHaveBeenCalled();
      expect(destroyedMainWindow.webContents.send).not.toHaveBeenCalled();
    } finally {
      database.close();
    }
  });

  it("keeps settings updates successful when a subscriber throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const database = DatabaseService.getInstance(":memory:");
    const service = new SettingsStoreService();
    const throwingListener = vi.fn(() => {
      throw new Error("listener failed");
    });
    const survivingListener = vi.fn();
    service.onDidChange(throwingListener);
    service.onDidChange(survivingListener);

    try {
      const updatedSettings = service.update({ activeGame: "poe2" });

      expect(updatedSettings.activeGame).toBe("poe2");
      expect(service.get().activeGame).toBe("poe2");
      expect(survivingListener).toHaveBeenCalledWith(updatedSettings);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("Settings change listener failed"),
        { error: "listener failed" },
      );
    } finally {
      database.close();
    }
  });

  it("applies login item settings when startup preferences change", () => {
    const database = DatabaseService.getInstance(":memory:");
    const service = new SettingsStoreService();

    try {
      service.update({ appLaunchOnStartup: true });
      expect(electronMocks.setLoginItemSettings).toHaveBeenLastCalledWith({
        args: [],
        openAsHidden: false,
        openAtLogin: true,
      });

      service.update({ appStartMinimized: true });
      expect(electronMocks.setLoginItemSettings).toHaveBeenLastCalledWith({
        args: ["--hidden"],
        openAsHidden: true,
        openAtLogin: true,
      });
    } finally {
      database.close();
    }
  });

  it("registers IPC handlers with validation", async () => {
    const { handlers } = mockIpcMainHandlers();
    const database = DatabaseService.getInstance(":memory:");
    new SettingsStoreService();

    try {
      expect(await handlers.get(SettingsStoreChannel.Get)?.({})).toMatchObject({
        activeGame: "poe1",
      });
      expect(
        await handlers.get(SettingsStoreChannel.Update)?.(
          {},
          { activeGame: "poe2" },
        ),
      ).toMatchObject({
        activeGame: "poe2",
      });
      expect(
        await handlers.get(SettingsStoreChannel.Update)?.({}, null),
      ).toEqual({
        ok: false,
        error: "settings must be an object",
      });
    } finally {
      database.close();
    }
  });
});

function createMockWindow(id: number, role: WindowName) {
  const window = {
    isDestroyed: vi.fn(() => false),
    webContents: {
      id,
      send: vi.fn(),
    },
  };
  registerIpcWindowRole(window.webContents, role);

  return window;
}

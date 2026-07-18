import { BrowserWindow } from "electron";

import { DatabaseService } from "~/main/modules/database";
import { WindowName } from "~/main/modules/main-window/MainWindow.types";
import { logWarn } from "~/main/utils/app-log";
import {
  assertObject,
  assertString,
  handleValidationError,
  IpcValidationError,
  safeErrorMessage,
} from "~/main/utils/ipc-validation";
import {
  getIpcWindowRole,
  registerGuardedIpcHandler,
} from "~/main/utils/ipc-window-roles";

import {
  type GameId,
  hasRenderableAuraPlacements,
  isProfileAvailableForGame,
  type Profile,
  type ProfileCreateInput,
  ProfileCreateInputSchema,
  type ProfileUpdateInput,
  ProfileUpdateInputSchema,
  resolveActiveGameProfile,
} from "~/types";
import { SettingsStoreService } from "../settings-store/SettingsStore.service";
import { ProfilesChannel } from "./Profiles.channels";
import { ProfilesRepository } from "./Profiles.repository";

const profileChangeWindowRoles = new Set([
  WindowName.Main,
  WindowName.AuraOverlay,
  WindowName.RecorderOverlay,
]);
const PROFILES_SCOPE = "profiles";

class ProfilesService {
  private static instance: ProfilesService | null = null;

  private readonly changeListeners = new Set<(profiles: Profile[]) => void>();
  private readonly repository: ProfilesRepository;

  static getInstance(): ProfilesService {
    if (!ProfilesService.instance) {
      ProfilesService.instance = new ProfilesService();
    }

    return ProfilesService.instance;
  }

  constructor() {
    this.repository = new ProfilesRepository(DatabaseService.getInstance());
    this.setupHandlers();
  }

  list(): Profile[] {
    return this.repository.list();
  }

  onDidChange(listener: (profiles: Profile[]) => void): () => void {
    this.changeListeners.add(listener);

    return () => {
      this.changeListeners.delete(listener);
    };
  }

  ensureDefaultProfile(): Profile {
    const profiles = this.list();
    const existingProfile =
      profiles.find((profile) => profile.game === null) ?? profiles[0] ?? null;
    if (existingProfile) {
      return existingProfile;
    }

    return this.create({ name: "Default Aura Profile" });
  }

  create(input: ProfileCreateInput): Profile {
    const profile = this.repository.create(
      ProfileCreateInputSchema.parse(input),
    );
    this.publishProfilesChanged();

    return profile;
  }

  update(input: ProfileUpdateInput): Profile {
    const profile = this.repository.update(
      ProfileUpdateInputSchema.parse(input),
    );
    this.publishProfilesChanged();

    return profile;
  }

  delete(id: string): void {
    this.repository.delete(id);
    this.publishProfilesChanged();
  }

  select(id: string): void {
    const settingsStore = SettingsStoreService.getInstance();
    const activeGame = settingsStore.get().activeGame;
    const profile = this.list().find((item) => item.id === id) ?? null;
    if (!profile || !isProfileAvailableForGame(profile, activeGame)) {
      throw new IpcValidationError(
        ProfilesChannel.Select,
        "profile is not available for the active game",
      );
    }

    settingsStore.update({ selectedProfileId: id });
  }

  replaceAll(profiles: Profile[]): void {
    this.repository.replaceAll(profiles);
    this.publishProfilesChanged();
  }

  upsertMany(profiles: Profile[]): void {
    const database = DatabaseService.getInstance();
    database.transaction(() => {
      for (const profile of profiles) {
        this.repository.upsert(profile);
      }
    });
    this.publishProfilesChanged();
  }

  private publishProfilesChanged(): void {
    const profiles = this.list();

    for (const listener of this.changeListeners) {
      try {
        listener(profiles);
      } catch (error) {
        logWarn(PROFILES_SCOPE, "Profile listener failed", {
          error: safeErrorMessage(error),
        });
      }
    }

    for (const window of BrowserWindow.getAllWindows()) {
      if (window.isDestroyed()) {
        continue;
      }

      const role = getIpcWindowRole({ sender: window.webContents });
      if (role && profileChangeWindowRoles.has(role)) {
        window.webContents.send(ProfilesChannel.Changed, profiles);
      }
    }
  }

  private setupHandlers(): void {
    registerGuardedIpcHandler(
      ProfilesChannel.List,
      [WindowName.Main, WindowName.AuraOverlay, WindowName.RecorderOverlay],
      () => this.list(),
    );
    registerGuardedIpcHandler(
      ProfilesChannel.Create,
      [WindowName.Main],
      (_event, input: unknown) => {
        try {
          assertObject(input, "profile", ProfilesChannel.Create);
          return this.create(input as ProfileCreateInput);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ProfilesChannel.Update,
      [WindowName.Main, WindowName.AuraOverlay],
      (_event, input: unknown) => {
        try {
          assertObject(input, "profile", ProfilesChannel.Update);
          return this.update(input as ProfileUpdateInput);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ProfilesChannel.Delete,
      [WindowName.Main],
      (_event, id: unknown) => {
        try {
          assertString(id, "id", ProfilesChannel.Delete, {
            min: 1,
            max: 128,
          });
          this.delete(id);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ProfilesChannel.Select,
      [WindowName.Main, WindowName.RecorderOverlay],
      (_event, id: unknown) => {
        try {
          assertString(id, "id", ProfilesChannel.Select, {
            min: 1,
            max: 128,
          });
          this.select(id);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
  }
}

function resolveProfileForGame(
  profiles: Profile[],
  profileId: string | null | undefined,
  game: GameId,
): Profile | null {
  return resolveActiveGameProfile(profiles, profileId, game);
}

export {
  hasRenderableAuraPlacements,
  isProfileAvailableForGame,
  ProfilesService,
  resolveProfileForGame,
};

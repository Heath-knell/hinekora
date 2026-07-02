import { BrowserWindow } from "electron";

import { DatabaseService } from "~/main/modules/database";
import { WindowName } from "~/main/modules/main-window/MainWindow.types";
import { logWarn } from "~/main/utils/app-log";
import {
  assertObject,
  assertString,
  handleValidationError,
  safeErrorMessage,
} from "~/main/utils/ipc-validation";
import {
  getIpcWindowRole,
  registerGuardedIpcHandler,
} from "~/main/utils/ipc-window-roles";

import {
  type GameId,
  type Profile,
  type ProfileCreateInput,
  ProfileCreateInputSchema,
  type ProfileUpdateInput,
  ProfileUpdateInputSchema,
} from "~/types";
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

  resolveProfileForGame(
    profileId: string | null | undefined,
    game: GameId,
  ): Profile | null {
    return resolveProfileForGame(this.list(), profileId, game);
  }

  resolveRenderableProfileForGame(game: GameId): Profile | null {
    return resolveRenderableProfileForGame(this.list(), game);
  }

  hasRenderableAuraPlacements(profile: Profile): boolean {
    return hasRenderableAuraPlacements(profile);
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
  }
}

function isProfileAvailableForGame(profile: Profile, game: GameId): boolean {
  return profile.game === null || profile.game === game;
}

function resolveProfileForGame(
  profiles: Profile[],
  profileId: string | null | undefined,
  game: GameId,
): Profile | null {
  if (profileId) {
    const profile = profiles.find((item) => item.id === profileId) ?? null;

    return profile && isProfileAvailableForGame(profile, game) ? profile : null;
  }

  return (
    resolveRenderableProfileForGame(profiles, game) ??
    profiles.find((profile) => isProfileAvailableForGame(profile, game)) ??
    null
  );
}

function resolveRenderableProfileForGame(
  profiles: Profile[],
  game: GameId,
): Profile | null {
  return (
    profiles.find(
      (profile) =>
        isProfileAvailableForGame(profile, game) &&
        hasRenderableAuraPlacements(profile),
    ) ?? null
  );
}

function hasRenderableAuraPlacements(profile: Profile): boolean {
  const cropRegionIds = new Set(profile.cropRegions.map((crop) => crop.id));

  return profile.overlayPlacements.some((placement) =>
    cropRegionIds.has(placement.cropRegionId),
  );
}

export {
  hasRenderableAuraPlacements,
  isProfileAvailableForGame,
  ProfilesService,
  resolveProfileForGame,
  resolveRenderableProfileForGame,
};

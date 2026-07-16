import {
  chmodSync,
  existsSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { app, safeStorage } from "electron";
import { z } from "zod";

import { logWarn } from "~/main/utils/app-log";
import { safeErrorMessage } from "~/main/utils/ipc-validation";

const maxSessionFileBytes = 32 * 1024;
const maxSupabaseSessionTokenLength = 16 * 1024;
const maxSupabaseUserIdLength = 256;
const maxPreviousUserIds = 5;
const UserIdSchema = z.string().min(1).max(maxSupabaseUserIdLength);

const StoredSupabaseSessionSchema = z
  .object({
    refresh_token: z.string().min(1).max(maxSupabaseSessionTokenLength),
    user_id: UserIdSchema,
  })
  .strict();
const PreviousUserIdsSchema = z.array(UserIdSchema).max(maxPreviousUserIds);
const PersistedSupabaseSessionSchema = z
  .object({
    access_token: z
      .string()
      .min(1)
      .max(maxSupabaseSessionTokenLength)
      .optional(),
    previous_user_ids: PreviousUserIdsSchema.optional(),
    refresh_token: z.string().min(1).max(maxSupabaseSessionTokenLength),
    user_id: UserIdSchema,
  })
  .strict();
const PersistedUserIdHistorySchema = z
  .object({
    previous_user_ids: PreviousUserIdsSchema.min(1),
  })
  .strict();

type StoredSupabaseSession = z.infer<typeof StoredSupabaseSessionSchema>;
interface StoredSessionPayload {
  previousUserIds: string[];
  session: StoredSupabaseSession | null;
}

interface PoeLeaguesSessionStorage {
  clearSession(userId: string | null): void;
  delete(): void;
  load(): StoredSupabaseSession | null;
  loadUserIds(): string[];
  save(session: StoredSupabaseSession): void;
}

interface SessionStorageFileSystem {
  chmodSync(path: string, mode: number): void;
  existsSync(path: string): boolean;
  readFileSync(path: string): Buffer;
  renameSync(oldPath: string, newPath: string): void;
  statSync(path: string): { size: number };
  unlinkSync(path: string): void;
  writeFileSync(
    path: string,
    data: Buffer | string,
    encoding?: BufferEncoding,
  ): void;
}

interface SessionStorageSafeStorage {
  decryptString(buffer: Buffer): string;
  encryptString(value: string): Buffer;
  isEncryptionAvailable(): boolean;
}

interface EncryptedPoeLeaguesSessionStorageOptions {
  fileSystem?: SessionStorageFileSystem;
  nodeEnv?: string;
  platform?: NodeJS.Platform;
  safeStorage?: SessionStorageSafeStorage;
  sessionPath?: string;
}

const nodeFileSystem: SessionStorageFileSystem = {
  chmodSync,
  existsSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
};

class EncryptedPoeLeaguesSessionStorage implements PoeLeaguesSessionStorage {
  private readonly fileSystem: SessionStorageFileSystem;
  private readonly nodeEnv: string | undefined;
  private readonly platform: NodeJS.Platform;
  private readonly safeStorage: SessionStorageSafeStorage;
  private readonly sessionPath: string;
  private hasLoggedEncryptionUnavailable = false;

  constructor(options: EncryptedPoeLeaguesSessionStorageOptions = {}) {
    this.fileSystem = options.fileSystem ?? nodeFileSystem;
    this.nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
    this.platform = options.platform ?? process.platform;
    this.safeStorage = options.safeStorage ?? safeStorage;
    this.sessionPath =
      options.sessionPath ??
      join(app.getPath("userData"), "poe-leagues-supabase-session.enc");
  }

  save(session: StoredSupabaseSession): void {
    const parsedSession = StoredSupabaseSessionSchema.safeParse(session);
    if (!parsedSession.success) {
      return;
    }

    const existingPayload = this.loadPayload();
    const previousUserIds = normalizeUserIds([
      ...(existingPayload?.session?.user_id
        ? [existingPayload.session.user_id]
        : []),
      ...(existingPayload?.previousUserIds ?? []),
    ]).filter((userId) => userId !== parsedSession.data.user_id);
    const persistedSession = {
      ...parsedSession.data,
      ...(previousUserIds.length > 0
        ? { previous_user_ids: previousUserIds }
        : {}),
    };

    this.writePayload(persistedSession, "save");
  }

  load(): StoredSupabaseSession | null {
    return this.loadPayload()?.session ?? null;
  }

  loadUserIds(): string[] {
    const payload = this.loadPayload();
    if (!payload) {
      return [];
    }

    return [
      ...new Set([
        ...(payload.session?.user_id ? [payload.session.user_id] : []),
        ...payload.previousUserIds,
      ]),
    ].slice(0, maxPreviousUserIds + 1);
  }

  clearSession(userId: string | null): void {
    const existingPayload = this.loadPayload();
    const previousUserIds = normalizeUserIds([
      ...(userId ? [userId] : []),
      ...(existingPayload?.session?.user_id
        ? [existingPayload.session.user_id]
        : []),
      ...(existingPayload?.previousUserIds ?? []),
    ]);

    if (previousUserIds.length === 0) {
      this.delete();
      return;
    }

    this.writePayload({ previous_user_ids: previousUserIds }, "clear");
  }

  delete(): void {
    if (!this.fileSystem.existsSync(this.sessionPath)) {
      return;
    }

    try {
      this.fileSystem.unlinkSync(this.sessionPath);
    } catch (error) {
      this.logSessionPersistenceFailed("delete", error);
      // Best-effort cleanup only.
    }
  }

  private loadPayload(): StoredSessionPayload | null {
    if (!this.fileSystem.existsSync(this.sessionPath)) {
      return null;
    }

    try {
      const fileSize = this.fileSystem.statSync(this.sessionPath).size;
      if (
        !Number.isSafeInteger(fileSize) ||
        fileSize < 0 ||
        fileSize > maxSessionFileBytes
      ) {
        throw new Error("Stored Supabase session file is too large");
      }

      const sessionBuffer = this.fileSystem.readFileSync(this.sessionPath);
      if (sessionBuffer.byteLength > maxSessionFileBytes) {
        throw new Error("Stored Supabase session file is too large");
      }

      const sessionJson = this.readSessionJson(sessionBuffer);
      if (!sessionJson) {
        return null;
      }
      if (Buffer.byteLength(sessionJson, "utf8") > maxSessionFileBytes) {
        throw new Error("Stored Supabase session payload is too large");
      }

      const parsedJson: unknown = JSON.parse(sessionJson);
      const parsedSession =
        PersistedSupabaseSessionSchema.safeParse(parsedJson);
      if (parsedSession.success) {
        return {
          previousUserIds: normalizeUserIds(
            parsedSession.data.previous_user_ids ?? [],
          ).filter((userId) => userId !== parsedSession.data.user_id),
          session: {
            refresh_token: parsedSession.data.refresh_token,
            user_id: parsedSession.data.user_id,
          },
        };
      }

      const parsedHistory = PersistedUserIdHistorySchema.safeParse(parsedJson);
      if (parsedHistory.success) {
        return {
          previousUserIds: normalizeUserIds(
            parsedHistory.data.previous_user_ids,
          ),
          session: null,
        };
      }

      throw new Error("Stored Supabase session is invalid");
    } catch (error) {
      this.logSessionPersistenceFailed("load", error);
      this.delete();
      return null;
    }
  }

  private writePayload(
    payload: Record<string, unknown>,
    operation: "clear" | "save",
  ): void {
    const sessionJson = JSON.stringify(payload);
    try {
      if (this.safeStorage.isEncryptionAvailable()) {
        this.writeSessionFile(this.safeStorage.encryptString(sessionJson));
        return;
      }

      if (this.nodeEnv === "development") {
        this.writeSessionFile(sessionJson, "utf8");
        return;
      }

      this.logEncryptionUnavailable(operation);
    } catch (error) {
      this.logSessionPersistenceFailed(operation, error);
      // Best-effort persistence only. In-memory auth and SQLite cache still work.
    }
  }

  private readSessionJson(sessionBuffer: Buffer): string | null {
    if (this.safeStorage.isEncryptionAvailable()) {
      try {
        return this.safeStorage.decryptString(sessionBuffer);
      } catch {
        if (this.nodeEnv === "development") {
          return sessionBuffer.toString("utf8");
        }

        throw new Error("Stored Supabase session could not be decrypted");
      }
    }

    return this.nodeEnv === "development"
      ? sessionBuffer.toString("utf8")
      : this.handleEncryptionUnavailableRead();
  }

  private writeSessionFile(
    data: Buffer | string,
    encoding?: BufferEncoding,
  ): void {
    const temporaryPath = `${this.sessionPath}.tmp`;

    try {
      if (encoding) {
        this.fileSystem.writeFileSync(temporaryPath, data, encoding);
      } else {
        this.fileSystem.writeFileSync(temporaryPath, data);
      }

      if (this.platform !== "win32") {
        this.fileSystem.chmodSync(temporaryPath, 0o600);
      }

      this.fileSystem.renameSync(temporaryPath, this.sessionPath);
    } catch (error) {
      this.deleteFileIfPresent(temporaryPath);
      throw error;
    }
  }

  private deleteFileIfPresent(path: string): void {
    try {
      if (this.fileSystem.existsSync(path)) {
        this.fileSystem.unlinkSync(path);
      }
    } catch {
      // Best-effort cleanup of an incomplete temporary file.
    }
  }

  private handleEncryptionUnavailableRead(): null {
    this.logEncryptionUnavailable("load");
    return null;
  }

  private logEncryptionUnavailable(operation: "clear" | "load" | "save"): void {
    if (this.hasLoggedEncryptionUnavailable) {
      return;
    }

    this.hasLoggedEncryptionUnavailable = true;
    logWarn("poe-leagues", "Supabase session persistence unavailable", {
      operation,
      reason: "safeStorage-unavailable",
    });
  }

  private logSessionPersistenceFailed(
    operation: "clear" | "delete" | "load" | "save",
    error: unknown,
  ): void {
    logWarn("poe-leagues", "Supabase session persistence failed", {
      operation,
      reason: safeErrorMessage(error),
    });
  }
}

function normalizeUserIds(userIds: readonly string[]): string[] {
  return [...new Set(userIds)].slice(0, maxPreviousUserIds);
}

export type { PoeLeaguesSessionStorage, StoredSupabaseSession };
export {
  EncryptedPoeLeaguesSessionStorage,
  maxSupabaseSessionTokenLength,
  maxSupabaseUserIdLength,
};

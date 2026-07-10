import { createHash, randomUUID } from "node:crypto";
import { rm, stat, unlink } from "node:fs/promises";
import { basename } from "node:path";

import type { WebContents } from "electron";
import { app, BrowserWindow, shell } from "electron";

import { BookmarksService } from "~/main/modules/bookmarks";
import { DatabaseService } from "~/main/modules/database";
import { WindowName } from "~/main/modules/main-window/MainWindow.types";
import { ManagedRecorderService } from "~/main/modules/managed-recorder";
import type { ManagedReplayKind } from "~/main/modules/managed-recorder/ManagedRecorder.dto";
import { normalizeMediaLibraryPageQuery } from "~/main/modules/media-library/MediaLibrary.utils";
import { OverlayWindowsService } from "~/main/modules/overlay-windows";
import { RecordingStorageService } from "~/main/modules/recording-storage";
import { resolveRecordingStorageRoot } from "~/main/modules/recording-storage/RecordingStorage.utils";
import { SettingsStoreService } from "~/main/modules/settings-store";
import {
  createSafePathLogFields,
  logError,
  logInfo,
  logWarn,
} from "~/main/utils/app-log";
import * as FileClipboard from "~/main/utils/file-clipboard";
import {
  assertString,
  handleValidationError,
  safeErrorMessage,
} from "~/main/utils/ipc-validation";
import { registerGuardedIpcHandler } from "~/main/utils/ipc-window-roles";
import { readMp4DurationSeconds } from "~/main/utils/media-metadata";

import {
  type GameId,
  quickClipTrimMaximumSeconds,
  quickClipTrimMinimumSeconds,
  type ReplayClip,
  type ReplayClipKind,
} from "~/types";
import { ReplayClipsChannel } from "./ReplayClips.channels";
import type {
  DeathEvent,
  ReplayClipBatchFileActionResult,
  ReplayClipCopyInput,
  ReplayClipDetail,
  ReplayClipFileActionResult,
  ReplayClipLibraryPage,
  ReplayClipLibraryQuery,
  ReplayClipListFilter,
  ReplayClipOperationProgress,
  ReplayClipSourceDetail,
  ReplayClipTrimInput,
  ReplayClipUpdateInput,
  ReplayClipUpdateResult,
  ReplayClipView,
  ReplayTriggerEvent,
} from "./ReplayClips.dto";
import { ReplayClipDuplicateTracker } from "./ReplayClips.duplicates";
import {
  areReplayClipPathsEqual as arePathsEqual,
  commitReplayClipFileUpdate,
  resolveReplayClipRenameTarget,
} from "./ReplayClips.file-operations";
import {
  resolveReplayClipFilePath,
  sanitizeReplayClipStoragePathList,
} from "./ReplayClips.files";
import { createReplayClipMediaUrl } from "./ReplayClips.media";
import { setupReplayClipMediaProtocol } from "./ReplayClips.protocol";
import {
  copyTrimmedReplayClipToClipboard,
  renderReplayClipQuickTrim,
} from "./ReplayClips.render";
import { ReplayClipsRepository } from "./ReplayClips.repository";
import {
  validateReplayClipCopyInput,
  validateReplayClipIdList,
  validateReplayClipLibraryQuery,
  validateReplayClipListFilter,
  validateReplayClipUpdateInput,
} from "./ReplayClips.validation";

const REPLAY_CLIPS_LOG_SCOPE = "replay-clips";
const defaultLibraryPageSize = 20;
const maxEditorReplayPageValidationCandidates = 500;

interface AvailableReplayClip {
  clip: ReplayClip;
  storedClipPath: string;
}

interface ReplayClipOperationProgressOptions {
  onProgress?: (progress: ReplayClipOperationProgress) => void;
}

class ReplayClipsService {
  private static instance: ReplayClipsService | null = null;

  private readonly clipFileOperationQueues = new Map<string, Promise<void>>();
  private readonly duplicateTracker = new ReplayClipDuplicateTracker();
  private readonly repository: ReplayClipsRepository;
  private activeReplayTriggerRequest: Promise<ReplayClip | null> | null = null;
  private storedFileMutationQueue: Promise<void> = Promise.resolve();

  static getInstance(): ReplayClipsService {
    if (!ReplayClipsService.instance) {
      ReplayClipsService.instance = new ReplayClipsService();
    }

    return ReplayClipsService.instance;
  }

  static resetForTests(): void {
    ReplayClipsService.instance = null;
  }

  constructor() {
    this.repository = new ReplayClipsRepository(DatabaseService.getInstance());
    this.setupHandlers();
    setupReplayClipMediaProtocol({
      resolveReplayClipPath: (id) => this.getStoredClipMediaPath(id),
      resolveRunRecordingPath: (id) =>
        RecordingStorageService.getInstance().getRecordingMediaPath(id),
    });
  }

  async list(filter: ReplayClipListFilter = {}): Promise<ReplayClip[]> {
    return Promise.all(
      this.repository
        .list(filter)
        .map((clip) => this.withClipSizeAsync(clip, true)),
    );
  }

  getClip(id: string): ReplayClipSourceDetail | null {
    const startedAt = Date.now();
    const clip = this.repository.get(id);
    if (!clip) {
      logWarn(REPLAY_CLIPS_LOG_SCOPE, "Replay preview detail missing", {
        clipId: id,
        elapsedMs: Date.now() - startedAt,
      });
      return null;
    }
    const sizedClip = clip;
    const storedClipPath = this.getStoredClipPathForClip(sizedClip);
    const durationSeconds =
      sizedClip.durationSeconds ?? this.readReplayClipDuration(storedClipPath);

    logInfo(REPLAY_CLIPS_LOG_SCOPE, "Replay preview detail resolved", {
      clipId: id,
      durationSeconds,
      elapsedMs: Date.now() - startedAt,
      hasMedia: Boolean(storedClipPath),
      status: sizedClip.status,
    });

    return {
      clip: sizedClip,
      durationSeconds,
      mediaUrl: storedClipPath
        ? createReplayClipMediaUrl(id, sizedClip.updatedAt)
        : null,
    };
  }

  listEditorReplayDetailPage(input: {
    createdAfter?: string;
    excludeIds?: string[];
    game?: GameId;
    includeIds?: string[];
    kind: ReplayClipKind;
    league?: string;
    pageIndex: number;
    pageSize: number;
  }): { items: ReplayClipSourceDetail[]; totalCount: number } {
    const filter: ReplayClipListFilter & {
      createdAfter?: string;
      excludeIds?: string[];
      includeIds?: string[];
      mediaPathOnly?: boolean;
      positiveMediaOnly?: boolean;
    } = {
      kind: input.kind,
      ...(input.createdAfter ? { createdAfter: input.createdAfter } : {}),
      ...(input.excludeIds && input.excludeIds.length > 0
        ? { excludeIds: input.excludeIds }
        : {}),
      ...(input.includeIds && input.includeIds.length > 0
        ? { includeIds: input.includeIds }
        : {}),
    };
    if (input.game) {
      filter.game = input.game;
    }
    if (input.league) {
      filter.league = input.league;
    }

    const candidateFilter = {
      ...filter,
      mediaPathOnly: true,
      positiveMediaOnly: true,
    };
    const items: ReplayClipSourceDetail[] = [];
    const seenAvailableClipIds = new Set<string>();
    let validatedCandidates = 0;

    while (
      items.length < input.pageSize &&
      validatedCandidates < maxEditorReplayPageValidationCandidates
    ) {
      const page = this.repository.listLibraryPage({
        filter: candidateFilter,
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        sortBy: "createdAt",
        sortDirection: "desc",
      });
      if (page.items.length === 0) {
        break;
      }

      let removedMissingCandidate = false;
      let inspectedCandidate = false;
      for (const clip of page.items) {
        if (seenAvailableClipIds.has(clip.id)) {
          continue;
        }
        if (validatedCandidates >= maxEditorReplayPageValidationCandidates) {
          break;
        }
        inspectedCandidate = true;
        validatedCandidates += 1;
        const availableClip = this.resolveAvailableReplayClip(clip);
        if (!availableClip) {
          removedMissingCandidate = true;
          continue;
        }

        seenAvailableClipIds.add(availableClip.clip.id);
        items.push(this.createAvailableReplayClipDetail(availableClip));
        if (items.length >= input.pageSize) {
          break;
        }
      }

      if (
        !removedMissingCandidate ||
        !inspectedCandidate ||
        page.items.length < input.pageSize
      ) {
        break;
      }
    }
    const knownAvailableCount = this.repository.count({
      ...candidateFilter,
    });

    return {
      items,
      totalCount: knownAvailableCount,
    };
  }

  async listLibrary(
    query: ReplayClipLibraryQuery = {},
  ): Promise<ReplayClipLibraryPage> {
    const normalizedQuery = this.normalizeLibraryQuery(query);
    const filter = this.libraryQueryToListFilter(normalizedQuery);
    if (normalizedQuery.sortBy === "sizeBytes") {
      await Promise.all(
        this.repository
          .listAll(filter)
          .map((clip) => this.withClipSizeAsync(clip, true)),
      );
    }
    const page = this.repository.listLibraryPage({
      filter,
      pageIndex: normalizedQuery.pageIndex,
      pageSize: normalizedQuery.pageSize,
      sortBy: normalizedQuery.sortBy,
      sortDirection: normalizedQuery.sortDirection,
    });

    const items = await Promise.all(
      page.items.map((clip) => this.withClipSizeAsync(clip, true)),
    );

    return {
      items: items.map((clip) => this.createReplayClipView(clip)),
      availableLeagues: this.listLibraryLeagues(normalizedQuery),
      pageIndex: normalizedQuery.pageIndex,
      pageSize: normalizedQuery.pageSize,
      pageCount: Math.max(
        1,
        Math.ceil(page.totalCount / normalizedQuery.pageSize),
      ),
      totalCount: page.totalCount,
      sortBy: normalizedQuery.sortBy,
      sortDirection: normalizedQuery.sortDirection,
    };
  }

  replaceAll(
    clips: ReplayClip[],
    storageRoot = this.resolveStorageRoot(),
  ): void {
    this.repository.replaceAll(this.sanitizeClips(clips, storageRoot));
  }

  upsertMany(
    clips: ReplayClip[],
    storageRoot = this.resolveStorageRoot(),
  ): void {
    this.repository.upsertMany(this.sanitizeClips(clips, storageRoot));
  }

  async saveManualReplay(): Promise<ReplayClip | null> {
    const settings = SettingsStoreService.getInstance().get();
    return this.handleReplayTrigger({
      kind: "manual",
      game: settings.activeGame,
      line: "Manual replay save",
      lineHash: this.hashLine(`manual:${Date.now()}`),
      detectedAt: new Date().toISOString(),
    });
  }

  async handleDeathEvent(event: DeathEvent): Promise<ReplayClip | null> {
    return this.handleReplayTrigger({ ...event, kind: "death" });
  }

  async handleReplayTrigger(
    event: ReplayTriggerEvent,
  ): Promise<ReplayClip | null> {
    if (this.activeReplayTriggerRequest) {
      logInfo(REPLAY_CLIPS_LOG_SCOPE, "Replay trigger coalesced", {
        game: event.game,
        kind: event.kind,
        lineHash: event.lineHash,
      });
      return this.activeReplayTriggerRequest;
    }

    const request = this.handleReplayTriggerExclusive(event).finally(() => {
      if (this.activeReplayTriggerRequest === request) {
        this.activeReplayTriggerRequest = null;
      }
    });
    this.activeReplayTriggerRequest = request;

    return request;
  }

  private async handleReplayTriggerExclusive(
    event: ReplayTriggerEvent,
  ): Promise<ReplayClip | null> {
    logInfo(REPLAY_CLIPS_LOG_SCOPE, "Replay trigger received", {
      game: event.game,
      kind: event.kind,
      lineHash: event.lineHash,
    });

    if (this.duplicateTracker.isDuplicate(event.lineHash)) {
      const existing = this.repository.getByTriggerLineHash(event.lineHash);
      if (existing) {
        logWarn(REPLAY_CLIPS_LOG_SCOPE, "Duplicate replay trigger ignored", {
          game: event.game,
          kind: event.kind,
          lineHash: event.lineHash,
          clipId: existing.id,
        });
        BookmarksService.getInstance().linkReplayClip(existing);
        return existing;
      }
    }

    if (!this.isManagedReplayBufferActive(event)) {
      return null;
    }

    BookmarksService.getInstance().rememberReplayClipSession({
      game: event.game,
      triggerLineHash: event.lineHash,
    });

    const settings = SettingsStoreService.getInstance().get();
    const replayKind = event.kind;
    let clip = this.createClip(
      event.game,
      replayKind,
      event.lineHash,
      event.detectedAt,
    );
    this.persistAndPublish(clip);

    try {
      clip = this.updateClip(clip, { status: "saving_replay" });
      this.showClipPreviewOverlay(clip);
      logInfo(REPLAY_CLIPS_LOG_SCOPE, "Saving replay for trigger", {
        clipId: clip.id,
        backend: "managed",
        kind: replayKind,
        seconds: settings.deathClipSeconds,
      });
      const replayPath = await this.saveManagedReplay(
        settings.deathClipSeconds,
        replayKind,
      );
      if (!replayPath) {
        throw new Error("Recorder did not return a saved replay path");
      }
      const storedReplayPath = this.resolveClipFilePath(replayPath, {
        requireExistingFile: true,
      });
      if (!storedReplayPath) {
        throw new Error(
          "Recorder returned a replay path outside managed storage",
        );
      }

      clip = this.updateClip(clip, {
        originalObsPath: storedReplayPath,
        processedClipPath: storedReplayPath,
        sizeBytes: (await stat(storedReplayPath)).size,
      });
      logInfo(REPLAY_CLIPS_LOG_SCOPE, "Replay source saved", {
        clipId: clip.id,
        ...createSafePathLogFields(storedReplayPath, "recording"),
      });

      const readyClip = this.updateClip(clip, {
        status: "ready",
        durationSeconds: this.readReplayClipDuration(storedReplayPath),
      });
      logInfo(REPLAY_CLIPS_LOG_SCOPE, "Replay clip ready", {
        clipId: readyClip.id,
      });
      BookmarksService.getInstance().linkReplayClip(readyClip);
      this.cleanupRecordingStorageForClip(readyClip);

      return readyClip;
    } catch (error) {
      logError(REPLAY_CLIPS_LOG_SCOPE, "Replay clip creation failed", {
        clipId: clip.id,
        error: safeErrorMessage(error),
      });
      return this.updateClip(clip, {
        status: "failed",
        error: safeErrorMessage(error),
      });
    }
  }

  private isManagedReplayBufferActive(event: ReplayTriggerEvent): boolean {
    const status = ManagedRecorderService.getInstance().getStatus();
    if (status.bufferActive && status.gameRunning !== false) {
      return true;
    }

    logInfo(REPLAY_CLIPS_LOG_SCOPE, "Replay clip skipped: rewind unavailable", {
      game: event.game,
      lineHash: event.lineHash,
      available: status.available,
      gameRunning: status.gameRunning ?? null,
      initialized: status.initialized,
      recording: status.recording,
      runRecordingActive: status.runRecordingActive,
    });

    return false;
  }

  private async saveManagedReplay(
    durationSeconds: number,
    kind: ManagedReplayKind = "death",
  ): Promise<string | null> {
    const managedRecorder = ManagedRecorderService.getInstance();
    const status = managedRecorder.getStatus();
    if (!status.bufferActive) {
      logWarn(
        REPLAY_CLIPS_LOG_SCOPE,
        "Managed replay save blocked: buffer inactive",
        {
          available: status.available,
          initialized: status.initialized,
          recording: status.recording,
          runRecordingActive: status.runRecordingActive,
        },
      );
      throw new Error("Managed replay buffer is not active");
    }

    const result = await managedRecorder.saveReplay(durationSeconds, kind);
    if (!result.ok) {
      throw new Error(result.error ?? "Managed recorder save failed");
    }

    return result.path;
  }

  async openClip(id: string): Promise<ReplayClipFileActionResult> {
    try {
      const clipPath = this.getStoredClipPath(id);
      if (!clipPath) {
        return { ok: false, error: "Clip file path is not available" };
      }

      const error = await shell.openPath(clipPath);

      return { ok: error.length === 0, error: error.length > 0 ? error : null };
    } catch (error) {
      return { ok: false, error: safeErrorMessage(error) };
    }
  }

  revealClip(id: string): ReplayClipFileActionResult {
    try {
      const clipPath = this.getStoredClipPath(id);
      if (!clipPath) {
        return { ok: false, error: "Clip file path is not available" };
      }

      shell.showItemInFolder(clipPath);

      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: safeErrorMessage(error) };
    }
  }

  async copyClipToClipboard(
    input: string | ReplayClipCopyInput,
    options: ReplayClipOperationProgressOptions = {},
  ): Promise<ReplayClipFileActionResult> {
    const copyInput = typeof input === "string" ? { id: input } : input;

    return this.queueClipFileOperation(copyInput.id, () =>
      this.copyClipToClipboardQueued(copyInput, options),
    );
  }

  private async copyClipToClipboardQueued(
    copyInput: ReplayClipCopyInput,
    options: ReplayClipOperationProgressOptions,
  ): Promise<ReplayClipFileActionResult> {
    try {
      const clip = this.repository.get(copyInput.id);
      if (!clip) {
        return { ok: false, error: "Clip was not found" };
      }

      const clipPath = this.getStoredClipPathForClip(clip);
      if (!clipPath) {
        return { ok: false, error: "Clip file path is not available" };
      }

      const durationSeconds =
        this.readReplayClipDuration(clipPath) ??
        clip.durationSeconds ??
        clip.targetDurationSeconds;
      const muteAudio = copyInput.muteAudio === true;
      const trim = copyInput.trim
        ? this.resolveReplayClipQuickTrim(copyInput.trim, durationSeconds)
        : null;
      const fullRangeTrim = this.resolveReplayClipQuickTrim(
        { inSeconds: 0, outSeconds: durationSeconds },
        durationSeconds,
      );
      const didTrim = trim
        ? !isReplayClipFullRangeTrim(trim, durationSeconds)
        : false;
      const shouldRenderTrimmedCopy = didTrim || muteAudio;

      if (shouldRenderTrimmedCopy && trim) {
        const onProgress = createReplayClipOperationProgressHandler(
          copyInput.operationRequestId,
          options,
        );

        return await this.copyTrimmedClipToClipboard({
          ...(onProgress ? { onProgress } : {}),
          sourcePath: clipPath,
          trim,
          ...(muteAudio ? { muteAudio } : {}),
        });
      }

      if (shouldRenderTrimmedCopy && !trim) {
        const onProgress = createReplayClipOperationProgressHandler(
          copyInput.operationRequestId,
          options,
        );

        return await this.copyTrimmedClipToClipboard({
          ...(onProgress ? { onProgress } : {}),
          sourcePath: clipPath,
          trim: fullRangeTrim,
          muteAudio: true,
        });
      }

      return await FileClipboard.copyFileToClipboard(clipPath);
    } catch (error) {
      return { ok: false, error: safeErrorMessage(error) };
    }
  }

  async updateClipFile(
    input: ReplayClipUpdateInput,
    options: ReplayClipOperationProgressOptions = {},
  ): Promise<ReplayClipUpdateResult> {
    return this.queueClipFileOperation(input.id, () =>
      this.queueStoredFileMutation(() =>
        this.updateClipFileQueued(input, options),
      ),
    );
  }

  private async updateClipFileQueued(
    input: ReplayClipUpdateInput,
    options: ReplayClipOperationProgressOptions,
  ): Promise<ReplayClipUpdateResult> {
    try {
      const clip = this.repository.get(input.id);
      if (!clip) {
        return { ok: false, detail: null, error: "Clip was not found" };
      }

      const sourcePath = this.getStoredClipPathForClip(clip);
      if (!sourcePath) {
        return {
          ok: false,
          detail: null,
          error: "Clip file path is not available",
        };
      }

      const knownDurationSeconds =
        this.readReplayClipDuration(sourcePath) ?? clip.durationSeconds;
      const durationSeconds =
        knownDurationSeconds ?? clip.targetDurationSeconds;
      const muteAudio = input.muteAudio === true;
      const trim = input.trim
        ? this.resolveReplayClipQuickTrim(input.trim, durationSeconds)
        : null;
      const fullRangeTrim = this.resolveReplayClipQuickTrim(
        { inSeconds: 0, outSeconds: durationSeconds },
        durationSeconds,
      );
      const targetPath = await resolveReplayClipRenameTarget(
        sourcePath,
        input.name ?? null,
      );
      const finalPath = targetPath ?? sourcePath;
      const didRename =
        targetPath !== null && !arePathsEqual(sourcePath, targetPath);
      const didTrim = trim
        ? !isReplayClipFullRangeTrim(trim, durationSeconds)
        : false;
      const shouldRenderTrimmedUpdate = didTrim || muteAudio;
      const renderTrim = trim ?? {
        inSeconds: fullRangeTrim.inSeconds,
        outSeconds: fullRangeTrim.outSeconds,
      };

      if (!shouldRenderTrimmedUpdate && !didTrim && !didRename) {
        return {
          ok: true,
          detail: this.getClipView(clip.id),
          error: null,
        };
      }

      const onProgress = createReplayClipOperationProgressHandler(
        input.operationRequestId,
        options,
      );
      const mutation = await commitReplayClipFileUpdate({
        finalPath,
        onCleanupError: (error, path) => {
          logWarn(REPLAY_CLIPS_LOG_SCOPE, "Replay update cleanup failed", {
            error: safeErrorMessage(error),
            ...createSafePathLogFields(path, "cleanup"),
          });
        },
        persist: async (committedPath) => {
          const fileStats = await stat(committedPath);
          let nextClip = this.createUpdatedClipForStoredPath({
            clip,
            durationSeconds:
              this.readReplayClipDuration(committedPath) ??
              (didTrim && trim
                ? roundReplayClipSeconds(trim.outSeconds - trim.inSeconds)
                : clip.durationSeconds),
            path: committedPath,
            sizeBytes: fileStats.size,
          });
          nextClip = await this.withClipSizeAsync(nextClip);
          if (nextClip.sizeBytes <= 0) {
            nextClip = { ...nextClip, sizeBytes: fileStats.size };
          }
          this.persistAndPublish(nextClip);
          return nextClip;
        },
        ...(shouldRenderTrimmedUpdate && renderTrim
          ? {
              render: (outputPath: string) =>
                this.renderReplayClipQuickTrim({
                  ...(onProgress ? { onProgress } : {}),
                  outputPath,
                  sourcePath,
                  trim: renderTrim,
                  ...(muteAudio ? { muteAudio } : {}),
                }),
            }
          : {}),
        sourcePath,
      });
      const updatedClip = mutation.committedValue;
      if (mutation.obsoleteSourcePath) {
        await this.deleteStoredPathIfUnreferenced(mutation.obsoleteSourcePath);
      }
      logInfo(REPLAY_CLIPS_LOG_SCOPE, "Replay clip updated from overlay", {
        clipId: updatedClip.id,
        didRename,
        didTrim,
        durationSeconds: updatedClip.durationSeconds,
        sizeBytes: updatedClip.sizeBytes,
        ...createSafePathLogFields(finalPath, "clip"),
      });

      return {
        ok: true,
        detail: this.getClipView(updatedClip.id),
        error: null,
      };
    } catch (error) {
      logError(REPLAY_CLIPS_LOG_SCOPE, "Replay clip update failed", {
        clipId: input.id,
        error: safeErrorMessage(error),
      });

      return { ok: false, detail: null, error: safeErrorMessage(error) };
    }
  }

  async deleteClip(id: string): Promise<ReplayClipFileActionResult> {
    return this.queueClipFileOperation(id, () =>
      this.queueStoredFileMutation(() => this.deleteClipQueued(id)),
    );
  }

  private async deleteClipQueued(
    id: string,
  ): Promise<ReplayClipFileActionResult> {
    try {
      const clip = this.repository.get(id);
      if (!clip) {
        return { ok: false, error: "Clip was not found" };
      }

      BookmarksService.getInstance().deleteReplayClipLinks(id);
      this.repository.delete(id);
      try {
        await this.deleteStoredClipFiles(clip);
      } catch (error) {
        const cleanupError = safeErrorMessage(error);
        logWarn(REPLAY_CLIPS_LOG_SCOPE, "Replay clip file cleanup failed", {
          clipId: clip.id,
          error: cleanupError,
        });

        return { ok: true, error: null, cleanupError };
      }

      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: safeErrorMessage(error) };
    }
  }

  async deleteManyClips(
    ids: string[],
  ): Promise<ReplayClipBatchFileActionResult> {
    const deletedIds: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    const cleanupErrors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      const result = await this.deleteClip(id);
      if (result.ok) {
        deletedIds.push(id);
        if (result.cleanupError) {
          cleanupErrors.push({ id, error: result.cleanupError });
        }
        continue;
      }

      failed.push({ id, error: result.error ?? "Clip delete failed" });
    }

    return {
      ok: failed.length === 0,
      error: failed.length === 0 ? null : "Some clips could not be deleted",
      deletedIds,
      failed,
      ...(cleanupErrors.length > 0 ? { cleanupErrors } : {}),
    };
  }

  private createClip(
    game: ReplayClip["sourceGame"],
    kind: ReplayClipKind,
    lineHash: string,
    detectedAt: string,
  ): ReplayClip {
    const now = new Date().toISOString();
    const settings = SettingsStoreService.getInstance().get();

    return {
      id: randomUUID(),
      kind,
      status: "death_detected",
      sourceGame: game,
      sourceLeague: settings.activeLeague,
      deathTimestamp: detectedAt,
      triggerLineHash: lineHash,
      originalObsPath: null,
      processedClipPath: null,
      targetDurationSeconds: settings.deathClipSeconds,
      durationSeconds: null,
      sizeBytes: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private updateClip(
    clip: ReplayClip,
    update: Partial<ReplayClip>,
  ): ReplayClip {
    const updated: ReplayClip = {
      ...clip,
      ...update,
      updatedAt: new Date().toISOString(),
    };
    this.persistAndPublish(updated);

    return updated;
  }

  private showClipPreviewOverlay(clip: ReplayClip): void {
    try {
      void OverlayWindowsService.getInstance()
        .showClipPreviewOverlay(clip)
        .catch((error: unknown) => {
          logWarn(REPLAY_CLIPS_LOG_SCOPE, "Replay clip overlay failed", {
            clipId: clip.id,
            error: safeErrorMessage(error),
          });
        });
    } catch (error) {
      logWarn(REPLAY_CLIPS_LOG_SCOPE, "Replay clip overlay failed", {
        clipId: clip.id,
        error: safeErrorMessage(error),
      });
    }
  }

  private cleanupRecordingStorageForClip(clip: ReplayClip): void {
    try {
      RecordingStorageService.getInstance().cleanup({
        protectedPaths: [clip.processedClipPath, clip.originalObsPath].filter(
          (path): path is string => typeof path === "string" && path.length > 0,
        ),
      });
    } catch (error) {
      logWarn(REPLAY_CLIPS_LOG_SCOPE, "Recording storage cleanup failed", {
        clipId: clip.id,
        error: safeErrorMessage(error),
      });
    }
  }

  private persistAndPublish(clip: ReplayClip): void {
    const publishedClip = clip;
    this.repository.upsert(publishedClip);
    const publishedView = this.createReplayClipView(publishedClip);
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send(
          ReplayClipsChannel.StatusChanged,
          publishedView,
        );
      }
    }
  }

  private setupHandlers(): void {
    registerGuardedIpcHandler(
      ReplayClipsChannel.Get,
      [WindowName.Main, WindowName.ClipPreviewOverlay],
      (_event, id: unknown) => {
        try {
          assertString(id, "id", ReplayClipsChannel.Get, {
            min: 1,
            max: 128,
          });
          return this.getClipView(id);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.List,
      [WindowName.Main, WindowName.RecorderOverlay],
      (_event, filter: unknown) => {
        try {
          return this.list(this.validateListFilter(filter)).then((clips) =>
            clips.map((clip) => this.createReplayClipView(clip)),
          );
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.ListLibrary,
      [WindowName.Main],
      (_event, query: unknown) => {
        try {
          return this.listLibrary(this.validateLibraryQuery(query));
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.SaveManualReplay,
      [WindowName.Main, WindowName.RecorderOverlay],
      async () => {
        const clip = await this.saveManualReplay();
        return clip ? this.createReplayClipView(clip) : null;
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.Update,
      [WindowName.Main, WindowName.ClipPreviewOverlay],
      (event, input: unknown) => {
        try {
          const sender = (event as { sender?: WebContents }).sender;

          return this.updateClipFile(this.validateUpdateInput(input), {
            onProgress: (progress) => {
              this.sendOperationProgress(sender, progress);
            },
          });
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.Open,
      [WindowName.Main],
      (_event, id: unknown) => {
        try {
          assertString(id, "id", ReplayClipsChannel.Open, {
            min: 1,
            max: 128,
          });
          return this.openClip(id);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.Reveal,
      [WindowName.Main, WindowName.ClipPreviewOverlay],
      (_event, id: unknown) => {
        try {
          assertString(id, "id", ReplayClipsChannel.Reveal, {
            min: 1,
            max: 128,
          });
          return this.revealClip(id);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.Copy,
      [WindowName.Main, WindowName.ClipPreviewOverlay],
      (event, input: unknown) => {
        try {
          const sender = (event as { sender?: WebContents }).sender;

          return this.copyClipToClipboard(this.validateCopyInput(input), {
            onProgress: (progress) => {
              this.sendOperationProgress(sender, progress);
            },
          });
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.Delete,
      [WindowName.Main],
      (_event, id: unknown) => {
        try {
          assertString(id, "id", ReplayClipsChannel.Delete, {
            min: 1,
            max: 128,
          });
          return this.deleteClip(id);
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
    registerGuardedIpcHandler(
      ReplayClipsChannel.DeleteMany,
      [WindowName.Main],
      (_event, ids: unknown) => {
        try {
          return this.deleteManyClips(this.validateIdList(ids));
        } catch (error) {
          return handleValidationError(error);
        }
      },
    );
  }

  private sendOperationProgress(
    sender: WebContents | undefined,
    progress: ReplayClipOperationProgress,
  ): void {
    try {
      if (!sender || sender.isDestroyed()) {
        return;
      }

      sender.send(ReplayClipsChannel.OperationProgress, progress);
    } catch (error) {
      logWarn(REPLAY_CLIPS_LOG_SCOPE, "Failed to send replay clip progress", {
        error: safeErrorMessage(error),
      });
    }
  }

  private getStoredClipPath(id: string): string | null {
    const clip = this.repository.get(id);
    if (!clip) {
      return null;
    }

    return this.getStoredClipPathForClip(clip);
  }

  private getStoredClipMediaPath(id: string): string | null {
    const clip = this.repository.get(id);
    if (!clip) {
      return null;
    }

    return this.resolveClipFilePath(
      clip.processedClipPath ?? clip.originalObsPath,
      { requireExistingFile: false },
    );
  }

  private getStoredClipPathForClip(clip: ReplayClip): string | null {
    return this.resolveClipFilePath(
      clip.processedClipPath ?? clip.originalObsPath,
      {
        requireExistingFile: true,
        requireNonEmptyFile: true,
      },
    );
  }

  private resolveAvailableReplayClip(
    clip: ReplayClip,
  ): AvailableReplayClip | null {
    const storedClipPath = this.getStoredClipPathForClip(clip);
    if (!storedClipPath) {
      this.repository.updateSize(clip.id, 0);

      return null;
    }

    return {
      clip,
      storedClipPath,
    };
  }

  private createAvailableReplayClipDetail({
    clip,
    storedClipPath,
  }: AvailableReplayClip): ReplayClipSourceDetail {
    return {
      clip,
      durationSeconds:
        clip.durationSeconds ?? this.readReplayClipDuration(storedClipPath),
      mediaUrl: createReplayClipMediaUrl(clip.id, clip.updatedAt),
    };
  }

  private getClipView(id: string): ReplayClipDetail | null {
    const detail = this.getClip(id);
    if (!detail) {
      return null;
    }

    return {
      ...detail,
      clip: this.createReplayClipView(detail.clip, Boolean(detail.mediaUrl)),
    };
  }

  private createReplayClipView(
    clip: ReplayClip,
    hasMediaFile = Boolean(
      (clip.processedClipPath ?? clip.originalObsPath) && clip.sizeBytes > 0,
    ),
  ): ReplayClipView {
    const { originalObsPath, processedClipPath, ...view } = clip;
    const mediaPath = processedClipPath ?? originalObsPath;

    return {
      ...view,
      fileName: mediaPath ? basename(mediaPath) : null,
      hasMediaFile: Boolean(mediaPath && hasMediaFile),
    };
  }

  private readReplayClipDuration(path: string | null): number | null {
    return path ? readMp4DurationSeconds(path) : null;
  }

  private async renderReplayClipQuickTrim(input: {
    onProgress?: (progress: number) => void;
    muteAudio?: boolean;
    outputPath: string;
    sourcePath: string;
    trim: ReplayClipTrimInput;
  }): Promise<void> {
    await renderReplayClipQuickTrim(input);
  }

  private async copyTrimmedClipToClipboard(input: {
    onProgress?: (progress: number) => void;
    muteAudio?: boolean;
    sourcePath: string;
    trim: ReplayClipTrimInput;
  }): Promise<ReplayClipFileActionResult> {
    return copyTrimmedReplayClipToClipboard({
      ...input,
      render: (outputPath) =>
        this.renderReplayClipQuickTrim({ ...input, outputPath }),
    });
  }

  private async queueClipFileOperation<T>(
    clipId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous =
      this.clipFileOperationQueues.get(clipId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(operation);
    const queued = run.then(
      () => undefined,
      () => {
        /* v8 ignore next */
        return undefined;
      },
    );
    this.clipFileOperationQueues.set(clipId, queued);

    try {
      return await run;
    } finally {
      if (this.clipFileOperationQueues.get(clipId) === queued) {
        this.clipFileOperationQueues.delete(clipId);
      }
    }
  }

  private async queueStoredFileMutation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const run = this.storedFileMutationQueue
      .catch(() => undefined)
      .then(operation);
    this.storedFileMutationQueue = run.then(
      () => undefined,
      () => undefined,
    );

    return run;
  }

  private resolveReplayClipQuickTrim(
    trim: ReplayClipTrimInput,
    durationSeconds: number,
  ): ReplayClipTrimInput {
    const duration = Number.isFinite(durationSeconds)
      ? Math.max(
          roundReplayClipSeconds(durationSeconds),
          quickClipTrimMinimumSeconds,
        )
      : quickClipTrimMaximumSeconds;
    const minimumTrimSeconds = Math.min(quickClipTrimMinimumSeconds, duration);
    const inSeconds = clampReplayClipSeconds(
      trim.inSeconds,
      0,
      Math.max(0, duration - minimumTrimSeconds),
    );
    const outSeconds = clampReplayClipSeconds(
      trim.outSeconds,
      inSeconds + minimumTrimSeconds,
      duration,
    );

    return { inSeconds, outSeconds };
  }

  private createUpdatedClipForStoredPath(input: {
    clip: ReplayClip;
    durationSeconds: number | null;
    path: string;
    sizeBytes: number;
  }): ReplayClip {
    const hasProcessedPath =
      typeof input.clip.processedClipPath === "string" &&
      input.clip.processedClipPath.length > 0;
    const originalMatchesProcessed =
      input.clip.originalObsPath !== null &&
      input.clip.processedClipPath !== null &&
      arePathsEqual(input.clip.originalObsPath, input.clip.processedClipPath);

    return {
      ...input.clip,
      durationSeconds: input.durationSeconds,
      error: null,
      originalObsPath:
        !hasProcessedPath || originalMatchesProcessed
          ? input.path
          : input.clip.originalObsPath,
      processedClipPath: hasProcessedPath ? input.path : null,
      sizeBytes: input.sizeBytes,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
  }

  private async deleteStoredClipFiles(clip: ReplayClip): Promise<void> {
    const paths = new Set(
      [clip.processedClipPath, clip.originalObsPath].filter(
        (path): path is string => typeof path === "string" && path.length > 0,
      ),
    );

    for (const path of paths) {
      const storedPath = this.resolveClipFilePath(path, {
        requireExistingFile: true,
      });
      if (!storedPath) {
        continue;
      }

      if (this.isStoredPathReferenced(storedPath)) {
        logInfo(REPLAY_CLIPS_LOG_SCOPE, "Replay clip file retained", {
          clipId: clip.id,
          reason: "shared-path",
          ...createSafePathLogFields(storedPath, "recording"),
        });
        continue;
      }

      await unlink(storedPath);
    }
  }

  private async deleteStoredPathIfUnreferenced(path: string): Promise<void> {
    if (this.isStoredPathReferenced(path)) {
      return;
    }

    try {
      await rm(path, { force: true });
    } catch (error) {
      logWarn(REPLAY_CLIPS_LOG_SCOPE, "Obsolete replay file cleanup failed", {
        error: safeErrorMessage(error),
        ...createSafePathLogFields(path, "recording"),
      });
    }
  }

  private isStoredPathReferenced(path: string): boolean {
    return this.repository
      .listStoragePaths()
      .some((clip) =>
        [clip.processedClipPath, clip.originalObsPath].some(
          (candidate) => candidate !== null && arePathsEqual(candidate, path),
        ),
      );
  }

  private hashLine(line: string): string {
    return createHash("sha256").update(line).digest("hex").slice(0, 32);
  }

  private sanitizeClips(
    clips: ReplayClip[],
    storageRoot: string,
  ): ReplayClip[] {
    return sanitizeReplayClipStoragePathList(clips, storageRoot);
  }

  private validateListFilter(value: unknown): ReplayClipListFilter {
    return validateReplayClipListFilter(value);
  }

  private validateLibraryQuery(value: unknown): ReplayClipLibraryQuery {
    return validateReplayClipLibraryQuery(value);
  }

  private validateUpdateInput(value: unknown): ReplayClipUpdateInput {
    return validateReplayClipUpdateInput(value);
  }

  private validateCopyInput(value: unknown): ReplayClipCopyInput {
    return validateReplayClipCopyInput(value);
  }

  private validateIdList(value: unknown): string[] {
    return validateReplayClipIdList(value);
  }

  private normalizeLibraryQuery(
    query: ReplayClipLibraryQuery,
  ): Required<ReplayClipLibraryQuery> {
    const pageQuery = normalizeMediaLibraryPageQuery(query, {
      pageIndex: 0,
      pageSize: defaultLibraryPageSize,
      sortBy: "createdAt",
      sortDirection: "desc",
    });

    return {
      game: query.game ?? "poe1",
      kind: query.kind ?? "death",
      league: query.league ?? "",
      pageIndex: pageQuery.pageIndex,
      pageSize: pageQuery.pageSize,
      sortBy: pageQuery.sortBy,
      sortDirection: pageQuery.sortDirection,
    };
  }

  private libraryQueryToListFilter(
    query: Required<ReplayClipLibraryQuery>,
  ): ReplayClipListFilter {
    const filter: ReplayClipListFilter = {
      game: query.game,
      kind: query.kind,
    };
    if (query.league.length > 0) {
      filter.league = query.league;
    }

    return filter;
  }

  private listLibraryLeagues(
    query: Required<ReplayClipLibraryQuery>,
  ): string[] {
    return this.repository.listLeagues({ game: query.game, kind: query.kind });
  }

  private async withClipSizeAsync(
    clip: ReplayClip,
    persist = false,
  ): Promise<ReplayClip> {
    const paths = new Set(
      [clip.processedClipPath, clip.originalObsPath].filter(
        (path): path is string => typeof path === "string" && path.length > 0,
      ),
    );
    const sizes = await Promise.all(
      Array.from(paths, async (path) => {
        const storedPath = this.resolveClipFilePath(path, {
          requireExistingFile: false,
        });
        if (!storedPath) {
          return 0;
        }

        try {
          const fileStats = await stat(storedPath);
          return fileStats.isFile() ? fileStats.size : 0;
        } catch {
          return 0;
        }
      }),
    );

    const sizeBytes = sizes.reduce((total, size) => total + size, 0);
    if (persist && sizeBytes !== clip.sizeBytes) {
      this.repository.updateSize(clip.id, sizeBytes);
    }

    return sizeBytes === clip.sizeBytes ? clip : { ...clip, sizeBytes };
  }

  private resolveClipFilePath(
    path: string | null | undefined,
    options: { requireExistingFile?: boolean; requireNonEmptyFile?: boolean },
  ): string | null {
    return resolveReplayClipFilePath(path, {
      storageRoot: this.resolveStorageRoot(),
      ...options,
    });
  }

  private resolveStorageRoot(): string {
    const settings = SettingsStoreService.getInstance().get();
    return resolveRecordingStorageRoot(
      settings.recordingStoragePath,
      app.getPath("videos"),
    );
  }
}

function isReplayClipFullRangeTrim(
  trim: ReplayClipTrimInput,
  durationSeconds: number,
): boolean {
  return (
    trim.inSeconds <= 0.001 &&
    Math.abs(trim.outSeconds - durationSeconds) <= 0.001
  );
}

function createReplayClipOperationProgressHandler(
  operationRequestId: string | null | undefined,
  options: ReplayClipOperationProgressOptions,
): ((progress: number) => void) | undefined {
  if (!operationRequestId || !options.onProgress) {
    return undefined;
  }

  return (progress) => {
    options.onProgress?.({
      operationRequestId,
      progress: Math.min(Math.max(progress, 0), 1),
    });
  };
}

function clampReplayClipSeconds(
  value: number,
  min: number,
  max: number,
): number {
  /* c8 ignore next 1 */
  if (max < min) {
    return roundReplayClipSeconds(min);
  }

  if (!Number.isFinite(value)) {
    return roundReplayClipSeconds(min);
  }

  return roundReplayClipSeconds(Math.min(Math.max(value, min), max));
}

function roundReplayClipSeconds(seconds: number): number {
  return Math.round(Math.max(seconds, 0) * 1_000) / 1_000;
}

export { ReplayClipsService };

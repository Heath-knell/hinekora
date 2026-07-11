import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  copyFile: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();

  return {
    ...actual,
    copyFile: fsMocks.copyFile,
    rename: fsMocks.rename,
    rm: fsMocks.rm,
  };
});

import { commitReplayClipFileUpdate } from "../ReplayClips.file-operations";

const clipsRoot = resolve("clips");
const sourcePath = resolve(clipsRoot, "source.mp4");

beforeEach(() => {
  fsMocks.copyFile.mockReset().mockResolvedValue(undefined);
  fsMocks.rename.mockReset().mockResolvedValue(undefined);
  fsMocks.rm.mockReset().mockResolvedValue(undefined);
});

describe("commitReplayClipFileUpdate failures", () => {
  it("persists an unchanged path without touching the filesystem", async () => {
    await expect(
      commitReplayClipFileUpdate({
        finalPath: sourcePath,
        persist: () => "committed",
        sourcePath,
      }),
    ).resolves.toEqual({
      committedValue: "committed",
      obsoleteSourcePath: null,
    });
    expect(fsMocks.rename).not.toHaveBeenCalled();
  });

  it("cleans staged output and reports cleanup failures when rendering fails", async () => {
    const renderError = new Error("render failed");
    const cleanupError = new Error("cleanup failed");
    const onCleanupError = vi.fn();
    fsMocks.rm.mockRejectedValueOnce(cleanupError);

    await expect(
      commitReplayClipFileUpdate({
        finalPath: resolve(clipsRoot, "rendered.mp4"),
        onCleanupError,
        persist: () => "unused",
        render: async () => {
          throw renderError;
        },
        sourcePath,
      }),
    ).rejects.toBe(renderError);
    expect(onCleanupError).toHaveBeenCalledWith(
      cleanupError,
      expect.stringContaining(".rendered.hinekora-"),
    );
  });

  it("falls back to copy-based in-place replacement", async () => {
    fsMocks.rename.mockRejectedValueOnce(new Error("rename unavailable"));

    await expect(
      commitReplayClipFileUpdate({
        finalPath: sourcePath,
        persist: () => "committed",
        render: async () => undefined,
        sourcePath,
      }),
    ).resolves.toEqual({
      committedValue: "committed",
      obsoleteSourcePath: null,
    });
    expect(fsMocks.copyFile).toHaveBeenCalledTimes(2);
    expect(fsMocks.rm).toHaveBeenCalledTimes(2);
  });

  it("restores a copy-based backup when persistence fails", async () => {
    const persistenceError = new Error("database failed");
    fsMocks.rename.mockRejectedValueOnce(new Error("rename unavailable"));

    await expect(
      commitReplayClipFileUpdate({
        finalPath: sourcePath,
        persist: () => {
          throw persistenceError;
        },
        render: async () => undefined,
        sourcePath,
      }),
    ).rejects.toBe(persistenceError);
    expect(fsMocks.copyFile).toHaveBeenCalledTimes(3);
    expect(fsMocks.rm).toHaveBeenCalledTimes(2);
  });

  it("surfaces both persistence and rollback failures", async () => {
    const persistenceError = new Error("database failed");
    const rollbackError = new Error("rollback failed");
    fsMocks.rename
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(rollbackError);

    const result = commitReplayClipFileUpdate({
      finalPath: resolve(clipsRoot, "renamed.mp4"),
      persist: () => {
        throw persistenceError;
      },
      sourcePath,
    });

    await expect(result).rejects.toMatchObject({
      errors: [persistenceError, rollbackError],
      message: "Could not restore the original replay clip name",
    });
  });
});

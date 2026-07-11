import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  areReplayClipPathsEqual,
  commitReplayClipFileUpdate,
} from "../ReplayClips.file-operations";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "hinekora-clip-commit-"));
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

describe("commitReplayClipFileUpdate", () => {
  it("compares replay clip paths case-insensitively", () => {
    expect(
      areReplayClipPathsEqual(
        join(root, "Replay Clip.mp4"),
        join(root, "replay clip.MP4"),
      ),
    ).toBe(true);
    expect(
      areReplayClipPathsEqual(
        join(root, "Replay Clip.mp4"),
        join(root, "Other Clip.mp4"),
      ),
    ).toBe(false);
  });

  it("restores a renamed source when persistence fails", async () => {
    const sourcePath = join(root, "source.mp4");
    const finalPath = join(root, "renamed.mp4");
    await writeFile(sourcePath, "original");

    await expect(
      commitReplayClipFileUpdate({
        finalPath,
        persist: () => {
          throw new Error("database failed");
        },
        sourcePath,
      }),
    ).rejects.toThrow("database failed");

    await expect(readFile(sourcePath, "utf8")).resolves.toBe("original");
    await expect(readFile(finalPath, "utf8")).rejects.toThrow();
  });

  it("restores an in-place render when persistence fails", async () => {
    const sourcePath = join(root, "source.mp4");
    await writeFile(sourcePath, "original");

    await expect(
      commitReplayClipFileUpdate({
        finalPath: sourcePath,
        persist: () => {
          throw new Error("database failed");
        },
        render: (outputPath) => writeFile(outputPath, "rendered"),
        sourcePath,
      }),
    ).rejects.toThrow("database failed");

    await expect(readFile(sourcePath, "utf8")).resolves.toBe("original");
  });

  it("keeps the source and removes new output when persistence fails", async () => {
    const sourcePath = join(root, "source.mp4");
    const finalPath = join(root, "rendered.mp4");
    await writeFile(sourcePath, "original");

    await expect(
      commitReplayClipFileUpdate({
        finalPath,
        persist: () => {
          throw new Error("database failed");
        },
        render: (outputPath) => writeFile(outputPath, "rendered"),
        sourcePath,
      }),
    ).rejects.toThrow("database failed");

    await expect(readFile(sourcePath, "utf8")).resolves.toBe("original");
    await expect(readFile(finalPath, "utf8")).rejects.toThrow();
  });

  it("returns committed metadata and cleans in-place backups", async () => {
    const sourcePath = join(root, "source.mp4");
    await writeFile(sourcePath, "original");

    await expect(
      commitReplayClipFileUpdate({
        finalPath: sourcePath,
        persist: () => "committed",
        render: (outputPath) => writeFile(outputPath, "rendered"),
        sourcePath,
      }),
    ).resolves.toEqual({
      committedValue: "committed",
      obsoleteSourcePath: null,
    });
    await expect(readFile(sourcePath, "utf8")).resolves.toBe("rendered");
    expect(await readdir(root)).toEqual(["source.mp4"]);
  });
});

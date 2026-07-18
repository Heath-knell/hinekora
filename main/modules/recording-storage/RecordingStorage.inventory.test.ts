import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getManagedStoragePaths,
  hydrateStoragePathSizes,
} from "./RecordingStorage.inventory";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "hinekora-recording-inventory-"));
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

describe("recording storage inventory helpers", () => {
  it("rejects outside clip paths and treats directories as zero-sized", async () => {
    expect(
      getManagedStoragePaths(root, {
        originalObsPath: join(root, "..", "outside.mp4"),
        processedClipPath: null,
      }),
    ).toEqual([]);

    const directoryPath = join(root, "directory.mp4");
    await mkdir(directoryPath);
    const sizes = new Map([["directory", { path: directoryPath, size: 10 }]]);
    await expect(hydrateStoragePathSizes(sizes, sizes.keys())).resolves.toBe(
      true,
    );
    expect(sizes.get("directory")?.size).toBe(0);
  });

  it("stops hydrating path sizes when background work is canceled", async () => {
    const sizes = new Map([
      ["missing", { path: join(root, "missing.mp4"), size: 10 }],
    ]);

    await expect(
      hydrateStoragePathSizes(sizes, sizes.keys(), () => true),
    ).resolves.toBe(false);
    expect(sizes.get("missing")?.size).toBe(10);
  });
});

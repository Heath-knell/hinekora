import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { isWindowsOS } from "~/main/utils/platform";

import type { NoobsApi } from "../ManagedRecorder.noobs";
import { loadNoobsApi } from "../ManagedRecorder.noobs";
import { resolveManagedVideoEncoderSettings } from "../ManagedRecorder.utils";

function hasNvidiaGraphicsAdapter(): boolean {
  if (!isWindowsOS()) {
    return false;
  }

  try {
    const adapterNames = execFileSync(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "(Get-CimInstance Win32_VideoController).Name",
      ],
      {
        encoding: "utf8",
        timeout: 10_000,
        windowsHide: true,
      },
    );
    return adapterNames.toLowerCase().includes("nvidia");
  } catch {
    return false;
  }
}

const runNvencSmokeTest =
  process.env.HINEKORA_TEST_NVENC === "1" && hasNvidiaGraphicsAdapter();
const require = createRequire(import.meta.url);
let noobs: NoobsApi | null = null;
let logDirectory: string | null = null;

afterEach(async () => {
  noobs?.Shutdown?.();
  noobs = null;
  if (logDirectory) {
    await rm(logDirectory, { force: true, recursive: true });
    logDirectory = null;
  }
});

describe("NVENC native integration", () => {
  it.runIf(runNvencSmokeTest)(
    "creates an available NVENC encoder with performance settings",
    async () => {
      noobs = await loadNoobsApi(async (specifier) => require(specifier));
      expect(noobs).not.toBeNull();
      logDirectory = await mkdtemp(join(tmpdir(), "hinekora-nvenc-smoke-"));
      noobs!.Init(
        resolve("node_modules/noobs/dist"),
        logDirectory,
        () => undefined,
      );

      const encoder = noobs!
        .ListVideoEncoders?.()
        .find((candidate) => candidate.startsWith("obs_nvenc_"));
      expect(
        encoder,
        "No NVENC encoder was exposed; run this opt-in test only on NVIDIA hardware",
      ).toBeDefined();
      expect(noobs!.SetVideoEncoder).toBeTypeOf("function");
      expect(() =>
        noobs!.SetVideoEncoder!(encoder!, {
          ...resolveManagedVideoEncoderSettings(encoder!, "moderate"),
        }),
      ).not.toThrow();
    },
    30_000,
  );
});

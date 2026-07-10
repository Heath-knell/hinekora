import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  netFetch: vi.fn(),
  protocolHandle: vi.fn(),
}));

vi.mock("electron", () => ({
  net: { fetch: mocks.netFetch },
  protocol: {
    handle: mocks.protocolHandle,
    isProtocolHandled: () => false,
  },
}));
vi.mock("~/main/utils/app-log", () => ({
  logInfo: mocks.logInfo,
  logWarn: mocks.logWarn,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("ReplayClips.protocol diagnostics", () => {
  it("logs completed media responses when diagnostics are enabled", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hinekora-protocol-"));
    const path = join(directory, "clip.mp4");
    await writeFile(path, "video");
    mocks.netFetch.mockResolvedValue(new Response("video"));
    vi.stubEnv("HINEKORA_CLIP_PREVIEW_DIAGNOSTICS", "1");

    try {
      const { handleReplayClipMediaRequest } = await import(
        "../ReplayClips.protocol"
      );
      const response = await handleReplayClipMediaRequest(
        new Request("hinekora-media://replay-clip/clip-1"),
        {
          resolveReplayClipPath: () => path,
          resolveRunRecordingPath: () => null,
        },
      );

      expect(response.status).toBe(200);
      expect(mocks.logInfo).toHaveBeenCalledWith(
        "replay-clips",
        "Replay preview media response ready",
        expect.objectContaining({
          mediaId: "clip-1",
          mediaKind: "replay-clip",
          status: 200,
        }),
      );
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});

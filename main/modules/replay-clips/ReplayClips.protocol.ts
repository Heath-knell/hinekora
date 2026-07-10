import { net, protocol } from "electron";

import { logInfo, logWarn } from "~/main/utils/app-log";
import { safeErrorMessage } from "~/main/utils/ipc-validation";

import {
  createReplayClipMediaFileResponse,
  resolveHinekoraMediaRequestTarget,
} from "./ReplayClips.media";

const replayClipMediaScheme = "hinekora-media";
const replayMediaDiagnosticsEnabled =
  process.env.HINEKORA_CLIP_PREVIEW_DIAGNOSTICS === "1";

interface ReplayClipMediaPathResolvers {
  resolveReplayClipPath: (id: string) => string | null;
  resolveRunRecordingPath: (id: string) => string | null;
}

function setupReplayClipMediaProtocol(
  resolvers: ReplayClipMediaPathResolvers,
): void {
  try {
    if (protocol.isProtocolHandled(replayClipMediaScheme)) {
      return;
    }

    protocol.handle(replayClipMediaScheme, (request) =>
      handleReplayClipMediaRequest(request, resolvers),
    );
  } catch (error) {
    logWarn("replay-clips", "Replay media protocol setup failed", {
      error: safeErrorMessage(error),
    });
  }
}

async function handleReplayClipMediaRequest(
  request: GlobalRequest,
  resolvers: ReplayClipMediaPathResolvers,
): Promise<Response> {
  const startedAt = Date.now();
  const target = resolveHinekoraMediaRequestTarget(request.url);
  if (!target) {
    return new Response(null, { status: 404 });
  }

  const mediaPath =
    target.kind === "replay-clip"
      ? resolvers.resolveReplayClipPath(target.id)
      : resolvers.resolveRunRecordingPath(target.id);
  if (!mediaPath) {
    logWarn("replay-clips", "Replay preview media missing", {
      mediaId: target.id,
      mediaKind: target.kind,
    });
    return new Response(null, { status: 404 });
  }

  try {
    const response = await createReplayClipMediaFileResponse(
      mediaPath,
      request,
      (url, init) => net.fetch(url, init),
    );
    if (replayMediaDiagnosticsEnabled) {
      logInfo("replay-clips", "Replay preview media response ready", {
        elapsedMs: Date.now() - startedAt,
        mediaId: target.id,
        mediaKind: target.kind,
        range: request.headers.get("range"),
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    logWarn("replay-clips", "Replay preview media failed", {
      mediaId: target.id,
      mediaKind: target.kind,
      error: safeErrorMessage(error),
    });
    return new Response(null, { status: 500 });
  }
}

export { handleReplayClipMediaRequest, setupReplayClipMediaProtocol };

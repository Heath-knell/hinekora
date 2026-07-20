import type { EditorTimelinePlaybackRate } from "~/types";
import {
  calculateTimelineDuration,
  createTimelineClipFromAsset,
  moveTimelineClipWithinTrack,
  roundToMilliseconds,
} from "../Editor.utils/Editor.utils";
import type { EditorSliceActionContext } from "./Editor.slice.context";
import type { EditorSlice } from "./Editor.slice.types";
import {
  mergeProjectAssets,
  resolveAvailableTimelineStart,
} from "./Editor.slice.utils";

type EditorTimelineClipActions = Pick<
  EditorSlice["editor"],
  | "addAssetToTimelineAt"
  | "moveTimelineClip"
  | "removeTimelineClip"
  | "setSelectedTimelineClipPlaybackRate"
>;

function createEditorTimelineClipActions({
  get,
  updateProject,
}: EditorSliceActionContext): EditorTimelineClipActions {
  return {
    addAssetToTimelineAt: (assetKey, timelineSeconds) => {
      const editor = get().editor;
      const asset =
        editor.mediaAssetPage?.items.find(
          (item) => item.assetKey === assetKey,
        ) ??
        editor.workspace?.assets.find((item) => item.assetKey === assetKey) ??
        editor.project?.assets.find((item) => item.assetKey === assetKey);
      if (!asset?.exists || asset.status !== "ready" || !asset.mediaUrl) {
        return;
      }

      updateProject(
        (project) => {
          const videoTrack = project.tracks.find(
            (track) => track.kind === "video",
          );
          if (!videoTrack) {
            return project;
          }

          const clip = createTimelineClipFromAsset({
            asset,
            id: `timeline-${crypto.randomUUID()}`,
            startSeconds: 0,
            trackId: videoTrack.id,
          });
          const startSeconds = resolveAvailableTimelineStart({
            clips: videoTrack.clips,
            desiredStartSeconds: timelineSeconds,
            durationSeconds: clip.durationSeconds,
          });
          const tracks = project.tracks.map((track) =>
            track.id === videoTrack.id
              ? {
                  ...track,
                  clips: [...track.clips, { ...clip, startSeconds }],
                }
              : track,
          );

          return {
            ...project,
            activeClipId: clip.id,
            assets: mergeProjectAssets(project, [asset]),
            durationSeconds: calculateTimelineDuration(tracks),
            selectedAssetKey: asset.assetKey,
            title:
              videoTrack.clips.length === 0 && project.title === "Untitled edit"
                ? `${asset.name} edit`
                : project.title,
            tracks,
            updatedAt: new Date().toISOString(),
          };
        },
        { historyLabel: `Add ${asset.name}` },
      );
    },
    moveTimelineClip: (clipId, timelineSeconds, cursorSeconds) => {
      updateProject(
        (project) => {
          let didMove = false;
          const tracks = project.tracks.map((track) => {
            if (!track.clips.some((clip) => clip.id === clipId)) {
              return track;
            }

            const result = moveTimelineClipWithinTrack({
              clipId,
              clips: track.clips,
              ...(cursorSeconds === undefined ? {} : { cursorSeconds }),
              timelineSeconds,
            });
            didMove = didMove || result.didMove;

            return {
              ...track,
              clips: result.clips,
            };
          });

          if (!didMove) {
            return project;
          }

          return {
            ...project,
            durationSeconds: calculateTimelineDuration(tracks),
            tracks,
            updatedAt: new Date().toISOString(),
          };
        },
        { historyLabel: "Move" },
      );
    },
    removeTimelineClip: (clipId) => {
      const clipName =
        get()
          .editor.project?.tracks.flatMap((track) => track.clips)
          .find((clip) => clip.id === clipId)?.name ?? null;
      updateProject(
        (project) => {
          const didRemove = project.tracks.some((track) =>
            track.clips.some((clip) => clip.id === clipId),
          );
          if (!didRemove) {
            return project;
          }

          const tracks = project.tracks.map((track) => ({
            ...track,
            clips: track.clips.filter((clip) => clip.id !== clipId),
          }));
          const remainingClips = tracks.flatMap((track) => track.clips);
          const nextClip = remainingClips[0] ?? null;
          const activeClipStillExists =
            project.activeClipId !== clipId &&
            remainingClips.some((clip) => clip.id === project.activeClipId);

          return {
            ...project,
            activeClipId: activeClipStillExists
              ? project.activeClipId
              : (nextClip?.id ?? null),
            durationSeconds: calculateTimelineDuration(tracks),
            selectedAssetKey: activeClipStillExists
              ? project.selectedAssetKey
              : (nextClip?.assetKey ?? null),
            tracks,
            updatedAt: new Date().toISOString(),
          };
        },
        { historyLabel: clipName ? `Delete ${clipName}` : "Delete" },
      );
    },
    setSelectedTimelineClipPlaybackRate: (playbackRate) => {
      const selectedClipId = get().editor.selectedClipId;
      if (!selectedClipId) {
        return;
      }

      const clipName =
        get()
          .editor.project?.tracks.flatMap((track) => track.clips)
          .find((clip) => clip.id === selectedClipId)?.name ?? null;
      updateProject(
        (project) => {
          let didChange = false;
          const tracks = project.tracks.map((track) => {
            const clipIndex = track.clips.findIndex(
              (clip) => clip.id === selectedClipId,
            );
            if (clipIndex === -1) {
              return track;
            }

            const clip = track.clips[clipIndex];
            if (!clip || clip.playbackRate === playbackRate) {
              return track;
            }

            didChange = true;
            const durationSeconds = calculatePlaybackRateDuration({
              inSeconds: clip.inSeconds,
              outSeconds: clip.outSeconds,
              playbackRate,
            });
            const clipEndSeconds = roundToMilliseconds(
              clip.startSeconds + durationSeconds,
            );
            const nextClip = track.clips[clipIndex + 1];
            const pushSeconds = roundToMilliseconds(
              Math.max(
                clipEndSeconds - (nextClip?.startSeconds ?? Infinity),
                0,
              ),
            );

            return {
              ...track,
              clips: track.clips.map((timelineClip, timelineClipIndex) =>
                timelineClip.id === selectedClipId
                  ? {
                      ...timelineClip,
                      durationSeconds,
                      playbackRate,
                    }
                  : pushSeconds > 0 && timelineClipIndex > clipIndex
                    ? {
                        ...timelineClip,
                        startSeconds: roundToMilliseconds(
                          timelineClip.startSeconds + pushSeconds,
                        ),
                      }
                    : timelineClip,
              ),
            };
          });
          if (!didChange) {
            return project;
          }

          return {
            ...project,
            durationSeconds: calculateTimelineDuration(tracks),
            tracks,
            updatedAt: new Date().toISOString(),
          };
        },
        {
          historyLabel: `Speed ${formatPlaybackRateLabel(playbackRate)}`,
          historySubtitle: clipName,
        },
      );
    },
  };
}

function calculatePlaybackRateDuration(input: {
  inSeconds: number;
  outSeconds: number;
  playbackRate: EditorTimelinePlaybackRate;
}): number {
  return roundToMilliseconds(
    Math.max(0.001, (input.outSeconds - input.inSeconds) / input.playbackRate),
  );
}

function formatPlaybackRateLabel(playbackRate: EditorTimelinePlaybackRate) {
  return `${playbackRate}x`;
}

export { createEditorTimelineClipActions };

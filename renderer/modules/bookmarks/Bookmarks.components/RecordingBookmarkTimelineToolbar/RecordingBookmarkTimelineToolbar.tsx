import type { ReactNode } from "react";

import type { VisualPlaybackSubscriber } from "~/renderer/modules/media-playback/useVisualPlaybackPublisher/useVisualPlaybackPublisher";

import { RecordingPlaybackControls } from "../RecordingPlaybackControls/RecordingPlaybackControls";
import { RecordingVolumeControls } from "../RecordingVolumeControls/RecordingVolumeControls";

interface RecordingBookmarkTimelineToolbarProps {
  durationSeconds: number;
  isDisabled: boolean;
  isPlaying: boolean;
  playbackSeconds: number;
  subscribeVisualPlaybackTime?: VisualPlaybackSubscriber;
  toolbarStart?: ReactNode;
  visualPlaybackOffsetSeconds?: number;
  volume: number;
  onJumpToStart: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onTogglePlayback: () => void;
  onVolumeChange: (volume: number) => void;
}

function RecordingBookmarkTimelineToolbar({
  durationSeconds,
  isDisabled,
  isPlaying,
  playbackSeconds,
  subscribeVisualPlaybackTime,
  toolbarStart,
  visualPlaybackOffsetSeconds,
  volume,
  onJumpToStart,
  onSeekBackward,
  onSeekForward,
  onTogglePlayback,
  onVolumeChange,
}: RecordingBookmarkTimelineToolbarProps) {
  return (
    <div className="grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-base-content/10 border-b px-3">
      <div className="relative z-10 flex items-center justify-self-start">
        {toolbarStart}
      </div>
      <div className="relative z-10">
        <RecordingPlaybackControls
          durationSeconds={durationSeconds}
          isDisabled={isDisabled}
          isPlaying={isPlaying}
          playbackSeconds={playbackSeconds}
          {...(subscribeVisualPlaybackTime
            ? { subscribeVisualPlaybackTime }
            : {})}
          {...(visualPlaybackOffsetSeconds !== undefined
            ? { visualPlaybackOffsetSeconds }
            : {})}
          onJumpToStart={onJumpToStart}
          onSeekBackward={onSeekBackward}
          onSeekForward={onSeekForward}
          onTogglePlayback={onTogglePlayback}
        />
      </div>
      <div className="relative z-10 flex items-center justify-self-end">
        <RecordingVolumeControls
          isDisabled={isDisabled}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
      </div>
    </div>
  );
}

export { RecordingBookmarkTimelineToolbar };

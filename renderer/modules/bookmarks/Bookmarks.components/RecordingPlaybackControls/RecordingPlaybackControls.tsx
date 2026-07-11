import {
  FiPause,
  FiPlay,
  FiRotateCcw,
  FiRotateCw,
  FiSkipBack,
} from "react-icons/fi";

import type { VisualPlaybackSubscriber } from "~/renderer/modules/media-playback/useVisualPlaybackPublisher/useVisualPlaybackPublisher";

import { RecordingPlaybackTime } from "../RecordingPlaybackTime/RecordingPlaybackTime";

interface RecordingPlaybackControlsProps {
  durationSeconds: number;
  isDisabled: boolean;
  isPlaying: boolean;
  playbackSeconds: number;
  subscribeVisualPlaybackTime?: VisualPlaybackSubscriber;
  visualPlaybackOffsetSeconds?: number;
  onJumpToStart: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onTogglePlayback: () => void;
}

function RecordingPlaybackControls({
  durationSeconds,
  isDisabled,
  isPlaying,
  playbackSeconds,
  subscribeVisualPlaybackTime,
  visualPlaybackOffsetSeconds,
  onJumpToStart,
  onSeekBackward,
  onSeekForward,
  onTogglePlayback,
}: RecordingPlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        aria-label="Jump to start"
        className="btn btn-ghost btn-xs"
        disabled={isDisabled}
        type="button"
        onClick={onJumpToStart}
      >
        <FiSkipBack size={15} />
      </button>
      <button
        aria-label="Seek backward 5 seconds"
        className="btn btn-ghost btn-xs gap-0.5"
        disabled={isDisabled}
        type="button"
        onClick={onSeekBackward}
      >
        <FiRotateCcw size={14} />
        <span className="text-[9px] leading-none">5</span>
      </button>
      <button
        aria-label="Seek forward 5 seconds"
        className="btn btn-ghost btn-xs gap-0.5"
        disabled={isDisabled}
        type="button"
        onClick={onSeekForward}
      >
        <FiRotateCw size={14} />
        <span className="text-[9px] leading-none">5</span>
      </button>
      <button
        aria-label={isPlaying ? "Pause recording" : "Play recording"}
        className="btn btn-circle btn-primary btn-sm"
        disabled={isDisabled}
        type="button"
        onClick={onTogglePlayback}
      >
        {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
      <RecordingPlaybackTime
        durationSeconds={durationSeconds}
        playbackSeconds={playbackSeconds}
        {...(subscribeVisualPlaybackTime
          ? { subscribeVisualPlaybackTime }
          : {})}
        {...(visualPlaybackOffsetSeconds !== undefined
          ? { visualPlaybackOffsetSeconds }
          : {})}
      />
    </div>
  );
}

export { RecordingPlaybackControls };

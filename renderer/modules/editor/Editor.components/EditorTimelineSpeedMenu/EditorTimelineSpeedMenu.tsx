import clsx from "clsx";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck } from "react-icons/fi";
import { TbTimeDuration30 } from "react-icons/tb";

import { useBoundStore } from "~/renderer/store";

import {
  defaultEditorTimelinePlaybackRate,
  editorTimelinePlaybackRates,
  isEditorTimelinePlaybackRate,
} from "~/types";

function EditorTimelineSpeedMenu() {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    bottom: number;
    left: number;
  } | null>(null);
  const isProcessing = useBoundStore(
    (state) =>
      state.editor.clipboardState.status === "copying" ||
      state.editor.exportState.status === "exporting",
  );
  const project = useBoundStore((state) => state.editor.project);
  const selectedClipId = useBoundStore((state) => state.editor.selectedClipId);
  const selectedTimelineClip =
    project?.tracks
      .flatMap((track) => track.clips)
      .find((clip) => clip.id === selectedClipId) ?? null;
  const selectedPlaybackRate =
    selectedTimelineClip?.playbackRate ?? defaultEditorTimelinePlaybackRate;
  const canChangeClipSpeed = !isProcessing && selectedTimelineClip !== null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    };

    const updateMenuPosition = () => {
      const triggerBounds = triggerRef.current?.getBoundingClientRect();
      if (!triggerBounds) {
        return;
      }

      setMenuPosition({
        bottom: window.innerHeight - triggerBounds.top + 4,
        left: triggerBounds.left + triggerBounds.width / 2,
      });
    };

    updateMenuPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  const handleToggleMenu = () => {
    const triggerBounds = triggerRef.current?.getBoundingClientRect();
    if (!isOpen && triggerBounds) {
      setMenuPosition({
        bottom: window.innerHeight - triggerBounds.top + 4,
        left: triggerBounds.left + triggerBounds.width / 2,
      });
    }

    setIsOpen((currentIsOpen) => !currentIsOpen);
  };

  const handlePlaybackRateClick = (event: MouseEvent<HTMLUListElement>) => {
    if (!canChangeClipSpeed || !(event.target instanceof Element)) {
      return;
    }

    const option = event.target.closest<HTMLButtonElement>(
      "button[data-playback-rate]",
    );
    const playbackRate = Number(option?.dataset.playbackRate);
    if (!isEditorTimelinePlaybackRate(playbackRate)) {
      return;
    }

    useBoundStore
      .getState()
      .editor.setSelectedTimelineClipPlaybackRate(playbackRate);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <span
        className="tooltip tooltip-bottom"
        data-tip={`Clip speed: ${selectedPlaybackRate}x`}
      >
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label={`Clip speed: ${selectedPlaybackRate}x`}
          className={clsx(
            "btn btn-square btn-xs h-6 min-h-6 w-6",
            selectedPlaybackRate === defaultEditorTimelinePlaybackRate
              ? "btn-ghost"
              : "btn-primary",
          )}
          disabled={!canChangeClipSpeed}
          ref={triggerRef}
          type="button"
          onClick={handleToggleMenu}
        >
          <TbTimeDuration30 size={20} />
        </button>
      </span>
      {isOpen &&
        menuPosition !== null &&
        createPortal(
          <ul
            aria-label="Clip speed options"
            className="menu fixed z-[100] w-16 -translate-x-1/2 rounded-md border border-base-content/10 bg-base-200 p-1 shadow-lg"
            ref={menuRef}
            role="menu"
            style={menuPosition}
            onClick={handlePlaybackRateClick}
          >
            {editorTimelinePlaybackRates.map((playbackRate) => {
              const isSelected = playbackRate === selectedPlaybackRate;

              return (
                <li key={playbackRate}>
                  <button
                    aria-checked={isSelected}
                    className={clsx(
                      "flex h-7 min-h-7 flex-row items-center justify-between rounded-md px-1.5 text-xs",
                      { active: isSelected },
                    )}
                    data-playback-rate={playbackRate}
                    role="menuitemradio"
                    type="button"
                  >
                    <span>{playbackRate}x</span>
                    {isSelected && <FiCheck aria-hidden="true" size={12} />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}

export { EditorTimelineSpeedMenu };

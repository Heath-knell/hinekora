import clsx from "clsx";
import type { ChangeEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { FiInfo } from "react-icons/fi";

import { useCaptureGuideShallow } from "~/renderer/store";

import type { RecordingEncoderChoice, RecordingQuality } from "~/types";
import {
  captureFormatOptions,
  captureMotionOptions,
  captureQualityOptions,
  captureStorageEstimateKey,
} from "../../CaptureGuide.utils/CaptureGuide.utils";
import { CaptureStorageTable } from "../CaptureStorageTable/CaptureStorageTable";

interface CaptureStorageViewProps {
  canLoadEstimates?: boolean;
}

function CaptureStorageView({
  canLoadEstimates = true,
}: CaptureStorageViewProps) {
  const [encoder, setEncoder] =
    useState<RecordingEncoderChoice>("hardware_h264");
  const [fps, setFps] = useState<30 | 60>(60);
  const [quality, setQuality] = useState<RecordingQuality>("moderate");
  const { error, estimate, isPending, loadEstimates } = useCaptureGuideShallow(
    (captureGuide) => ({
      error: captureGuide.errorsByKey[captureStorageEstimateKey],
      estimate: captureGuide.estimatesByKey[captureStorageEstimateKey],
      isPending: captureGuide.pendingKeys[captureStorageEstimateKey] === true,
      loadEstimates: captureGuide.loadEstimates,
    }),
  );
  const selectedFormat =
    captureFormatOptions.find((option) => option.value === encoder) ??
    captureFormatOptions[0]!;
  let estimateStatus: "error" | "loading" | "ready" = "ready";
  if (isPending || (!estimate && !error)) {
    estimateStatus = "loading";
  } else if (error) {
    estimateStatus = "error";
  }
  useEffect(() => {
    if (!canLoadEstimates) {
      return;
    }
    void loadEstimates([
      {
        encoder,
        fps,
        key: captureStorageEstimateKey,
        quality,
      },
    ]);
  }, [canLoadEstimates, encoder, fps, loadEstimates, quality]);

  const handleFormatChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setEncoder(event.target.value as RecordingEncoderChoice);
  };
  const handleQualityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setQuality(event.target.value as RecordingQuality);
  };
  const handleMotionSelect = (event: MouseEvent<HTMLButtonElement>) => {
    const nextFps = Number(event.currentTarget.dataset.fps);
    if (captureMotionOptions.some((option) => option.value === nextFps)) {
      setFps(nextFps as 30 | 60);
    }
  };

  return (
    <section className="space-y-5" aria-labelledby="storage-planner-heading">
      <div>
        <h2 className="font-semibold text-lg" id="storage-planner-heading">
          Plan how much space you need
        </h2>
        <p className="mt-1 text-base-content/65 text-sm">
          Pick what matters to you. The estimates update immediately.
        </p>
      </div>

      <div className="grid gap-4 rounded-md border border-base-content/10 bg-base-200 p-4 md:grid-cols-3">
        <div className="grid content-start gap-1.5 text-sm">
          <span className="font-medium">Motion</span>
          <div className="join w-full">
            {captureMotionOptions.map((option) => (
              <button
                aria-pressed={fps === option.value}
                className={clsx("btn join-item btn-sm min-w-0 flex-1", {
                  "btn-primary": fps === option.value,
                  "btn-outline border-base-content/20": fps !== option.value,
                })}
                data-fps={option.value}
                key={option.value}
                type="button"
                onClick={handleMotionSelect}
              >
                {option.label} ({option.value} fps)
              </button>
            ))}
          </div>
          <span className="text-base-content/50 text-xs">
            {
              captureMotionOptions.find((option) => option.value === fps)
                ?.description
            }
          </span>
        </div>

        <label className="grid content-start gap-1.5 text-sm">
          <span className="font-medium">Video format</span>
          <select
            aria-label="Storage estimate video format"
            className="select select-bordered select-sm w-full"
            value={encoder}
            onChange={handleFormatChange}
          >
            {captureFormatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-base-content/50 text-xs">
            {selectedFormat.summary}
          </span>
        </label>

        <label className="grid content-start gap-1.5 text-sm">
          <span className="font-medium">Picture detail</span>
          <select
            aria-label="Storage estimate picture detail"
            className="select select-bordered select-sm w-full"
            value={quality}
            onChange={handleQualityChange}
          >
            {captureQualityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-base-content/50 text-xs">
            Balanced is a good starting point for most recordings.
          </span>
        </label>
      </div>

      <CaptureStorageTable estimate={estimate} status={estimateStatus} />
      {error && (
        <p className="text-error text-sm" role="alert">
          {error}
        </p>
      )}
      <p className="inline-flex items-center gap-1 text-base-content/50 text-xs">
        <FiInfo aria-hidden="true" /> These are planning estimates, not exact
        limits. Actual file size and recording format can vary with your
        hardware, audio, and what happens on screen. Native resolution is not
        shown because it depends on your selected capture source.
      </p>
    </section>
  );
}

export { CaptureStorageView };

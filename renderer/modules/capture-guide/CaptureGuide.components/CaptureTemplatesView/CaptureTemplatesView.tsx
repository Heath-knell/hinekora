import type { MouseEvent } from "react";
import { useEffect } from "react";
import { FiCheck } from "react-icons/fi";

import { useManagedRecorderActive } from "~/renderer/modules/managed-recorder/ManagedRecorder.hooks/useManagedRecorderActive/useManagedRecorderActive";
import { useCaptureGuideShallow } from "~/renderer/store";

import {
  captureResolutionGuideOptions,
  captureTemplateEstimateConfigurations,
  captureTemplates,
  formatEstimatedRecordingStorage,
  getCaptureFormatShortLabel,
  getCaptureMotionLabel,
  getCaptureTemplateEstimateKey,
} from "../../CaptureGuide.utils/CaptureGuide.utils";

interface CaptureTemplatesViewProps {
  canLoadEstimates?: boolean;
  onFormatComparisonRequest?: () => void;
}

function CaptureTemplatesView({
  canLoadEstimates = true,
  onFormatComparisonRequest,
}: CaptureTemplatesViewProps) {
  const isRecorderActive = useManagedRecorderActive();
  const {
    applicationError,
    applicationMessage,
    applyingTemplateId,
    applyTemplate,
    errorsByKey,
    estimatesByKey,
    loadEstimates,
    pendingKeys,
  } = useCaptureGuideShallow((captureGuide) => ({
    applicationError: captureGuide.applicationError,
    applicationMessage: captureGuide.applicationMessage,
    applyingTemplateId: captureGuide.applyingTemplateId,
    applyTemplate: captureGuide.applyTemplate,
    errorsByKey: captureGuide.errorsByKey,
    estimatesByKey: captureGuide.estimatesByKey,
    loadEstimates: captureGuide.loadEstimates,
    pendingKeys: captureGuide.pendingKeys,
  }));

  useEffect(() => {
    if (!canLoadEstimates) {
      return;
    }
    void loadEstimates(captureTemplateEstimateConfigurations);
  }, [canLoadEstimates, loadEstimates]);

  const hasEstimateError = captureTemplateEstimateConfigurations.some(
    (configuration) => Boolean(errorsByKey[configuration.key]),
  );

  const handleUseTemplate = (event: MouseEvent<HTMLButtonElement>) => {
    const templateId = event.currentTarget.dataset.templateId;
    if (templateId) {
      void applyTemplate(templateId);
    }
  };
  const handleFormatComparisonRequest = () => {
    onFormatComparisonRequest?.();
  };

  return (
    <section className="space-y-5" aria-label="Capture templates">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {captureTemplates.map((template) => {
          const settings = template.settings;
          const resolution = captureResolutionGuideOptions.find(
            (option) => option.value === settings.recordingOutputResolution,
          );
          const recordingEncoder = settings.recordingEncoder;
          const formatLabel = getCaptureFormatShortLabel(recordingEncoder);
          const estimateKey = getCaptureTemplateEstimateKey(template.id);
          const estimate = estimatesByKey[estimateKey];
          const estimateError = errorsByKey[estimateKey];
          const isEstimatePending =
            pendingKeys[estimateKey] === true || (!estimate && !estimateError);
          const estimateRow = estimate?.rows.find(
            (row) => row.resolution === settings.recordingOutputResolution,
          );
          const estimatedHourBytes = estimateRow?.estimates.find(
            (item) => item.durationMinutes === 60,
          )?.estimatedBytes;
          let estimatedHour = "Unavailable";
          if (estimatedHourBytes !== undefined) {
            estimatedHour = `About ${formatEstimatedRecordingStorage(estimatedHourBytes)} per hour`;
          } else if (isEstimatePending) {
            estimatedHour = "Calculating...";
          }
          const isApplying = applyingTemplateId === template.id;

          return (
            <article
              className="flex min-h-64 flex-col rounded-md border border-base-content/10 bg-base-200 p-5"
              data-template-id={template.id}
              key={template.id}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base">{template.name}</h3>
                {template.isRecommended && (
                  <span className="badge badge-success badge-sm">
                    Best starting point
                  </span>
                )}
              </div>
              <p className="mt-2 text-base-content/65 text-sm leading-relaxed">
                {template.description}
              </p>
              <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                <dt className="text-base-content/50">Picture</dt>
                <dd className="text-right font-medium">
                  {resolution?.displayName}
                </dd>
                <dt className="text-base-content/50">Motion</dt>
                <dd className="text-right font-medium">
                  {getCaptureMotionLabel(settings.recordingFps ?? 30)}
                </dd>
                <dt className="text-base-content/50">Storage</dt>
                <dd className="text-right font-medium">{estimatedHour}</dd>
              </dl>
              <p className="mt-4 text-base-content/50 text-xs">
                Best for: {template.bestFor}
              </p>
              <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 min-w-0 text-base-content/60 text-xs">
                  <span>{resolution?.displayName}</span>
                  <span aria-hidden="true"> - </span>
                  <span>{settings.recordingFps ?? 30} fps</span>
                  <span aria-hidden="true"> - </span>
                  <button
                    aria-label={`Open format comparison for ${formatLabel}`}
                    className="link link-primary cursor-pointer align-baseline font-medium"
                    data-format-comparison-template-id={template.id}
                    type="button"
                    onClick={handleFormatComparisonRequest}
                  >
                    {formatLabel}
                  </button>
                </p>
                <button
                  className="btn btn-primary btn-sm min-w-36 cursor-pointer"
                  data-template-id={template.id}
                  disabled={isRecorderActive || applyingTemplateId !== null}
                  type="button"
                  onClick={handleUseTemplate}
                >
                  {isApplying ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <FiCheck aria-hidden="true" />
                  )}
                  {isApplying ? "Saving..." : "Use template"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-base-content/50 text-xs">
        Storage numbers are estimates. Actual file size and recording format can
        vary with your hardware and what happens on screen.
      </p>
      {hasEstimateError && (
        <p className="text-error text-sm" role="alert">
          Some storage estimates are unavailable. Reopen this page to retry.
        </p>
      )}

      {isRecorderActive && (
        <p className="text-warning text-sm" role="status">
          Stop recording or rewind before choosing a template.
        </p>
      )}
      {applicationMessage && (
        <p className="text-success text-sm" role="status">
          {applicationMessage}
        </p>
      )}
      {applicationError && (
        <p className="text-error text-sm" role="alert">
          {applicationError}
        </p>
      )}
    </section>
  );
}

export { CaptureTemplatesView };

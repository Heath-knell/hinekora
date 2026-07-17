import type {
  ManagedRecordingStorageEstimate,
  ManagedRecordingStorageEstimateConfiguration,
} from "~/main/modules/managed-recorder/ManagedRecorder.dto";
import { pickCaptureProfileSettingsUpdate } from "~/renderer/modules/capture-profiles/CaptureProfiles.utils/CaptureProfiles.utils";
import { isManagedRecorderStatusActive } from "~/renderer/modules/managed-recorder/ManagedRecorder.utils/ManagedRecorder.utils";
import type {
  BoundStoreStateCreator,
  CaptureGuideSlice,
} from "~/renderer/store/store.types";

import { captureTemplates } from "../CaptureGuide.utils/CaptureGuide.utils";

function isMatchingEstimate(
  estimate: ManagedRecordingStorageEstimate | undefined,
  configuration: ManagedRecordingStorageEstimateConfiguration,
): boolean {
  if (
    estimate?.requestedEncoder !== configuration.encoder ||
    estimate.fps !== configuration.fps ||
    estimate.quality !== configuration.quality
  ) {
    return false;
  }

  const scopedRow = configuration.resolution
    ? estimate.rows.length === 1 &&
      estimate.rows[0]?.resolution === configuration.resolution
    : true;
  const scopedDuration = configuration.durationMinutes
    ? estimate.rows.length > 0 &&
      estimate.rows.every(
        (row) =>
          row.estimates.length === 1 &&
          row.estimates[0]?.durationMinutes === configuration.durationMinutes,
      )
    : true;

  return scopedRow && scopedDuration;
}

const createCaptureGuideSlice: BoundStoreStateCreator<CaptureGuideSlice> = (
  set,
  get,
) => {
  const requestVersions = new Map<string, number>();
  const pendingConfigurationsByKey = new Map<
    string,
    ManagedRecordingStorageEstimateConfiguration
  >();

  return {
    captureGuide: {
      applyingTemplateId: null,
      applicationError: null,
      applicationMessage: null,
      errorsByKey: {},
      estimatesByKey: {},
      pendingKeys: {},
      applyTemplate: async (templateId) => {
        const template = captureTemplates.find(
          (item) => item.id === templateId,
        );
        if (!template || get().captureGuide.applyingTemplateId) {
          return;
        }
        if (isManagedRecorderStatusActive(get().managedRecorder.status)) {
          set((state) => {
            state.captureGuide.applicationError =
              "Stop recording or rewind before choosing a template.";
            state.captureGuide.applicationMessage = null;
          });
          return;
        }

        set((state) => {
          state.captureGuide.applyingTemplateId = template.id;
          state.captureGuide.applicationError = null;
          state.captureGuide.applicationMessage = null;
        });
        try {
          const currentProfileSettings = pickCaptureProfileSettingsUpdate(
            get().settings.value ?? {},
          );
          const result = await get().captureProfiles.create(
            template.profileName,
            {
              ...(currentProfileSettings ?? {}),
              ...template.settings,
            },
          );
          set((state) => {
            if (result.status === "blocked") {
              state.captureGuide.applicationError =
                "Stop recording or rewind before choosing a template.";
              return;
            }
            if (result.status === "created-not-applied") {
              state.captureGuide.applicationError = result.message;
              return;
            }
            if (result.status === "failed") {
              state.captureGuide.applicationError = result.message;
              return;
            }
            state.captureGuide.applicationMessage = `${template.name} was saved and selected as your capture profile.`;
          });
        } catch (error) {
          set((state) => {
            state.captureGuide.applicationError =
              error instanceof Error
                ? error.message
                : "Unable to save the capture template.";
          });
        } finally {
          set((state) => {
            if (state.captureGuide.applyingTemplateId === template.id) {
              state.captureGuide.applyingTemplateId = null;
            }
          });
        }
      },
      loadEstimates: async (configurations) => {
        const pendingConfigurations = configurations.filter((configuration) => {
          const pendingConfiguration = pendingConfigurationsByKey.get(
            configuration.key,
          );

          return (
            !isMatchingEstimate(
              get().captureGuide.estimatesByKey[configuration.key],
              configuration,
            ) &&
            !(
              pendingConfiguration?.encoder === configuration.encoder &&
              pendingConfiguration.fps === configuration.fps &&
              pendingConfiguration.quality === configuration.quality
            )
          );
        });
        if (pendingConfigurations.length === 0) {
          return;
        }

        const versions = new Map<string, number>();
        for (const configuration of pendingConfigurations) {
          const version = (requestVersions.get(configuration.key) ?? 0) + 1;
          requestVersions.set(configuration.key, version);
          versions.set(configuration.key, version);
          pendingConfigurationsByKey.set(configuration.key, configuration);
        }
        set((state) => {
          for (const configuration of pendingConfigurations) {
            state.captureGuide.pendingKeys[configuration.key] = true;
            delete state.captureGuide.errorsByKey[configuration.key];
            if (
              !isMatchingEstimate(
                state.captureGuide.estimatesByKey[configuration.key],
                configuration,
              )
            ) {
              delete state.captureGuide.estimatesByKey[configuration.key];
            }
          }
        });

        try {
          const response =
            await window.electron.managedRecorder.getRecordingStorageEstimates({
              configurations: pendingConfigurations,
            });
          set((state) => {
            for (const estimate of response.configurations) {
              if (
                requestVersions.get(estimate.key) !== versions.get(estimate.key)
              ) {
                continue;
              }
              state.captureGuide.estimatesByKey[estimate.key] = estimate;
              state.captureGuide.pendingKeys[estimate.key] = false;
              pendingConfigurationsByKey.delete(estimate.key);
            }
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to estimate recording storage";
          set((state) => {
            for (const configuration of pendingConfigurations) {
              if (
                requestVersions.get(configuration.key) !==
                versions.get(configuration.key)
              ) {
                continue;
              }
              state.captureGuide.errorsByKey[configuration.key] = message;
              state.captureGuide.pendingKeys[configuration.key] = false;
              pendingConfigurationsByKey.delete(configuration.key);
            }
          });
        }
      },
      resetApplicationStatus: () => {
        set((state) => {
          state.captureGuide.applicationError = null;
          state.captureGuide.applicationMessage = null;
        });
      },
    },
  };
};

export { createCaptureGuideSlice };

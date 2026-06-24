import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiInfo, FiRefreshCw } from "react-icons/fi";

import type { ManagedRecorderAudioDevices } from "~/main/modules/managed-recorder/ManagedRecorder.dto";
import {
  useManagedRecorderSelector,
  useSettingsShallow,
} from "~/renderer/store";

import {
  createAudioDeviceOptions,
  resolveAudioDeviceValue,
  resolveAudioOptionTitle,
  resolveAudioOptionValue,
} from "./ManagedRecorderAudioSettingsCard.utils";

const emptyAudioDevices: ManagedRecorderAudioDevices = {
  input: [],
  output: [],
};
type AudioDeviceLoadStatus = "idle" | "loading" | "loaded" | "failed";

const audioFieldHelp = {
  input:
    "Captures microphone or line-in audio when an input device is selected.",
  output: "Captures desktop playback audio when an output device is selected.",
} as const;

function ManagedRecorderAudioSettingsCard() {
  const [audioDevices, setAudioDevices] =
    useState<ManagedRecorderAudioDevices>(emptyAudioDevices);
  const [audioDeviceLoadStatus, setAudioDeviceLoadStatus] =
    useState<AudioDeviceLoadStatus>("idle");
  const isMountedRef = useRef(true);
  const { settingsValue, updateSettings } = useSettingsShallow((settings) => ({
    settingsValue: settings.value,
    updateSettings: settings.update,
  }));
  const status = useManagedRecorderSelector(
    (managedRecorder) => managedRecorder.status,
  );
  const isRecording = status?.recording === true;
  const isBusy =
    status?.isStartingRecording === true ||
    status?.isStoppingRecording === true;
  const isLoadingAudioDevices = audioDeviceLoadStatus === "loading";
  const audioDevicesRefreshTitle =
    audioDeviceLoadStatus === "failed"
      ? "Audio device refresh failed. Try again."
      : isLoadingAudioDevices
        ? "Refreshing audio devices"
        : "Refresh audio devices";
  const selectedAudioInputId =
    settingsValue?.recordingAudioInputDeviceId ?? null;
  const selectedAudioOutputId =
    settingsValue?.recordingAudioOutputDeviceId ?? null;
  const audioInputOptions = useMemo(
    () =>
      createAudioDeviceOptions({
        devices: audioDevices.input,
        disabledLabel: "No input audio",
        defaultLabel: "Default input device",
      }),
    [audioDevices.input],
  );
  const audioOutputOptions = useMemo(
    () =>
      createAudioDeviceOptions({
        devices: audioDevices.output,
        disabledLabel: "No output audio",
        defaultLabel: "Default output device",
      }),
    [audioDevices.output],
  );
  const audioInputValue = useMemo(
    () => resolveAudioOptionValue(audioInputOptions, selectedAudioInputId),
    [audioInputOptions, selectedAudioInputId],
  );
  const audioOutputValue = useMemo(
    () => resolveAudioOptionValue(audioOutputOptions, selectedAudioOutputId),
    [audioOutputOptions, selectedAudioOutputId],
  );

  const loadAudioDevices = useCallback(
    async (forceRefresh = false): Promise<void> => {
      setAudioDeviceLoadStatus("loading");
      try {
        const devices = await window.electron.managedRecorder.listAudioDevices({
          forceRefresh,
        });
        if (isMountedRef.current) {
          setAudioDevices(devices);
          setAudioDeviceLoadStatus("loaded");
        }
      } catch {
        if (isMountedRef.current) {
          setAudioDeviceLoadStatus("failed");
        }
      }

      return undefined;
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    void loadAudioDevices();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadAudioDevices]);

  const handleAudioDevicesRefresh = () => {
    void loadAudioDevices(true);
  };
  const handleAudioInputChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void updateSettings({
      recordingAudioInputDeviceId: resolveAudioDeviceValue(
        audioInputOptions,
        event.target.value,
      ),
    });
  };
  const handleAudioOutputChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void updateSettings({
      recordingAudioOutputDeviceId: resolveAudioDeviceValue(
        audioOutputOptions,
        event.target.value,
      ),
    });
  };

  return (
    <section className="grid gap-3 rounded-lg border border-base-content/10 bg-neutral p-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 font-bold text-primary text-sm">Audio Settings</h2>
        <button
          aria-label="Refresh audio devices"
          className="btn btn-ghost btn-xs h-7 min-h-0 w-7 p-0 text-primary"
          disabled={isRecording || isBusy || isLoadingAudioDevices}
          title={audioDevicesRefreshTitle}
          type="button"
          onClick={handleAudioDevicesRefresh}
        >
          <FiRefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-primary text-[0.8125rem]">
          <span className="inline-flex items-center gap-1">
            Audio input
            <span
              aria-label={audioFieldHelp.input}
              className="tooltip tooltip-bottom inline-flex cursor-help text-base-content/45 transition-colors hover:text-base-content/70"
              data-tip={audioFieldHelp.input}
              role="img"
              tabIndex={0}
            >
              <FiInfo className="h-3.5 w-3.5" />
            </span>
          </span>
          <select
            className="select select-bordered select-sm w-full min-w-0 truncate pr-8"
            disabled={isRecording || isBusy}
            title={resolveAudioOptionTitle(audioInputOptions, audioInputValue)}
            value={audioInputValue}
            onChange={handleAudioInputChange}
          >
            {audioInputOptions.map((option, index) => (
              <option
                key={`${option.value}:${index}`}
                title={option.title}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-primary text-[0.8125rem]">
          <span className="inline-flex items-center gap-1">
            Audio output
            <span
              aria-label={audioFieldHelp.output}
              className="tooltip tooltip-bottom inline-flex cursor-help text-base-content/45 transition-colors hover:text-base-content/70"
              data-tip={audioFieldHelp.output}
              role="img"
              tabIndex={0}
            >
              <FiInfo className="h-3.5 w-3.5" />
            </span>
          </span>
          <select
            className="select select-bordered select-sm w-full min-w-0 truncate pr-8"
            disabled={isRecording || isBusy}
            title={resolveAudioOptionTitle(
              audioOutputOptions,
              audioOutputValue,
            )}
            value={audioOutputValue}
            onChange={handleAudioOutputChange}
          >
            {audioOutputOptions.map((option, index) => (
              <option
                key={`${option.value}:${index}`}
                title={option.title}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

export { ManagedRecorderAudioSettingsCard };

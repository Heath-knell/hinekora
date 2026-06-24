import { describe, expect, it } from "vitest";

import {
  audioDisabledValue,
  createAudioDeviceOptions,
  formatAudioDeviceLabel,
  resolveAudioDeviceValue,
  resolveAudioOptionTitle,
  resolveAudioOptionValue,
} from "./ManagedRecorderAudioSettingsCard.utils";

describe("ManagedRecorderAudioSettingsCard utils", () => {
  it("truncates long audio device labels while preserving short labels", () => {
    expect(formatAudioDeviceLabel(" Display Alpha ")).toBe("Display Alpha");
    expect(formatAudioDeviceLabel("External Display Audio Device")).toBe(
      "External Display...",
    );
  });

  it("creates audio device options with real labels and unique option values", () => {
    const options = createAudioDeviceOptions({
      devices: [
        { id: "default", label: "Default" },
        { id: "default", label: "Speakers default alias" },
        { id: "{device-1}", label: "Speakers" },
        { id: "{device-1}", label: "Duplicate Speakers" },
        { id: "{device-1}", label: "Speakers" },
      ],
      disabledLabel: "No output audio",
      defaultLabel: "Default output device",
    });

    expect(options).toEqual([
      {
        value: audioDisabledValue,
        deviceId: null,
        label: "No output audio",
        title: "No output audio",
      },
      {
        value: "default",
        deviceId: "default",
        label: "Default output device",
        title: "Default output device",
      },
      {
        value: "device:0",
        deviceId: "{device-1}",
        label: "Speakers",
        title: "Speakers",
      },
      {
        value: "device:1",
        deviceId: "{device-1}",
        label: "Duplicate Speakers",
        title: "Duplicate Speakers",
      },
    ]);
  });

  it("does not create synthetic selected-device options before devices are known", () => {
    expect(
      createAudioDeviceOptions({
        devices: [],
        disabledLabel: "No output audio",
        defaultLabel: "Default output device",
      }),
    ).toEqual([
      {
        value: audioDisabledValue,
        deviceId: null,
        label: "No output audio",
        title: "No output audio",
      },
      {
        value: "default",
        deviceId: "default",
        label: "Default output device",
        title: "Default output device",
      },
    ]);
  });

  it("resolves select option values, device ids, and titles", () => {
    const options = createAudioDeviceOptions({
      devices: [{ id: "{device-1}", label: "Speakers" }],
      disabledLabel: "No output audio",
      defaultLabel: "Default output device",
    });

    expect(resolveAudioDeviceValue(options, audioDisabledValue)).toBeNull();
    expect(resolveAudioDeviceValue(options, "default")).toBe("default");
    expect(resolveAudioDeviceValue(options, "device:0")).toBe("{device-1}");
    expect(resolveAudioOptionValue(options, "{device-1}")).toBe("device:0");
    expect(resolveAudioOptionValue(options, "{unknown}")).toBe(
      audioDisabledValue,
    );
    expect(resolveAudioOptionTitle(options, "device:0")).toBe("Speakers");
    expect(resolveAudioOptionTitle(options, "{unknown}")).toBe("{unknown}");
  });
});

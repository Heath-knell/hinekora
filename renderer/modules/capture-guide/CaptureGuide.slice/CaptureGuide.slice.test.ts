import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ManagedRecordingStorageEstimate,
  ManagedRecordingStorageEstimateConfiguration,
} from "~/main/modules/managed-recorder/ManagedRecorder.dto";
import { createCaptureProfileTestFixture } from "~/renderer/modules/capture-profiles/CaptureProfiles.test-utils";
import type { BoundStore } from "~/renderer/store/store.types";
import { createBoundStoreForTests } from "~/renderer/test/createBoundStoreForTests";

import { createDefaultSettings } from "~/types";
import { createCaptureGuideSlice } from "./CaptureGuide.slice";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function createEstimate(
  configuration: ManagedRecordingStorageEstimateConfiguration,
): ManagedRecordingStorageEstimate {
  return {
    fps: configuration.fps,
    key: configuration.key,
    quality: configuration.quality,
    requestedEncoder: configuration.encoder,
    rows: configuration.resolution
      ? [
          {
            estimates: configuration.durationMinutes
              ? [
                  {
                    durationMinutes: configuration.durationMinutes,
                    estimatedBytes: 5_486_400_000,
                  },
                ]
              : [],
            height: 1080,
            resolution: configuration.resolution,
            width: 1920,
          },
        ]
      : [],
  };
}

describe("CaptureGuide slice", () => {
  const createProfile = vi.fn();
  const getRecordingStorageEstimates = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createProfile.mockResolvedValue({
      profile: createCaptureProfileTestFixture({
        id: "template-profile",
        name: "Everyday Recording 1080p",
      }),
      status: "applied",
    });
    getRecordingStorageEstimates.mockImplementation(
      ({
        configurations,
      }: {
        configurations: ManagedRecordingStorageEstimateConfiguration[];
      }) =>
        Promise.resolve({
          configurations: configurations.map((configuration) =>
            createEstimate(configuration),
          ),
        }),
    );
    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        managedRecorder: { getRecordingStorageEstimates },
      },
    });
  });

  function createTestStore() {
    return createBoundStoreForTests(
      (set, get, api) =>
        ({
          ...createCaptureGuideSlice(set, get, api),
          captureProfiles: { create: createProfile },
          managedRecorder: { status: null },
          settings: {
            value: {
              ...createDefaultSettings(),
              deathClipSeconds: 45,
              recordingAudioInputDeviceId: "microphone-1",
              recordingAutoStartMode: "recording",
            },
          },
        }) as unknown as BoundStore,
    );
  }

  it("does not load estimates until a guide view requests them", () => {
    createTestStore();

    expect(getRecordingStorageEstimates).not.toHaveBeenCalled();
  });

  it("caches matching estimates and reports request failures", async () => {
    const store = createTestStore();
    const configuration: ManagedRecordingStorageEstimateConfiguration = {
      encoder: "hardware_h264",
      fps: 60,
      key: "planner",
      quality: "moderate",
    };

    await store.getState().captureGuide.loadEstimates([configuration]);
    await store.getState().captureGuide.loadEstimates([configuration]);

    expect(getRecordingStorageEstimates).toHaveBeenCalledTimes(1);
    expect(getRecordingStorageEstimates).toHaveBeenLastCalledWith({
      configurations: [configuration],
    });
    expect(store.getState().captureGuide.estimatesByKey.planner).toMatchObject(
      createEstimate(configuration),
    );

    getRecordingStorageEstimates.mockRejectedValueOnce(new Error("offline"));
    await store
      .getState()
      .captureGuide.loadEstimates([{ ...configuration, quality: "high" }]);
    expect(store.getState().captureGuide.errorsByKey.planner).toBe("offline");
    expect(store.getState().captureGuide.pendingKeys.planner).toBe(false);
  });

  it("keeps the newest estimate when requests for one table resolve out of order", async () => {
    const first = createDeferred<{
      configurations: ManagedRecordingStorageEstimate[];
    }>();
    const second = createDeferred<{
      configurations: ManagedRecordingStorageEstimate[];
    }>();
    getRecordingStorageEstimates
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const store = createTestStore();
    const firstConfiguration: ManagedRecordingStorageEstimateConfiguration = {
      encoder: "hardware_h264",
      fps: 60,
      key: "planner",
      quality: "moderate",
    };
    const secondConfiguration = {
      ...firstConfiguration,
      encoder: "hardware_h265" as const,
    };

    const firstRequest = store
      .getState()
      .captureGuide.loadEstimates([firstConfiguration]);
    const secondRequest = store
      .getState()
      .captureGuide.loadEstimates([secondConfiguration]);
    second.resolve({ configurations: [createEstimate(secondConfiguration)] });
    await secondRequest;
    first.resolve({ configurations: [createEstimate(firstConfiguration)] });
    await firstRequest;

    expect(
      store.getState().captureGuide.estimatesByKey.planner?.requestedEncoder,
    ).toBe("hardware_h265");
  });

  it("caches a matching scoped template estimate", async () => {
    const store = createTestStore();
    const configuration: ManagedRecordingStorageEstimateConfiguration = {
      durationMinutes: 60,
      encoder: "hardware_h264",
      fps: 60,
      key: "capture-template:everyday-recording",
      quality: "moderate",
      resolution: "1920x1080",
    };

    await store.getState().captureGuide.loadEstimates([configuration]);
    await store.getState().captureGuide.loadEstimates([configuration]);

    expect(getRecordingStorageEstimates).toHaveBeenCalledTimes(1);
    expect(
      store.getState().captureGuide.estimatesByKey[configuration.key]?.rows,
    ).toHaveLength(1);
  });

  it("preserves current capture settings when applying a template", async () => {
    const store = createTestStore();

    await store.getState().captureGuide.applyTemplate("everyday-recording");

    expect(createProfile).toHaveBeenCalledWith(
      "Everyday Recording 1080p",
      expect.objectContaining({
        deathClipSeconds: 45,
        recordingAudioInputDeviceId: "microphone-1",
        recordingAutoStartMode: "recording",
        recordingEncoder: "hardware_h264",
        recordingFps: 60,
        recordingOutputResolution: "1920x1080",
      }),
    );
    expect(store.getState().captureGuide.applicationMessage).toContain(
      "saved and selected",
    );
  });

  it("surfaces a profile that was saved but could not be applied", async () => {
    createProfile.mockResolvedValueOnce({
      message: "The profile was saved, but its settings could not be selected.",
      profile: createCaptureProfileTestFixture(),
      status: "created-not-applied",
    });
    const store = createTestStore();

    await store.getState().captureGuide.applyTemplate("long-sessions");

    expect(store.getState().captureGuide.applicationError).toContain(
      "saved, but",
    );
    expect(store.getState().captureGuide.applicationMessage).toBeNull();
    expect(store.getState().captureGuide.applyingTemplateId).toBeNull();
  });

  it("surfaces profile creation failures and resets route messages", async () => {
    createProfile.mockResolvedValueOnce({
      message: "create failed",
      status: "failed",
    });
    const store = createTestStore();

    await store.getState().captureGuide.applyTemplate("long-sessions");
    expect(store.getState().captureGuide.applicationError).toBe(
      "create failed",
    );

    store.getState().captureGuide.resetApplicationStatus();
    expect(store.getState().captureGuide.applicationError).toBeNull();
    expect(store.getState().captureGuide.applicationMessage).toBeNull();
  });
});

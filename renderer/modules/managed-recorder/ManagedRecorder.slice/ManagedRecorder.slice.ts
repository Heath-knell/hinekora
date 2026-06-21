import { trackEvent } from "~/renderer/modules/umami";
import type {
  BoundStoreStateCreator,
  ManagedRecorderSlice,
} from "~/renderer/store/store.types";

export const createManagedRecorderSlice: BoundStoreStateCreator<
  ManagedRecorderSlice
> = (set) => ({
  managedRecorder: {
    status: null,
    hydrate: async () => {
      const status = await window.electron.managedRecorder.getStatus();
      set((state) => {
        state.managedRecorder.status = status;
      });
    },
    startBuffer: async () => {
      const status = await window.electron.managedRecorder.startBuffer();
      set((state) => {
        state.managedRecorder.status = status;
      });
      trackEvent("recording-rewind-started");
    },
    stopBuffer: async () => {
      const status = await window.electron.managedRecorder.stopBuffer();
      set((state) => {
        state.managedRecorder.status = status;
      });
      trackEvent("recording-rewind-stopped");
    },
    startRunRecording: async () => {
      const status = await window.electron.managedRecorder.startRunRecording();
      set((state) => {
        state.managedRecorder.status = status;
      });
      trackEvent("recording-session-started");
    },
    stopRunRecording: async () => {
      const status = await window.electron.managedRecorder.stopRunRecording();
      set((state) => {
        state.managedRecorder.status = status;
      });
      trackEvent("recording-session-stopped");
    },
    saveReplay: async () => {
      await window.electron.managedRecorder.saveReplay();
      const status = await window.electron.managedRecorder.getStatus();
      set((state) => {
        state.managedRecorder.status = status;
      });
      trackEvent("recording-manual-replay-requested");
    },
    startListening: () =>
      window.electron.managedRecorder.onStatusChanged((status) => {
        set((state) => {
          state.managedRecorder.status = status;
        });
      }),
  },
});

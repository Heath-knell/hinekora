import type { PoeProcessState } from "~/main/modules/poe-process/PoeProcess.dto";
import type {
  BoundStoreStateCreator,
  PoeProcessSlice,
} from "~/renderer/store/store.types";

const stoppedPoeProcessState: PoeProcessState = {
  isRunning: false,
  processName: "",
};

export const createPoeProcessSlice: BoundStoreStateCreator<PoeProcessSlice> = (
  set,
) => {
  let poeProcessChangeVersion = 0;

  return {
    poeProcess: {
      state: stoppedPoeProcessState,
      error: null,
      hydrate: async () => {
        const changeVersion = poeProcessChangeVersion;
        const state = await window.electron.poeProcess.getState();
        if (changeVersion !== poeProcessChangeVersion) {
          return;
        }

        set((store) => {
          store.poeProcess.state = state;
          store.poeProcess.error = null;
        });
      },
      startListening: () => {
        const setProcessState = (state: PoeProcessState) => {
          poeProcessChangeVersion += 1;
          set((store) => {
            store.poeProcess.state = state;
            store.poeProcess.error = null;
          });
        };

        const unsubscribeStart =
          window.electron.poeProcess.onStart(setProcessState);
        const unsubscribeStop =
          window.electron.poeProcess.onStop(setProcessState);
        const unsubscribeState =
          window.electron.poeProcess.onState(setProcessState);
        const unsubscribeError = window.electron.poeProcess.onError((error) => {
          poeProcessChangeVersion += 1;
          set((store) => {
            store.poeProcess.error = error.error;
          });
        });

        return () => {
          unsubscribeStart();
          unsubscribeStop();
          unsubscribeState();
          unsubscribeError();
        };
      },
    },
  };
};

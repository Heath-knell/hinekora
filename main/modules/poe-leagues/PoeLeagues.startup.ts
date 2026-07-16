import type { SettingsStoreService } from "~/main/modules/settings-store";
import { logInfo, logWarn } from "~/main/utils/app-log";
import { safeErrorMessage } from "~/main/utils/ipc-validation";

import type { PoeLeaguesChangedEvent } from "./PoeLeagues.dto";

interface StartupPoeLeaguesService {
  initialize(): Promise<void>;
  onDidChange(listener: (event: PoeLeaguesChangedEvent) => void): () => void;
}

type StartupSettingsStore = Pick<
  SettingsStoreService,
  "get" | "onDidChange" | "refreshCatalogDefaults"
>;

function startPoeLeaguesWhenSetupCompleted(
  poeLeagues: StartupPoeLeaguesService,
  settingsStore: StartupSettingsStore,
): () => void {
  let hasStarted = false;
  let stopWaitingForSetup: () => void = () => undefined;
  const stopListeningForLeagueChanges = poeLeagues.onDidChange((event) => {
    if (!event.status.isFetching) {
      settingsStore.refreshCatalogDefaults();
    }
  });

  const start = () => {
    if (hasStarted) {
      return;
    }

    hasStarted = true;
    stopWaitingForSetup();
    stopWaitingForSetup = () => undefined;
    void poeLeagues.initialize().then(
      () => {
        logInfo("startup", "PoE leagues initialized");
      },
      (error) => {
        logWarn("startup", "PoE leagues initialization failed", {
          error: safeErrorMessage(error),
        });
      },
    );
    logInfo("startup", "PoE leagues initialization started");
  };

  if (settingsStore.get().setupCompleted) {
    start();
  } else {
    stopWaitingForSetup = settingsStore.onDidChange((settings) => {
      if (settings.setupCompleted) {
        start();
      }
    });
    logInfo("startup", "PoE leagues initialization deferred until setup");
  }

  return () => {
    stopWaitingForSetup();
    stopListeningForLeagueChanges();
  };
}

export { startPoeLeaguesWhenSetupCompleted };

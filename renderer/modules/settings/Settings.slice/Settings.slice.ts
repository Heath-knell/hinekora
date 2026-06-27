import { trackEvent } from "~/renderer/modules/umami";
import type {
  BoundStoreStateCreator,
  SettingsSlice,
} from "~/renderer/store/store.types";

import type { AppSettings } from "~/types";

const privateSettingsUpdateKeys = new Set<keyof AppSettings>([
  "poe1CharacterName",
  "poe2CharacterName",
]);

function shouldTrackSettingsUpdate(input: Partial<AppSettings>): boolean {
  const updateKeys = Object.keys(input) as Array<keyof AppSettings>;

  return (
    updateKeys.length > 0 &&
    updateKeys.some((key) => !privateSettingsUpdateKeys.has(key))
  );
}

export const createSettingsSlice: BoundStoreStateCreator<SettingsSlice> = (
  set,
) => ({
  settings: {
    value: null,
    hydrate: async () => {
      const value = await window.electron.settings.get();
      set((state) => {
        state.settings.value = value;
      });
    },
    update: async (input: Partial<AppSettings>) => {
      const value = await window.electron.settings.update(input);
      set((state) => {
        state.settings.value = value;
      });
      if (shouldTrackSettingsUpdate(input)) {
        trackEvent("settings-updated");
      }
    },
  },
});

export { shouldTrackSettingsUpdate };

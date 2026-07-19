import { useCallback } from "react";

import { useProfilesShallow } from "~/renderer/store";

function useAuraProfileSave(profileId: string | null): () => void {
  const flushProfile = useProfilesShallow((profiles) => profiles.flush);

  return useCallback(() => {
    if (!profileId) {
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    queueMicrotask(() => {
      void flushProfile(profileId).catch(() => undefined);
    });
  }, [flushProfile, profileId]);
}

export { useAuraProfileSave };

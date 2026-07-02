import { useManagedRecorderShallow } from "~/renderer/store";

import { isManagedRecorderStatusActive } from "../../ManagedRecorder.utils/ManagedRecorder.utils";

function useManagedRecorderActive(): boolean {
  return useManagedRecorderShallow((managedRecorder) =>
    isManagedRecorderStatusActive(managedRecorder.status),
  );
}

export { useManagedRecorderActive };

import { FiAlertCircle } from "react-icons/fi";

import { useAppSetupShallow } from "~/renderer/store";

function AppSetupErrorDisplay() {
  const { error } = useAppSetupShallow((appSetup) => ({
    error: appSetup.error,
  }));

  if (!error) {
    return null;
  }

  return (
    <div className="alert alert-error mb-6" role="alert">
      <FiAlertCircle className="h-6 w-6 shrink-0" />
      <span>{error}</span>
    </div>
  );
}

export default AppSetupErrorDisplay;

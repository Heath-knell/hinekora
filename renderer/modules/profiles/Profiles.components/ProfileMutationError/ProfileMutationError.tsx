import clsx from "clsx";

import { useProfilesShallow } from "~/renderer/store";

interface ProfileMutationErrorProps {
  className?: string;
}

function ProfileMutationError({ className }: ProfileMutationErrorProps) {
  const error = useProfilesShallow((profiles) => profiles.error);

  if (!error) {
    return null;
  }

  return (
    <div
      className={clsx("alert alert-error py-2 text-xs", className)}
      role="alert"
    >
      {error}
    </div>
  );
}

export { ProfileMutationError };

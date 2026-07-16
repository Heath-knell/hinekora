import { useEffect, useState } from "react";
import { FiCopy, FiEye, FiEyeOff } from "react-icons/fi";

import { usePoeLeaguesShallow } from "~/renderer/store";

function PseudonymousUserIdField() {
  const [copyStatus, setCopyStatus] = useState<"copied" | "error" | "idle">(
    "idle",
  );
  const [isRevealed, setIsRevealed] = useState(false);
  const {
    error,
    isFetching,
    isLoading,
    loadSessionUserId,
    previousUserIds,
    userId,
  } = usePoeLeaguesShallow((poeLeagues) => ({
    error: poeLeagues.sessionUserIdError,
    isFetching: Object.values(poeLeagues.isFetchingByGame).some(Boolean),
    isLoading: poeLeagues.isSessionUserIdLoading,
    loadSessionUserId: poeLeagues.loadSessionUserId,
    previousUserIds: poeLeagues.previousSessionUserIds,
    userId: poeLeagues.sessionUserId,
  }));
  const userIds = [
    ...(userId ? [userId] : []),
    ...previousUserIds.filter((previousUserId) => previousUserId !== userId),
  ];
  const hasUserIds = userIds.length > 0;
  const hasPreviousUserIds = previousUserIds.length > 0;

  useEffect(() => {
    if (!isFetching) {
      void loadSessionUserId();
    }
  }, [isFetching, loadSessionUserId]);

  const handleCopy = async () => {
    if (!hasUserIds) {
      return;
    }

    try {
      await navigator.clipboard.writeText(userIds.join("\n"));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  const handleToggleReveal = () => {
    setIsRevealed((current) => !current);
  };

  return (
    <div className="space-y-2 py-3">
      <div>
        <p className="font-medium text-sm">
          Pseudonymous user {hasPreviousUserIds ? "IDs" : "ID"}
        </p>
        <p className="text-base-content/55 text-xs">
          Include {hasPreviousUserIds ? "these IDs" : "this ID"} if you ask us
          to locate or delete your Supabase data.
        </p>
      </div>
      <div className="w-full max-w-xl space-y-1">
        <div className="join flex">
          <label className="input input-bordered input-sm join-item flex min-w-0 flex-1 items-center">
            <input
              aria-label="Pseudonymous user ID"
              className="min-w-0 flex-1 bg-transparent outline-none"
              placeholder={isLoading ? "Loading…" : "Not available yet"}
              readOnly
              type={isRevealed ? "text" : "password"}
              value={userIds[0] ?? ""}
            />
          </label>
          <button
            aria-label={
              isRevealed
                ? "Hide pseudonymous user ID"
                : "Reveal pseudonymous user ID"
            }
            className="btn btn-ghost btn-sm btn-square join-item border-base-content/20"
            disabled={!hasUserIds || isLoading}
            title={
              isRevealed
                ? "Hide pseudonymous user ID"
                : "Reveal pseudonymous user ID"
            }
            type="button"
            onClick={handleToggleReveal}
          >
            {isRevealed ? (
              <FiEyeOff aria-hidden="true" size={15} />
            ) : (
              <FiEye aria-hidden="true" size={15} />
            )}
          </button>
          <button
            aria-label="Copy pseudonymous user ID"
            className="btn btn-primary btn-sm btn-square join-item"
            disabled={!hasUserIds || isLoading}
            title="Copy pseudonymous user ID"
            type="button"
            onClick={handleCopy}
          >
            <FiCopy aria-hidden="true" size={15} />
          </button>
        </div>
        {userIds.slice(1).map((previousUserId, index) => (
          <label
            className="input input-bordered input-sm flex w-full items-center"
            key={previousUserId}
          >
            <input
              aria-label={`Previous pseudonymous user ID ${index + 1}`}
              className="min-w-0 flex-1 bg-transparent outline-none"
              readOnly
              type={isRevealed ? "text" : "password"}
              value={previousUserId}
            />
          </label>
        ))}
      </div>
      {copyStatus === "copied" && (
        <p className="text-success text-xs" role="status">
          User {hasPreviousUserIds ? "IDs" : "ID"} copied.
        </p>
      )}
      {copyStatus === "error" && (
        <p className="text-error text-xs" role="alert">
          Could not copy the user ID. Reveal it to copy the value manually.
        </p>
      )}
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}

export { PseudonymousUserIdField };

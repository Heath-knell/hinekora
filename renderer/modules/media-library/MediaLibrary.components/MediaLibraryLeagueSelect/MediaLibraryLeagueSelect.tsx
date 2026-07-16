import type { ChangeEvent } from "react";
import { FiRefreshCcw as RefreshCcw } from "react-icons/fi";

import type { MediaLibraryLeagueOption } from "../../MediaLibrary.utils/MediaLibrary.utils";

interface MediaLibraryLeagueSelectProps {
  ariaLabel: string;
  disabled?: boolean;
  error?: string | null;
  isFetchingLeagues?: boolean;
  league: string;
  leagueOptions: MediaLibraryLeagueOption[];
  onLeagueChange: (league: string) => void;
  selectClassName: string;
  statusPlacement?: "before" | "after";
}

function MediaLibraryLeagueSelect({
  ariaLabel,
  disabled = false,
  error = null,
  isFetchingLeagues = false,
  league,
  leagueOptions,
  onLeagueChange,
  selectClassName,
  statusPlacement = "after",
}: MediaLibraryLeagueSelectProps) {
  const handleLeagueChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onLeagueChange(event.currentTarget.value);
  };

  const status = (
    <>
      {error && (
        <span className="text-error text-xs" role="status">
          {error}
        </span>
      )}
      {isFetchingLeagues && (
        <span
          className="inline-flex items-center gap-1 text-base-content/60 text-xs"
          role="status"
        >
          <RefreshCcw className="animate-spin" size={13} />
          Fetching
        </span>
      )}
    </>
  );

  return (
    <>
      {statusPlacement === "before" && status}
      <label className="no-drag">
        <span className="sr-only">{ariaLabel}</span>
        <select
          aria-label={ariaLabel}
          className={selectClassName}
          disabled={disabled}
          value={league}
          onChange={handleLeagueChange}
        >
          {leagueOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {statusPlacement === "after" && status}
    </>
  );
}

export { MediaLibraryLeagueSelect };

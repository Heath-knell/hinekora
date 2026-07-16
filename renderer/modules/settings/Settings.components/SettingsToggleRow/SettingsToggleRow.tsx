import clsx from "clsx";
import type { ChangeEventHandler, ReactNode } from "react";

interface SettingsToggleRowProps {
  ariaLabel?: string;
  checked: boolean;
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  onChange: ChangeEventHandler<HTMLInputElement>;
  statusClassName?: string;
  statusLabel?: ReactNode;
  statusRole?: "alert" | "status";
}

function SettingsToggleRow({
  ariaLabel,
  checked,
  description,
  disabled = false,
  label,
  onChange,
  statusClassName,
  statusLabel,
  statusRole,
}: SettingsToggleRowProps) {
  return (
    <div className="py-3">
      <label
        className={clsx("grid grid-cols-[minmax(0,1fr)_auto] gap-4", {
          "cursor-not-allowed opacity-60": disabled,
          "cursor-pointer": !disabled,
        })}
      >
        <div className="min-w-0 [text-wrap:wrap]">
          <span className="font-semibold text-sm">{label}</span>
          {description && (
            <p className="mt-1 mb-0 text-base-content/60 text-sm">
              {description}
            </p>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-2 self-start">
          {statusLabel && (
            <span
              className={clsx("font-medium text-xs", statusClassName)}
              role={statusRole}
            >
              {statusLabel}
            </span>
          )}
          <input
            aria-label={ariaLabel}
            checked={checked}
            className="toggle toggle-primary toggle-sm"
            disabled={disabled}
            type="checkbox"
            onChange={onChange}
          />
        </span>
      </label>
    </div>
  );
}

export { SettingsToggleRow };

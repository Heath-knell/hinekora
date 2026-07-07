import clsx from "clsx";
import type { ChangeEventHandler, ReactNode } from "react";

interface SettingsToggleRowProps {
  ariaLabel?: string;
  checked: boolean;
  description?: ReactNode;
  label: ReactNode;
  onChange: ChangeEventHandler<HTMLInputElement>;
  statusClassName?: string;
  statusLabel?: ReactNode;
}

function SettingsToggleRow({
  ariaLabel,
  checked,
  description,
  label,
  onChange,
  statusClassName,
  statusLabel,
}: SettingsToggleRowProps) {
  return (
    <div className="py-3">
      <label className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-4">
        <div className="min-w-0 [text-wrap:wrap]">
          <span className="font-semibold text-sm">{label}</span>
          {description ? (
            <p className="mt-1 mb-0 text-base-content/60 text-sm">
              {description}
            </p>
          ) : null}
        </div>
        <span className="flex shrink-0 items-center gap-2 self-start">
          {statusLabel ? (
            <span className={clsx("font-medium text-xs", statusClassName)}>
              {statusLabel}
            </span>
          ) : null}
          <input
            aria-label={ariaLabel}
            checked={checked}
            className="toggle toggle-primary toggle-sm"
            type="checkbox"
            onChange={onChange}
          />
        </span>
      </label>
    </div>
  );
}

export { SettingsToggleRow };

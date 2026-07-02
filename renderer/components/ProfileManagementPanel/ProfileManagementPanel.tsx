import clsx from "clsx";
import type { ChangeEvent, MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { FiPlus as Plus, FiTrash2 as Trash } from "react-icons/fi";

interface ProfileManagementPanelItem {
  columns: ReactNode[];
  deleteDisabledTitle?: string;
  id: string;
  isDeleteDisabled: boolean;
  isSelected: boolean;
  name: string;
}

interface ProfileManagementPanelProps {
  count: number;
  disabled?: boolean;
  disabledTitle?: string;
  emptyMessage: string;
  initialName: string;
  inputLabel: string;
  items: ProfileManagementPanelItem[];
  rowGridClassName: string;
  title: string;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

function ProfileManagementPanel({
  count,
  disabled = false,
  disabledTitle,
  emptyMessage,
  initialName,
  inputLabel,
  items,
  onCreate,
  onDelete,
  onSelect,
  rowGridClassName,
  title,
}: ProfileManagementPanelProps) {
  const [name, setName] = useState(initialName);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    setName(event.target.value);
  };
  const handleCreate = () => {
    if (disabled) {
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName) {
      onCreate(trimmedName);
    }
  };
  const handleSelectProfile = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    const profileId = event.currentTarget.dataset.profileId;
    if (profileId) {
      onSelect(profileId);
    }
  };
  const handleDeleteProfile = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    const profileId = event.currentTarget.dataset.profileId;
    if (profileId) {
      onDelete(profileId);
    }
  };

  return (
    <section className="grid gap-3 rounded-lg border border-base-content/10 bg-neutral p-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 font-bold text-primary text-sm">{title}</h2>
        <span>{count}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label={inputLabel}
          className="input input-bordered min-w-0 flex-1"
          disabled={disabled}
          title={disabledTitle}
          value={name}
          onChange={handleNameChange}
        />
        <button
          className="btn btn-primary btn-sm"
          disabled={disabled}
          title={disabledTitle}
          type="button"
          onClick={handleCreate}
        >
          <Plus size={16} />
          Add
        </button>
      </div>
      <div className="grid gap-1.5">
        {items.map((item) => (
          <div
            className={clsx(
              "grid min-h-[34px] w-full items-center gap-2 rounded-md border px-2 py-1.5 text-base-content",
              rowGridClassName,
              {
                "border-primary bg-primary/25": item.isSelected,
                "border-transparent bg-base-200": !item.isSelected,
              },
            )}
            key={item.id}
          >
            <button
              className="min-w-0 truncate text-left disabled:cursor-not-allowed disabled:opacity-50"
              data-profile-id={item.id}
              disabled={disabled}
              title={disabledTitle}
              type="button"
              onClick={handleSelectProfile}
            >
              {item.name}
            </button>
            {item.columns.map((column, index) => (
              <span key={`${item.id}-${index}`}>{column}</span>
            ))}
            <button
              aria-label={`Delete ${item.name}`}
              className="btn btn-ghost btn-xs h-7 min-h-0 w-7 p-0 text-error"
              data-profile-id={item.id}
              disabled={disabled || item.isDeleteDisabled}
              title={disabled ? disabledTitle : item.deleteDisabledTitle}
              type="button"
              onClick={handleDeleteProfile}
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="m-0 text-base-content/60">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}

export type { ProfileManagementPanelItem };
export { ProfileManagementPanel };

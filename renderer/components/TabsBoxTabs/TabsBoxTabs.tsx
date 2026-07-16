import clsx from "clsx";
import type { KeyboardEvent, MouseEvent } from "react";

interface TabsBoxItem<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  tabId?: string;
  panelId?: string;
}

interface TabsBoxTabItem<T extends string> extends TabsBoxItem<T> {
  tabId: string;
  panelId: string;
}

interface TabsBoxTabsBaseProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  variant?: "default" | "primary";
}

interface TabsBoxRadioProps<T extends string> extends TabsBoxTabsBaseProps<T> {
  items: readonly TabsBoxItem<T>[];
  selectionRole: "radio";
}

interface TabsBoxTabProps<T extends string> extends TabsBoxTabsBaseProps<T> {
  items: readonly TabsBoxTabItem<T>[];
  selectionRole?: "tab";
}

type TabsBoxTabsProps<T extends string> =
  | TabsBoxRadioProps<T>
  | TabsBoxTabProps<T>;

function TabsBoxTabs<T extends string>({
  items,
  value,
  onChange,
  selectionRole = "tab",
  variant = "default",
}: TabsBoxTabsProps<T>) {
  const handleTabClick = (event: MouseEvent<HTMLButtonElement>) => {
    const nextValue = event.currentTarget.dataset.value as T | undefined;
    if (!nextValue || nextValue === value) {
      return;
    }

    onChange(nextValue);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const tabs = Array.from(
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        `[role="${selectionRole}"]:not(:disabled)`,
      ) ?? [],
    );
    const currentIndex = tabs.indexOf(event.currentTarget);
    if (currentIndex < 0 || tabs.length === 0) {
      return;
    }

    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    const nextValue = nextTab?.dataset.value as T | undefined;
    if (!nextTab || !nextValue) {
      return;
    }

    nextTab.focus();
    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  return (
    <>
      {items.map((item) => {
        const isActive = value === item.value;

        return (
          <button
            aria-checked={selectionRole === "radio" ? isActive : undefined}
            aria-controls={selectionRole === "tab" ? item.panelId : undefined}
            aria-selected={selectionRole === "tab" ? isActive : undefined}
            className={clsx(
              "tab border-0 bg-transparent px-4 font-semibold transition-colors disabled:text-base-content/40 disabled:hover:bg-transparent disabled:hover:text-base-content/40",
              {
                "rounded-md text-base-content/65 hover:bg-base-200 hover:text-base-content":
                  variant === "primary",
                "tab-active !bg-base-300 !text-primary shadow-sm hover:!bg-base-300 hover:!text-primary":
                  variant === "default" && isActive,
                "tab-active !bg-primary !text-primary-content shadow-sm hover:!bg-primary hover:!text-primary-content":
                  variant === "primary" && isActive,
                "text-base-content/60 hover:bg-base-300 hover:text-primary":
                  variant === "default",
              },
            )}
            data-value={item.value}
            disabled={item.disabled}
            id={item.tabId}
            key={item.value}
            role={selectionRole}
            tabIndex={isActive ? 0 : -1}
            type="button"
            onClick={handleTabClick}
            onKeyDown={handleTabKeyDown}
          >
            {item.label}
          </button>
        );
      })}
    </>
  );
}

export type { TabsBoxItem, TabsBoxTabItem };
export { TabsBoxTabs };

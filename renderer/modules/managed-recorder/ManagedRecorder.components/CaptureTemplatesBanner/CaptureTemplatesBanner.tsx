import { useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { FiArrowRight, FiInfo, FiX } from "react-icons/fi";

import { useSettingsShallow } from "~/renderer/store";

const captureTemplatesBannerStyle = {
  "--capture-guide-accent": "oklch(43.7% 0.078 188.216)",
} as CSSProperties;

function CaptureTemplatesBanner() {
  const navigate = useNavigate();
  const { isDismissed, updateSettings } = useSettingsShallow((settings) => ({
    isDismissed: settings.value?.captureTemplatesBannerDismissed ?? false,
    updateSettings: settings.update,
  }));

  if (isDismissed) {
    return null;
  }

  const handleOpenTemplates = () => {
    void navigate({
      to: "/capture-guide",
    });
  };
  const handleDismiss = () => {
    void updateSettings({ captureTemplatesBannerDismissed: true });
  };

  return (
    <div
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-[var(--capture-guide-accent)] bg-[color-mix(in_oklch,var(--capture-guide-accent)_18%,transparent)] px-3 py-2 text-[color-mix(in_oklch,var(--capture-guide-accent)_62%,white)] text-xs shadow-sm"
      role="status"
      style={captureTemplatesBannerStyle}
    >
      <FiInfo aria-hidden="true" className="shrink-0" />
      <p className="m-0 min-w-0 whitespace-nowrap">
        Need a practical capture preset?
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          className="btn btn-xs cursor-pointer border-[var(--capture-guide-accent)] bg-base-300/80 px-2 text-[color-mix(in_oklch,var(--capture-guide-accent)_62%,white)] hover:bg-base-300"
          type="button"
          onClick={handleOpenTemplates}
        >
          Templates
          <FiArrowRight aria-hidden="true" />
        </button>
        <span
          className="tooltip tooltip-left"
          data-tip="Dismiss capture templates banner"
        >
          <button
            aria-label="Dismiss capture templates banner"
            className="btn btn-ghost btn-square btn-xs cursor-pointer text-[color-mix(in_oklch,var(--capture-guide-accent)_48%,white)] hover:text-[color-mix(in_oklch,var(--capture-guide-accent)_72%,white)]"
            type="button"
            onClick={handleDismiss}
          >
            <FiX aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
  );
}

export { CaptureTemplatesBanner };

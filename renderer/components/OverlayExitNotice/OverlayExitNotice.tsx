interface OverlayExitNoticeProps {
  overlayName: string;
}

function OverlayExitNotice({ overlayName }: OverlayExitNoticeProps) {
  return (
    <div
      aria-live="polite"
      className="no-drag pointer-events-none fixed top-[22px] left-1/2 z-50 flex min-h-8 max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-lg border border-primary/40 bg-base-300/90 px-3 py-2 text-primary text-xs shadow-[0_0_0_1px_color-mix(in_oklch,var(--color-base-300)_52%,transparent),0_0_24px_color-mix(in_oklch,var(--color-primary)_24%,transparent)] backdrop-blur-md"
      role="status"
    >
      <span className="font-semibold">Press</span>
      <kbd className="kbd kbd-xs font-black">Esc</kbd>
      <span className="font-semibold">to leave {overlayName}.</span>
    </div>
  );
}

export { OverlayExitNotice };

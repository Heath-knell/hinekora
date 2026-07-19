interface ShortcutComboProps {
  keys: string[];
}

function ShortcutCombo({ keys }: ShortcutComboProps) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key) => (
        <kbd className="kbd kbd-xs min-h-5 px-1.5" key={key}>
          {key}
        </kbd>
      ))}
    </span>
  );
}

export { ShortcutCombo };

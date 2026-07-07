import { Fragment } from "react";

import { readKeybindChordParts } from "./KeybindChord.utils";

interface KeybindChordProps {
  accelerator: string;
}

function KeybindChord({ accelerator }: KeybindChordProps) {
  const parts = readKeybindChordParts(accelerator);

  return (
    <span className="inline-flex min-w-0 items-center gap-1 align-middle">
      {parts.map((part, index) => (
        <Fragment key={`${accelerator}-${part}-${index}`}>
          {index > 0 && (
            <span className="font-semibold text-base-content/45 text-xs">
              +
            </span>
          )}
          <kbd className="kbd kbd-sm border-base-content/10 bg-base-200/70 font-semibold text-base-content/70">
            {part}
          </kbd>
        </Fragment>
      ))}
    </span>
  );
}

export { KeybindChord };

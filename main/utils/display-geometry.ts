interface DisplayLike {
  id: number;
  size: {
    width: number;
    height: number;
  };
  scaleFactor: number;
}

interface DisplayDimensions {
  width: number;
  height: number;
}

interface DisplayWorkAreaLike {
  workArea: Electron.Rectangle;
}

function getNativeDisplayDimensions(display: DisplayLike): DisplayDimensions {
  return {
    width: Math.round(display.size.width * display.scaleFactor),
    height: Math.round(display.size.height * display.scaleFactor),
  };
}

function createDisplayDimensionsLookup(
  displays: DisplayLike[],
): Map<string, DisplayDimensions> {
  return new Map(
    displays.map((display) => [
      String(display.id),
      getNativeDisplayDimensions(display),
    ]),
  );
}

function validateBoundsOnDisplays<Bounds extends Electron.Rectangle>(
  bounds: Bounds | null,
  displays: readonly DisplayWorkAreaLike[],
  minOverlap: number,
): Bounds | null {
  if (!bounds) {
    return null;
  }

  for (const display of displays) {
    const overlapX = Math.max(
      0,
      Math.min(
        bounds.x + bounds.width,
        display.workArea.x + display.workArea.width,
      ) - Math.max(bounds.x, display.workArea.x),
    );
    const overlapY = Math.max(
      0,
      Math.min(
        bounds.y + bounds.height,
        display.workArea.y + display.workArea.height,
      ) - Math.max(bounds.y, display.workArea.y),
    );

    if (overlapX >= minOverlap && overlapY >= minOverlap) {
      return bounds;
    }
  }

  return null;
}

export type { DisplayDimensions, DisplayLike, DisplayWorkAreaLike };
export {
  createDisplayDimensionsLookup,
  getNativeDisplayDimensions,
  validateBoundsOnDisplays,
};

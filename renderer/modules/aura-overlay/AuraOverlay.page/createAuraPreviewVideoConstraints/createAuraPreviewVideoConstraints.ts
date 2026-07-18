function createAuraPreviewVideoConstraints(): MediaTrackConstraints {
  return {
    width: { max: 7680 },
    height: { max: 4320 },
    frameRate: { max: 60 },
  };
}

export { createAuraPreviewVideoConstraints };

interface ArcGeometryPoint {
  x: number;
  y: number;
}

interface ArcBoundaryPaths {
  inner: string;
  outer: string;
}

interface ArcBoundaryPoints {
  inner: ArcGeometryPoint[];
  outer: ArcGeometryPoint[];
}

interface SampledGeometryPoint extends ArcGeometryPoint {
  length: number;
}

interface PathSourceRectInput {
  halfNormalLength: number;
  halfTangentLength: number;
  normal: ArcGeometryPoint;
  point: ArcGeometryPoint;
  tangent: ArcGeometryPoint;
  videoSize: {
    height: number;
    width: number;
  };
}

interface PathSourceRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface PathSampleVideoSegment {
  clipHeight: number;
  clipWidth: number;
  clipX: number;
  clipY: number;
  sourceHeight: number;
  sourceWidth: number;
  sourceX: number;
  sourceY: number;
  transformA: number;
  transformB: number;
  transformC: number;
  transformD: number;
  transformE: number;
  transformF: number;
}

interface PathSampleVideoSourceBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

type PathSampleVideoOutputAxis = "x" | "y";

interface PathSampleVideoGeometry {
  height: number;
  segments: PathSampleVideoSegment[];
  sourceBounds: PathSampleVideoSourceBounds | null;
  width: number;
}

interface CreatePathSampleVideoGeometryInput {
  height: number;
  maxSegmentCount: number;
  minSegmentCount: number;
  outputAxis: PathSampleVideoOutputAxis;
  pathPoints: ArcGeometryPoint[];
  sourceThickness: number;
  targetOutputSegmentLength: number;
  targetThickness: number;
  videoSize: {
    height: number;
    width: number;
  };
  width: number;
}

interface DrawPathSampleVideoFrameInput {
  canvas: HTMLCanvasElement;
  geometry: PathSampleVideoGeometry;
  video: HTMLVideoElement;
}

interface ResolvePathSampleSegmentCountInput {
  maxSegmentCount: number;
  minSegmentCount: number;
  outputLength: number;
  targetOutputSegmentLength: number;
  targetSourceSegmentLength?: number;
  totalLength: number;
}

export type {
  ArcBoundaryPaths,
  ArcBoundaryPoints,
  ArcGeometryPoint,
  CreatePathSampleVideoGeometryInput,
  DrawPathSampleVideoFrameInput,
  PathSampleVideoGeometry,
  PathSampleVideoOutputAxis,
  PathSampleVideoSegment,
  PathSampleVideoSourceBounds,
  PathSourceRect,
  PathSourceRectInput,
  ResolvePathSampleSegmentCountInput,
  SampledGeometryPoint,
};

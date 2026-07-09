const quickClipTrimMaximumSeconds = 3_600;
const quickClipTrimMinimumSeconds = 0.1;

interface QuickClipTrimRange {
  inSeconds: number;
  outSeconds: number;
}

export type { QuickClipTrimRange };
export { quickClipTrimMaximumSeconds, quickClipTrimMinimumSeconds };

import type { CropRegionSelection } from "~/main/modules/overlay-windows/OverlayWindows.dto";
import type {
  CropSelectorPoint,
  CropSelectorShape,
} from "~/renderer/modules/crop-selector-overlay/CropSelectorOverlay.utils/CropSelectorOverlay.utils";

interface CropSelectorSelectionState {
  arcEnd: CropSelectorPoint | null;
  arcStart: CropSelectorPoint | null;
  hoverPoint: CropSelectorPoint | null;
  isDragging: boolean;
  pointSelectionPoints: CropSelectorPoint[];
  selection: CropRegionSelection | null;
  shape: CropSelectorShape;
}

type CropSelectorSelectionAction =
  | { type: "clear-selection" }
  | { type: "finish-drag" }
  | { type: "reset-arc-selection" }
  | { type: "reset-selection" }
  | { point: CropSelectorPoint; type: "set-hover-point" }
  | {
      points: CropSelectorPoint[];
      selection: CropRegionSelection;
      type: "set-point-selection";
    }
  | {
      point: CropSelectorPoint;
      selection: CropRegionSelection;
      type: "start-drag";
    }
  | { point: CropSelectorPoint; type: "start-arc-selection" }
  | {
      hoverPoint: CropSelectorPoint;
      point: CropSelectorPoint;
      type: "set-arc-end";
    }
  | {
      hoverPoint: CropSelectorPoint;
      selection: CropRegionSelection;
      type: "preview-selection";
    };

function createCropSelectorSelectionState(
  shape: CropSelectorShape,
): CropSelectorSelectionState {
  return {
    arcEnd: null,
    arcStart: null,
    hoverPoint: null,
    isDragging: false,
    pointSelectionPoints: [],
    selection: null,
    shape,
  };
}

function cropSelectorSelectionReducer(
  state: CropSelectorSelectionState,
  action: CropSelectorSelectionAction,
): CropSelectorSelectionState {
  switch (action.type) {
    case "clear-selection":
      return { ...state, selection: null };
    case "finish-drag":
      return { ...state, isDragging: false };
    case "reset-arc-selection":
      return {
        ...state,
        arcEnd: null,
        arcStart: null,
        hoverPoint: null,
        selection: null,
      };
    case "reset-selection":
      return {
        ...state,
        arcEnd: null,
        arcStart: null,
        hoverPoint: null,
        isDragging: false,
        pointSelectionPoints: [],
        selection: null,
      };
    case "set-hover-point":
      return { ...state, hoverPoint: action.point };
    case "set-point-selection":
      return {
        ...state,
        hoverPoint: action.points.at(-1) ?? null,
        pointSelectionPoints: action.points,
        selection: action.selection,
      };
    case "start-drag":
      return {
        ...state,
        isDragging: true,
        selection: action.selection,
      };
    case "start-arc-selection":
      return {
        ...state,
        arcEnd: null,
        arcStart: action.point,
        hoverPoint: action.point,
        selection: null,
      };
    case "set-arc-end":
      return {
        ...state,
        arcEnd: action.point,
        hoverPoint: action.hoverPoint,
      };
    case "preview-selection":
      return {
        ...state,
        hoverPoint: action.hoverPoint,
        selection: action.selection,
      };
  }
}

export type { CropSelectorSelectionState };
export { createCropSelectorSelectionState, cropSelectorSelectionReducer };

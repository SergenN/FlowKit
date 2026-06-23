import type {
  Dimensions,
  GraphNode,
  PanelPositionType,
  XYPosition,
} from '../core/types';

/** expects a node and returns a color value */
export type MiniMapNodeFunc = (node: GraphNode) => string;

export type ShapeRendering =
  | 'auto'
  | 'optimizeSpeed'
  | 'crispEdges'
  | 'geometricPrecision'
  | 'inherit';

export interface MiniMapProps {
  /** Node color, can be either a string or a string func that receives the current node */
  nodeColor?: string | MiniMapNodeFunc;
  /** Node stroke color, can be either a string or a string func that receives the current node */
  nodeStrokeColor?: string | MiniMapNodeFunc;
  /** Additional node class name, can be either a string or a string func that receives the current node */
  nodeClassName?: string | MiniMapNodeFunc;
  /** Node border radius */
  nodeBorderRadius?: number;
  /** Node stroke width */
  nodeStrokeWidth?: number;
  /** Background color of minimap mask */
  maskColor?: string;
  /** Border color of minimap mask */
  maskStrokeColor?: string;
  /** Border width of minimap mask */
  maskStrokeWidth?: number;
  /** Position of the minimap */
  position?: PanelPositionType;
  /** Enable drag minimap to drag viewport */
  pannable?: boolean;
  /** Enable zoom minimap to zoom viewport */
  zoomable?: boolean;
  width?: number;
  height?: number;
  ariaLabel?: string | null;
  /** Enable inverse panning, i.e. drag minimap to move viewport in opposite direction */
  inversePan?: boolean;
  /** Specify zoom step */
  zoomStep?: number;
  /** Specify minimap scale */
  offsetScale?: number;
  /** Mask border radius */
  maskBorderRadius?: number;
}

/** these props are passed to mini map node slots */
export interface MiniMapNodeProps {
  id: string;
  type: string;
  selected?: boolean;
  dragging?: boolean;
  position: XYPosition;
  dimensions: Dimensions;
  borderRadius?: number;
  color?: string;
  shapeRendering?: ShapeRendering;
  strokeColor?: string;
  strokeWidth?: number;
  hidden?: boolean;
}

// export interface MiniMapEmits {
//   click: { event: MouseEvent; position: { x: number; y: number } };
//   nodeClick: NodeMouseEvent;
//   nodeDblclick: NodeMouseEvent;
//   nodeMouseenter: NodeMouseEvent;
//   nodeMousemove: NodeMouseEvent;
//   nodeMouseleave: NodeMouseEvent;
// }
//
// export interface MiniMapNodeEmits {
//   click: MouseEvent;
//   dblclick: MouseEvent;
//   mouseenter: MouseEvent;
//   mousemove: MouseEvent;
//   mouseleave: MouseEvent;
// }

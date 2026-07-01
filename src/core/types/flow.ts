import type { D3ZoomEvent } from 'd3-zoom';
import type { FlowKitError, KeyFilter } from '../utils';
import type {
  DefaultEdgeOptions,
  Edge,
  EdgeProps,
  EdgeUpdatable,
  GraphEdge,
} from './edge';
import type {
  CoordinateExtent,
  CoordinateExtentRange,
  GraphNode,
  Node,
  NodeProps,
} from './node';
import type {
  Connection,
  ConnectionLineOptions,
  ConnectionLineProps,
  ConnectionMode,
  OnConnectStartParams,
} from './connection';
import type { PanOnScrollMode, ViewportTransform } from './zoom';
import type { EdgeTypesObject, NodeTypesObject } from './components';
import type {
  EdgeMouseEvent,
  EdgeUpdateEvent,
  NodeDragEvent,
  NodeMouseEvent,
} from './hooks';
import type { ValidConnectionFunc } from './handle';
import type { EdgeChange, NodeChange } from './changes';
import type { FlowKitStore } from './store';

// todo: should be object type
export type ElementData = any;

/** Initial elements (before parsing into state) */
export type Element <
NodeData = ElementData,
  EdgeData = ElementData,
> = Node<NodeData> | Edge<EdgeData>

export type Elements <
NodeData = ElementData,
  EdgeData = ElementData,
> = Element<NodeData, EdgeData>[]

export type MaybeElement = Node | Edge | Connection | Element;

export interface CustomThemeVars {
  [key: string]: string | number | undefined;
}

export type CSSVars =
  | '--vf-node-color'
  | '--vf-box-shadow'
  | '--vf-node-bg'
  | '--vf-node-text'
  | '--vf-connection-path'
  | '--vf-handle';

export type ThemeVars = { [key in CSSVars]?: string };
export type Styles = Record<string, string | number | undefined> & ThemeVars & CustomThemeVars;


/** Handle Positions */
export enum Position {
  Left = 'left',
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
}

export interface XYPosition {
  x: number;
  y: number;
}

export type XYZPosition = XYPosition & { z: number };

export interface Dimensions {
  width: number;
  height: number;
}

export interface Box extends XYPosition {
  x2: number;
  y2: number;
}

export interface Rect extends Dimensions, XYPosition {}

export type SnapGrid = [x: number, y: number];

export interface SelectionRect extends Rect {
  startX: number;
  startY: number;
}

export enum SelectionMode {
  Partial = 'partial',
  Full = 'full',
}

export interface FlowExportObject {
  /** exported nodes */
  nodes: Node[];
  /** exported edges */
  edges: Edge[];
  /** exported viewport (position + zoom) */
  viewport: ViewportTransform;
}

export type FlowImportObject = {
  [key in keyof FlowExportObject]?: FlowExportObject[key];
};

export interface FlowProps {
  id?: string;
  nodes?: Node[];
  edges?: Edge[];
  /** either use the edgeTypes prop to define your edge-types or use slots (<template #edge-mySpecialType="props">) */
  edgeTypes?: EdgeTypesObject;
  /** either use the nodeTypes prop to define your node-types or use slots (<template #node-mySpecialType="props">) */
  nodeTypes?: NodeTypesObject;
  connectionMode?: ConnectionMode;
  connectionLineOptions?: ConnectionLineOptions;
  connectionRadius?: number;
  isValidConnection?: ValidConnectionFunc | null;
  deleteKeyCode?: KeyFilter | null;
  selectionKeyCode?: KeyFilter | boolean | null;
  multiSelectionKeyCode?: KeyFilter | null;
  zoomActivationKeyCode?: KeyFilter | null;
  panActivationKeyCode?: KeyFilter | null;
  snapToGrid?: boolean;
  snapGrid?: SnapGrid;
  onlyRenderVisibleElements?: boolean;
  edgesUpdatable?: EdgeUpdatable;
  nodesDraggable?: boolean;
  nodesConnectable?: boolean;
  nodeDragThreshold?: number;
  elementsSelectable?: boolean;
  selectNodesOnDrag?: boolean;
  /** move pane on drag, replaced prop `paneMovable` */
  panOnDrag?: boolean | number[];
  minZoom?: number;
  maxZoom?: number;
  defaultViewport?: Partial<ViewportTransform>;
  translateExtent?: CoordinateExtent;
  nodeExtent?: CoordinateExtent | CoordinateExtentRange;
  defaultMarkerColor?: string;
  zoomOnScroll?: boolean;
  zoomOnPinch?: boolean;
  panOnScroll?: boolean;
  panOnScrollSpeed?: number;
  panOnScrollMode?: PanOnScrollMode;
  /**
   * Distance that the mouse can move between mousedown/up that will trigger a click
   * @default 0
   */
  paneClickDistance?: number;
  zoomOnDoubleClick?: boolean;
  /** If set to false, scrolling inside the viewport will be disabled and instead the page scroll will be used */
  preventScrolling?: boolean;
  selectionMode?: SelectionMode;
  edgeUpdaterRadius?: number;
  /** will be renamed to `fitView` */
  fitViewOnInit?: boolean;
  /** allow connection with click handlers, i.e. support touch devices */
  connectOnClick?: boolean;
  noDragClassName?: string;
  noWheelClassName?: string;
  noPanClassName?: string;
  /** does not work for the `addEdge` utility! */
  defaultEdgeOptions?: DefaultEdgeOptions;
  /** elevates edges when selected and applies z-Index to put them above their nodes */
  elevateEdgesOnSelect?: boolean;
  /** elevates nodes when selected and applies z-Index + 1000 */
  elevateNodesOnSelect?: boolean;

  disableKeyboardA11y?: boolean;
  edgesFocusable?: boolean;
  nodesFocusable?: boolean;

  autoPanOnConnect?: boolean;
  autoPanOnNodeDrag?: boolean;
  autoPanSpeed?: number;
}

export interface FlowEmits {
  (event: 'nodesChange', changes: NodeChange[]): void;
  (event: 'edgesChange', changes: EdgeChange[]): void;
  (event: 'nodesInitialized'): void;
  (event: 'init', paneEvent: FlowKitStore): void;
  (event: 'updateNodeInternals'): void;
  (event: 'error', error: FlowKitError): void;

  (event: 'connect', connectionEvent: Connection): void;
  (
    event: 'connectStart',
    connectionEvent: {
      event?: MouseEvent;
    } & OnConnectStartParams,
  ): void;
  (event: 'connectEnd', connectionEvent?: MouseEvent): void;
  (
    event: 'clickConnectStart',
    connectionEvent: {
      event?: MouseEvent;
    } & OnConnectStartParams,
  ): void;
  (event: 'clickConnectEnd', connectionEvent?: MouseEvent): void;

  (
    event: 'moveStart',
    moveEvent: {
      event: D3ZoomEvent<HTMLDivElement, any>;
      flowTransform: ViewportTransform;
    },
  ): void;
  (
    event: 'move',
    moveEvent: {
      event: D3ZoomEvent<HTMLDivElement, any>;
      flowTransform: ViewportTransform;
    },
  ): void;
  (
    event: 'moveEnd',
    moveEvent: {
      event: D3ZoomEvent<HTMLDivElement, any>;
      flowTransform: ViewportTransform;
    },
  ): void;

  (event: 'selectionDragStart', selectionEvent: NodeDragEvent): void;
  (event: 'selectionDrag', selectionEvent: NodeDragEvent): void;
  (event: 'selectionDragStop', selectionEvent: NodeDragEvent): void;
  (
    event: 'selectionContextMenu',
    selectionEvent: { event: MouseEvent; nodes: GraphNode[] },
  ): void;
  (event: 'selectionStart', selectionEvent: MouseEvent): void;
  (event: 'selectionEnd', selectionEvent: MouseEvent): void;

  (event: 'viewportChangeStart', viewport: ViewportTransform): void;
  (event: 'viewportChange', viewport: ViewportTransform): void;
  (event: 'viewportChangeEnd', viewport: ViewportTransform): void;

  (event: 'paneScroll', paneScrollEvent: WheelEvent | undefined): void;
  (
    event:
      | 'paneClick'
      | 'paneContextMenu'
      | 'paneMouseEnter'
      | 'paneMouseMove'
      | 'paneMouseLeave',
    paneMouseEvent: MouseEvent,
  ): void;

  (event: 'edgeUpdate', edgeUpdateEvent: EdgeUpdateEvent): void;
  (
    event:
      | 'edgeContextMenu'
      | 'edgeMouseEnter'
      | 'edgeMouseMove'
      | 'edgeMouseLeave'
      | 'edgeDoubleClick'
      | 'edgeClick'
      | 'edgeUpdateStart'
      | 'edgeUpdateEnd',
    edgeMouseEvent: EdgeMouseEvent,
  ): void;

  (
    event:
      | 'nodeContextMenu'
      | 'nodeMouseEnter'
      | 'nodeMouseMove'
      | 'nodeMouseLeave'
      | 'nodeDoubleClick'
      | 'nodeClick',
    nodeMouseEvent: NodeMouseEvent,
  ): void;

  (
    event: 'nodeDragStart' | 'nodeDrag' | 'nodeDragStop',
    nodeDragEvent: NodeDragEvent,
  ): void;

  (
    event:
      | 'miniMapNodeClick'
      | 'miniMapNodeDoubleClick'
      | 'miniMapNodeMouseEnter'
      | 'miniMapNodeMouseMove'
      | 'miniMapNodeMouseLeave',
    nodeMouseEvent: NodeMouseEvent,
  ): void;

  /** v-model event definitions */
  (event: 'update:modelValue', value: Elements): void;
  (event: 'update:nodes', value: GraphNode[]): void;
  (event: 'update:edges', value: GraphEdge[]): void;
}

export interface NodeSlots extends Record<
  `node-${string}`,
  (nodeProps: NodeProps) => any
> {}

export interface EdgeSlots extends Record<
  `edge-${string}`,
  (edgeProps: EdgeProps) => any
> {}

export interface FlowSlots extends NodeSlots, EdgeSlots {
  'connection-line': (connectionLineProps: ConnectionLineProps) => any;
  'zoom-pane': () => any;
  default: () => any;
}
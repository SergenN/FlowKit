import type { D3ZoomEvent } from 'd3-zoom'
import type {
  EventHookExtended,
  EventHookOn,
  EventHookTrigger,
  FlowItError,
} from '../utils';
import type { GraphEdge } from './edge'
import type { GraphNode } from './node'
import type { Connection, OnConnectStartParams } from './connection'
import type { ViewportTransform } from './zoom'
import type { EdgeChange, NodeChange } from './changes'
import type { FlowItStore } from './store'

export type MouseTouchEvent = MouseEvent | TouchEvent

export interface NodeMouseEvent {
  event: MouseTouchEvent
  node: GraphNode
}

export interface NodeDragEvent {
  event: MouseTouchEvent
  node: GraphNode
  nodes: GraphNode[]
}

export interface EdgeMouseEvent {
  event: MouseTouchEvent
  edge: GraphEdge
}

export interface EdgeUpdateEvent {
  event: MouseTouchEvent
  edge: GraphEdge
  connection: Connection
}

export interface FlowEvents {
  nodesChange: NodeChange[];
  edgesChange: EdgeChange[];
  nodeDoubleClick: NodeMouseEvent;
  nodeClick: NodeMouseEvent;
  nodeMouseEnter: NodeMouseEvent;
  nodeMouseMove: NodeMouseEvent;
  nodeMouseLeave: NodeMouseEvent;
  nodeContextMenu: NodeMouseEvent;
  nodeDragStart: NodeDragEvent;
  nodeDrag: NodeDragEvent;
  nodeDragStop: NodeDragEvent;
  nodesInitialized: GraphNode[];
  updateNodeInternals: string[];
  miniMapNodeClick: NodeMouseEvent;
  miniMapNodeDoubleClick: NodeMouseEvent;
  miniMapNodeMouseEnter: NodeMouseEvent;
  miniMapNodeMouseMove: NodeMouseEvent;
  miniMapNodeMouseLeave: NodeMouseEvent;
  connect: Connection;
  connectStart: {
    event?: MouseEvent | TouchEvent;
  } & OnConnectStartParams;
  connectEnd: MouseEvent | TouchEvent | undefined;
  clickConnectStart: {
    event?: MouseEvent | TouchEvent;
  } & OnConnectStartParams;
  clickConnectEnd: MouseEvent | TouchEvent | undefined;
  init: FlowItStore;
  move: {
    event: D3ZoomEvent<HTMLDivElement, any> | WheelEvent;
    flowTransform: ViewportTransform;
  };
  moveStart: {
    event: D3ZoomEvent<HTMLDivElement, any> | WheelEvent;
    flowTransform: ViewportTransform;
  };
  moveEnd: {
    event: D3ZoomEvent<HTMLDivElement, any> | WheelEvent;
    flowTransform: ViewportTransform;
  };
  selectionDragStart: NodeDragEvent;
  selectionDrag: NodeDragEvent;
  selectionDragStop: NodeDragEvent;
  selectionContextMenu: { event: MouseEvent; nodes: GraphNode[] };
  selectionStart: MouseEvent;
  selectionEnd: MouseEvent;
  viewportChangeStart: ViewportTransform;
  viewportChange: ViewportTransform;
  viewportChangeEnd: ViewportTransform;
  paneScroll: WheelEvent | undefined;
  paneClick: MouseEvent;
  paneContextMenu: MouseEvent;
  paneMouseEnter: PointerEvent;
  paneMouseMove: PointerEvent;
  paneMouseLeave: PointerEvent;
  edgeContextMenu: EdgeMouseEvent;
  edgeMouseEnter: EdgeMouseEvent;
  edgeMouseMove: EdgeMouseEvent;
  edgeMouseLeave: EdgeMouseEvent;
  edgeDoubleClick: EdgeMouseEvent;
  edgeClick: EdgeMouseEvent;
  edgeUpdateStart: EdgeMouseEvent;
  edgeUpdate: EdgeUpdateEvent;
  edgeUpdateEnd: EdgeMouseEvent;
  error: FlowItError;
}

export type FlowHooks = Readonly<{
  [key in keyof FlowEvents]: EventHookExtended<FlowEvents[key]>
}>

export type FlowHooksOn = Readonly<{
  [key in keyof FlowEvents as `on${Capitalize<key>}`]: EventHookOn<FlowEvents[key]>
}>

export type FlowHooksEmit = Readonly<{
  [key in keyof FlowEvents]: EventHookTrigger<FlowEvents[key]>
}>

/**
 * To type `Args` (the event callback arguments) pass an array as argument list as first generic type
 * To type `Return` (the event callback return value) pass a value to the second generic type
 */
export type CustomEvent<Args extends any[] = any[], Return = any> = (...args: Args) => Return

type CustomEventHandlers<CustomEvents = object> = {
  [key in keyof CustomEvents]: CustomEvents[key]
}

export type EdgeEventsHandler<CustomEvents = object> = {
  doubleClick: (event: EdgeMouseEvent) => void | { off: () => void }
  click: (event: EdgeMouseEvent) => void | { off: () => void }
  mouseEnter: (event: EdgeMouseEvent) => void | { off: () => void }
  mouseMove: (event: EdgeMouseEvent) => void | { off: () => void }
  mouseLeave: (event: EdgeMouseEvent) => void | { off: () => void }
  contextMenu: (event: EdgeMouseEvent) => void | { off: () => void }
  updateStart: (event: EdgeMouseEvent) => void | { off: () => void }
  update: (event: EdgeUpdateEvent) => void | { off: () => void }
  updateEnd: (event: EdgeMouseEvent) => void | { off: () => void }
} & CustomEventHandlers<CustomEvents>

export type EdgeEventsOn<CustomEvents = object> = {
  [key in keyof EdgeEventsHandler]: EventHookOn<EdgeEventsHandler[key] extends (event: infer Event) => any ? Event : never>
} & CustomEventHandlers<CustomEvents>

export type EdgeEventsEmit<CustomEvents = object> = {
  [key in keyof EdgeEventsHandler]: EventHookTrigger<EdgeEventsHandler[key] extends (event: infer Event) => any ? Event : never>
} & CustomEventHandlers<CustomEvents>

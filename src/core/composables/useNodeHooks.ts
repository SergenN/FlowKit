import type { FlowItStore, NodeMouseEvent, NodeDragEvent } from '../types';
import { createExtendedEventHook } from '../utils';
import type { EventHookExtended } from '../utils';

type NodeHooks = {
  doubleClick: EventHookExtended<NodeMouseEvent>;
  click: EventHookExtended<NodeMouseEvent>;
  mouseEnter: EventHookExtended<NodeMouseEvent>;
  mouseMove: EventHookExtended<NodeMouseEvent>;
  mouseLeave: EventHookExtended<NodeMouseEvent>;
  contextMenu: EventHookExtended<NodeMouseEvent>;
  dragStart: EventHookExtended<NodeDragEvent>;
  drag: EventHookExtended<NodeDragEvent>;
  dragStop: EventHookExtended<NodeDragEvent>;
};

export type NodeEmit = { [K in keyof NodeHooks]: NodeHooks[K]['trigger'] };
export type NodeOn = { [K in keyof NodeHooks]: NodeHooks[K]['on'] };

function createNodeHooks(): NodeHooks {
  return {
    doubleClick: createExtendedEventHook(),
    click: createExtendedEventHook(),
    mouseEnter: createExtendedEventHook(),
    mouseMove: createExtendedEventHook(),
    mouseLeave: createExtendedEventHook(),
    contextMenu: createExtendedEventHook(),
    dragStart: createExtendedEventHook(),
    drag: createExtendedEventHook(),
    dragStop: createExtendedEventHook(),
  };
}

export function useNodeHooks(emits: FlowItStore['emits']): {
  emit: NodeEmit;
  on: NodeOn;
} {
  const nodeHooks = createNodeHooks();

  nodeHooks.doubleClick.on((event) => emits.nodeDoubleClick(event));
  nodeHooks.click.on((event) => emits.nodeClick(event));
  nodeHooks.mouseEnter.on((event) => emits.nodeMouseEnter(event));
  nodeHooks.mouseMove.on((event) => emits.nodeMouseMove(event));
  nodeHooks.mouseLeave.on((event) => emits.nodeMouseLeave(event));
  nodeHooks.contextMenu.on((event) => emits.nodeContextMenu(event));
  nodeHooks.dragStart.on((event) => emits.nodeDragStart(event));
  nodeHooks.drag.on((event) => emits.nodeDrag(event));
  nodeHooks.dragStop.on((event) => emits.nodeDragStop(event));

  return {
    emit: {
      doubleClick: nodeHooks.doubleClick.trigger,
      click: nodeHooks.click.trigger,
      mouseEnter: nodeHooks.mouseEnter.trigger,
      mouseMove: nodeHooks.mouseMove.trigger,
      mouseLeave: nodeHooks.mouseLeave.trigger,
      contextMenu: nodeHooks.contextMenu.trigger,
      dragStart: nodeHooks.dragStart.trigger,
      drag: nodeHooks.drag.trigger,
      dragStop: nodeHooks.dragStop.trigger,
    },
    on: {
      doubleClick: nodeHooks.doubleClick.on,
      click: nodeHooks.click.on,
      mouseEnter: nodeHooks.mouseEnter.on,
      mouseMove: nodeHooks.mouseMove.on,
      mouseLeave: nodeHooks.mouseLeave.on,
      contextMenu: nodeHooks.contextMenu.on,
      dragStart: nodeHooks.dragStart.on,
      drag: nodeHooks.drag.on,
      dragStop: nodeHooks.dragStop.on,
    },
  };
}

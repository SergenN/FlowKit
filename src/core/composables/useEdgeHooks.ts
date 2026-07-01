import type { FlowItStore, EdgeMouseEvent, EdgeUpdateEvent } from '../types';
import { createExtendedEventHook } from '../utils';
import type { EventHookExtended } from '../utils';

type EdgeHooks = {
  doubleClick: EventHookExtended<EdgeMouseEvent>;
  click: EventHookExtended<EdgeMouseEvent>;
  mouseEnter: EventHookExtended<EdgeMouseEvent>;
  mouseMove: EventHookExtended<EdgeMouseEvent>;
  mouseLeave: EventHookExtended<EdgeMouseEvent>;
  contextMenu: EventHookExtended<EdgeMouseEvent>;
  updateStart: EventHookExtended<EdgeMouseEvent>;
  update: EventHookExtended<EdgeUpdateEvent>;
  updateEnd: EventHookExtended<EdgeMouseEvent>;
};

export type EdgeEmit = { [K in keyof EdgeHooks]: EdgeHooks[K]['trigger'] };
export type EdgeOn = { [K in keyof EdgeHooks]: EdgeHooks[K]['on'] };

function createEdgeHooks(): EdgeHooks {
  return {
    doubleClick: createExtendedEventHook(),
    click: createExtendedEventHook(),
    mouseEnter: createExtendedEventHook(),
    mouseMove: createExtendedEventHook(),
    mouseLeave: createExtendedEventHook(),
    contextMenu: createExtendedEventHook(),
    updateStart: createExtendedEventHook(),
    update: createExtendedEventHook(),
    updateEnd: createExtendedEventHook(),
  };
}

export function useEdgeHooks(emits: FlowItStore['emits']): {
  emit: EdgeEmit;
  on: EdgeOn;
} {
  const edgeHooks = createEdgeHooks();

  edgeHooks.doubleClick.on((event) => emits.edgeDoubleClick(event));
  edgeHooks.click.on((event) => emits.edgeClick(event));
  edgeHooks.mouseEnter.on((event) => emits.edgeMouseEnter(event));
  edgeHooks.mouseMove.on((event) => emits.edgeMouseMove(event));
  edgeHooks.mouseLeave.on((event) => emits.edgeMouseLeave(event));
  edgeHooks.contextMenu.on((event) => emits.edgeContextMenu(event));
  edgeHooks.updateStart.on((event) => emits.edgeUpdateStart(event));
  edgeHooks.update.on((event) => emits.edgeUpdate(event));
  edgeHooks.updateEnd.on((event) => emits.edgeUpdateEnd(event));

  return {
    emit: {
      doubleClick: edgeHooks.doubleClick.trigger,
      click: edgeHooks.click.trigger,
      mouseEnter: edgeHooks.mouseEnter.trigger,
      mouseMove: edgeHooks.mouseMove.trigger,
      mouseLeave: edgeHooks.mouseLeave.trigger,
      contextMenu: edgeHooks.contextMenu.trigger,
      updateStart: edgeHooks.updateStart.trigger,
      update: edgeHooks.update.trigger,
      updateEnd: edgeHooks.updateEnd.trigger,
    },
    on: {
      doubleClick: edgeHooks.doubleClick.on,
      click: edgeHooks.click.on,
      mouseEnter: edgeHooks.mouseEnter.on,
      mouseMove: edgeHooks.mouseMove.on,
      mouseLeave: edgeHooks.mouseLeave.on,
      contextMenu: edgeHooks.contextMenu.on,
      updateStart: edgeHooks.updateStart.on,
      update: edgeHooks.update.on,
      updateEnd: edgeHooks.updateEnd.on,
    },
  };
}

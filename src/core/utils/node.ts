import type {
  Actions,
  GraphNode,
  HandleElement,
  HandleType,
  Position,
} from '../types';
import { getDimensions } from '.';

export function getHandleBounds(
  type: HandleType,
  nodeElement: HTMLDivElement,
  nodeBounds: DOMRect,
  zoom: number,
  nodeId: string,
): HandleElement[] | null {
  const handles = nodeElement.querySelectorAll(`.flow__handle.${type}`);

  if (!handles?.length) {
    return null;
  }

  return Array.from(handles).map((handle): HandleElement => {
    const handleBounds = handle.getBoundingClientRect();

    return {
      id: handle.getAttribute('data-handleid'),
      type,
      nodeId,
      position: handle.getAttribute('data-handlepos') as unknown as Position,
      x: (handleBounds.left - nodeBounds.left) / zoom,
      y: (handleBounds.top - nodeBounds.top) / zoom,
      ...getDimensions(handle as HTMLDivElement),
    };
  });
}

export function handleNodeClick(
  node: GraphNode,
  multiSelectionActive: boolean,
  addSelectedNodes: Actions['addSelectedNodes'],
  removeSelectedNodes: Actions['removeSelectedNodes'],
  unselect = false,
  nodeEl: HTMLDivElement,
) {
  if (!node.selected) {
    addSelectedNodes([node]);
  } else if (unselect || (node.selected && multiSelectionActive)) {
    removeSelectedNodes([node]);

    queueMicrotask(() => {
      nodeEl.blur();
    });
  }
}

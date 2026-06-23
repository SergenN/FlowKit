import type { D3DragEvent, DragBehavior, SubjectPosition } from 'd3-drag';
import { drag } from 'd3-drag';
import { select } from 'd3-selection';
import type {
  MouseTouchEvent,
  NodeDragEvent,
  NodeDragItem,
  XYPosition,
} from '../types';
import {
  calcAutoPan,
  calcNextPosition,
  getDragItems,
  getEventHandlerParams,
  getEventPosition,
  handleNodeClick,
  hasSelector,
  snapPosition,
} from '../utils';
import { useGetPointerPosition, useFlowKit } from '.';

export type UseDragEvent = D3DragEvent<HTMLDivElement, null, SubjectPosition>;

interface UseDragParams {
  onStart: (event: NodeDragEvent) => void;
  onDrag: (event: NodeDragEvent) => void;
  onStop: (event: NodeDragEvent) => void;
  onClick?: (event: MouseTouchEvent) => void;
  el: Element | null;
  disabled?: boolean;
  selectable?: boolean;
  dragHandle?: string | undefined;
  id?: string;
  onDraggingChange?: (dragging: boolean) => void;
}

export function setupDrag(params: UseDragParams): () => void {
  const {
    flowRef,
    snapToGrid,
    snapGrid,
    noDragClassName,
    nodeLookup,
    nodeExtent,
    nodeDragThreshold,
    viewport,
    autoPanOnNodeDrag,
    autoPanSpeed,
    nodesDraggable,
    panBy,
    findNode,
    multiSelectionActive,
    nodesSelectionActive,
    selectNodesOnDrag,
    removeSelectedElements,
    addSelectedNodes,
    updateNodePositions,
    emits,
  } = useFlowKit();

  const {
    onStart,
    onDrag,
    onStop,
    onClick,
    el,
    disabled,
    id,
    selectable,
    dragHandle,
    onDraggingChange,
  } = params;

  let dragging = false;

  let dragItems: NodeDragItem[] = [];
  let dragHandler: DragBehavior<Element, unknown, unknown>;
  let containerBounds: DOMRect | null = null;
  let lastPos: Partial<XYPosition> = { x: undefined, y: undefined };
  let mousePosition: XYPosition = { x: 0, y: 0 };
  let dragEvent: MouseEvent | null = null;
  let dragStarted = false;
  let nodePositionsChanged = false;
  let autoPanId = 0;
  let autoPanStarted = false;

  const getPointerPosition = useGetPointerPosition();

  const setDragging = (value: boolean) => {
    dragging = value;
    onDraggingChange?.(value);
  };

  const updateNodes = ({ x, y }: XYPosition) => {
    lastPos = { x, y };

    let hasChange = false;

    dragItems = dragItems.map((n) => {
      const nextPosition = { x: x - n.distance.x, y: y - n.distance.y };

      const { computedPosition } = calcNextPosition(
        n,
        snapToGrid ? snapPosition(nextPosition, snapGrid) : nextPosition,
        emits.error,
        nodeExtent,
        n.parentId ? findNode(n.parentId) : undefined,
      );

      hasChange =
        hasChange ||
        n.position.x !== computedPosition.x ||
        n.position.y !== computedPosition.y;
      n.position = computedPosition;
      return n;
    });

    nodePositionsChanged = nodePositionsChanged || hasChange;

    if (!hasChange) {
      return;
    }

    updateNodePositions(dragItems, true, true);
    setDragging(true);

    if (dragEvent) {
      const [currentNode, nodes] = getEventHandlerParams({
        id,
        dragItems,
        findNode,
      });
      onDrag({ event: dragEvent, node: currentNode, nodes });
    }
  };

  const autoPan = () => {
    if (!containerBounds) {
      return;
    }

    const [xMovement, yMovement] = calcAutoPan(
      mousePosition,
      containerBounds,
      autoPanSpeed,
    );

    if (xMovement !== 0 || yMovement !== 0) {
      const nextPos = {
        x: (lastPos.x ?? 0) - xMovement / viewport.zoom,
        y: (lastPos.y ?? 0) - yMovement / viewport.zoom,
      };

      if (panBy({ x: xMovement, y: yMovement })) {
        updateNodes(nextPos);
      }
    }

    autoPanId = requestAnimationFrame(autoPan);
  };

  const startDrag = (event: UseDragEvent, nodeEl: Element) => {
    dragStarted = true;

    const node = findNode(id);
    if (!selectNodesOnDrag && !multiSelectionActive && node) {
      if (!node.selected) {
        removeSelectedElements();
      }
    }

    if (node && selectable && selectNodesOnDrag) {
      handleNodeClick(
        node,
        multiSelectionActive,
        addSelectedNodes,
        removeSelectedElements,
        nodesSelectionActive,
        nodeEl as HTMLDivElement,
      );
    }

    const pointerPos = getPointerPosition(event.sourceEvent);
    lastPos = pointerPos;
    dragItems = getDragItems(nodeLookup, nodesDraggable, pointerPos, id);

    if (dragItems.length) {
      const [currentNode, nodes] = getEventHandlerParams({
        id,
        dragItems,
        findNode,
      });
      onStart({ event: event.sourceEvent, node: currentNode, nodes });
    }
  };

  const eventStart = (event: UseDragEvent, nodeEl: Element) => {
    if (
      event.sourceEvent.type === 'touchmove' &&
      event.sourceEvent.touches.length > 1
    ) {
      return;
    }

    nodePositionsChanged = false;

    if (nodeDragThreshold === 0) {
      startDrag(event, nodeEl);
    }

    lastPos = getPointerPosition(event.sourceEvent);
    containerBounds = flowRef?.getBoundingClientRect() || null;
    mousePosition = getEventPosition(event.sourceEvent, containerBounds!);
  };

  const eventDrag = (event: UseDragEvent, nodeEl: Element) => {
    const pointerPos = getPointerPosition(event.sourceEvent);

    if (!autoPanStarted && dragStarted && autoPanOnNodeDrag) {
      autoPanStarted = true;
      autoPan();
    }

    if (!dragStarted) {
      const x = pointerPos.xSnapped - (lastPos.x ?? 0);
      const y = pointerPos.ySnapped - (lastPos.y ?? 0);
      const distance = Math.sqrt(x * x + y * y);

      if (distance > nodeDragThreshold) {
        startDrag(event, nodeEl);
      }
    }

    if (
      (lastPos.x !== pointerPos.xSnapped ||
        lastPos.y !== pointerPos.ySnapped) &&
      dragItems.length &&
      dragStarted
    ) {
      dragEvent = event.sourceEvent as MouseEvent;
      mousePosition = getEventPosition(event.sourceEvent, containerBounds!);
      updateNodes(pointerPos);
    }
  };

  const eventEnd = (event: UseDragEvent) => {
    let isClick = false;

    if (!dragStarted && !dragging && !multiSelectionActive) {
      const evt = event.sourceEvent as MouseTouchEvent;
      const pointerPos = getPointerPosition(evt);
      const x = pointerPos.xSnapped - (lastPos.x ?? 0);
      const y = pointerPos.ySnapped - (lastPos.y ?? 0);
      const distance = Math.sqrt(x * x + y * y);

      if (distance !== 0 && distance <= nodeDragThreshold) {
        onClick?.(evt);
        isClick = true;
      }
    }

    if (dragItems.length && !isClick) {
      if (nodePositionsChanged) {
        updateNodePositions(dragItems, false, false);
        nodePositionsChanged = false;
      }

      const [currentNode, nodes] = getEventHandlerParams({
        id,
        dragItems,
        findNode,
      });
      onStop({ event: event.sourceEvent, node: currentNode, nodes });
    }

    dragItems = [];
    setDragging(false);
    autoPanStarted = false;
    dragStarted = false;
    lastPos = { x: undefined, y: undefined };
    cancelAnimationFrame(autoPanId);
  };

  // setup drag on the element
  const cleanup = () => {
    if (!el) return;

    const selection = select(el);
    selection.on('.drag', null);

    if (dragHandler) {
      dragHandler.on('start', null);
      dragHandler.on('drag', null);
      dragHandler.on('end', null);
    }
  };

  if (el && !disabled) {
    const selection = select(el);

    dragHandler = drag()
      .on('start', (event: UseDragEvent) => eventStart(event, el))
      .on('drag', (event: UseDragEvent) => eventDrag(event, el))
      .on('end', (event: UseDragEvent) => eventEnd(event))
      .filter(
        (
          event: D3DragEvent<
            HTMLDivElement,
            null,
            SubjectPosition
          >['sourceEvent'],
        ) => {
          const target = event.target as HTMLDivElement;

          return (
            !event.button &&
            (!noDragClassName ||
              (!hasSelector(target, `.${noDragClassName}`, el) &&
                (!dragHandle || hasSelector(target, dragHandle, el))))
          );
        },
      );

    selection.call(dragHandler);
  }

  return cleanup;
}

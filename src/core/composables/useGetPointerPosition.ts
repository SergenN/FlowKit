import {
  getEventPosition,
  isUseDragEvent,
  pointToRendererPoint,
  snapPosition,
} from '../utils';
import type { MouseTouchEvent } from '../types';
import { useFlowKit } from './useFlowKit';
import type { UseDragEvent } from './useDrag';

/**
 * Composable that returns a function to get the pointer position
 *
 * @internal
 */
export function useGetPointerPosition() {
  const store = useFlowKit();

  // returns the pointer position projected to the VF coordinate system
  return (event: UseDragEvent | MouseTouchEvent) => {
    const { viewport, snapGrid, snapToGrid, flowRef } = store;

    const containerBounds = flowRef?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
    };
    const evt = isUseDragEvent(event) ? event.sourceEvent : event;

    const { x, y } = getEventPosition(evt, containerBounds as DOMRect);
    const pointerPos = pointToRendererPoint({ x, y }, viewport);
    const { x: xSnapped, y: ySnapped } = snapToGrid
      ? snapPosition(pointerPos, snapGrid)
      : pointerPos;

    // we need the snapped position to be able to skip unnecessary drag events
    return {
      xSnapped,
      ySnapped,
      ...pointerPos,
    };
  };
}

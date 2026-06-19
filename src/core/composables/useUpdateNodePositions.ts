import type { NodeDragItem, XYPosition } from '../types'
import { calcNextPosition } from '../utils'
import { useFlowJs } from './useFlowJS';

/**
 * Composable for updating the position of nodes.
 *
 * @internal
 */
export function useUpdateNodePositions() {
  const {
    getSelectedNodes,
    nodeExtent,
    updateNodePositions,
    findNode,
    snapGrid,
    snapToGrid,
    nodesDraggable,
    emits,
  } = useFlowJs();

  return (positionDiff: XYPosition, isShiftPressed = false) => {
    // by default a node moves 5px on each key press, or 20px if shift is pressed
    // if snap grid is enabled, we use that for the velocity.
    const xVelo = snapToGrid ? snapGrid[0] : 5
    const yVelo = snapToGrid ? snapGrid[1] : 5
    const factor = isShiftPressed ? 4 : 1

    const positionDiffX = positionDiff.x * xVelo * factor
    const positionDiffY = positionDiff.y * yVelo * factor

    const nodeUpdates: NodeDragItem[] = []
    for (const node of getSelectedNodes()) {
      if (node.draggable || (nodesDraggable && typeof node.draggable === 'undefined')) {
        const nextPosition = { x: node.computedPosition.x + positionDiffX, y: node.computedPosition.y + positionDiffY }

        const { position } = calcNextPosition(
          node,
          nextPosition,
          emits.error,
          nodeExtent,
          node.parentId ? findNode(node.parentId) : undefined,
        )

        nodeUpdates.push({
          id: node.id,
          position,
          from: node.position,
          distance: { x: positionDiff.x, y: positionDiff.y },
          dimensions: node.dimensions,
        })
      }
    }

    updateNodePositions(nodeUpdates, true, false)
  }
}

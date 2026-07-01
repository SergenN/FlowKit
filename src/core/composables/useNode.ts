import type { ElementData, GraphNode } from '../types';
import { ErrorCode, FlowKitError, getConnectedEdges } from '../utils';
import { useFlowKit } from './useFlowKit';

export function useNode<Data = ElementData>(
  id: string,
  nodeEl?: HTMLElement | null,
) {
  const { findNode, edges, emits } = useFlowKit();

  const node = findNode<Data>(id);

  if (!node) {
    emits.error(new FlowKitError(ErrorCode.NODE_NOT_FOUND, id));
  }

  return {
    id,
    nodeEl: nodeEl ?? null,
    node: node as GraphNode<Data>,
    parentNode: node?.parentId ? findNode(node.parentId) : undefined,
    connectedEdges: getConnectedEdges(node ? [node as GraphNode] : [], edges),
  };
}

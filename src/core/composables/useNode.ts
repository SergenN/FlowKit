import type { ElementData, GraphNode } from '../types';
import { ErrorCode, FlowJsError, getConnectedEdges } from '../utils';
import { useFlowJs } from './useFlowJS';

export function useNode<Data = ElementData>(
  id: string,
  nodeEl?: HTMLElement | null,
) {
  const { findNode, edges, emits } = useFlowJs();

  const node = findNode<Data>(id);

  if (!node) {
    emits.error(new FlowJsError(ErrorCode.NODE_NOT_FOUND, id));
  }

  return {
    id,
    nodeEl: nodeEl ?? null,
    node: node as GraphNode<Data>,
    parentNode: node?.parentId ? findNode(node.parentId) : undefined,
    connectedEdges: getConnectedEdges(node ? [node as GraphNode] : [], edges),
  };
}

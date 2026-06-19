import type { GraphNode, Node } from '../types';
import { useFlowJs } from './useFlowJS';

interface NodeData<NodeType extends Node = GraphNode> {
  id: string;
  type: NodeType['type'];
  data: NonNullable<NodeType['data']>;
}

export function getNodesData<NodeType extends Node = GraphNode>(
  nodeId: string,
): NodeData<NodeType> | null;
export function getNodesData<NodeType extends Node = GraphNode>(
  nodeIds: string[],
): NodeData<NodeType>[];
export function getNodesData<NodeType extends Node = GraphNode>(
  nodeIds: string[],
  guard: (node: Node) => node is NodeType,
): NodeData<NodeType>[];
export function getNodesData(_nodeIds: any): any {
  const { findNode } = useFlowJs();

  const nodeIds = _nodeIds;

  if (!Array.isArray(nodeIds)) {
    const node = findNode(nodeIds);

    if (node) {
      return {
        id: node.id,
        type: node.type,
        data: node.data,
      };
    }

    return null;
  }

  const data: NodeData<Node>[] = [];

  for (const nodeId of nodeIds) {
    const node = findNode(nodeId);

    if (node) {
      data.push({
        id: node.id,
        type: node.type,
        data: node.data,
      });
    }
  }

  return data;
}

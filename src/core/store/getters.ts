import type {
  ComputedGetters,
  EdgeComponent,
  GraphEdge,
  GraphNode,
  NodeComponent,
  NodeLookup,
  State,
} from '../types';
import {
  getNodesInside,
  isEdgeVisible,
  defaultEdgeTypes,
  defaultNodeTypes,
} from '../utils';

export function useGetters(
  state: State,
  nodeLookup: NodeLookup,
): ComputedGetters {
  const getEdgeTypes = (): Record<string, EdgeComponent> => {
    const edgeTypes: Record<string, any> = {
      ...defaultEdgeTypes,
      ...state.edgeTypes,
    };

    const keys = Object.keys(edgeTypes);

    for (const e of state.edges) {
      e.type && !keys.includes(e.type) && (edgeTypes[e.type] = e.type);
    }

    return edgeTypes;
  };

  const getNodeTypes = (): Record<string, NodeComponent> => {
    const nodeTypes: Record<string, any> = {
      ...defaultNodeTypes,
      ...state.nodeTypes,
    };

    const keys = Object.keys(nodeTypes);

    for (const n of state.nodes) {
      n.type && !keys.includes(n.type) && (nodeTypes[n.type] = n.type);
    }

    return nodeTypes;
  };

  const getNodes = (): GraphNode[] => {
    if (state.onlyRenderVisibleElements) {
      return getNodesInside(
        state.nodes,
        {
          x: 0,
          y: 0,
          width: state.dimensions.width,
          height: state.dimensions.height,
        },
        state.viewport,
        true,
      );
    }

    return state.nodes;
  };

  const getEdges = (): GraphEdge[] => {
    if (state.onlyRenderVisibleElements) {
      const visibleEdges: GraphEdge[] = [];

      for (const edge of state.edges) {
        const source = nodeLookup.get(edge.source)!;
        const target = nodeLookup.get(edge.target)!;

        if (
          isEdgeVisible({
            sourcePos: source.computedPosition || { x: 0, y: 0 },
            targetPos: target.computedPosition || { x: 0, y: 0 },
            sourceWidth: source.dimensions.width,
            sourceHeight: source.dimensions.height,
            targetWidth: target.dimensions.width,
            targetHeight: target.dimensions.height,
            width: state.dimensions.width,
            height: state.dimensions.height,
            viewport: state.viewport,
          })
        ) {
          visibleEdges.push(edge);
        }
      }

      return visibleEdges;
    }

    return state.edges;
  };

  const getSelectedNodes = (): GraphNode[] => {
    const selectedNodes: GraphNode[] = [];
    for (const node of state.nodes) {
      if (node.selected) {
        selectedNodes.push(node);
      }
    }
    return selectedNodes;
  };

  const getSelectedEdges = (): GraphEdge[] => {
    const selectedEdges: GraphEdge[] = [];
    for (const edge of state.edges) {
      if (edge.selected) {
        selectedEdges.push(edge);
      }
    }
    return selectedEdges;
  };

  const getSelectedElements = (): (GraphNode | GraphEdge)[] => [
    ...getSelectedNodes(),
    ...getSelectedEdges(),
  ];

  return {
    getEdgeTypes,
    getNodeTypes,
    getEdges,
    getNodes,
    getSelectedElements,
    getSelectedNodes,
    getSelectedEdges,
  };
}

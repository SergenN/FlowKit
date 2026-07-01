import type { Edge, GraphEdge } from '../types';
import { useFlowIt } from './useFlowIt';

interface EdgeData<EdgeType extends Edge = GraphEdge> {
  id: string;
  type: EdgeType['type'];
  data: NonNullable<EdgeType['data']> | null;
}

export function useEdgesData<EdgeType extends Edge = GraphEdge>(
  edgeId: string,
): EdgeData<EdgeType> | null;
export function useEdgesData<EdgeType extends Edge = GraphEdge>(
  edgeIds: string[],
): EdgeData<EdgeType>[];
export function useEdgesData<EdgeType extends Edge = GraphEdge>(
  edgeIds: string[],
  guard: (edge: Edge) => edge is EdgeType,
): EdgeData<EdgeType>[];
export function useEdgesData(_edgeIds: any): any {
  const { findEdge } = useFlowIt();

  const edgeIds = _edgeIds;

  if (!Array.isArray(edgeIds)) {
    const edge = findEdge(edgeIds);

    if (edge) {
      return {
        id: edge.id,
        type: edge.type,
        data: edge.data ?? null,
      };
    }

    return null;
  }

  const data: EdgeData<Edge>[] = [];

  for (const edgeId of edgeIds) {
    const edge = findEdge(edgeId);

    if (edge) {
      data.push({
        id: edge.id,
        type: edge.type,
        data: edge.data ?? null,
      });
    }
  }

  return data;
}

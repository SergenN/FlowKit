import type { ElementData } from '../types';
import { ErrorCode, FlowKitError } from '../utils';
import { useFlowKit } from './useFlowKit';

/**
 * Composable that provides access to an edge object and it's dom element
 *
 * If no edge id is provided, the edge id is injected from context
 *
 * If you do not provide an id, this composable has to be called in a child of your custom edge component, or it will throw
 *
 * @public
 * @param id - The id of the edge to access
 * @param edgeEl
 * @returns the edge id, the edge and the edge dom element
 */
export function useEdge<Data = ElementData>(
  id: string,
  edgeEl?: HTMLElement | SVGElement | null,
) {
  const { findEdge, emits } = useFlowKit();

  const edge = findEdge<Data>(id);

  if (!edge) {
    emits.error(new FlowKitError(ErrorCode.EDGE_NOT_FOUND, id));
  }

  return {
    id,
    edge,
    edgeEl: edgeEl ?? null,
  };
}
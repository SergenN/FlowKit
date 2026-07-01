import { useFlowIt } from './useFlowIt';

export interface UseNodesInitializedOptions {
  includeHiddenNodes?: boolean;
}

export function getNodesInitialized(
  options: UseNodesInitializedOptions = { includeHiddenNodes: false },
): boolean {
  const { nodes } = useFlowIt();

  if (nodes.length === 0) {
    return false;
  }

  for (const node of nodes) {
    if (options.includeHiddenNodes || !node.hidden) {
      if (
        node?.handleBounds === undefined ||
        node.dimensions.width === 0 ||
        node.dimensions.height === 0
      ) {
        return false;
      }
    }
  }

  return true;
}

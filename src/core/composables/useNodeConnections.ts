import type { HandleType, NodeConnection } from '../types';
import { areConnectionMapsEqual, handleConnectionChange } from '../utils';
import { useFlowKit } from './useFlowKit';

export interface UseNodeConnectionsParams {
  handleType?: HandleType | null;
  handleId?: string | null;
  nodeId: string;
  onConnect?: (connections: NodeConnection[]) => void;
  onDisconnect?: (connections: NodeConnection[]) => void;
}

export function getNodeConnections(
  params: UseNodeConnectionsParams,
): NodeConnection[] {
  const { handleType, handleId, nodeId } = params;
  const { connectionLookup } = useFlowKit();

  let handleSuffix = '';
  if (handleType) {
    handleSuffix = handleId ? `-${handleType}-${handleId}` : `-${handleType}`;
  }

  const key = `${nodeId}${handleSuffix}`;
  const connections = connectionLookup.get(key);

  if (!connections) return [];

  return Array.from(connections.values());
}

export function setupNodeConnections(
  params: UseNodeConnectionsParams,
  onChange: (connections: NodeConnection[]) => void,
): () => void {
  const { handleType, handleId, nodeId, onConnect, onDisconnect } = params;
  const store = useFlowKit();
  const { connectionLookup } = store;

  let prevConnections: Map<string, NodeConnection> | null = null;

  let handleSuffix = '';
  if (handleType) {
    handleSuffix = handleId ? `-${handleType}-${handleId}` : `-${handleType}`;
  }

  const key = `${nodeId}${handleSuffix}`;

  const checkConnections = () => {
    const nextConnections = connectionLookup.get(key);

    if (areConnectionMapsEqual(prevConnections ?? undefined, nextConnections)) {
      return;
    }

    const currentConnections =
      nextConnections ?? new Map<string, NodeConnection>();

    if (prevConnections) {
      handleConnectionChange(prevConnections, currentConnections, onDisconnect);
      handleConnectionChange(currentConnections, prevConnections, onConnect);
    }

    prevConnections = currentConnections;
    onChange(Array.from(currentConnections.values()));
  };

  // Run immediately to capture the current state.
  checkConnections();

  // Re-check whenever edges change — the connectionLookup is rebuilt on every
  // edge add/remove/update, so this is the correct reactive signal.
  const onEdgesChange = () => checkConnections();
  store.onEdgesChange(onEdgesChange);

  return () => store.hooks.edgesChange.off(onEdgesChange);
}

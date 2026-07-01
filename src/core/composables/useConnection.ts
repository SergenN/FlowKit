import { useFlowKit } from './useFlowKit'

/**
 * Composable for accessing the currently ongoing connection.
 *
 * @public
 * @returns current connection: startHandle, endHandle, status, position
 */
export function useConnection() {
  const {
    connectionStartHandle: startHandle,
    connectionEndHandle: endHandle,
    connectionStatus: status,
    connectionPosition: position,
  } = useFlowKit();

  return {
    startHandle,
    endHandle,
    status,
    position,
  }
}

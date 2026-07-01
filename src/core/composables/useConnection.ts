import { useFlowIt } from './useFlowIt'

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
  } = useFlowIt();

  return {
    startHandle,
    endHandle,
    status,
    position,
  }
}

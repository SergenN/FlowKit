import type {
  Connection,
  ConnectionInProgress,
  HandleElement,
  HandleType,
  MouseTouchEvent,
  ValidConnectionFunc,
} from '../types';
import {
  calcAutoPan,
  getClosestHandle,
  getConnectionStatus,
  getEventPosition,
  getHandle,
  getHandlePosition,
  getHandleType,
  getHostForElement,
  isConnectionValid,
  isMouseEvent,
  isValidHandle,
  oppositePosition,
  pointToRendererPoint,
  rendererPointToPoint,
  resetRecentHandle,
} from '../utils';
import { Position } from '../types';
import { useFlowIt } from './useFlowIt';

export interface UseHandleProps {
  handleId: string | null;
  nodeId: string;
  type: HandleType;
  isValidConnection?: ValidConnectionFunc | null;
  edgeUpdaterType?: HandleType;
  onEdgeUpdate?: (event: MouseTouchEvent, connection: Connection) => void;
  onEdgeUpdateEnd?: (event: MouseTouchEvent) => void;
}

function alwaysValid() {
  return true;
}

/**
 * This composable provides listeners for handle events
 *
 * Generally it's recommended to use the `<Handle />` component instead of this composable.
 *
 * @public
 */
export function useHandle({
  handleId,
  nodeId,
  type,
  isValidConnection,
  edgeUpdaterType,
  onEdgeUpdate,
  onEdgeUpdateEnd,
}: UseHandleProps) {
  const {
    id: flowId,
    connectionMode,
    connectionRadius,
    connectOnClick,
    connectionClickStartHandle,
    nodesConnectable,
    autoPanOnConnect,
    autoPanSpeed,
    findNode,
    panBy,
    startConnection,
    updateConnection,
    endConnection,
    emits,
    edges,
    nodes,
    isValidConnection: isValidConnectionProp,
    nodeLookup,
  } = useFlowIt();
  const store = useFlowIt();

  let connection: Connection | null = null;
  let isValid: boolean | null = false;
  let handleDomNode: Element | null = null;

  function handlePointerDown(event: MouseTouchEvent) {
    const isTarget = type === 'target';

    const isMouseTriggered = isMouseEvent(event);

    // when vue-flow is used inside a shadow root we can't use document
    const doc = getHostForElement(event.target as HTMLElement);
    const clickedHandle = event.currentTarget as HTMLElement | null;

    if (
      clickedHandle &&
      ((isMouseTriggered && event.button === 0) || !isMouseTriggered)
    ) {
      // const node = findNode(nodeId)

      let isValidConnectionHandler =
        isValidConnection || isValidConnectionProp || alwaysValid;

      // if (!isValidConnectionHandler && node) {
      //   isValidConnectionHandler = (!isTarget ? node.isValidTargetPos : node.isValidSourcePos) || alwaysValid
      // }

      let closestHandle: HandleElement | null;

      let autoPanId = 0;

      const { x, y } = getEventPosition(event);
      const handleType = getHandleType(edgeUpdaterType, clickedHandle);
      const containerBounds = store.flowRef?.getBoundingClientRect();

      if (!containerBounds || !handleType) {
        return;
      }

      const fromHandleInternal = getHandle(
        nodeId,
        handleType,
        handleId,
        nodeLookup,
        connectionMode,
      );

      if (!fromHandleInternal) {
        return;
      }

      let prevActiveHandle: Element;
      let connectionPosition = getEventPosition(event, containerBounds);
      let autoPanStarted = false;

      // when the user is moving the mouse close to the edge of the canvas while connecting we move the canvas
      const autoPan = () => {
        if (!autoPanOnConnect) {
          return;
        }

        const [xMovement, yMovement] = calcAutoPan(
          connectionPosition,
          containerBounds,
          autoPanSpeed,
        );

        panBy({ x: xMovement, y: yMovement });
        autoPanId = requestAnimationFrame(autoPan);
      };

      // Stays the same for all consecutive pointermove events
      const fromHandle: HandleElement = {
        ...fromHandleInternal,
        nodeId: nodeId,
        type: handleType,
        position: fromHandleInternal.position,
      };

      const fromNodeInternal = nodeLookup.get(nodeId)!;

      const from = getHandlePosition(
        fromNodeInternal,
        fromHandle,
        Position.Left,
        true,
      );

      const newConnection: ConnectionInProgress = {
        inProgress: true,
        isValid: null,

        from,
        fromHandle,
        fromPosition: fromHandle.position,
        fromNode: fromNodeInternal,

        to: connectionPosition,
        toHandle: null,
        toPosition: oppositePosition[fromHandle.position],
        toNode: null,
      };

      startConnection(
        {
          nodeId: nodeId,
          id: handleId,
          type: handleType,
          position:
            (clickedHandle?.getAttribute('data-handlepos') as Position) ||
            Position.Top,
          ...connectionPosition,
        },
        {
          x: x - containerBounds.left,
          y: y - containerBounds.top,
        },
      );

      emits.connectStart({
        event,
        nodeId: nodeId,
        handleId: handleId,
        handleType,
      });

      let previousConnection: ConnectionInProgress = newConnection;

      function onPointerMove(event: MouseTouchEvent) {
        connectionPosition = getEventPosition(event, containerBounds);

        closestHandle = getClosestHandle(
          pointToRendererPoint(
            connectionPosition,
            store.viewport,
            false,
            [1, 1],
          ),
          connectionRadius,
          nodeLookup,
          fromHandle,
        );

        if (!autoPanStarted) {
          autoPan();
          autoPanStarted = true;
        }

        const result = isValidHandle(
          event,
          {
            handle: closestHandle,
            connectionMode: connectionMode,
            fromNodeId: nodeId,
            fromHandleId: handleId,
            fromType: isTarget ? 'target' : 'source',
            isValidConnection: isValidConnectionHandler,
            doc,
            flowId,
            nodeLookup: nodeLookup,
          },
          edges,
          nodes,
          findNode,
          nodeLookup,
        );

        handleDomNode = result.handleDomNode;
        connection = result.connection;
        isValid = isConnectionValid(!!closestHandle, result.isValid);

        const newConnection: ConnectionInProgress = {
          // from stays the same
          ...previousConnection,
          isValid,
          to:
            result.toHandle && isValid
              ? rendererPointToPoint(
                  { x: result.toHandle.x, y: result.toHandle.y },
                  store.viewport,
                )
              : connectionPosition,
          toHandle: result.toHandle,
          toPosition:
            isValid && result.toHandle
              ? result.toHandle.position
              : oppositePosition[fromHandle.position],
          toNode: result.toHandle
            ? nodeLookup.get(result.toHandle.nodeId)!
            : null,
        };

        // we don't want to trigger an update when the connection
        // is snapped to the same handle as before
        if (
          isValid &&
          closestHandle &&
          previousConnection?.toHandle &&
          newConnection.toHandle &&
          previousConnection.toHandle.type === newConnection.toHandle.type &&
          previousConnection.toHandle.nodeId ===
            newConnection.toHandle.nodeId &&
          previousConnection.toHandle.id === newConnection.toHandle.id &&
          previousConnection.to.x === newConnection.to.x &&
          previousConnection.to.y === newConnection.to.y
        ) {
          return;
        }

        const connectingHandle = closestHandle ?? result.toHandle;

        updateConnection(
          connectingHandle && isValid
            ? rendererPointToPoint(
                {
                  x: connectingHandle.x,
                  y: connectingHandle.y,
                },
                store.viewport,
              )
            : connectionPosition,
          connectingHandle,
          getConnectionStatus(!!connectingHandle, isValid),
        );

        previousConnection = newConnection;

        if (!closestHandle && !isValid && !handleDomNode) {
          return resetRecentHandle(prevActiveHandle);
        }

        if (
          connection &&
          connection.source !== connection.target &&
          handleDomNode
        ) {
          resetRecentHandle(prevActiveHandle);

          prevActiveHandle = handleDomNode;

          // todo: remove `vue-flow__handle-connecting` in next major version
          handleDomNode.classList.add(
            'connecting',
            'vue-flow__handle-connecting',
          );
          handleDomNode.classList.toggle('valid', !!isValid);
          // todo: remove this in next major version
          handleDomNode.classList.toggle('vue-flow__handle-valid', !!isValid);
        }
      }

      function onPointerUp(event: MouseTouchEvent) {
        // Prevent multi-touch aborting connection
        if ('touches' in event && event.touches.length > 0) {
          return;
        }

        if ((closestHandle || handleDomNode) && connection && isValid) {
          if (!onEdgeUpdate) {
            emits.connect(connection);
          } else {
            onEdgeUpdate(event, connection);
          }
        }

        emits.connectEnd(event);

        if (edgeUpdaterType) {
          onEdgeUpdateEnd?.(event);
        }

        resetRecentHandle(prevActiveHandle);

        cancelAnimationFrame(autoPanId);
        endConnection(event);

        autoPanStarted = false;
        isValid = false;
        connection = null;
        handleDomNode = null;

        doc.removeEventListener('mousemove', onPointerMove);
        doc.removeEventListener('mouseup', onPointerUp);

        doc.removeEventListener('touchmove', onPointerMove);
        doc.removeEventListener('touchend', onPointerUp);
      }

      doc.addEventListener('mousemove', onPointerMove);
      doc.addEventListener('mouseup', onPointerUp);

      doc.addEventListener('touchmove', onPointerMove);
      doc.addEventListener('touchend', onPointerUp);
    }
  }

  function handleClick(event: MouseEvent) {
    if (!connectOnClick) {
      return;
    }

    // const isTarget = type === 'target'

    if (!connectionClickStartHandle) {
      emits.clickConnectStart({ event, nodeId: nodeId, handleId: handleId });

      startConnection(
        {
          nodeId: nodeId,
          type: type,
          id: handleId,
          position: Position.Top,
          ...getEventPosition(event),
        },
        undefined,
        true,
      );

      return;
    }

    let isValidConnectionHandler =
      isValidConnection || isValidConnectionProp || alwaysValid;

    const node = findNode(nodeId);

    // TODO
    // if (!isValidConnectionHandler && node) {
    //   isValidConnectionHandler = (!isTarget ? node.isValidTargetPos : node.isValidSourcePos) || alwaysValid
    // }

    if (
      node &&
      (typeof node.connectable === 'undefined'
        ? nodesConnectable
        : node.connectable) === false
    ) {
      return;
    }

    const doc = getHostForElement(event.target as HTMLElement);

    const result = isValidHandle(
      event,
      {
        handle: {
          nodeId: nodeId,
          id: handleId,
          type: type,
          position: Position.Top,
          ...getEventPosition(event),
        },
        connectionMode: connectionMode,
        fromNodeId: connectionClickStartHandle.nodeId,
        fromHandleId: connectionClickStartHandle.id ?? null,
        fromType: connectionClickStartHandle.type,
        isValidConnection: isValidConnectionHandler,
        doc,
        flowId,
        nodeLookup: nodeLookup,
      },
      edges,
      nodes,
      findNode,
      nodeLookup,
    );

    const isOwnHandle = result.connection?.source === result.connection?.target;

    if (result.isValid && result.connection && !isOwnHandle) {
      emits.connect(result.connection);
    }

    emits.clickConnectEnd(event);

    endConnection(event, true);
  }

  return {
    handlePointerDown,
    handleClick,
  };
}

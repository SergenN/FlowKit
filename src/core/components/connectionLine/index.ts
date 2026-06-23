import type { HandleElement } from '../../types';
import { ConnectionLineType, ConnectionMode, Position } from '../../types';
import { getHandlePosition, getMarkerId, oppositePosition } from '../../utils';
import { useFlowKit } from '../../composables';
import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
} from '../edges/utils';

export class ConnectionLineElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  private cleanups: (() => void)[] = [];

  connectedCallback() {
    this.store = useFlowKit();
    this.render();

    const onConnectStart = () => this.render();
    const onConnectEnd = () => {
      this.innerHTML = '';
    };

    this.store.hooks.connectStart.on(onConnectStart);
    this.store.hooks.connectEnd.on(onConnectEnd);

    this.cleanups.push(
      () => this.store.hooks.connectStart.off(onConnectStart),
      () => this.store.hooks.connectEnd.off(onConnectEnd),
    );

    const onMouseMove = (e: MouseEvent) => {
      if (this.store.connectionStartHandle) this.render(e);
    };
    document.addEventListener('mousemove', onMouseMove);
    this.cleanups.push(() =>
      document.removeEventListener('mousemove', onMouseMove),
    );
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }

  render(mouseEvent?: MouseEvent) {
    this.innerHTML = '';

    const store = this.store;
    const connectionStartHandle = store.connectionStartHandle;
    if (!connectionStartHandle) return;

    const id = store.id;
    const connectionMode = store.connectionMode;
    const connectionEndHandle = store.connectionEndHandle;
    const connectionPosition = store.connectionPosition;
    const connectionLineOptions = store.connectionLineOptions;
    const connectionStatus = store.connectionStatus;
    const viewport = store.viewport;
    const findNode = store.findNode;

    const fromNode = findNode(connectionStartHandle.nodeId);
    if (!fromNode) return;

    // Mirror the original Vue component exactly:
    // When free-dragging, use raw mouse position (connectionPosition is stale in our impl)
    // When snapped, connectionPosition is set by updateConnection to rendererPointToPoint(handle)
    let toX: number;
    let toY: number;

    if (mouseEvent && !connectionEndHandle) {
      // Free drag: compute from raw mouse
      const containerBounds = store.flowRef?.getBoundingClientRect();
      if (containerBounds) {
        toX =
          (mouseEvent.clientX - containerBounds.left - viewport.x) /
          viewport.zoom;
        toY =
          (mouseEvent.clientY - containerBounds.top - viewport.y) /
          viewport.zoom;
      } else {
        toX = (connectionPosition.x - viewport.x) / viewport.zoom;
        toY = (connectionPosition.y - viewport.y) / viewport.zoom;
      }
    } else {
      // Snapped or static: use connectionPosition (set correctly by updateConnection)
      toX = (connectionPosition.x - viewport.x) / viewport.zoom;
      toY = (connectionPosition.y - viewport.y) / viewport.zoom;
    }

    const markerStart = connectionLineOptions.markerStart
      ? `url(#${getMarkerId(connectionLineOptions.markerStart, id)})`
      : '';
    const markerEnd = connectionLineOptions.markerEnd
      ? `url(#${getMarkerId(connectionLineOptions.markerEnd, id)})`
      : '';

    const startHandleId = connectionStartHandle.id;
    const handleType = connectionStartHandle.type;

    const fromHandleBounds = fromNode.handleBounds;
    let handleBounds = fromHandleBounds?.[handleType] ?? [];

    if (connectionMode === ConnectionMode.Loose) {
      const oppositeBounds =
        fromHandleBounds?.[handleType === 'source' ? 'target' : 'source'] ?? [];
      handleBounds = [...handleBounds, ...oppositeBounds];
    }

    if (!handleBounds) return;

    const fromHandle =
      (startHandleId
        ? handleBounds.find((d) => d.id === startHandleId)
        : handleBounds[0]) ?? null;

    const fromPosition = fromHandle?.position ?? Position.Top;
    const { x: fromX, y: fromY } = getHandlePosition(
      fromNode,
      fromHandle,
      fromPosition,
    );

    const toNode = findNode(connectionEndHandle?.nodeId) ?? null;
    let toHandle: HandleElement | null = null;
    if (toNode) {
      if (connectionMode === ConnectionMode.Strict) {
        toHandle =
          toNode.handleBounds[
            handleType === 'source' ? 'target' : 'source'
          ]?.find((d) => d.id === connectionEndHandle?.id) || null;
      } else {
        toHandle =
          [
            ...(toNode.handleBounds.source ?? []),
            ...(toNode.handleBounds.target ?? []),
          ]?.find((d) => d.id === connectionEndHandle?.id) || null;
      }
    }

    const toPosition =
      connectionEndHandle?.position ??
      (fromPosition ? oppositePosition[fromPosition] : null);

    if (!fromPosition || !toPosition) return;

    const type = connectionLineOptions.type ?? ConnectionLineType.Bezier;

    const pathParams = {
      sourceX: fromX,
      sourceY: fromY,
      sourcePosition: fromPosition,
      targetX: toX,
      targetY: toY,
      targetPosition: toPosition,
    };

    let dAttr = '';
    if (type === ConnectionLineType.Bezier) {
      [dAttr] = getBezierPath(pathParams);
    } else if (type === ConnectionLineType.Step) {
      [dAttr] = getSmoothStepPath({ ...pathParams, borderRadius: 0 });
    } else if (type === ConnectionLineType.SmoothStep) {
      [dAttr] = getSmoothStepPath(pathParams);
    } else if (type === ConnectionLineType.SimpleBezier) {
      [dAttr] = getSimpleBezierPath(pathParams);
    } else {
      dAttr = `M${fromX},${fromY} ${toX},${toY}`;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('flow__edges', 'flow__connectionline', 'flow__container');

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('flow__connection');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', dAttr);
    path.classList.add('flow__connection-path');
    if (connectionLineOptions.class)
      path.classList.add(connectionLineOptions.class);
    if (connectionStatus) path.classList.add(connectionStatus);
    if (connectionLineOptions.style) {
      for (const [key, value] of Object.entries(connectionLineOptions.style)) {
        (path.style as any)[key] = value;
      }
    }
    if (markerEnd) path.setAttribute('marker-end', markerEnd);
    if (markerStart) path.setAttribute('marker-start', markerStart);

    g.appendChild(path);
    svg.appendChild(g);
    this.appendChild(svg);
  }
}

customElements.define('flow-connection-line', ConnectionLineElement);

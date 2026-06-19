import type { HandleElement } from '../../types';
import { ConnectionLineType, ConnectionMode, Position } from '../../types';
import { getHandlePosition, getMarkerId, oppositePosition } from '../../utils';
import { useFlowJs } from '../../composables';
import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
} from '../edges/utils';

export class ConnectionLineElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowJs>;

  connectedCallback() {
    this.store = useFlowJs();
    this.render();
  }

  render() {
    this.innerHTML = '';

    const {
      id,
      connectionMode,
      connectionStartHandle,
      connectionEndHandle,
      connectionPosition,
      connectionLineOptions,
      connectionStatus,
      viewport,
      findNode,
    } = this.store;

    if (!connectionStartHandle) return;

    const fromNode = findNode(connectionStartHandle.nodeId);
    if (!fromNode) return;

    const toNode = findNode(connectionEndHandle?.nodeId) ?? null;

    const toXY = {
      x: (connectionPosition.x - viewport.x) / viewport.zoom,
      y: (connectionPosition.y - viewport.y) / viewport.zoom,
    };

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
      targetX: toXY.x,
      targetY: toXY.y,
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
      dAttr = `M${fromX},${fromY} ${toXY.x},${toXY.y}`;
    }

    // root svg
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('flow__edges', 'flow__connectionline', 'flow__container');

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('flow__connection');

    // check for custom connection line slot
    const customConnectionLine = this.querySelector(
      'slot[name="connection-line"]',
    );

    if (customConnectionLine) {
      const customEl = document.createElement(
        'flow-connection-line-custom',
      ) as any;
      customEl.setProps?.({
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toXY.x,
        targetY: toXY.y,
        targetPosition: toPosition,
        sourceNode: fromNode,
        sourceHandle: fromHandle,
        targetNode: toNode,
        targetHandle: toHandle,
        markerEnd,
        markerStart,
        connectionStatus,
      });
      g.appendChild(customEl);
    } else {
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      path.setAttribute('d', dAttr);
      path.classList.add('flow__connection-path');

      if (connectionLineOptions.class)
        path.classList.add(connectionLineOptions.class);
      if (connectionStatus) path.classList.add(connectionStatus);

      if (connectionLineOptions.style) {
        for (const [key, value] of Object.entries(
          connectionLineOptions.style,
        )) {
          (path.style as any)[key] = value;
        }
      }

      if (markerEnd) path.setAttribute('marker-end', markerEnd);
      if (markerStart) path.setAttribute('marker-start', markerStart);

      g.appendChild(path);
    }

    svg.appendChild(g);
    this.appendChild(svg);
  }
}

customElements.define('flow-connection-line', ConnectionLineElement);

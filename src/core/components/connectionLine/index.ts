import { ConnectionLineType, ConnectionMode, Position } from '../../types';
import { getHandlePosition, getMarkerId, oppositePosition } from '../../utils';
import { useFlowIt } from '../../composables';
import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
} from '../edges/utils';

export class ConnectionLineElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowIt>;
  private cleanups: (() => void)[] = [];

  // Persistent SVG elements — created once, updated in place on every frame.
  private path: SVGPathElement | null = null;

  connectedCallback() {
    this.store = useFlowIt();

    const onConnectStart = () => {
      // Build the SVG structure once when a connection starts.
      this.buildSvg();
    };

    const onConnectEnd = () => {
      this.innerHTML = '';
      this.path = null;
    };

    this.store.hooks.connectStart.on(onConnectStart);
    this.store.hooks.connectEnd.on(onConnectEnd);

    const onMouseMove = (e: MouseEvent) => {
      if (this.store.connectionStartHandle) this.updatePath(e);
    };
    document.addEventListener('mousemove', onMouseMove);

    this.cleanups.push(
      () => this.store.hooks.connectStart.off(onConnectStart),
      () => this.store.hooks.connectEnd.off(onConnectEnd),
      () => document.removeEventListener('mousemove', onMouseMove),
    );
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.path = null;
  }

  // Build the SVG/g/path skeleton once per connection gesture and append it.
  private buildSvg() {
    this.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('flow__edges', 'flow__connectionline', 'flow__container');

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('flow__connection');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('flow__connection-path');

    g.appendChild(path);
    svg.appendChild(g);
    this.appendChild(svg);

    this.path = path;
  }

  // Update only the mutable attributes of the existing path element.
  private updatePath(mouseEvent?: MouseEvent) {
    if (!this.path) return;

    const store = this.store;
    const connectionStartHandle = store.connectionStartHandle;
    if (!connectionStartHandle) return;

    const {
      id,
      connectionMode,
      connectionEndHandle,
      connectionPosition,
      connectionLineOptions,
      connectionStatus,
      viewport,
      findNode,
    } = store;

    const fromNode = findNode(connectionStartHandle.nodeId);
    if (!fromNode) return;

    let toX: number;
    let toY: number;

    if (mouseEvent && !connectionEndHandle) {
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

    if (!handleBounds.length) return;

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

    const path = this.path;
    path.setAttribute('d', dAttr);

    // Sync mutable classes — connection status and user-provided class.
    const statusClasses = ['valid', 'invalid', 'connecting'];
    for (const cls of statusClasses) path.classList.remove(cls);
    if (connectionStatus) path.classList.add(connectionStatus);

    if (connectionLineOptions.class) {
      path.classList.add(connectionLineOptions.class);
    }

    // Sync markers.
    if (markerEnd) path.setAttribute('marker-end', markerEnd);
    else path.removeAttribute('marker-end');
    if (markerStart) path.setAttribute('marker-start', markerStart);
    else path.removeAttribute('marker-start');

    // Sync styles.
    if (connectionLineOptions.style) {
      for (const [key, value] of Object.entries(connectionLineOptions.style)) {
        (path.style as any)[key] = value;
      }
    }
  }
}

customElements.define('flow-connection-line', ConnectionLineElement);

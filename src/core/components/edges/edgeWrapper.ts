import type { Connection, HandleType, MouseTouchEvent } from '../../types';
import { ConnectionMode, Position } from '../../types';
import { useEdgeHooks, useHandle, useFlowJs } from '../../composables';
import {
  ARIA_EDGE_DESC_KEY,
  ErrorCode,
  FlowJsError,
  elementSelectionKeys,
  getEdgeHandle,
  getHandlePosition,
  getMarkerId,
} from '../../utils';
import {
  getBezierPath,
  getSmoothStepPath,
  getSimpleBezierPath,
  getStraightPath,
} from './utils';

export class EdgeWrapperElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowJs>;
  private edgeId!: string;
  private cleanups: (() => void)[] = [];

  // private mouseOver = false;
  // private updating = false;
  private nodeId = '';
  private handleId: string | null = null;
  private edgeUpdaterType: HandleType = 'source';

  private emit!: ReturnType<typeof useEdgeHooks>['emit'];
  // private handlePointerDown!: (event: MouseTouchEvent) => void;

  // The SVG <g> injected directly into the parent <svg>
  private g: SVGGElement | null = null;
  // Keep references to the paths so we can update them in-place during drag
  private pathEl: SVGPathElement | null = null;
  private interactionEl: SVGPathElement | null = null;
  private labelFo: SVGForeignObjectElement | null = null;

  connectedCallback() {
    this.store = useFlowJs();
    this.edgeId = this.getAttribute('id') ?? '';
    this.style.display = 'none';

    this.setup();
    this.render();

    // Re-compute path when connected nodes move (drag)
    const onNodesChange = (changes: any[]) => {
      const edge = this.edge;
      if (!edge) return;
      const relevant = changes.some(
        (c) =>
          c.type === 'position' &&
          (c.id === edge.source || c.id === edge.target),
      );
      if (relevant) this.updatePath();
    };
    this.store.onNodesChange(onNodesChange);
    this.cleanups.push(() => this.store.hooks.nodesChange.off(onNodesChange));
  }

  disconnectedCallback() {
    this.g?.remove();
    this.g = null;
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
  }

  private get edge() {
    return this.store.findEdge(this.edgeId)!;
  }

  private get isSelectable() {
    return typeof this.edge?.selectable === 'undefined'
      ? this.store.elementsSelectable
      : this.edge.selectable;
  }

  // private get isUpdatable() {
  //   return typeof this.edge?.updatable === 'undefined'
  //     ? this.store.edgesUpdatable
  //     : this.edge.updatable;
  // }

  private get isFocusable() {
    return typeof this.edge?.focusable === 'undefined'
      ? this.store.edgesFocusable
      : this.edge.focusable;
  }

  private setup() {
    const { emit } = useEdgeHooks(this.store.emits);
    this.emit = emit;

    const { handlePointerDown } = useHandle({
      nodeId: this.nodeId,
      handleId: this.handleId,
      type: this.edgeUpdaterType,
      isValidConnection: this.store.isValidConnection,
      edgeUpdaterType: this.edgeUpdaterType,
      onEdgeUpdate: (event, connection) => this.onEdgeUpdate(event, connection),
      onEdgeUpdateEnd: (event) => this.onEdgeUpdateEnd(event),
    });

    this.handlePointerDown = handlePointerDown;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const onClick = (e: MouseEvent) => this.onEdgeClick(e);
    const onContextMenu = (e: MouseEvent) => this.onEdgeContextMenu(e);
    const onDblClick = (e: MouseEvent) => this.onDoubleClick(e);
    const onMouseEnter = (e: MouseEvent) =>
      this.emit.mouseEnter({ event: e, edge: this.edge });
    const onMouseMove = (e: MouseEvent) =>
      this.emit.mouseMove({ event: e, edge: this.edge });
    const onMouseLeave = (e: MouseEvent) =>
      this.emit.mouseLeave({ event: e, edge: this.edge });
    const onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);

    this.addEventListener('click', onClick);
    this.addEventListener('contextmenu', onContextMenu);
    this.addEventListener('dblclick', onDblClick);
    this.addEventListener('mouseenter', onMouseEnter);
    this.addEventListener('mousemove', onMouseMove);
    this.addEventListener('mouseleave', onMouseLeave);
    this.addEventListener('keydown', onKeyDown);

    this.cleanups.push(() => {
      this.removeEventListener('click', onClick);
      this.removeEventListener('contextmenu', onContextMenu);
      this.removeEventListener('dblclick', onDblClick);
      this.removeEventListener('mouseenter', onMouseEnter);
      this.removeEventListener('mousemove', onMouseMove);
      this.removeEventListener('mouseleave', onMouseLeave);
      this.removeEventListener('keydown', onKeyDown);
    });
  }

  private getSvgParent(): SVGSVGElement | null {
    let el: Element | null = this.parentElement;
    while (el) {
      if (el instanceof SVGSVGElement) return el;
      el = el.parentElement;
    }
    return null;
  }

  /** Compute the current bezier path from live node positions */
  private computePath(): string | null {
    const edge = this.edge;
    if (!edge) return null;

    const { findNode, connectionMode } = this.store;
    const sourceNode = findNode(edge.source);
    const targetNode = findNode(edge.target);
    if (!sourceNode || !targetNode) return null;

    const sourceNodeHandles =
      connectionMode === ConnectionMode.Strict
        ? sourceNode.handleBounds.source
        : [
            ...(sourceNode.handleBounds.source || []),
            ...(sourceNode.handleBounds.target || []),
          ];
    const sourceHandle = getEdgeHandle(sourceNodeHandles, edge.sourceHandle);

    const targetNodeHandles =
      connectionMode === ConnectionMode.Strict
        ? targetNode.handleBounds.target
        : [
            ...(targetNode.handleBounds.target || []),
            ...(targetNode.handleBounds.source || []),
          ];
    const targetHandle = getEdgeHandle(targetNodeHandles, edge.targetHandle);

    const sourcePosition = sourceHandle?.position || Position.Bottom;
    const targetPosition = targetHandle?.position || Position.Top;

    const { x: sourceX, y: sourceY } = getHandlePosition(
      sourceNode,
      sourceHandle,
      sourcePosition,
    );
    const { x: targetX, y: targetY } = getHandlePosition(
      targetNode,
      targetHandle,
      targetPosition,
    );

    edge.sourceX = sourceX;
    edge.sourceY = sourceY;
    edge.targetX = targetX;
    edge.targetY = targetY;

    const pathParams = {
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      ...('pathOptions' in edge ? (edge as any).pathOptions : {}),
    };

    const edgeType = edge.type || 'default';
    let pathD: string;
    if (edgeType === 'smoothstep') {
      [pathD] = getSmoothStepPath(pathParams);
    } else if (edgeType === 'step') {
      [pathD] = getSmoothStepPath({ ...pathParams, borderRadius: 0 });
    } else if (edgeType === 'simplebezier') {
      [pathD] = getSimpleBezierPath(pathParams);
    } else if (edgeType === 'straight') {
      [pathD] = getStraightPath(pathParams);
    } else {
      [pathD] = getBezierPath(pathParams);
    }

    return pathD;
  }

  /** Update just the path `d` attribute — no DOM rebuild, smooth during drag */
  private updatePath() {
    const pathD = this.computePath();
    if (!pathD) return;
    this.pathEl?.setAttribute('d', pathD);
    this.interactionEl?.setAttribute('d', pathD);
    // Reposition label to stay at the midpoint of the updated path
    if (this.labelFo && this.pathEl) {
      const pathLength = this.pathEl.getTotalLength?.() ?? 0;
      const mid = this.pathEl.getPointAtLength?.(pathLength / 2) ?? {
        x: 0,
        y: 0,
      };
      this.labelFo.setAttribute('x', String(mid.x));
      this.labelFo.setAttribute('y', String(mid.y));
    }
  }

  render() {
    this.g?.remove();
    this.g = null;
    this.pathEl = null;
    this.interactionEl = null;
    this.labelFo = null;

    const edge = this.edge;
    if (!edge) return;

    const {
      id: flowId,
      findNode,
      noPanClassName,
      emits,
      hooks,
    } = this.store;

    const sourceNode = findNode(edge.source);
    const targetNode = findNode(edge.target);

    if (!sourceNode || !targetNode) {
      emits.error(
        new FlowJsError(
          !sourceNode && !targetNode
            ? ErrorCode.EDGE_SOURCE_TARGET_MISSING
            : !sourceNode
              ? ErrorCode.EDGE_SOURCE_MISSING
              : ErrorCode.EDGE_TARGET_MISSING,
          edge.id,
          edge.source,
          edge.target,
        ),
      );
      return;
    }

    if (edge.hidden || sourceNode.hidden || targetNode.hidden) return;

    const svg = this.getSvgParent();
    if (!svg) return;

    const edgeClass =
      edge.class instanceof Function ? edge.class(edge) : edge.class;
    const edgeStyle =
      edge.style instanceof Function ? edge.style(edge) : edge.style;
    const edgeType = edge.type || 'default';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    g.dataset.id = this.edgeId;
    g.setAttribute('aria-roledescription', 'edge');
    g.setAttribute('role', this.isFocusable ? 'group' : 'img');

    if (this.isFocusable) {
      g.tabIndex = 0;
      g.setAttribute('aria-describedby', `${ARIA_EDGE_DESC_KEY}-${flowId}`);
    }

    if (edge.ariaLabel !== null) {
      g.setAttribute(
        'aria-label',
        edge.ariaLabel ?? `Edge from ${edge.source} to ${edge.target}`,
      );
    }

    const inactive = !this.isSelectable && !hooks.edgeClick.hasListeners();
    g.setAttribute(
      'class',
      [
        'flow__edge',
        `flow__edge-${edgeType}`,
        noPanClassName,
        typeof edgeClass === 'string' ? edgeClass : '',
        edge.selected ? 'selected' : '',
        edge.animated ? 'animated' : '',
        inactive ? 'inactive' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );

    if (edge.domAttributes) {
      for (const [key, value] of Object.entries(edge.domAttributes)) {
        g.setAttribute(key, String(value));
      }
    }

    const pathD = this.computePath() ?? '';
    const markerStart = `url(#${getMarkerId(edge.markerStart, flowId)})`;
    const markerEnd = `url(#${getMarkerId(edge.markerEnd, flowId)})`;

    const pathEl = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    pathEl.setAttribute('id', this.edgeId);
    pathEl.setAttribute('d', pathD);
    if (edge.markerEnd) pathEl.setAttribute('marker-end', markerEnd);
    if (edge.markerStart) pathEl.setAttribute('marker-start', markerStart);
    pathEl.classList.add('flow__edge-path');
    // Apply stroke style directly on the path so color/width take effect
    if (edgeStyle) {
      for (const [key, value] of Object.entries(edgeStyle)) {
        (pathEl.style as any)[key] = value;
      }
    }
    g.appendChild(pathEl);
    this.pathEl = pathEl;

    const interactionEl = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    interactionEl.setAttribute('fill', 'none');
    interactionEl.setAttribute('d', pathD);
    interactionEl.setAttribute(
      'stroke-width',
      String(edge.interactionWidth ?? 20),
    );
    interactionEl.setAttribute('stroke-opacity', '0');
    interactionEl.classList.add('flow__edge-interaction');
    g.appendChild(interactionEl);
    this.interactionEl = interactionEl;

    // Label — rendered as a foreignObject so HTML/text can be used
    if (edge.label) {
      const labelText = typeof edge.label === 'string' ? edge.label : '';
      if (labelText) {
        // Compute midpoint of path for label placement
        const pathLength = pathEl.getTotalLength?.() ?? 0;
        const mid = pathEl.getPointAtLength?.(pathLength / 2) ?? { x: 0, y: 0 };

        const fo = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'foreignObject',
        );
        fo.setAttribute('width', '1');
        fo.setAttribute('height', '1');
        fo.setAttribute('x', String(mid.x));
        fo.setAttribute('y', String(mid.y));
        fo.style.overflow = 'visible';
        this.labelFo = fo;

        const labelEl = document.createElement('div');
        labelEl.textContent = labelText;
        labelEl.style.cssText = [
          'position: absolute',
          'transform: translate(-50%, -50%)',
          'background: white',
          'padding: 2px 6px',
          'border-radius: 4px',
          'font-size: 12px',
          'border: 1px solid #e2e8f0',
          'white-space: nowrap',
          'pointer-events: all',
          'user-select: none',
        ].join(';');

        // Apply custom label style if provided
        if (edge.labelStyle) {
          for (const [key, value] of Object.entries(edge.labelStyle)) {
            (labelEl.style as any)[key] = value;
          }
        }

        fo.appendChild(labelEl);
        g.appendChild(fo);
      }
    }

    svg.appendChild(g);
    this.g = g;

    g.addEventListener('click', (e) =>
      this.dispatchEvent(new MouseEvent('click', e)),
    );
    g.addEventListener('mouseenter', (e) =>
      this.dispatchEvent(new MouseEvent('mouseenter', e)),
    );
    g.addEventListener('mouseleave', (e) =>
      this.dispatchEvent(new MouseEvent('mouseleave', e)),
    );
    g.addEventListener('contextmenu', (e) =>
      this.dispatchEvent(new MouseEvent('contextmenu', e)),
    );
    g.addEventListener('dblclick', (e) =>
      this.dispatchEvent(new MouseEvent('dblclick', e)),
    );
  }

  private onEdgeUpdate(event: MouseTouchEvent, connection: Connection) {
    this.emit.update({ event, edge: this.edge, connection });
  }

  private onEdgeUpdateEnd(event: MouseTouchEvent) {
    this.emit.updateEnd({ event, edge: this.edge });
    // this.updating = false;
  }

  // private handleEdgeUpdater(event: MouseEvent, isSourceHandle: boolean) {
  //   if (event.button !== 0) return;
  //   // this.updating = true;
  //   this.nodeId = isSourceHandle ? this.edge.target : this.edge.source;
  //   this.handleId =
  //     (isSourceHandle ? this.edge.targetHandle : this.edge.sourceHandle) ??
  //     null;
  //   this.edgeUpdaterType = isSourceHandle ? 'target' : 'source';
  //   this.emit.updateStart({ event, edge: this.edge });
  //   this.handlePointerDown(event);
  // }

  private onEdgeClick(event: MouseEvent) {
    const { addSelectedEdges, removeSelectedEdges, multiSelectionActive } =
      this.store;
    if (this.isSelectable) {
      this.store.nodesSelectionActive = false;
      if (this.edge.selected && multiSelectionActive) {
        removeSelectedEdges([this.edge]);
        this.blur();
      } else {
        addSelectedEdges([this.edge]);
      }
    }
    this.emit.click({ event, edge: this.edge });
  }

  private onEdgeContextMenu(event: MouseEvent) {
    this.emit.contextMenu({ event, edge: this.edge });
  }

  private onDoubleClick(event: MouseEvent) {
    this.emit.doubleClick({ event, edge: this.edge });
  }

  private onKeyDown(event: KeyboardEvent) {
    const { disableKeyboardA11y, addSelectedEdges, removeSelectedEdges } =
      this.store;
    if (
      disableKeyboardA11y ||
      !elementSelectionKeys.includes(event.key) ||
      !this.isSelectable
    )
      return;
    const unselect = event.key === 'Escape';
    if (unselect) {
      this.blur();
      removeSelectedEdges([this.store.findEdge(this.edgeId)!]);
    } else {
      addSelectedEdges([this.store.findEdge(this.edgeId)!]);
    }
  }
}

customElements.define('flow-edge-wrapper', EdgeWrapperElement);

import type { CoordinateExtent, GraphNode } from '../core/types';
import {
  getBoundsofRects,
  getConnectedEdges,
  getRectOfNodes,
  isMacOs,
  wheelDelta,
} from '../core/utils';
import { useFlowIt } from '../core/composables';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { D3ZoomEvent } from 'd3-zoom';
import { pointer, select } from 'd3-selection';
import type { MiniMapNodeFunc, MiniMapProps, ShapeRendering } from './types';
import './miniMapNode';

const defaultWidth = 200;
const defaultHeight = 150;

export class MiniMapElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowIt>;
  private cleanups: (() => void)[] = [];
  private svgEl: SVGSVGElement | null = null;
  private nodeEls = new Map<string, HTMLElement>();

  // Props with defaults matching original Vue component
  private _nodeColor: string | MiniMapNodeFunc = '#e2e2e2';
  private _nodeStrokeColor: string | MiniMapNodeFunc = 'transparent';
  private _nodeClassName: string | MiniMapNodeFunc = '';
  private _nodeBorderRadius = 5;
  private _nodeStrokeWidth = 2;
  private _maskColor = 'rgb(240, 240, 240, 0.6)';
  private _maskStrokeColor = 'none';
  private _maskStrokeWidth = 1;
  private _maskBorderRadius = 0;
  private _position = 'bottom-right';
  private _pannable = false;
  private _zoomable = false;
  private _ariaLabel: string | null = 'Flow mini map';
  private _inversePan = false;
  private _zoomStep = 1;
  private _offsetScale = 5;
  private _width?: number;
  private _height?: number;

  setProps(props: MiniMapProps) {
    if (props.nodeColor !== undefined) this._nodeColor = props.nodeColor;
    if (props.nodeStrokeColor !== undefined)
      this._nodeStrokeColor = props.nodeStrokeColor;
    if (props.nodeClassName !== undefined)
      this._nodeClassName = props.nodeClassName ?? '';
    if (props.nodeBorderRadius !== undefined)
      this._nodeBorderRadius = props.nodeBorderRadius;
    if (props.nodeStrokeWidth !== undefined)
      this._nodeStrokeWidth = props.nodeStrokeWidth;
    if (props.maskColor !== undefined) this._maskColor = props.maskColor;
    if (props.maskStrokeColor !== undefined)
      this._maskStrokeColor = props.maskStrokeColor;
    if (props.maskStrokeWidth !== undefined)
      this._maskStrokeWidth = props.maskStrokeWidth;
    if (props.maskBorderRadius !== undefined)
      this._maskBorderRadius = props.maskBorderRadius;
    if (props.position !== undefined) this._position = props.position as string;
    if (props.pannable !== undefined) this._pannable = props.pannable;
    if (props.zoomable !== undefined) this._zoomable = props.zoomable;
    if (props.ariaLabel !== undefined)
      this._ariaLabel = props.ariaLabel ?? null;
    if (props.inversePan !== undefined) this._inversePan = props.inversePan;
    if (props.zoomStep !== undefined) this._zoomStep = props.zoomStep;
    if (props.offsetScale !== undefined) this._offsetScale = props.offsetScale;
    if (props.width !== undefined) this._width = props.width;
    if (props.height !== undefined) this._height = props.height;
    if (this.store) this.render();
  }

  private get elementWidth() {
    return this._width ?? defaultWidth;
  }
  private get elementHeight() {
    return this._height ?? defaultHeight;
  }

  private get shapeRendering(): ShapeRendering {
    return typeof window === 'undefined' || !!window.chrome
      ? 'crispEdges'
      : 'geometricPrecision';
  }

  private nodeColorFunc(node: GraphNode): string {
    return typeof this._nodeColor === 'function'
      ? this._nodeColor(node)
      : this._nodeColor;
  }

  private nodeStrokeColorFunc(node: GraphNode): string {
    return typeof this._nodeStrokeColor === 'function'
      ? this._nodeStrokeColor(node)
      : this._nodeStrokeColor;
  }

  private nodeClassNameFunc(node: GraphNode): string {
    return typeof this._nodeClassName === 'function'
      ? this._nodeClassName(node)
      : (this._nodeClassName ?? '');
  }

  private getInitializedNodes(): GraphNode[] {
    return this.store.nodes.filter(
      (n) => !n.hidden && n.dimensions.width > 0 && n.dimensions.height > 0,
    );
  }

  private computeViewValues() {
    const { viewport, dimensions } = this.store;
    const initialized = this.getInitializedNodes();

    const bb = getRectOfNodes(initialized);
    const viewBB = {
      x: -viewport.x / viewport.zoom,
      y: -viewport.y / viewport.zoom,
      width: dimensions.width / viewport.zoom,
      height: dimensions.height / viewport.zoom,
    };

    const boundingRect = initialized.length
      ? getBoundsofRects(bb, viewBB)
      : viewBB;

    const scaledWidth = boundingRect.width / this.elementWidth;
    const scaledHeight = boundingRect.height / this.elementHeight;
    const viewScale = Math.max(scaledWidth, scaledHeight);

    const viewWidth = viewScale * this.elementWidth;
    const viewHeight = viewScale * this.elementHeight;
    const offset = this._offsetScale * viewScale;

    const viewBox = {
      offset,
      x: boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset,
      y: boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset,
      width: viewWidth + offset * 2,
      height: viewHeight + offset * 2,
    };

    return { viewBox, viewBB, viewScale, initialized };
  }

  private getMaskPath(
    viewBox: {
      x: number;
      y: number;
      width: number;
      height: number;
      offset: number;
    },
    viewBB: { x: number; y: number; width: number; height: number },
  ): string {
    if (!viewBox.x || !viewBox.y) return '';
    const r = this._maskBorderRadius;
    return `
      M${viewBox.x - viewBox.offset},${viewBox.y - viewBox.offset}
      h${viewBox.width + viewBox.offset * 2}
      v${viewBox.height + viewBox.offset * 2}
      h${-viewBox.width - viewBox.offset * 2}z
      M${viewBB.x + r},${viewBB.y}
      h${viewBB.width - 2 * r}
      a${r},${r} 0 0 1 ${r},${r}
      v${viewBB.height - 2 * r}
      a${r},${r} 0 0 1 -${r},${r}
      h${-(viewBB.width - 2 * r)}
      a${r},${r} 0 0 1 -${r},-${r}
      v${-(viewBB.height - 2 * r)}
      a${r},${r} 0 0 1 ${r},-${r}z`;
  }

  connectedCallback() {
    this.store = useFlowIt();
    this.setupStructure();
    this.setupZoom();
    this.render();

    const onChange = () => this.render();
    this.store.hooks.nodesChange.on(onChange);
    this.store.hooks.viewportChange.on(onChange);
    this.cleanups.push(
      () => this.store.hooks.nodesChange.off(onChange),
      () => this.store.hooks.viewportChange.off(onChange),
    );
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.svgEl = null;
    this.nodeEls.clear();
  }

  private setupStructure() {
    // Panel wrapper — mirrors <Panel :position="position">
    const panel = document.createElement('flow-panel') as any;
    panel.setProps?.({ position: this._position });
    panel.classList.add('flow__minimap');
    panel.classList.toggle('pannable', this._pannable);
    panel.classList.toggle('zoomable', this._zoomable);
    this.appendChild(panel);

    // SVG — mirrors <svg ref="el" ...>
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('role', 'img');
    if (this._ariaLabel) {
      svg.setAttribute('aria-labelledby', `flow__minimap-${this.store.id}`);
      const title = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'title',
      );
      title.setAttribute('id', `flow__minimap-${this.store.id}`);
      title.textContent = this._ariaLabel;
      svg.appendChild(title);
    }
    svg.addEventListener('click', (e: MouseEvent) => {
      const [x, y] = pointer(e);
      this.dispatchEvent(
        new CustomEvent('minimap-click', {
          detail: { event: e, position: { x, y } },
          bubbles: true,
        }),
      );
    });
    panel.appendChild(svg);
    this.svgEl = svg;
  }

  private setupZoom() {
    if (!this.svgEl) return;

    const selection = select(this.svgEl as Element);

    const zoomHandler = (event: D3ZoomEvent<SVGSVGElement, any>) => {
      if (event.sourceEvent.type !== 'wheel') return;
      const { d3Selection, d3Zoom, viewport } = this.store;
      if (!d3Selection || !d3Zoom) return;
      const factor = event.sourceEvent.ctrlKey && isMacOs() ? 10 : 1;
      const pinchDelta =
        -event.sourceEvent.deltaY *
        (event.sourceEvent.deltaMode === 1
          ? 0.05
          : event.sourceEvent.deltaMode
            ? 1
            : 0.002) *
        this._zoomStep;
      const nextZoom = viewport.zoom * 2 ** (pinchDelta * factor);
      d3Zoom.scaleTo(d3Selection, nextZoom);
    };

    const panHandler = (event: D3ZoomEvent<HTMLDivElement, any>) => {
      if (event.sourceEvent.type !== 'mousemove') return;
      const { d3Selection, d3Zoom, viewport, dimensions, translateExtent } =
        this.store;
      if (!d3Selection || !d3Zoom) return;
      const { viewScale } = this.computeViewValues();
      const moveScale =
        viewScale * Math.max(1, viewport.zoom) * (this._inversePan ? -1 : 1);
      const pos = {
        x: viewport.x - event.sourceEvent.movementX * moveScale,
        y: viewport.y - event.sourceEvent.movementY * moveScale,
      };
      const extent: CoordinateExtent = [
        [0, 0],
        [dimensions.width, dimensions.height],
      ];
      const nextTransform = zoomIdentity
        .translate(pos.x, pos.y)
        .scale(viewport.zoom);
      const constrained = d3Zoom.constrain()(
        nextTransform,
        extent,
        translateExtent,
      );
      d3Zoom.transform(d3Selection, constrained);
    };

    const handler = zoom()
      .wheelDelta((event) => wheelDelta(event) * (this._zoomStep / 10))
      .on('zoom', this._pannable ? panHandler : () => {})
      .on('zoom.wheel', this._zoomable ? zoomHandler : () => {});

    selection.call(handler as any);
    this.cleanups.push(() => selection.on('zoom', null));
  }

  private render() {
    if (!this.svgEl) return;

    const { viewBox, viewBB, initialized } = this.computeViewValues();
    const { edges } = this.store;

    // Update SVG dimensions and viewBox — mirrors :width :height :viewBox bindings
    this.svgEl.setAttribute('width', String(this.elementWidth));
    this.svgEl.setAttribute('height', String(this.elementHeight));
    this.svgEl.setAttribute(
      'viewBox',
      [viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(' '),
    );

    // Sync flow-minimap-node elements — add/remove to match initialized nodes
    // (mirrors v-for="node of getNodesInitialized")
    const currentIds = new Set(initialized.map((n) => n.id));

    // Remove nodes no longer initialized
    for (const [id, el] of this.nodeEls) {
      if (!currentIds.has(id)) {
        el.remove();
        this.nodeEls.delete(id);
      }
    }

    // Add/update nodes
    for (const node of initialized) {
      let nodeEl = this.nodeEls.get(node.id) as any;

      if (!nodeEl) {
        nodeEl = document.createElement('flow-minimap-node') as any;

        // Node event handlers — mirror @click @dblclick @mouseenter @mousemove @mouseleave
        nodeEl.addEventListener('node-click', (e: CustomEvent) => {
          const param = {
            event: e.detail,
            node,
            connectedEdges: getConnectedEdges([node], edges),
          };
          this.store.emits.miniMapNodeClick?.(param);
          this.dispatchEvent(
            new CustomEvent('node-click', { detail: param, bubbles: true }),
          );
        });
        nodeEl.addEventListener('node-dblclick', (e: CustomEvent) => {
          const param = {
            event: e.detail,
            node,
            connectedEdges: getConnectedEdges([node], edges),
          };
          this.store.emits.miniMapNodeDoubleClick?.(param);
          this.dispatchEvent(
            new CustomEvent('node-dblclick', { detail: param, bubbles: true }),
          );
        });
        nodeEl.addEventListener('node-mouseenter', (e: CustomEvent) => {
          const param = {
            event: e.detail,
            node,
            connectedEdges: getConnectedEdges([node], edges),
          };
          this.store.emits.miniMapNodeMouseEnter?.(param);
          this.dispatchEvent(
            new CustomEvent('node-mouseenter', {
              detail: param,
              bubbles: true,
            }),
          );
        });
        nodeEl.addEventListener('node-mousemove', (e: CustomEvent) => {
          const param = {
            event: e.detail,
            node,
            connectedEdges: getConnectedEdges([node], edges),
          };
          this.store.emits.miniMapNodeMouseMove?.(param);
          this.dispatchEvent(
            new CustomEvent('node-mousemove', { detail: param, bubbles: true }),
          );
        });
        nodeEl.addEventListener('node-mouseleave', (e: CustomEvent) => {
          const param = {
            event: e.detail,
            node,
            connectedEdges: getConnectedEdges([node], edges),
          };
          this.store.emits.miniMapNodeMouseLeave?.(param);
          this.dispatchEvent(
            new CustomEvent('node-mouseleave', {
              detail: param,
              bubbles: true,
            }),
          );
        });

        this.svgEl!.appendChild(nodeEl);
        this.nodeEls.set(node.id, nodeEl);
      }

      // Update props — mirrors v-bind on <MiniMapNode>
      nodeEl.setProps({
        id: node.id,
        type: node.type ?? 'default',
        position: node.computedPosition,
        dimensions: node.dimensions,
        selected: node.selected,
        dragging: node.dragging,
        color: this.nodeColorFunc(node),
        borderRadius: this._nodeBorderRadius,
        strokeColor: this.nodeStrokeColorFunc(node),
        strokeWidth: this._nodeStrokeWidth,
        shapeRendering: this.shapeRendering,
        hidden: node.hidden,
      });

      // Apply nodeClassName — mirrors :class="nodeClassNameFunc(node)"
      const className = this.nodeClassNameFunc(node);
      if (className)
        nodeEl.classList.add(...className.split(' ').filter(Boolean));
    }

    // Update/create mask path — mirrors <path class="vue-flow__minimap-mask" ...>
    let maskEl = this.svgEl.querySelector(
      '.flow__minimap-mask',
    ) as SVGPathElement | null;
    if (!maskEl) {
      maskEl = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      ) as SVGPathElement;
      maskEl.classList.add('flow__minimap-mask');
      maskEl.setAttribute('fill-rule', 'evenodd');
      this.svgEl.appendChild(maskEl);
    }
    maskEl.setAttribute('d', this.getMaskPath(viewBox, viewBB));
    maskEl.setAttribute('fill', this._maskColor);
    maskEl.setAttribute('stroke', this._maskStrokeColor);
    maskEl.setAttribute('stroke-width', String(this._maskStrokeWidth));
  }
}

customElements.define('flow-minimap', MiniMapElement);

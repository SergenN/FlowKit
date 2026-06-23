import { GraphNode, Position, Rect, ViewportTransform } from '../core/types';
import { getRectOfNodes } from '../core/utils';
import { useFlowKit } from '../core/composables';
import type { Align, NodeToolbarProps } from './types';

export class NodeToolbarElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  private cleanups: (() => void)[] = [];
  private wrapperEl: HTMLElement | null = null;

  // Props with defaults matching original Vue component
  private _nodeId?: string | string[];
  private _isVisible?: boolean;
  private _position: Position = Position.Top;
  private _offset: number = 10;
  private _align: Align = 'center';

  setProps(props: NodeToolbarProps) {
    if (props.nodeId !== undefined) this._nodeId = props.nodeId;
    if (props.isVisible !== undefined) this._isVisible = props.isVisible;
    if (props.position !== undefined) this._position = props.position;
    if (props.offset !== undefined) this._offset = props.offset;
    if (props.align !== undefined) this._align = props.align;
    if (this.store) this.update();
  }

  connectedCallback() {
    this.store = useFlowKit();
    this.style.display = 'none'; // host is just a logical container

    this.setupWrapper();
    this.update();

    const onChange = () => this.update();
    this.store.hooks.nodesChange.on(onChange);
    this.store.hooks.viewportChange.on(onChange);
    this.cleanups.push(
      () => this.store.hooks.nodesChange.off(onChange),
      () => this.store.hooks.viewportChange.off(onChange),
    );
  }

  disconnectedCallback() {
    this.wrapperEl?.remove();
    this.wrapperEl = null;
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }

  private setupWrapper() {
    // Mirror <Teleport :to="viewportRef"> — append wrapper into the viewport element
    // so the toolbar is positioned relative to the flow canvas
    const wrapper = document.createElement('div');
    wrapper.classList.add('flow__node-toolbar');
    wrapper.style.position = 'absolute';
    wrapper.style.display = 'none';

    // Move slotted children into the wrapper
    while (this.childNodes.length) {
      wrapper.appendChild(this.childNodes[0]);
    }

    // Append into viewportRef (the transformation pane) so absolute positioning works
    const viewportRef = this.store.viewportRef;
    if (viewportRef) {
      viewportRef.appendChild(wrapper);
    } else {
      // fallback: append to parent flow element
      this.parentElement?.appendChild(wrapper);
    }

    this.wrapperEl = wrapper;
  }

  // Returns the node id from context (data-id on closest flow-node-wrapper ancestor)
  private getContextNodeId(): string | null {
    let el: Element | null = this.parentElement;
    while (el) {
      if (el.tagName.toLowerCase() === 'flow-node-wrapper') {
        return (el as HTMLElement).dataset.id ?? null;
      }
      el = el.parentElement;
    }
    return null;
  }

  private getNodes(): GraphNode[] {
    const contextNodeId = this.getContextNodeId();
    const ids = Array.isArray(this._nodeId)
      ? this._nodeId
      : [this._nodeId || contextNodeId || ''];

    return ids.reduce<GraphNode[]>((acc, id) => {
      const node = this.store.findNode(id);
      if (node) acc.push(node);
      return acc;
    }, []);
  }

  private isActive(nodes: GraphNode[]): boolean {
    if (typeof this._isVisible === 'boolean') return this._isVisible;
    // Mirror: nodes.length === 1 && nodes[0].selected && getSelectedNodes.length === 1
    const selectedNodes = this.store.nodes.filter((n) => n.selected);
    return (
      nodes.length === 1 && !!nodes[0].selected && selectedNodes.length === 1
    );
  }

  private getTransform(
    nodeRect: Rect,
    transform: ViewportTransform,
    position: Position,
    offset: number,
    align: Align,
  ): string {
    let alignmentOffset = 0.5;
    if (align === 'start') alignmentOffset = 0;
    else if (align === 'end') alignmentOffset = 1;

    // Default: Position.Top
    let pos = [
      (nodeRect.x + nodeRect.width * alignmentOffset) * transform.zoom +
        transform.x,
      nodeRect.y * transform.zoom + transform.y - offset,
    ];
    let shift = [-100 * alignmentOffset, -100];

    switch (position) {
      case Position.Right:
        pos = [
          (nodeRect.x + nodeRect.width) * transform.zoom + transform.x + offset,
          (nodeRect.y + nodeRect.height * alignmentOffset) * transform.zoom +
            transform.y,
        ];
        shift = [0, -100 * alignmentOffset];
        break;
      case Position.Bottom:
        pos[1] =
          (nodeRect.y + nodeRect.height) * transform.zoom +
          transform.y +
          offset;
        shift[1] = 0;
        break;
      case Position.Left:
        pos = [
          nodeRect.x * transform.zoom + transform.x - offset,
          (nodeRect.y + nodeRect.height * alignmentOffset) * transform.zoom +
            transform.y,
        ];
        shift = [-100, -100 * alignmentOffset];
        break;
    }

    return `translate(${pos[0]}px, ${pos[1]}px) translate(${shift[0]}%, ${shift[1]}%)`;
  }

  private update() {
    if (!this.wrapperEl) return;

    const nodes = this.getNodes();
    const active = this.isActive(nodes);

    if (!active || nodes.length === 0) {
      this.wrapperEl.style.display = 'none';
      return;
    }

    const nodeRect = getRectOfNodes(nodes);
    const viewport = this.store.viewport;
    const zIndex = Math.max(
      ...nodes.map((n) => (n.computedPosition.z || 1) + 1),
    );

    this.wrapperEl.style.display = '';
    this.wrapperEl.style.transform = this.getTransform(
      nodeRect,
      viewport,
      this._position,
      this._offset,
      this._align,
    );
    this.wrapperEl.style.zIndex = String(zIndex);
  }
}

customElements.define('flow-node-toolbar', NodeToolbarElement);

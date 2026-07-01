import type { HandleConnectable, NodeProps } from '../../types';
import { Position } from '../../types';
import { useFlowIt } from '../../composables';

type NodeVariant = 'input' | 'output' | 'default';

/**
 * Unified default node element covering all three built-in node variants:
 * - "default"  → target handle (top) + label + source handle (bottom)
 * - "input"    → label + source handle (bottom)
 * - "output"   → target handle (top) + label
 *
 * Which handles are rendered is determined by the `type` field in the props
 * passed via setProps(), so a single custom element tag handles all cases.
 * The nodeWrapper passes `type` through props, and defaultNodeTypes maps all
 * three variant names to this same "flow-default-node" tag.
 */
export class DefaultNodeElement extends HTMLElement {
  private store: ReturnType<typeof useFlowIt> | null = null;
  private pendingProps: NodeProps<{ label: any }> | null = null;

  connectedCallback() {
    this.store = useFlowIt();
    if (this.pendingProps) {
      this.render(this.pendingProps);
      this.pendingProps = null;
    }
  }

  setProps(props: NodeProps<{ label: any }>) {
    if (this.store) {
      this.render(props);
    } else {
      this.pendingProps = props;
    }
  }

  private getNodeEl(): HTMLElement | null {
    let el: Element | null = this.parentElement;
    while (el) {
      if (el.tagName.toLowerCase() === 'flow-node-wrapper')
        return el as HTMLElement;
      el = el.parentElement;
    }
    return null;
  }

  private appendHandle(
    handleType: 'source' | 'target',
    position: string,
    connectable: HandleConnectable,
    nodeId: string,
    node: any,
    nodeEl: HTMLElement | null,
  ): void {
    const handle = document.createElement('flow-handle') as any;
    handle.setAttribute('type', handleType);
    handle.setAttribute('position', position);
    handle.setAttribute('connectable', String(connectable));
    handle.setAttribute('data-handleid', `${handleType}-${position}`);
    // Must append before setProps: connectedCallback sets up the handle's store,
    // and setProps calls setupHandle() which needs the store to be initialised.
    this.appendChild(handle);
    handle.setProps?.({
      id: `${handleType}-${position}`,
      type: handleType,
      position,
      connectable,
      nodeId,
      node,
      nodeEl,
    });
  }

  private createLabel(label: any): HTMLElement | null {
    if (!label) return null;
    if (typeof label === 'string') {
      const el = document.createElement('div');
      el.textContent = label;
      return el;
    }
    if (label instanceof HTMLElement) return label;
    return null;
  }

  private render(props: NodeProps<{ label: any }>) {
    this.innerHTML = '';

    const {
      id: nodeId,
      type,
      sourcePosition = Position.Bottom,
      targetPosition = Position.Top,
      connectable = true,
      data,
    } = props;

    const variant: NodeVariant =
      type === 'input' || type === 'output' ? type : 'default';

    const node = this.store?.findNode(nodeId);
    const nodeEl = this.getNodeEl();
    const labelEl = this.createLabel(data?.label);

    // Render order matches original per-type behaviour:
    //   output  → target handle, label
    //   input   → label, source handle
    //   default → target handle, label, source handle
    if (variant === 'output') {
      this.appendHandle(
        'target',
        targetPosition,
        connectable,
        nodeId,
        node,
        nodeEl,
      );
      if (labelEl) this.appendChild(labelEl);
    } else if (variant === 'input') {
      if (labelEl) this.appendChild(labelEl);
      this.appendHandle(
        'source',
        sourcePosition,
        connectable,
        nodeId,
        node,
        nodeEl,
      );
    } else {
      this.appendHandle(
        'target',
        targetPosition,
        connectable,
        nodeId,
        node,
        nodeEl,
      );
      if (labelEl) this.appendChild(labelEl);
      this.appendHandle(
        'source',
        sourcePosition,
        connectable,
        nodeId,
        node,
        nodeEl,
      );
    }
  }
}

customElements.define('flow-default-node', DefaultNodeElement);

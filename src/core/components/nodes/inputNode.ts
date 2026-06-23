import type { NodeProps } from '../../types';
import { Position } from '../../types';
import { useFlowKit } from '../../composables';

export class InputNodeElement extends HTMLElement {
  private store: ReturnType<typeof useFlowKit> | null = null;
  private pendingProps: NodeProps<{ label: any }> | null = null;

  connectedCallback() {
    this.store = useFlowKit();
    if (this.pendingProps) {
      this.render(this.pendingProps);
    } else {
      this.render();
    }
  }

  setProps(props: NodeProps<{ label: any }>) {
    this.dataset.props = JSON.stringify(props);
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

  private render(props?: NodeProps<{ label: any }>) {
    this.innerHTML = '';

    const raw = props ? undefined : this.dataset.props;
    const resolvedProps: NodeProps<{ label: any }> | null =
      props ?? (raw ? JSON.parse(raw) : null);
    if (!resolvedProps) return;

    const {
      id: nodeId,
      sourcePosition = Position.Bottom,
      connectable = true,
      data,
    } = resolvedProps;

    const node = this.store?.findNode(nodeId);
    const nodeEl = this.getNodeEl();
    const label = data?.label;

    if (label) {
      if (typeof label === 'string') {
        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        this.appendChild(labelEl);
      } else if (label instanceof HTMLElement) {
        this.appendChild(label);
      }
    }

    const handle = document.createElement('flow-handle') as any;
    handle.setAttribute('type', 'source');
    handle.setAttribute('position', sourcePosition);
    handle.setAttribute('connectable', String(connectable));
    handle.setAttribute('data-handleid', `source-${sourcePosition}`);
    this.appendChild(handle);
    handle.setProps?.({
      id: `source-${sourcePosition}`,
      type: 'source',
      position: sourcePosition,
      connectable,
      nodeId,
      node,
      nodeEl,
    });
  }
}

customElements.define('flow-input-node', InputNodeElement);

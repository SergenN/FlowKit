import type { NodeProps } from '../../types';
import { Position } from '../../types';
import { useFlowKit } from '../../composables';

export class DefaultNodeElement extends HTMLElement {
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
      targetPosition = Position.Top,
      connectable = true,
      data,
    } = resolvedProps;

    const node = this.store?.findNode(nodeId);
    const nodeEl = this.getNodeEl();
    const label = data?.label;

    // target handle
    const targetHandle = document.createElement('flow-handle') as any;
    targetHandle.setAttribute('type', 'target');
    targetHandle.setAttribute('position', targetPosition);
    targetHandle.setAttribute('connectable', String(connectable));
    targetHandle.setAttribute('data-handleid', `target-${targetPosition}`);
    this.appendChild(targetHandle);
    targetHandle.setProps?.({
      id: `target-${targetPosition}`,
      type: 'target',
      position: targetPosition,
      connectable,
      nodeId,
      node,
      nodeEl,
    });

    // label
    if (label) {
      if (typeof label === 'string') {
        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        this.appendChild(labelEl);
      } else if (label instanceof HTMLElement) {
        this.appendChild(label);
      }
    }

    // source handle
    const sourceHandle = document.createElement('flow-handle') as any;
    sourceHandle.setAttribute('type', 'source');
    sourceHandle.setAttribute('position', sourcePosition);
    sourceHandle.setAttribute('connectable', String(connectable));
    sourceHandle.setAttribute('data-handleid', `source-${sourcePosition}`);
    this.appendChild(sourceHandle);
    sourceHandle.setProps?.({
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

customElements.define('flow-default-node', DefaultNodeElement);

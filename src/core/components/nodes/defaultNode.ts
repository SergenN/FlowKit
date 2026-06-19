import type { NodeProps } from '../../types';
import { Position } from '../../types';

export class DefaultNodeElement extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  setProps(props: NodeProps<{ label: any }>) {
    this.dataset.props = JSON.stringify(props);
    this.render();
  }

  private render() {
    this.innerHTML = '';

    const raw = this.dataset.props;
    if (!raw) return;

    const props: NodeProps<{ label: any }> = JSON.parse(raw);

    const {
      sourcePosition = Position.Bottom,
      targetPosition = Position.Top,
      connectable = true,
      data,
    } = props;

    const label = data?.label;

    // target handle
    const targetHandle = document.createElement('flow-handle') as any;
    targetHandle.setAttribute('type', 'target');
    targetHandle.setAttribute('position', targetPosition);
    targetHandle.setAttribute('connectable', String(connectable));
    this.appendChild(targetHandle);

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
    this.appendChild(sourceHandle);
  }
}

customElements.define('flow-default-node', DefaultNodeElement);

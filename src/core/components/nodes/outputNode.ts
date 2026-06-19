import type { NodeProps } from '../../types';
import { Position } from '../../types';

export class OutputNodeElement extends HTMLElement {
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

    const { targetPosition = Position.Top, connectable = true, data } = props;

    const label = data?.label;

    // target handle
    const handle = document.createElement('flow-handle') as any;
    handle.setAttribute('type', 'target');
    handle.setAttribute('position', targetPosition);
    handle.setAttribute('connectable', String(connectable));
    this.appendChild(handle);

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
  }
}

customElements.define('flow-output-node', OutputNodeElement);

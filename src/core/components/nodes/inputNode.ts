import type { NodeProps } from '../../types';
import { Position } from '../../types';

export class InputNodeElement extends HTMLElement {
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
      connectable = true,
      data,
    } = props;

    const label = data?.label;

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
    const handle = document.createElement('flow-handle') as any;
    handle.setAttribute('type', 'source');
    handle.setAttribute('position', sourcePosition);
    handle.setAttribute('connectable', String(connectable));
    this.appendChild(handle);
  }
}

customElements.define('flow-input-node', InputNodeElement);

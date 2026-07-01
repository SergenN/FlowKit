import type { SelectionRect } from '../../types';

export class UserSelectionElement extends HTMLElement {
  connectedCallback() {
    this.classList.add('flow__selection', 'flow__container');
  }

  setRect(rect: SelectionRect) {
    this.style.width = `${rect.width}px`;
    this.style.height = `${rect.height}px`;
    this.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
  }
}

customElements.define('flow-user-selection', UserSelectionElement);

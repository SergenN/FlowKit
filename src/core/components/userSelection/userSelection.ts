import type { SelectionRect } from '../../types';

export class UserSelectionElement extends HTMLElement {
  connectedCallback() {
    this.classList.add('flow__selection', 'flow__container');
    this.updateRect();
  }

  setRect(rect: SelectionRect) {
    this.updateRect(rect);
  }

  private updateRect(rect?: SelectionRect) {
    if (!rect) {
      const raw = this.getAttribute('rect');
      if (!raw) return;
      rect = JSON.parse(raw) as SelectionRect;
    }

    this.style.width = `${rect.width}px`;
    this.style.height = `${rect.height}px`;
    this.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
  }

  static get observedAttributes() {
    return ['rect'];
  }

  attributeChangedCallback() {
    this.updateRect();
  }
}

customElements.define('flow-user-selection', UserSelectionElement);

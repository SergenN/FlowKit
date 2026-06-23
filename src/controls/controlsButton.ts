export class ControlButtonElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <button type="button" class="flow__controls-button">
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('flow-control-button', ControlButtonElement);

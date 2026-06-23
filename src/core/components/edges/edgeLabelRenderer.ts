import { useFlowKit } from '../../composables';

export class EdgeLabelRendererElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;

  connectedCallback() {
    this.store = useFlowKit();
    this.render();
  }

  render() {
    this.innerHTML = '';

    // find the edge labels container in the viewport
    const target =
      this.store.viewportRef?.getElementsByClassName('flow__edge-labels')[0];

    if (target) {
      // move slot content directly into the edge labels container
      const slot = document.createElement('slot');
      target.appendChild(slot);
    } else {
      // fallback: render inside an svg foreignObject like the original
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const foreignObject = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'foreignObject',
      );
      foreignObject.setAttribute('height', '0');
      foreignObject.setAttribute('width', '0');

      const slot = document.createElement('slot');
      foreignObject.appendChild(slot);
      svg.appendChild(foreignObject);
      this.appendChild(svg);
    }
  }
}

customElements.define('flow-edge-label-renderer', EdgeLabelRendererElement);

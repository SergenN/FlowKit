import { useFlowJs } from '../../composables';

export class EdgeRendererElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowJs>;
  private cleanups: (() => void)[] = [];

  connectedCallback() {
    this.store = useFlowJs();
    this.render();

    const onEdgesChange = () => this.render();
    this.store.onEdgesChange(onEdgesChange);
    this.cleanups.push(() => this.store.hooks.edgesChange.off(onEdgesChange));
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
  }

  render() {
    this.innerHTML = '';

    const { getEdges } = this.store;

    // Single SVG that holds both <defs> (for markers) and edge <g> elements
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('flow__edges', 'flow__container');
    svg.style.overflow = 'visible';

    // <defs> for markers — must live in the same SVG as the paths
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.classList.add('flow__marker-defs');
    svg.appendChild(defs);

    this.appendChild(svg);

    // markerDefinitions is an HTML element — keep it outside the SVG,
    // but give it a reference to the defs element via a custom property
    const markerDefs = document.createElement('flow-marker-definitions') as any;
    markerDefs.defsEl = defs;
    this.appendChild(markerDefs);

    for (const edge of getEdges()) {
      const edgeWrapper = document.createElement('flow-edge-wrapper') as any;
      edgeWrapper.setAttribute('id', edge.id);
      svg.appendChild(edgeWrapper);
    }

    const connectionLine = document.createElement('flow-connection-line');
    this.appendChild(connectionLine);
  }
}

customElements.define('flow-edge-renderer', EdgeRendererElement);

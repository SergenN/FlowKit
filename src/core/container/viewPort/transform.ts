import { useFlowKit } from '../../composables';

export class TransformElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  private inner: HTMLDivElement | null = null;

  connectedCallback() {
    this.store = useFlowKit();

    this.inner = document.createElement('div');
    this.inner.classList.add('flow__transformationpane', 'flow__container');

    const slot = document.createElement('slot');
    this.inner.appendChild(slot);
    this.appendChild(this.inner);

    this.updateStyles();
  }

  updateStyles() {
    if (!this.inner) return;

    const { viewport, fitViewOnInit, fitViewOnInitDone } = this.store;

    const isHidden = fitViewOnInit ? !fitViewOnInitDone : false;

    this.inner.style.transform = `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})`;
    this.inner.style.opacity = isHidden ? '0' : '';
  }
}

customElements.define('flow-transform', TransformElement);

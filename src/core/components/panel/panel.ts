import type { PanelProps } from '../../types';
import { useFlowJs } from '../../composables';

export class PanelElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowJs>;

  connectedCallback() {
    this.store = useFlowJs();

    this.classList.add('flow__panel');
    this.updateClasses();
    this.updateStyles();

    const slot = document.createElement('slot');
    this.appendChild(slot);
  }

  setProps(props: PanelProps) {
    this.dataset.position = props.position;
    this.updateClasses();
  }

  private updateClasses() {
    const position = this.dataset.position ?? '';
    const positionClasses = position.split('-');

    // remove old position classes
    for (const cls of ['top', 'bottom', 'left', 'right', 'center']) {
      this.classList.remove(cls);
    }

    for (const cls of positionClasses) {
      if (cls) this.classList.add(cls);
    }
  }

  private updateStyles() {
    this.style.pointerEvents = this.store.userSelectionActive ? 'none' : 'all';
  }
}

customElements.define('flow-panel', PanelElement);

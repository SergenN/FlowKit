import type { PanelProps } from '../../types';
import { useFlowKit } from '../../composables';

export class PanelElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  private position = '';

  connectedCallback() {
    this.store = useFlowKit();

    this.classList.add('flow__panel');
    this.updateClasses();
    this.updateStyles();

    const slot = document.createElement('slot');
    this.appendChild(slot);
  }

  setProps(props: PanelProps) {
    this.position = props.position;
    this.updateClasses();
  }

  private updateClasses() {
    for (const cls of ['top', 'bottom', 'left', 'right', 'center']) {
      this.classList.remove(cls);
    }

    for (const cls of this.position.split('-')) {
      if (cls) this.classList.add(cls);
    }
  }

  private updateStyles() {
    this.style.pointerEvents = this.store.userSelectionActive ? 'none' : 'all';
  }
}

customElements.define('flow-panel', PanelElement);

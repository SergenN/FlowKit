import { useFlowJs } from '../../composables';
import { getNodesInitialized } from '../../composables/useNodesInitialized';

export class NodeRendererElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowJs>;
  private cleanups: (() => void)[] = [];

  connectedCallback() {
    this.store = useFlowJs();
    this.classList.add('flow__nodes', 'flow__container');

    this.render();
    this.checkNodesInitialized();

    const onNodesChange = (changes: any[]) => {
      const hasStructural = changes.some(
        (c) => c.type === 'add' || c.type === 'remove',
      );
      if (hasStructural) this.render();
    };
    this.store.onNodesChange(onNodesChange);
    this.cleanups.push(() => this.store.hooks.nodesChange.off(onNodesChange));
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
  }

  private checkNodesInitialized() {
    const { emits, getNodes } = this.store;

    const interval = setInterval(() => {
      if (getNodesInitialized()) {
        clearInterval(interval);
        queueMicrotask(() => emits.nodesInitialized(getNodes()));
      }
    }, 50);

    this.cleanups.push(() => clearInterval(interval));
  }

  render() {
    this.innerHTML = '';

    const { getNodes } = this.store;

    for (const node of getNodes()) {
      const nodeWrapper = document.createElement('flow-node-wrapper') as any;
      nodeWrapper.setAttribute('id', node.id);
      nodeWrapper.setAttribute('data-id', node.id);
      this.appendChild(nodeWrapper);
    }
  }
}

customElements.define('flow-node-renderer', NodeRendererElement);

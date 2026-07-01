import { useFlowIt } from '../../composables';
import { getNodesInitialized } from '../../composables/useNodesInitialized';

export class NodeRendererElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowIt>;
  private cleanups: (() => void)[] = [];

  connectedCallback() {
    this.store = useFlowIt();
    this.classList.add('flow__nodes', 'flow__container');

    this.render();
    this.watchNodesInitialized();

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

  // Previously used setInterval to poll getNodesInitialized() every 50ms.
  // Now we subscribe to nodesChange: every time a node's dimensions are measured
  // (type === 'dimensions'), we re-check. This fires at exactly the right moment
  // with no timer overhead.
  private watchNodesInitialized() {
    const { emits, getNodes } = this.store;
    let fired = false;

    // Check immediately — nodes may already be initialized if re-mounting.
    if (getNodesInitialized()) {
      queueMicrotask(() => emits.nodesInitialized(getNodes()));
      return;
    }

    const onNodesChange = (changes: any[]) => {
      if (fired) return;

      const hasDimensionChange = changes.some((c) => c.type === 'dimensions');
      if (!hasDimensionChange) return;

      if (getNodesInitialized()) {
        fired = true;
        this.store.hooks.nodesChange.off(onNodesChange);
        queueMicrotask(() => emits.nodesInitialized(getNodes()));
      }
    };

    this.store.onNodesChange(onNodesChange);
    this.cleanups.push(() => this.store.hooks.nodesChange.off(onNodesChange));
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

import type { FlowProps, FlowKitStore } from '../../types';
import { setupWatchProps } from '../../composables';
import { setupOnInitHandler } from '../../composables/useOnInitHandler';
import { checkStylesLoaded } from '../../composables/useStylesLoadedWarning';
import { setupResizeHandler } from '../../composables/useResizeHandler';
import { useFlowKit } from '../../composables';
import { useHooks } from '../../store';

export class FlowElement extends HTMLElement {
  private store!: FlowKitStore;
  private cleanups: (() => void)[] = [];

  constructor() {
    super();
  }

  connectedCallback() {
    this.classList.add('flow');

    const props = this.getProps();
    this.store = useFlowKit(props); // props already contains id from getProps()

    const dispatchEvent = (name: string, data: unknown) => {
      this.dispatchEvent(
        new CustomEvent(name, { detail: data, bubbles: true, composed: true }),
      );
    };
    const cleanupHooks = useHooks(dispatchEvent, this.store.hooks);
    this.cleanups.push(cleanupHooks);

    // Default onConnect: automatically add an edge when user drags a connection
    const onConnect = (connection: any) => {
      this.store.addEdges([connection]);
    };
    this.store.hooks.connect.on(onConnect);
    this.cleanups.push(() => this.store.hooks.connect.off(onConnect));

    const cleanupProps = setupWatchProps(props, this.store);
    this.cleanups.push(cleanupProps);

    const cleanupInit = setupOnInitHandler();
    this.cleanups.push(cleanupInit);

    checkStylesLoaded(this.store.emits);

    this.store.flowRef = this as unknown as HTMLDivElement;

    if (!this.id) {
      this.id = this.store.id;
    }

    const viewport = document.createElement('flow-viewport');
    this.appendChild(viewport);

    const edgeLabels = document.createElement('div');
    edgeLabels.className = 'flow__edge-labels';
    this.appendChild(edgeLabels);

    const cleanupResize = setupResizeHandler(
      this as unknown as HTMLDivElement,
      this.store,
    );
    this.cleanups.push(cleanupResize);
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
    this.store.$destroy();
  }

  private getProps(): FlowProps {
    // read attributes and convert to FlowProps
    return {
      id: this.getAttribute('id') ?? undefined,
      snapToGrid: this.hasAttribute('snap-to-grid'),
      onlyRenderVisibleElements: this.hasAttribute(
        'only-render-visible-elements',
      ),
      nodesDraggable: this.hasAttribute('nodes-draggable') ? true : undefined,
      nodesConnectable: this.hasAttribute('nodes-connectable')
        ? true
        : undefined,
      elementsSelectable: this.hasAttribute('elements-selectable')
        ? true
        : undefined,
      fitViewOnInit: this.hasAttribute('fit-view-on-init') ? true : undefined,
      // ... other props from attributes
    };
  }

  // allow imperative access to the store (replaces defineExpose)
  getStore(): FlowKitStore {
    return this.store;
  }
}

customElements.define('flow-kit', FlowElement);

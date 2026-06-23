import type { EdgeChange, FlowProps, NodeChange, FlowKitStore } from '../types';
import { Storage } from '../utils';

export function useFlowKit(idOrOpts?: string | FlowProps): FlowKitStore {
  const storage = Storage.getInstance();

  const isOptsObj = typeof idOrOpts === 'object';
  const options = isOptsObj ? idOrOpts : { id: idOrOpts };
  const id = options?.id;

  // try to find existing store by id
  let flowStore: FlowKitStore | undefined;
  if (id) {
    flowStore = storage.get(id);
  }

  // If no id given, try to find the nearest flow-kit ancestor in the DOM
  if (!flowStore && !id) {
    const el =
      (document.currentScript as any)?._caller ??
      storage.flows.values().next().value;
    flowStore = el;
  }

  // create a new store if none found
  if (!flowStore) {
    const name = id ?? storage.getId();
    flowStore = storage.create(name, options);
    wireDefaultHandlers(flowStore);
  } else if (isOptsObj) {
    flowStore.setState(options);
  }

  return flowStore;
}

function wireDefaultHandlers(store: FlowKitStore): () => void {
  const nodesChangeHandler = (changes: NodeChange[]) => {
    store.applyNodeChanges(changes);
  };

  const edgesChangeHandler = (changes: EdgeChange[]) => {
    store.applyEdgeChanges(changes);
  };

  if (store.applyDefault) {
    store.onNodesChange(nodesChangeHandler);
    store.onEdgesChange(edgesChangeHandler);
  }

  // return cleanup for the caller to invoke when tearing down
  return () => {
    store.hooks.nodesChange.off(nodesChangeHandler);
    store.hooks.edgesChange.off(edgesChangeHandler);
  };
}

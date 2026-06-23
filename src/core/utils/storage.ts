import type {
  FlowProps,
  GraphEdge,
  GraphNode,
  FlowKitStore,
  FlowHooksEmit,
  FlowHooksOn,
} from '../types';
import { useActions, useGetters, useState } from '../store';

export class Storage {
  public currentId = 0;
  public flows = new Map<string, FlowKitStore>();
  static instance: Storage;

  public static getInstance(): Storage {
    Storage.instance = Storage.instance ?? new Storage();
    return Storage.instance;
  }

  public set(id: string, flow: FlowKitStore) {
    return this.flows.set(id, flow);
  }

  public get(id: string) {
    return this.flows.get(id);
  }

  public remove(id: string) {
    return this.flows.delete(id);
  }

  public create(id: string, preloadedState?: FlowProps): FlowKitStore {
    const state = useState();

    const hooksOn = Object.fromEntries(
      Object.entries(state.hooks).map(([n, h]) => [
        `on${n.charAt(0).toUpperCase() + n.slice(1)}`,
        h.on,
      ]),
    ) as unknown as FlowHooksOn;

    const emits = {} as FlowHooksEmit;
    for (const [n, h] of Object.entries(state.hooks)) {
      (emits as any)[n] = h.trigger;
    }

    const nodeLookup = new Map<string, GraphNode>();
    for (const node of state.nodes) {
      nodeLookup.set(node.id, node);
    }

    const edgeLookup = new Map<string, GraphEdge>();
    for (const edge of state.edges) {
      edgeLookup.set(edge.id, edge);
    }

    const getters = useGetters(state, nodeLookup);
    const actions = useActions(state, nodeLookup, edgeLookup);

    actions.setState({ ...state, ...preloadedState });

    const flow: FlowKitStore = {
      ...hooksOn,
      ...getters,
      ...actions,
      ...state,
      nodeLookup,
      edgeLookup,
      emits,
      flowKitVersion: '1.0.0',
      id,
      $destroy: () => {
        this.remove(id);
      },
    };

    // Proxy ALL state keys so reads/writes on the store object always
    // go through the live state object rather than the stale spread copy.
    for (const key of Object.keys(state) as (keyof typeof state)[]) {
      Object.defineProperty(flow, key, {
        get: () => (state as any)[key],
        set: (v) => {
          (state as any)[key] = v;
        },
        enumerable: true,
        configurable: true,
      });
    }

    this.set(id, flow);

    return flow;
  }

  public getId() {
    return `flow-${this.currentId++}`;
  }
}

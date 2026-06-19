import type { FlowProps, FlowJsStore } from '../types';
import { isDef } from '../utils';

/**
 * Applies props to the store and sets up change listeners.
 * Returns a cleanup function.
 */
export function setupWatchProps(
  props: FlowProps,
  store: FlowJsStore,
): () => void {
  const cleanups: (() => void)[] = [];

  // ── nodes ────────────────────────────────────────────────────────────────
  if (props.nodes) {
    store.setNodes(props.nodes);
  }

  // ── edges ────────────────────────────────────────────────────────────────
  if (props.edges) {
    store.setEdges(props.edges);
  }

  // ── zoom ─────────────────────────────────────────────────────────────────
  if (isDef(props.maxZoom)) {
    store.setMaxZoom(props.maxZoom!);
  }

  if (isDef(props.minZoom)) {
    store.setMinZoom(props.minZoom!);
  }

  // ── extents ───────────────────────────────────────────────────────────────
  if (isDef(props.translateExtent)) {
    store.setTranslateExtent(props.translateExtent!);
  }

  if (isDef(props.nodeExtent)) {
    store.setNodeExtent(props.nodeExtent!);
  }

  // ── rest of props ─────────────────────────────────────────────────────────
  const skip: (keyof FlowProps)[] = [
    'id',
    'translateExtent',
    'nodeExtent',
    'edges',
    'nodes',
    'maxZoom',
    'minZoom',
  ];

  for (const key of Object.keys(props)) {
    const propKey = key as keyof FlowProps;
    if (skip.includes(propKey)) continue;

    const value = props[propKey];
    if (isDef(value)) {
      (store as any)[propKey] = value;
    }
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

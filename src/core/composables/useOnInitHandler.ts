import { useFlowJs } from './useFlowJS';

export function setupOnInitHandler(): () => void {
  const store = useFlowJs();

  const interval = setInterval(() => {
    // Check state directly — viewportHelper is a stale snapshot
    const isReady = !!(
      store.d3Zoom &&
      store.d3Selection &&
      store.dimensions.width &&
      store.dimensions.height
    );

    if (isReady) {
      clearInterval(interval);
      setTimeout(() => {
        store.emits.init(store);
      }, 1);
    }
  }, 10);

  return () => clearInterval(interval);
}
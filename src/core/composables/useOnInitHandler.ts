import { useFlowKit } from './useFlowKit';

export function setupOnInitHandler(): () => void {
  const store = useFlowKit();

  // d3Zoom and d3Selection are set synchronously when flow-viewport connects.
  // Dimensions are set by the ResizeObserver inside setupResizeHandler on the viewport.
  // So we observe the flow element for the viewport child being added (MutationObserver),
  // then observe the viewport for a non-zero size (ResizeObserver), and fire once both
  // conditions are met. No fixed-interval polling needed.

  let resizeObserver: ResizeObserver | undefined;
  let mutationObserver: MutationObserver | undefined;
  let fired = false;

  const tryFire = () => {
    if (fired) return;

    const isReady = !!(
      store.d3Zoom &&
      store.d3Selection &&
      store.dimensions.width &&
      store.dimensions.height
    );

    if (isReady) {
      fired = true;
      cleanup();
      queueMicrotask(() => store.emits.init(store));
    }
  };

  const watchViewport = (viewportEl: Element) => {
    // ResizeObserver fires when the viewport gets a size — that's when dimensions
    // are set by setupResizeHandler, so this is the correct signal for readiness.
    resizeObserver = new ResizeObserver(() => tryFire());
    resizeObserver.observe(viewportEl);

    // Also try immediately in case it already has a size.
    tryFire();
  };

  const flowEl = store.flowRef as HTMLElement | null;

  if (flowEl) {
    // flow-viewport may already be present (e.g. if this runs after connectedCallback
    // appended it), or it may arrive shortly after via appendChild.
    const existing = flowEl.querySelector('flow-viewport');
    if (existing) {
      watchViewport(existing);
    } else {
      mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (
              node instanceof Element &&
              node.tagName.toLowerCase() === 'flow-viewport'
            ) {
              mutationObserver!.disconnect();
              mutationObserver = undefined;
              watchViewport(node);
              return;
            }
          }
        }
      });
      mutationObserver.observe(flowEl, { childList: true });
    }
  }

  function cleanup() {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    resizeObserver = undefined;
    mutationObserver = undefined;
  }

  return cleanup;
}

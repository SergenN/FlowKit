import { ErrorCode, FlowItError, getDimensions } from '../utils';
import type { FlowItStore } from '../types';

export function setupResizeHandler(
  viewportEl: HTMLDivElement | null,
  flowStore: FlowItStore,
): () => void {
  let resizeObserver: ResizeObserver | undefined;

  const updateDimensions = () => {
    if (!viewportEl || !(viewportEl.checkVisibility?.() ?? true)) {
      return;
    }

    const size = getDimensions(viewportEl);

    if (size.width === 0 || size.height === 0) {
      flowStore.emits.error(
        new FlowItError(ErrorCode.MISSING_VIEWPORT_DIMENSIONS),
      );
    }

    flowStore.dimensions = {
      width: size.width || 500,
      height: size.height || 500,
    };
  };

  updateDimensions();
  window.addEventListener('resize', updateDimensions);

  if (viewportEl) {
    resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(viewportEl);
  }

  return () => {
    window.removeEventListener('resize', updateDimensions);

    if (resizeObserver && viewportEl) {
      resizeObserver.unobserve(viewportEl);
    }
  };
}

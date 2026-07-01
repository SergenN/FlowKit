import type { D3ZoomEvent, ZoomTransform } from 'd3-zoom';
import { zoom, zoomIdentity } from 'd3-zoom';
import { pointer, select } from 'd3-selection';
import type {
  CoordinateExtent,
  D3ZoomHandler,
  ViewportTransform,
} from '../../types';
import { PanOnScrollMode } from '../../types';
import { setupKeyPress, useFlowKit } from '../../composables';
import { setupResizeHandler } from '../../composables/useResizeHandler';
import { clamp, isMacOs, wheelDelta } from '../../utils';

export class ViewportElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  private cleanups: (() => void)[] = [];

  private isZoomingOrPanning = false;
  private isPanScrolling = false;
  private panScrollTimeout: ReturnType<typeof setTimeout> | null = null;
  private zoomedWithRightMouseButton = false;
  private mouseButton = 0;
  private prevTransform: ViewportTransform = { x: 0, y: 0, zoom: 0 };

  private panKeyPressed = false;
  private selectionKeyPressed = false;
  private zoomKeyPressed = false;

  connectedCallback() {
    const id = this.closest('flow-kit')?.getAttribute('id') ?? undefined;
    this.store = useFlowKit(id);

    this.classList.add('flow__viewport', 'flow__container');
    this.store.viewportRef = this as unknown as HTMLDivElement;

    // transformation pane (must have this class — actions.ts queries it for zoom matrix)
    const transform = document.createElement('div');
    transform.classList.add('flow__transformationpane', 'flow__container');

    const updateTransform = () => {
      const { x, y, zoom } = this.store.viewport;
      transform.style.transform = `translate(${x}px,${y}px) scale(${zoom})`;
    };

    // Set initial transform
    updateTransform();

    // Subscribe to viewport changes
    const onViewportChange = () => updateTransform();
    this.store.onViewportChange(onViewportChange);
    this.cleanups.push(() =>
      this.store.hooks.viewportChange.off(onViewportChange),
    );

    // renderers go inside the transform so they move/scale with the viewport
    const nodeRenderer = document.createElement('flow-node-renderer');
    const edgeRenderer = document.createElement('flow-edge-renderer');
    transform.appendChild(nodeRenderer);
    transform.appendChild(edgeRenderer);

    // pane wraps the transform (handles pan/select events)
    const pane = document.createElement('flow-pane');
    pane.appendChild(transform);
    this.appendChild(pane);

    this.setupKeyListeners();
    this.setupD3Zoom();

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
  }

  private get shouldPanOnDrag() {
    const { panOnDrag, selectionKeyCode } = this.store;
    return (
      (!this.selectionKeyPressed ||
        (this.selectionKeyPressed && selectionKeyCode === true)) &&
      (this.panKeyPressed || !!panOnDrag)
    );
  }

  private get shouldPanOnScroll() {
    return this.panKeyPressed || this.store.panOnScroll;
  }

  private get shouldSelectOnDrag() {
    return (
      this.store.selectionKeyCode === true && this.shouldPanOnDrag !== true
    );
  }

  private get isSelecting() {
    const { selectionKeyCode, userSelectionActive } = this.store;
    return (
      (this.selectionKeyPressed && selectionKeyCode !== true) ||
      userSelectionActive ||
      this.shouldSelectOnDrag
    );
  }

  private get connectionInProgress() {
    return this.store.connectionStartHandle !== null;
  }

  private setupKeyListeners() {
    const { panActivationKeyCode, selectionKeyCode, zoomActivationKeyCode } =
      this.store;

    const panKey = setupKeyPress(panActivationKeyCode, {}, (pressed) => {
      this.panKeyPressed = pressed;
      this.updatePaneClasses();
    });

    const selectionKey = setupKeyPress(
      selectionKeyCode as any,
      {},
      (pressed) => {
        this.selectionKeyPressed = pressed;
        this.updatePaneState();
      },
    );

    const zoomKey = setupKeyPress(zoomActivationKeyCode, {}, (pressed) => {
      this.zoomKeyPressed = pressed;
    });

    this.cleanups.push(panKey.cleanup, selectionKey.cleanup, zoomKey.cleanup);
  }

  private updatePaneClasses() {
    const pane = this.querySelector('flow-pane');
    if (!pane) return;

    const { panOnDrag, paneDragging } = this.store;

    pane.classList.toggle('connecting', this.connectionInProgress);
    pane.classList.toggle('dragging', paneDragging);
    pane.classList.toggle(
      'draggable',
      panOnDrag === true || (Array.isArray(panOnDrag) && panOnDrag.includes(0)),
    );
  }

  private updatePaneState() {
    const pane = this.querySelector('flow-pane') as any;
    if (!pane) return;
    pane.setProps?.(this.isSelecting, this.selectionKeyPressed);
  }

  private setupD3Zoom() {
    if (!this.store.viewportRef) {
      console.warn('Viewport element is missing');
      return;
    }

    const {
      minZoom,
      maxZoom,
      defaultViewport,
      translateExtent,
      paneClickDistance,
      emits,
      panOnDrag,
    } = this.store;

    const viewportElement = this as unknown as HTMLDivElement;
    const bbox = viewportElement.getBoundingClientRect();

    const d3Zoom = zoom<HTMLDivElement, unknown>()
      .clickDistance(paneClickDistance)
      .scaleExtent([minZoom, maxZoom])
      .translateExtent(translateExtent);

    const d3Selection = select(viewportElement).call(d3Zoom);
    const d3ZoomHandler = d3Selection.on('wheel.zoom');

    const updatedTransform = zoomIdentity
      .translate(defaultViewport.x ?? 0, defaultViewport.y ?? 0)
      .scale(clamp(defaultViewport.zoom ?? 1, minZoom, maxZoom));

    const extent: CoordinateExtent = [
      [0, 0],
      [bbox.width, bbox.height],
    ];

    const constrainedTransform = d3Zoom.constrain()(
      updatedTransform,
      extent,
      translateExtent,
    );
    d3Zoom.transform(d3Selection, constrainedTransform);
    d3Zoom.wheelDelta(wheelDelta);
    (this.store as any).d3Zoom = d3Zoom;
    (this.store as any).d3Selection = d3Selection;
    (this.store as any).d3ZoomHandler = d3ZoomHandler as D3ZoomHandler;

    this.store.viewport = {
      x: constrainedTransform.x,
      y: constrainedTransform.y,
      zoom: constrainedTransform.k,
    };

    d3Zoom.on('start', (event: D3ZoomEvent<HTMLDivElement, any>) => {
      if (!event.sourceEvent) return null;

      this.mouseButton = event.sourceEvent.button;
      this.isZoomingOrPanning = true;

      const flowTransform = eventToFlowTransform(event.transform);

      if (event.sourceEvent?.type === 'mousedown') {
        this.store.paneDragging = true;
        this.updatePaneClasses();
      }

      this.prevTransform = flowTransform;

      emits.viewportChangeStart(flowTransform);
      emits.moveStart({ event, flowTransform });
    });

    d3Zoom.on('end', (event: D3ZoomEvent<HTMLDivElement, any>) => {
      if (!event.sourceEvent) return null;

      this.isZoomingOrPanning = false;
      this.store.paneDragging = false;
      this.updatePaneClasses();

      if (
        isRightClickPan(this.shouldPanOnDrag, this.mouseButton) &&
        !this.zoomedWithRightMouseButton
      ) {
        emits.paneContextMenu(event.sourceEvent);
      }

      this.zoomedWithRightMouseButton = false;

      if (viewChanged(this.prevTransform, event.transform)) {
        const flowTransform = eventToFlowTransform(event.transform);
        this.prevTransform = flowTransform;

        emits.viewportChangeEnd(flowTransform);
        emits.moveEnd({ event, flowTransform });
      }
    });

    d3Zoom.filter((event: MouseEvent | TouchEvent | WheelEvent) => {
      const {
        noWheelClassName,
        noPanClassName,
        zoomOnScroll,
        zoomOnPinch,
        zoomOnDoubleClick,
        userSelectionActive,
      } = this.store;

      const zoomScroll = this.zoomKeyPressed || zoomOnScroll;
      const pinchZoom = zoomOnPinch && event.ctrlKey;
      const eventButton = (event as MouseEvent).button;
      const isWheelEvent = event.type === 'wheel';

      if (
        eventButton === 1 &&
        event.type === 'mousedown' &&
        (isWrappedWithClass(event, 'flow__node') ||
          isWrappedWithClass(event, 'flow__edge'))
      ) {
        return true;
      }

      if (
        !this.shouldPanOnDrag &&
        !zoomScroll &&
        !this.shouldPanOnScroll &&
        !zoomOnDoubleClick &&
        !zoomOnPinch
      ) {
        return false;
      }

      if (userSelectionActive) return false;

      if (this.connectionInProgress && !isWheelEvent) return false;

      if (!zoomOnDoubleClick && event.type === 'dblclick') return false;

      if (isWrappedWithClass(event, noWheelClassName) && isWheelEvent)
        return false;

      if (
        isWrappedWithClass(event, noPanClassName) &&
        (!isWheelEvent ||
          (this.shouldPanOnScroll && isWheelEvent && !this.zoomKeyPressed))
      ) {
        return false;
      }

      if (!zoomOnPinch && event.ctrlKey && isWheelEvent) return false;

      if (!zoomScroll && !this.shouldPanOnScroll && !pinchZoom && isWheelEvent)
        return false;

      if (
        !zoomOnPinch &&
        event.type === 'touchstart' &&
        (event as TouchEvent).touches?.length > 1
      ) {
        event.preventDefault();
        return false;
      }

      if (
        !this.shouldPanOnDrag &&
        (event.type === 'mousedown' || event.type === 'touchstart')
      )
        return false;

      if (
        this.shouldSelectOnDrag &&
        Array.isArray(panOnDrag) &&
        panOnDrag.includes(0) &&
        eventButton === 0
      )
        return false;

      if (
        Array.isArray(panOnDrag) &&
        !panOnDrag.includes(eventButton) &&
        (event.type === 'mousedown' || event.type === 'touchstart')
      ) {
        return false;
      }

      const { selectionKeyCode } = this.store;
      const buttonAllowed =
        (Array.isArray(panOnDrag) && panOnDrag.includes(eventButton)) ||
        (selectionKeyCode === true &&
          Array.isArray(panOnDrag) &&
          !panOnDrag.includes(0)) ||
        !eventButton ||
        eventButton <= 1;

      return (
        (!event.ctrlKey || this.panKeyPressed || isWheelEvent) && buttonAllowed
      );
    });

    // zoom handler
    this.setupZoomHandler(d3Zoom);

    // scroll handler
    this.setupScrollHandler(d3Zoom, d3Selection, d3ZoomHandler);
  }

  private setupZoomHandler(d3Zoom: any) {
    const { emits } = this.store;

    const applyZoom = () => {
      if (this.store.userSelectionActive && !this.isZoomingOrPanning) {
        d3Zoom.on('zoom', null);
      } else if (!this.store.userSelectionActive) {
        d3Zoom.on('zoom', (event: D3ZoomEvent<HTMLDivElement, any>) => {
          this.store.viewport = {
            x: event.transform.x,
            y: event.transform.y,
            zoom: event.transform.k,
          };

          const flowTransform = eventToFlowTransform(event.transform);

          this.zoomedWithRightMouseButton = isRightClickPan(
            this.shouldPanOnDrag,
            this.mouseButton,
          );

          emits.viewportChange(flowTransform);
          emits.move({ event, flowTransform });
        });
      }
    };

    applyZoom();
  }

  private setupScrollHandler(
    d3Zoom: any,
    d3Selection: any,
    d3ZoomHandler: any,
  ) {
    const {
      emits,
      panOnScrollMode,
      panOnScrollSpeed,
      noWheelClassName,
      preventScrolling,
      zoomOnPinch,
      zoomOnScroll,
      panOnScroll,
    } = this.store;

    if (
      this.shouldPanOnScroll &&
      !this.zoomKeyPressed &&
      !this.store.userSelectionActive
    ) {
      d3Selection.on(
        'wheel.zoom',
        (event: WheelEvent) => {
          if (isWrappedWithClass(event, noWheelClassName)) return false;

          const zoomScroll = this.zoomKeyPressed || zoomOnScroll;
          const pinchZoom = zoomOnPinch && event.ctrlKey;
          const scrollEventEnabled =
            !preventScrolling ||
            this.shouldPanOnScroll ||
            zoomScroll ||
            pinchZoom;

          if (!scrollEventEnabled) return false;

          event.preventDefault();
          event.stopImmediatePropagation();

          const currentZoom = d3Selection.property('__zoom').k || 1;
          const _isMacOs = isMacOs();

          if (!this.panKeyPressed && event.ctrlKey && zoomOnPinch && _isMacOs) {
            const point = pointer(event);
            const pinchDelta = wheelDelta(event);
            const z = currentZoom * 2 ** pinchDelta;
            d3Zoom.scaleTo(d3Selection, z, point, event);
            return;
          }

          const deltaNormalize = event.deltaMode === 1 ? 20 : 1;
          let deltaX =
            panOnScrollMode === PanOnScrollMode.Vertical
              ? 0
              : event.deltaX * deltaNormalize;
          let deltaY =
            panOnScrollMode === PanOnScrollMode.Horizontal
              ? 0
              : event.deltaY * deltaNormalize;

          if (
            !_isMacOs &&
            event.shiftKey &&
            panOnScrollMode !== PanOnScrollMode.Vertical &&
            !deltaX &&
            deltaY
          ) {
            deltaX = deltaY;
            deltaY = 0;
          }

          d3Zoom.translateBy(
            d3Selection,
            -(deltaX / currentZoom) * panOnScrollSpeed,
            -(deltaY / currentZoom) * panOnScrollSpeed,
          );

          const nextViewport = eventToFlowTransform(
            d3Selection.property('__zoom'),
          );

          if (this.panScrollTimeout) clearTimeout(this.panScrollTimeout);

          if (!this.isPanScrolling) {
            this.isPanScrolling = true;
            emits.moveStart({ event, flowTransform: nextViewport });
            emits.viewportChangeStart(nextViewport);
          } else {
            emits.move({ event, flowTransform: nextViewport });
            emits.viewportChange(nextViewport);

            this.panScrollTimeout = setTimeout(() => {
              emits.moveEnd({ event, flowTransform: nextViewport });
              emits.viewportChangeEnd(nextViewport);
              this.isPanScrolling = false;
            }, 150);
          }
        },
        { passive: false },
      );
    } else if (typeof d3ZoomHandler !== 'undefined') {
      d3Selection.on(
        'wheel.zoom',
        function (this: any, event: WheelEvent, d: any) {
          const zoomScroll = false || zoomOnScroll;
          const pinchZoom = zoomOnPinch && event.ctrlKey;
          const invalidEvent =
            !preventScrolling && event.type === 'wheel' && !event.ctrlKey;
          const scrollEventsDisabled =
            !zoomScroll && !panOnScroll && !pinchZoom && event.type === 'wheel';

          if (
            scrollEventsDisabled ||
            invalidEvent ||
            isWrappedWithClass(event, noWheelClassName)
          ) {
            return null;
          }

          event.preventDefault();
          d3ZoomHandler.call(this, event, d);
        },
        { passive: false },
      );
    }
  }
}

function isRightClickPan(pan: boolean | number[], usedButton: number) {
  return usedButton === 2 && Array.isArray(pan) && pan.includes(2);
}

function viewChanged(
  prevViewport: ViewportTransform,
  eventTransform: ZoomTransform,
) {
  return (
    (prevViewport.x !== eventTransform.x && !Number.isNaN(eventTransform.x)) ||
    (prevViewport.y !== eventTransform.y && !Number.isNaN(eventTransform.y)) ||
    (prevViewport.zoom !== eventTransform.k && !Number.isNaN(eventTransform.k))
  );
}

function eventToFlowTransform(
  eventTransform: ZoomTransform,
): ViewportTransform {
  return {
    x: eventTransform.x,
    y: eventTransform.y,
    zoom: eventTransform.k,
  };
}

function isWrappedWithClass(event: Event, className: string | undefined) {
  return (event.target as Element).closest(`.${className}`);
}

customElements.define('flow-viewport', ViewportElement);

import { interpolate, interpolateZoom } from 'd3-interpolate';
import { zoomIdentity } from 'd3-zoom';
import type {
  D3Selection,
  GraphNode,
  Project,
  State,
  TransitionOptions,
  ViewportFunctions,
} from '../types';
import {
  clampPosition,
  getRectOfNodes,
  getTransformForBounds,
  pointToRendererPoint,
  rendererPointToPoint,
} from '../utils';

export interface ViewportHelper extends ViewportFunctions {
  viewportInitialized: boolean;
  screenToFlowCoordinate: Project;
  flowToScreenCoordinate: Project;
}

const DEFAULT_PADDING = 0.1;

const defaultEase = (t: number) =>
  ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;

export function useViewportHelper(state: State): ViewportHelper {
  function zoom(scale: number, transitionOptions?: TransitionOptions) {
    return new Promise<boolean>((resolve) => {
      if (state.d3Selection && state.d3Zoom) {
        state.d3Zoom
          .interpolate(
            transitionOptions?.interpolate === 'linear'
              ? interpolate
              : interpolateZoom,
          )
          .scaleBy(
            getD3Transition(
              state.d3Selection,
              transitionOptions?.duration,
              transitionOptions?.ease,
              () => {
                resolve(true);
              },
            ),
            scale,
          );
      } else {
        resolve(false);
      }
    });
  }

  function transformViewport(
    x: number,
    y: number,
    zoom: number,
    transitionOptions?: TransitionOptions,
  ) {
    return new Promise<boolean>((resolve) => {
      const { x: clampedX, y: clampedY } = clampPosition(
        { x: -x, y: -y },
        state.translateExtent,
      );
      const nextTransform = zoomIdentity
        .translate(-clampedX, -clampedY)
        .scale(zoom);

      if (state.d3Selection && state.d3Zoom) {
        state.d3Zoom
          .interpolate(
            transitionOptions?.interpolate === 'linear'
              ? interpolate
              : interpolateZoom,
          )
          .transform(
            getD3Transition(
              state.d3Selection,
              transitionOptions?.duration,
              transitionOptions?.ease,
              () => {
                resolve(true);
              },
            ),
            nextTransform,
          );
      } else {
        resolve(false);
      }
    });
  }

  const isInitialized = () =>
    !!(
      state.d3Zoom &&
      state.d3Selection &&
      state.dimensions.width &&
      state.dimensions.height
    );

  return {
    get viewportInitialized() {
      return isInitialized();
    },

    zoomIn: (options) => zoom(1.2, options),

    zoomOut: (options) => zoom(1 / 1.2, options),

    zoomTo: (zoomLevel, options) => {
      return new Promise<boolean>((resolve) => {
        if (state.d3Selection && state.d3Zoom) {
          state.d3Zoom
            .interpolate(
              options?.interpolate === 'linear' ? interpolate : interpolateZoom,
            )
            .scaleTo(
              getD3Transition(
                state.d3Selection,
                options?.duration,
                options?.ease,
                () => {
                  resolve(true);
                },
              ),
              zoomLevel,
            );
        } else {
          resolve(false);
        }
      });
    },

    setViewport: (transform, options) => {
      return transformViewport(
        transform.x,
        transform.y,
        transform.zoom,
        options,
      );
    },

    getViewport: () => ({
      x: state.viewport.x,
      y: state.viewport.y,
      zoom: state.viewport.zoom,
    }),

    fitView: (
      options = {
        padding: DEFAULT_PADDING,
        includeHiddenNodes: false,
        duration: 0,
      },
    ) => {
      const nodesToFit: GraphNode[] = [];

      for (const node of state.nodes) {
        const isVisible =
          node.dimensions.width &&
          node.dimensions.height &&
          (options?.includeHiddenNodes || !node.hidden);

        if (isVisible) {
          if (!options.nodes?.length || options.nodes.includes(node.id)) {
            nodesToFit.push(node);
          }
        }
      }

      if (!nodesToFit.length) {
        return Promise.resolve(false);
      }

      const bounds = getRectOfNodes(nodesToFit);

      const { x, y, zoom } = getTransformForBounds(
        bounds,
        state.dimensions.width,
        state.dimensions.height,
        options.minZoom ?? state.minZoom,
        options.maxZoom ?? state.maxZoom,
        options.padding ?? DEFAULT_PADDING,
      );

      return transformViewport(x, y, zoom, options);
    },

    setCenter: (x, y, options) => {
      const nextZoom =
        typeof options?.zoom !== 'undefined' ? options.zoom : state.maxZoom;
      const centerX = state.dimensions.width / 2 - x * nextZoom;
      const centerY = state.dimensions.height / 2 - y * nextZoom;

      return transformViewport(centerX, centerY, nextZoom, options);
    },

    fitBounds: (bounds, options = { padding: DEFAULT_PADDING }) => {
      const { x, y, zoom } = getTransformForBounds(
        bounds,
        state.dimensions.width,
        state.dimensions.height,
        state.minZoom,
        state.maxZoom,
        options.padding ?? DEFAULT_PADDING,
      );

      return transformViewport(x, y, zoom, options);
    },

    project: (position) => {
      if (!isInitialized()) return position;
      return pointToRendererPoint(
        position,
        state.viewport,
        state.snapToGrid,
        state.snapGrid,
      );
    },

    screenToFlowCoordinate: (position) => {
      if (!isInitialized() || !state.flowRef) return { x: 0, y: 0 };
      const { x: domX, y: domY } = state.flowRef.getBoundingClientRect();
      return pointToRendererPoint(
        { x: position.x - domX, y: position.y - domY },
        state.viewport,
        state.snapToGrid,
        state.snapGrid,
      );
    },

    flowToScreenCoordinate: (position) => {
      if (!isInitialized() || !state.flowRef) return { x: 0, y: 0 };
      const { x: domX, y: domY } = state.flowRef.getBoundingClientRect();
      return rendererPointToPoint(
        { x: position.x - domX, y: position.y - domY },
        state.viewport,
      );
    },
  };
}

export function getD3Transition(
  selection: D3Selection,
  duration = 0,
  ease = defaultEase,
  onEnd = () => {},
) {
  const hasDuration = typeof duration === 'number' && duration > 0;

  if (!hasDuration) {
    onEnd();
  }

  return hasDuration
    ? selection.transition().duration(duration).ease(ease).on('end', onEnd)
    : selection;
}

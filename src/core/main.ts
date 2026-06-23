/**
 * FlowKit — entry point
 * Imports all custom element definitions (side effects) so every
 * customElements.define() call runs before the page uses them.
 */
import './style.css';
import './theme-default.css';

// ── Container ────────────────────────────────────────────────────────────────
import './container/flowKit/flowKit.ts';
import './container/viewPort/viewport.ts';
import './container/nodeRenderer/nodeRenderer.ts';
import './container/edgeRenderer/edgeRenderer.ts';
import './container/edgeRenderer/markerSymbols.ts';
import './container/edgeRenderer/markerDefinitions.ts';
import './container/viewPort/transform.ts'

// ── Components ───────────────────────────────────────────────────────────────
import './components/handle/handle.ts';
import './components/panel/panel.ts';

// ── Nodes ────────────────────────────────────────────────────────────────────
import './components/nodes/defaultNode.ts';
import './components/nodes/inputNode.ts';
import './components/nodes/outputNode.ts';
import './components/nodes/nodeWrapper.ts';

// ── Edges ────────────────────────────────────────────────────────────────────
import './components/edges/baseEdge.ts';
import './components/edges/bezierEdge.ts';
import './components/edges/straightEdge.ts';
import './components/edges/stepEdge.ts';
import './components/edges/smoothStepEdge.ts';
import './components/edges/simpleBezierEdge.ts';
import './components/edges/edgeText.ts';
import './components/edges/edgeLabelRenderer.ts';
import './components/edges/edgeWrapper.ts';

// ── Misc ─────────────────────────────────────────────────────────────────────
import './components/connectionLine/index.ts';
import './components/nodeSelection/nodeSelection.ts';
import './components/userSelection/userSelection.ts';

//── NodeToolbar ───────────────────────────────────────────────────────────────
import '../nodeToolbar/nodeToolbar';

// ── Public API (re-exports for consumers who import from this file) ───────────
export { FlowElement as FlowKit } from './container/flowKit/flowKit.ts';
export { HandleElement as Handle } from './components/handle/handle.ts';
export { PanelElement as Panel } from './components/panel/panel.ts';
export { StraightEdgeElement as StraightEdge } from './components/edges/straightEdge.ts';
export { StepEdgeElement as StepEdge } from './components/edges/stepEdge.ts';
export { BezierEdgeElement as BezierEdge } from './components/edges/bezierEdge.ts';
export { SimpleBezierEdgeElement as SimpleBezierEdge } from './components/edges/simpleBezierEdge.ts';
export { SmoothStepEdgeElement as SmoothStepEdge } from './components/edges/smoothStepEdge.ts';
export { BaseEdgeElement as BaseEdge } from './components/edges/baseEdge.ts';
export { EdgeTextElement as EdgeText } from './components/edges/edgeText.ts';
export { EdgeLabelRendererElement as EdgeLabelRenderer } from './components/edges/edgeLabelRenderer.ts';

export {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getSimpleEdgeCenter,
  getBezierEdgeCenter,
} from './components/edges/utils';

export {
  isNode,
  isEdge,
  isGraphNode,
  isGraphEdge,
  getOutgoers,
  getIncomers,
  getConnectedEdges,
  getTransformForBounds,
  getRectOfNodes,
  pointToRendererPoint,
  rendererPointToPoint,
  getNodesInside,
  getMarkerId,
  getBoundsofRects,
  connectionExists,
  clamp,
  wheelDelta,
} from './utils/graph';

export { isMacOs } from './utils/general';
export { applyChanges } from './utils/changes';
export {
  defaultEdgeTypes,
  defaultNodeTypes,
} from './utils/defaultNodeEdges.ts';
export {
  FlowSymbol as FlowKitInjection,
  NodeId as NodeIdInjection,
} from './context';
export { useFlowKit as useFlowKit } from './composables/useFlowKit';
export { useHandle } from './composables/useHandle';
export { useNode } from './composables/useNode';
export { useEdge } from './composables/useEdge';
export { useGetPointerPosition } from './composables/useGetPointerPosition';
export { getNodeConnections as useNodeConnections } from './composables/useNodeConnections';
export { getNodesData as useNodesData } from './composables/useNodesData';
export { useEdgesData } from './composables/useEdgesData.ts';
export { getNodesInitialized as useNodesInitialized } from './composables/useNodesInitialized';
export { setupKeyPress as useKeyPress } from './composables/useKeyPress';
export { FlowKitError, ErrorCode, isErrorOfType } from './utils/errors';
export { NodeToolbarElement as NodeToolbar } from '../nodeToolbar/nodeToolbar';

export * from '../nodeToolbar/types.ts';

export * from './types';
import type { DefaultEdgeTypes, DefaultNodeTypes } from '../types';

// All three built-in node variants share a single custom element.
// The element reads `type` from props to decide which handles to render.
export const defaultNodeTypes: DefaultNodeTypes = {
  input: 'flow-default-node',
  default: 'flow-default-node',
  output: 'flow-default-node',
};

export const defaultEdgeTypes: DefaultEdgeTypes = {
  default: 'flow-bezier-edge',
  straight: 'flow-straight-edge',
  step: 'flow-step-edge',
  smoothstep: 'flow-smooth-step-edge',
  simplebezier: 'flow-simple-bezier-edge',
};

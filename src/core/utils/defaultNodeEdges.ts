import type { DefaultEdgeTypes, DefaultNodeTypes } from '../types';

export const defaultNodeTypes: DefaultNodeTypes = {
  input: 'flow-input-node',
  default: 'flow-default-node',
  output: 'flow-output-node',
};

export const defaultEdgeTypes: DefaultEdgeTypes = {
  default: 'flow-bezier-edge',
  straight: 'flow-straight-edge',
  step: 'flow-step-edge',
  smoothstep: 'flow-smooth-step-edge',
  simplebezier: 'flow-simple-bezier-edge',
};

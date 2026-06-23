import type { FlowKitStore } from '../types';

export type InjectionKey<T> = symbol & { __type: T };

export const FlowSymbol = Symbol('flow') as InjectionKey<FlowKitStore>;
export const NodeId = Symbol('nodeId') as InjectionKey<string>;
export const NodeRef = Symbol('nodeRef') as InjectionKey<HTMLDivElement | null>;
export const EdgeId = Symbol('edgeId') as InjectionKey<string>;
export const EdgeRef = Symbol('edgeRef') as InjectionKey<SVGElement | null>;

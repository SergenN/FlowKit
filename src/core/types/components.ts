// components.ts

import type { NodeProps } from './node';
import type { EdgeProps } from './edge';

// ─── Rendering abstractions ──────────────────────────────────────────────────

/**
 * A registered custom element tag name (e.g. "my-node", "bezier-edge").
 * Must contain a hyphen per the Custom Elements spec.
 */
type CustomElementTagName = string;

/**
 * A plain render function — receives props, returns an HTMLElement or SVGElement.
 * Framework-agnostic equivalent of a functional component.
 */
export type NodeRenderFn = (
  props: NodeProps,
) => HTMLElement | SVGElement | DocumentFragment;

export type EdgeRenderFn = (props: EdgeProps) => SVGElement | DocumentFragment;

/**
 * A constructable element class (e.g. a class extending HTMLElement).
 */
export type NodeElementConstructor = new () => HTMLElement;

export type EdgeElementConstructor = new () => SVGElement | HTMLElement;

// ─── Component union types ────────────────────────────────────────────────────

/**
 * A node component can be:
 * - A custom element tag name (string, registered via customElements.define)
 * - A render function
 * - A custom element constructor
 */
export type NodeComponent =
  | CustomElementTagName
  | NodeRenderFn
  | NodeElementConstructor;

/**
 * An edge component can be:
 * - A custom element tag name
 * - A render function
 * - A custom element constructor
 */
export type EdgeComponent =
  | CustomElementTagName
  | EdgeRenderFn
  | EdgeElementConstructor;

// ─── Type registries ──────────────────────────────────────────────────────────

export type NodeTypesObject = {
  [key in keyof DefaultNodeTypes]?: NodeComponent;
} & Record<string, NodeComponent>;

export type EdgeTypesObject = {
  [key in keyof DefaultEdgeTypes]?: EdgeComponent;
} & Record<string, EdgeComponent>;

// ─── Default type maps ────────────────────────────────────────────────────────

export interface DefaultEdgeTypes {
  default: EdgeComponent; // bezier
  straight: EdgeComponent;
  simplebezier: EdgeComponent;
  step: EdgeComponent;
  smoothstep: EdgeComponent;
}

export type DefaultNodeTypes = {
  [key in 'input' | 'output' | 'default']: NodeComponent;
};

// ─── Edge label / text props ──────────────────────────────────────────────────

/**
 * Style is expressed as a plain CSSStyleDeclaration-compatible object
 * rather than Vue's CSSProperties.
 */
export type StyleObject = Partial<CSSStyleDeclaration>;

/**
 * Label content: a plain string, an HTMLElement/SVGElement node, or a raw object
 * passed through to the renderer.
 */
export type LabelContent = string | HTMLElement | SVGElement | object;

/** Props passed to edge label/text renderers */
export interface EdgeTextProps {
  x: number;
  y: number;
  label?: LabelContent;
  labelStyle?: StyleObject;
  labelShowBg?: boolean;
  labelBgStyle?: StyleObject;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
}

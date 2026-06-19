import type { BezierEdgeProps } from '../../types';
import { Position } from '../../types';
import { getBezierPath } from './utils';

export class BezierEdgeElement extends HTMLElement {
  private props: Partial<BezierEdgeProps> = {};

  connectedCallback() {
    this.render();
  }

  setProps(props: BezierEdgeProps) {
    this.props = props;
    this.render();
  }

  private render() {
    this.innerHTML = '';

    const [path, labelX, labelY] = getBezierPath({
      ...this.props,
      sourcePosition: this.props.sourcePosition ?? Position.Bottom,
      targetPosition: this.props.targetPosition ?? Position.Top,
    } as BezierEdgeProps);

    const baseEdge = document.createElement('flow-base-edge') as any;
    baseEdge.setProps?.({
      ...this.props,
      path,
      labelX,
      labelY,
    });

    this.appendChild(baseEdge);
  }
}

customElements.define('flow-bezier-edge', BezierEdgeElement);

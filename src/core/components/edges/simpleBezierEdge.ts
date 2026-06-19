import type { SimpleBezierEdgeProps } from '../../types';
import { Position } from '../../types';
import { getSimpleBezierPath } from './utils';

export class SimpleBezierEdgeElement extends HTMLElement {
  private props: Partial<SimpleBezierEdgeProps> = {};

  connectedCallback() {
    this.render();
  }

  setProps(props: SimpleBezierEdgeProps) {
    this.props = props;
    this.render();
  }

  private render() {
    this.innerHTML = '';

    const [path, labelX, labelY] = getSimpleBezierPath({
      ...this.props,
      sourcePosition: this.props.sourcePosition ?? Position.Bottom,
      targetPosition: this.props.targetPosition ?? Position.Top,
    } as SimpleBezierEdgeProps);

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

customElements.define('flow-simple-bezier-edge', SimpleBezierEdgeElement);

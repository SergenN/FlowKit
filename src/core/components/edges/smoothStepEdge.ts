import type { SmoothStepEdgeProps } from '../../types';
import { Position } from '../../types';
import { getSmoothStepPath } from './utils';

export class SmoothStepEdgeElement extends HTMLElement {
  private props: Partial<SmoothStepEdgeProps> = {};

  connectedCallback() {
    this.render();
  }

  setProps(props: SmoothStepEdgeProps) {
    this.props = props;
    this.render();
  }

  private render() {
    this.innerHTML = '';

    const [path, labelX, labelY] = getSmoothStepPath({
      ...this.props,
      sourcePosition: this.props.sourcePosition ?? Position.Bottom,
      targetPosition: this.props.targetPosition ?? Position.Top,
    } as SmoothStepEdgeProps);

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

customElements.define('flow-smooth-step-edge', SmoothStepEdgeElement);

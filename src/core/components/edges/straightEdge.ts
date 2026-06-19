import type { StraightEdgeProps } from '../../types';
import { getStraightPath } from './utils';

export class StraightEdgeElement extends HTMLElement {
  private props: Partial<StraightEdgeProps> = {};

  connectedCallback() {
    this.render();
  }

  setProps(props: StraightEdgeProps) {
    this.props = props;
    this.render();
  }

  private render() {
    this.innerHTML = '';

    const [path, labelX, labelY] = getStraightPath(
      this.props as StraightEdgeProps,
    );

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

customElements.define('flow-straight-edge', StraightEdgeElement);

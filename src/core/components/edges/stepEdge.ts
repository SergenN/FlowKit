import type { StepEdgeProps } from '../../types';

export class StepEdgeElement extends HTMLElement {
  private props: Partial<StepEdgeProps> = {};

  connectedCallback() {
    this.render();
  }

  setProps(props: StepEdgeProps) {
    this.props = props;
    this.render();
  }

  private render() {
    this.innerHTML = '';

    const smoothStep = document.createElement('flow-smooth-step-edge') as any;
    smoothStep.setProps?.({
      ...this.props,
      borderRadius: 0,
    });

    this.appendChild(smoothStep);
  }
}

customElements.define('flow-step-edge', StepEdgeElement);

import type { BaseEdgeProps } from '../../types';

export class BaseEdgeElement extends HTMLElement {
  private props: Partial<BaseEdgeProps> & { interactionWidth?: number } = {
    interactionWidth: 20,
  };

  pathEl: SVGPathElement | null = null;
  interactionEl: SVGPathElement | null = null;
  labelEl: SVGGElement | null = null;

  connectedCallback() {
    this.render();
  }

  setProps(props: Partial<BaseEdgeProps>) {
    this.props = { interactionWidth: 20, ...props };
    this.render();
  }

  private render() {
    this.innerHTML = '';

    const {
      id,
      path,
      markerEnd,
      markerStart,
      interactionWidth = 20,
      label,
      labelX,
      labelY,
      labelShowBg,
      labelBgStyle,
      labelBgPadding,
      labelBgBorderRadius,
      labelStyle,
    } = this.props;

    // main path
    const pathEl = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    if (id) pathEl.setAttribute('id', id);
    if (path) pathEl.setAttribute('d', path);
    if (markerEnd) pathEl.setAttribute('marker-end', markerEnd);
    if (markerStart) pathEl.setAttribute('marker-start', markerStart);
    pathEl.classList.add('flow__edge-path');
    this.pathEl = pathEl;
    this.appendChild(pathEl);

    // interaction path
    if (interactionWidth) {
      const interactionEl = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      interactionEl.setAttribute('fill', 'none');
      if (path) interactionEl.setAttribute('d', path);
      interactionEl.setAttribute('stroke-width', String(interactionWidth));
      interactionEl.setAttribute('stroke-opacity', '0');
      interactionEl.classList.add('flow__edge-interaction');
      this.interactionEl = interactionEl;
      this.appendChild(interactionEl);
    }

    // label
    if (label && labelX && labelY) {
      const labelEl = document.createElement('flow-edge-text') as any;
      labelEl.setProps?.({
        x: labelX,
        y: labelY,
        label,
        labelShowBg,
        labelBgStyle,
        labelBgPadding,
        labelBgBorderRadius,
        labelStyle,
      });
      this.labelEl = labelEl;
      this.appendChild(labelEl);
    }
  }
}

customElements.define('flow-base-edge', BaseEdgeElement);

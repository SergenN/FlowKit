import { MarkerType } from '../../types';
import type { MarkerProps } from '../../types';

export class MarkerSymbolElement extends HTMLElement {
  // Set by markerDefinitions before appending
  defsEl: SVGDefsElement | null = null;

  connectedCallback() {
    this.style.display = 'none';
    this.render();
  }

  disconnectedCallback() {
    // marker is owned by defsEl, not this element — don't remove it here
  }

  private getProps(): Required<MarkerProps> {
    return {
      id: this.getAttribute('id') ?? '',
      type: (this.getAttribute('type') ?? '') as MarkerType,
      width: Number(this.getAttribute('width') ?? 12.5),
      height: Number(this.getAttribute('height') ?? 12.5),
      markerUnits: this.getAttribute('marker-units') ?? 'strokeWidth',
      orient: this.getAttribute('orient') ?? 'auto-start-reverse',
      strokeWidth: Number(this.getAttribute('stroke-width') ?? 1),
      color: this.getAttribute('color') ?? 'none',
    };
  }

  render() {
    const defs = this.defsEl;
    if (!defs) return;

    const { id, type, width, height, markerUnits, orient, strokeWidth, color } =
      this.getProps();

    const marker = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'marker',
    );
    marker.setAttribute('id', id);
    marker.classList.add('flow__arrowhead');
    marker.setAttribute('viewBox', '-10 -10 20 20');
    marker.setAttribute('refX', '0');
    marker.setAttribute('refY', '0');
    marker.setAttribute('markerWidth', String(width));
    marker.setAttribute('markerHeight', String(height));
    marker.setAttribute('markerUnits', markerUnits);
    marker.setAttribute('orient', orient);

    if (type === MarkerType.ArrowClosed) {
      const polyline = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polyline',
      );
      polyline.setAttribute('points', '-5,-4 0,0 -5,4 -5,-4');
      polyline.setAttribute('stroke-linecap', 'round');
      polyline.setAttribute('stroke-linejoin', 'round');
      polyline.style.stroke = color;
      polyline.style.fill = color;
      polyline.style.strokeWidth = String(strokeWidth);
      marker.appendChild(polyline);
    }

    if (type === MarkerType.Arrow) {
      const polyline = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polyline',
      );
      polyline.setAttribute('points', '-5,-4 0,0 -5,4');
      polyline.setAttribute('stroke-linecap', 'round');
      polyline.setAttribute('stroke-linejoin', 'round');
      polyline.setAttribute('fill', 'none');
      polyline.style.stroke = color;
      polyline.style.strokeWidth = String(strokeWidth);
      marker.appendChild(polyline);
    }

    defs.appendChild(marker);
  }
}

customElements.define('flow-marker-symbol', MarkerSymbolElement);

import type { MiniMapNodeProps } from './types';

export class MiniMapNodeElement extends HTMLElement {
  private props: MiniMapNodeProps | null = null;
  private rectEl: SVGRectElement | null = null;

  // Optional custom renderer — replaces Vue's slot system.
  // Set this to a function that receives props and returns an SVGElement.
  customRenderer:
    | ((props: MiniMapNodeProps, svgParent: SVGSVGElement) => SVGElement | null)
    | null = null;

  connectedCallback() {
    // Hide the host element — it's just a logical container like edgeWrapper
    this.style.display = 'none';
    if (this.props) this.render();
  }

  disconnectedCallback() {
    this.rectEl?.remove();
    this.rectEl = null;
  }

  setProps(props: MiniMapNodeProps) {
    this.props = props;
    if (this.isConnected) this.render();
  }

  private getSvgParent(): SVGSVGElement | null {
    let el: Element | null = this.parentElement;
    while (el) {
      if (el instanceof SVGSVGElement) return el;
      el = el.parentElement;
    }
    return null;
  }

  private render() {
    const p = this.props;
    if (!p) return;

    // Remove previous element
    this.rectEl?.remove();
    this.rectEl = null;

    // Skip hidden or zero-size nodes
    if (p.hidden || p.dimensions.width === 0 || p.dimensions.height === 0)
      return;

    const svg = this.getSvgParent();
    if (!svg) return;

    // Custom renderer (replaces Vue slots)
    if (this.customRenderer) {
      const el = this.customRenderer(p, svg);
      if (el) svg.appendChild(el);
      return;
    }

    // Default: render a <rect>
    const rect = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    ) as SVGRectElement;
    rect.setAttribute('id', p.id);
    rect.classList.add('flow__minimap-node');
    rect.classList.toggle('selected', !!p.selected);
    rect.classList.toggle('dragging', !!p.dragging);
    rect.setAttribute('x', String(p.position.x));
    rect.setAttribute('y', String(p.position.y));
    rect.setAttribute('rx', String(p.borderRadius ?? 5));
    rect.setAttribute('ry', String(p.borderRadius ?? 5));
    rect.setAttribute('width', String(p.dimensions.width));
    rect.setAttribute('height', String(p.dimensions.height));
    rect.setAttribute('fill', p.color ?? '#e2e2e2');
    rect.setAttribute('stroke', p.strokeColor ?? 'transparent');
    rect.setAttribute('stroke-width', String(p.strokeWidth ?? 2));
    if (p.shapeRendering)
      rect.setAttribute('shape-rendering', p.shapeRendering);

    rect.addEventListener('click', (e) =>
      this.dispatchEvent(
        new CustomEvent('node-click', { detail: e, bubbles: true }),
      ),
    );
    rect.addEventListener('dblclick', (e) =>
      this.dispatchEvent(
        new CustomEvent('node-dblclick', { detail: e, bubbles: true }),
      ),
    );
    rect.addEventListener('mouseenter', (e) =>
      this.dispatchEvent(
        new CustomEvent('node-mouseenter', { detail: e, bubbles: true }),
      ),
    );
    rect.addEventListener('mousemove', (e) =>
      this.dispatchEvent(
        new CustomEvent('node-mousemove', { detail: e, bubbles: true }),
      ),
    );
    rect.addEventListener('mouseleave', (e) =>
      this.dispatchEvent(
        new CustomEvent('node-mouseleave', { detail: e, bubbles: true }),
      ),
    );

    svg.appendChild(rect);
    this.rectEl = rect;
  }
}

customElements.define('flow-minimap-node', MiniMapNodeElement);

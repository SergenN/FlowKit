import { useFlowKit } from '../core/composables';
import { DefaultBgColors } from './patterns.ts';
import { BackgroundVariant } from './types.ts';
import type { BackgroundProps } from './types.ts';

export class BackgroundElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  private cleanups: (() => void)[] = [];
  private svgEl: SVGSVGElement | null = null;

  private _variant: BackgroundVariant = BackgroundVariant.Dots;
  private _gap: number | [number, number] = 20;
  private _size: number = 1;
  private _lineWidth: number = 1;
  private _height: number = 100;
  private _width: number = 100;
  private _x: number = 0;
  private _y: number = 0;
  private _bgColor?: string;
  private _patternColor?: string;
  private _color?: string;
  private _offset: number | [number, number] = 0;
  private _id?: string;

  // Read props from HTML attributes so declarative usage works:
  // <flow-background variant="lines" gap="30" color="#eee"></flow-background>
  private readAttributes() {
    if (this.hasAttribute('variant'))
      this._variant = this.getAttribute('variant') as BackgroundVariant;
    if (this.hasAttribute('gap')) this._gap = Number(this.getAttribute('gap'));
    if (this.hasAttribute('size'))
      this._size = Number(this.getAttribute('size'));
    if (this.hasAttribute('line-width'))
      this._lineWidth = Number(this.getAttribute('line-width'));
    if (this.hasAttribute('height'))
      this._height = Number(this.getAttribute('height'));
    if (this.hasAttribute('width'))
      this._width = Number(this.getAttribute('width'));
    if (this.hasAttribute('x')) this._x = Number(this.getAttribute('x'));
    if (this.hasAttribute('y')) this._y = Number(this.getAttribute('y'));
    if (this.hasAttribute('bg-color'))
      this._bgColor = this.getAttribute('bg-color') ?? undefined;
    if (this.hasAttribute('color'))
      this._color = this.getAttribute('color') ?? undefined;
    if (this.hasAttribute('pattern-color'))
      this._patternColor = this.getAttribute('pattern-color') ?? undefined;
    if (this.hasAttribute('id'))
      this._id = this.getAttribute('id') ?? undefined;
  }

  static get observedAttributes() {
    return [
      'variant',
      'gap',
      'size',
      'line-width',
      'color',
      'bg-color',
      'pattern-color',
      'offset',
    ];
  }

  attributeChangedCallback() {
    this.readAttributes();
    if (this.store) this.render();
  }

  setProps(props: BackgroundProps) {
    if (props.variant !== undefined)
      this._variant = props.variant as BackgroundVariant;
    if (props.gap !== undefined)
      this._gap = props.gap as number | [number, number];
    if (props.size !== undefined) this._size = props.size;
    if (props.lineWidth !== undefined) this._lineWidth = props.lineWidth;
    if (props.height !== undefined) this._height = props.height;
    if (props.width !== undefined) this._width = props.width;
    if (props.x !== undefined) this._x = props.x;
    if (props.y !== undefined) this._y = props.y;
    if ((props as any).bgColor !== undefined)
      this._bgColor = (props as any).bgColor;
    if ((props as any).patternColor !== undefined)
      this._patternColor = (props as any).patternColor;
    if (props.color !== undefined) this._color = props.color;
    if (props.offset !== undefined) this._offset = props.offset;
    if (props.id !== undefined) this._id = props.id;
    if (this.store) this.render();
  }

  connectedCallback() {
    this.store = useFlowKit();
    this.readAttributes();
    this.render();

    const onViewportChange = () => this.render();
    this.store.hooks.viewportChange.on(onViewportChange);
    this.cleanups.push(() =>
      this.store.hooks.viewportChange.off(onViewportChange),
    );
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.svgEl = null;
  }

  private get patternId() {
    return `pattern-${this.store.id}${this._id ? `-${this._id}` : ''}`;
  }

  private get patternColor() {
    return (
      this._color ||
      this._patternColor ||
      DefaultBgColors[this._variant ?? BackgroundVariant.Dots]
    );
  }

  private getBackground() {
    const viewport = this.store.viewport;
    const zoom = viewport.zoom;
    const [gapX, gapY] = Array.isArray(this._gap)
      ? this._gap
      : [this._gap, this._gap];
    const scaledGap: [number, number] = [gapX * zoom || 1, gapY * zoom || 1];
    const scaledSize = this._size * zoom;
    const [offsetX, offsetY] = Array.isArray(this._offset)
      ? this._offset
      : [this._offset, this._offset];
    const scaledOffset: [number, number] = [
      offsetX * zoom || 1 + scaledGap[0] / 2,
      offsetY * zoom || 1 + scaledGap[1] / 2,
    ];
    return { scaledGap, offset: scaledOffset, size: scaledSize };
  }

  private render() {
    const viewport = this.store.viewport;
    const bg = this.getBackground();
    const pid = this.patternId;
    const color = this.patternColor;
    const h = Math.min(this._height, 100);
    const w = Math.min(this._width, 100);

    if (!this.svgEl) {
      this.svgEl = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      this.svgEl.classList.add('flow__background', 'flow__container');
      this.appendChild(this.svgEl);
    }

    this.svgEl.style.height = `${h}%`;
    this.svgEl.style.width = `${w}%`;
    this.svgEl.innerHTML = '';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    this.svgEl.appendChild(defs);

    const pattern = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'pattern',
    );
    pattern.setAttribute('id', pid);
    pattern.setAttribute('x', String(viewport.x % bg.scaledGap[0]));
    pattern.setAttribute('y', String(viewport.y % bg.scaledGap[1]));
    pattern.setAttribute('width', String(bg.scaledGap[0]));
    pattern.setAttribute('height', String(bg.scaledGap[1]));
    pattern.setAttribute(
      'patternTransform',
      `translate(-${bg.offset[0]},-${bg.offset[1]})`,
    );
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    defs.appendChild(pattern);

    if (this._variant === BackgroundVariant.Lines) {
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      const [dx, dy] = bg.scaledGap;
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', String(this._lineWidth));
      path.setAttribute('d', `M${dx / 2} 0 V${dy} M0 ${dy / 2} H${dx}`);
      pattern.appendChild(path);
    } else {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      );
      const r = bg.size / 2;
      circle.setAttribute('cx', String(r));
      circle.setAttribute('cy', String(r));
      circle.setAttribute('r', String(r));
      circle.setAttribute('fill', color);
      pattern.appendChild(circle);
    }

    if (this._bgColor) {
      const rect = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect',
      );
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', this._bgColor);
      pattern.appendChild(rect);
    }

    const fillRect = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    );
    fillRect.setAttribute('x', String(this._x));
    fillRect.setAttribute('y', String(this._y));
    fillRect.setAttribute('width', '100%');
    fillRect.setAttribute('height', '100%');
    fillRect.setAttribute('fill', `url(#${pid})`);
    this.svgEl.appendChild(fillRect);
  }
}

customElements.define('flow-background', BackgroundElement);

// --- LinePattern ---
import { BackgroundVariant } from './types.ts';

interface LinePatternProps {
  dimensions: [number, number];
  size?: number;
  color: string;
}

export class LinePatternElement extends HTMLElement {
  private pathEl: SVGPathElement | null = null;

  setProps(props: LinePatternProps) {
    const { dimensions, size, color } = props;
    const d = `M${dimensions[0] / 2} 0 V${dimensions[1]} M0 ${dimensions[1] / 2} H${dimensions[0]}`;

    if (!this.pathEl) {
      this.pathEl = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      this.appendChild(this.pathEl);
    }

    this.pathEl.setAttribute('stroke', color);
    this.pathEl.setAttribute('stroke-width', String(size ?? 1));
    this.pathEl.setAttribute('d', d);
  }
}

customElements.define('flow-bg-line-pattern', LinePatternElement);

// --- DotPattern ---

interface DotPatternProps {
  radius: number;
  color: string;
}

export class DotPatternElement extends HTMLElement {
  private circleEl: SVGCircleElement | null = null;

  setProps(props: DotPatternProps) {
    const { radius, color } = props;

    if (!this.circleEl) {
      this.circleEl = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      );
      this.appendChild(this.circleEl);
    }

    this.circleEl.setAttribute('cx', String(radius));
    this.circleEl.setAttribute('cy', String(radius));
    this.circleEl.setAttribute('r', String(radius));
    this.circleEl.setAttribute('fill', color);
  }
}

customElements.define('flow-bg-dot-pattern', DotPatternElement);

// --- Helpers ---

export const Patterns: Record<BackgroundVariant, string> = {
  [BackgroundVariant.Lines]: 'flow-bg-line-pattern',
  [BackgroundVariant.Dots]: 'flow-bg-dot-pattern',
};

export const DefaultBgColors: Record<BackgroundVariant, string> = {
  [BackgroundVariant.Dots]: '#81818a',
  [BackgroundVariant.Lines]: '#eee',
};

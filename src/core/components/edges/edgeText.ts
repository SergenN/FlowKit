import type { EdgeTextProps } from '../../types';

export class EdgeTextElement extends HTMLElement {
  private props: Partial<EdgeTextProps> = {
    labelStyle: {},
    labelShowBg: true,
    labelBgStyle: {},
    labelBgPadding: [2, 4],
    labelBgBorderRadius: 2,
  };

  private textEl: SVGTextElement | null = null;
  private box = { x: 0, y: 0, width: 0, height: 0 };

  connectedCallback() {
    this.render();
  }

  setProps(props: Partial<EdgeTextProps>) {
    this.props = {
      labelStyle: {},
      labelShowBg: true,
      labelBgStyle: {},
      labelBgPadding: [2, 4],
      labelBgBorderRadius: 2,
      ...props,
    };
    this.render();
  }

  private getBox() {
    if (!this.textEl) return;

    const nextBox = this.textEl.getBBox();

    if (
      nextBox.width !== this.box.width ||
      nextBox.height !== this.box.height
    ) {
      this.box = nextBox;
      this.updateTransform();
    }
  }

  private updateTransform() {
    const g = this.querySelector('g');
    if (!g) return;

    const { x = 0, y = 0 } = this.props;
    g.setAttribute(
      'transform',
      `translate(${x - this.box.width / 2} ${y - this.box.height / 2})`,
    );
  }

  private render() {
    this.innerHTML = '';

    const {
      x = 0,
      y = 0,
      label,
      labelStyle = {},
      labelShowBg = true,
      labelBgStyle = {},
      labelBgPadding = [2, 4],
      labelBgBorderRadius = 2,
    } = this.props;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute(
      'transform',
      `translate(${x - this.box.width / 2} ${y - this.box.height / 2})`,
    );
    g.classList.add('flow__edge-textwrapper');

    // background rect
    if (labelShowBg) {
      const rect = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect',
      );
      rect.classList.add('flow__edge-textbg');
      rect.setAttribute('width', `${this.box.width + 2 * labelBgPadding[0]}px`);
      rect.setAttribute(
        'height',
        `${this.box.height + 2 * labelBgPadding[1]}px`,
      );
      rect.setAttribute('x', String(-labelBgPadding[0]));
      rect.setAttribute('y', String(-labelBgPadding[1]));
      rect.setAttribute('rx', String(labelBgBorderRadius));
      rect.setAttribute('ry', String(labelBgBorderRadius));

      if (labelBgStyle) {
        for (const [key, value] of Object.entries(labelBgStyle)) {
          (rect.style as any)[key] = value;
        }
      }

      g.appendChild(rect);
    }

    // text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.classList.add('flow__edge-text');
    text.setAttribute('y', String(this.box.height / 2));
    text.setAttribute('dy', '0.3em');

    if (labelStyle) {
      for (const [key, value] of Object.entries(labelStyle)) {
        (text.style as any)[key] = value;
      }
    }

    if (typeof label === 'string') {
      text.textContent = label;
    } else if (label instanceof HTMLElement || label instanceof SVGElement) {
      text.appendChild(label);
    }

    this.textEl = text;
    g.appendChild(text);
    this.appendChild(g);

    // measure after appending
    queueMicrotask(() => this.getBox());
  }
}

customElements.define('flow-edge-text', EdgeTextElement);

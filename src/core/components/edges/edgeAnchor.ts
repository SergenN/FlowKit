import { Position } from '../../types';

interface EdgeAnchorProps {
  position: Position;
  centerX: number;
  centerY: number;
  radius?: number;
  type: string;
}

function shiftX(x: number, shift: number, position: Position): number {
  if (position === Position.Left) return x - shift;
  if (position === Position.Right) return x + shift;
  return x;
}

function shiftY(y: number, shift: number, position: Position): number {
  if (position === Position.Top) return y - shift;
  if (position === Position.Bottom) return y + shift;
  return y;
}

export class EdgeAnchorElement extends HTMLElement {
  private props: Partial<EdgeAnchorProps> = {};

  connectedCallback() {
    this.render();
  }

  setProps(props: EdgeAnchorProps) {
    this.props = props;
    this.render();
  }

  private render() {
    this.innerHTML = '';

    const {
      radius = 10,
      centerX = 0,
      centerY = 0,
      position = Position.Top,
      type = '',
    } = this.props;

    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    );
    circle.classList.add('flow__edgeupdater', `flow__edgeupdater-${type}`);
    circle.setAttribute('cx', String(shiftX(centerX, radius, position)));
    circle.setAttribute('cy', String(shiftY(centerY, radius, position)));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('stroke', 'transparent');
    circle.setAttribute('fill', 'transparent');

    this.appendChild(circle);
  }
}

customElements.define('flow-edge-anchor', EdgeAnchorElement);

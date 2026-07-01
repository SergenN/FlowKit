import { useFlowIt } from '../core/composables';
import type { FitViewParams } from '../core/types';
import PlusIcon from './icons/plus.svg';
import MinusIcon from './icons/minus.svg';
import FitViewIcon from './icons/fitview.svg';
import LockIcon from './icons/lock.svg';
import UnlockIcon from './icons/unlock.svg';

export interface ControlProps {
  showZoom?: boolean;
  showFitView?: boolean;
  showInteractive?: boolean;
  fitViewParams?: FitViewParams;
  position?: string;
}

function makeButton(
  iconUrl: string,
  className: string,
  title: string,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `flow__controls-button ${className}`;
  btn.title = title;
  const img = document.createElement('img');
  img.src = iconUrl;
  img.alt = '';
  btn.appendChild(img);
  return btn;
}

export class ControlsElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowIt>;
  private cleanups: (() => void)[] = [];

  // Props with defaults
  private _showZoom = true;
  private _showFitView = true;
  private _showInteractive = true;
  private _fitViewParams?: FitViewParams;
  private _position = 'bottom-left';

  // Button refs for updating disabled/icon state
  private zoomInBtn: HTMLButtonElement | null = null;
  private zoomOutBtn: HTMLButtonElement | null = null;
  private interactiveBtn: HTMLButtonElement | null = null;

  setProps(props: ControlProps) {
    if (props.showZoom !== undefined) this._showZoom = props.showZoom;
    if (props.showFitView !== undefined) this._showFitView = props.showFitView;
    if (props.showInteractive !== undefined)
      this._showInteractive = props.showInteractive;
    if (props.fitViewParams !== undefined)
      this._fitViewParams = props.fitViewParams;
    if (props.position !== undefined) this._position = props.position;
    if (this.store) this.render();
  }

  connectedCallback() {
    this.store = useFlowIt();
    this.render();

    const onUpdate = () => this.updateButtonStates();
    this.store.hooks.viewportChange.on(onUpdate);
    this.store.hooks.nodesChange.on(onUpdate);
    this.cleanups.push(
      () => this.store.hooks.viewportChange.off(onUpdate),
      () => this.store.hooks.nodesChange.off(onUpdate),
    );
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }

  private get isInteractive(): boolean {
    return (
      this.store.nodesDraggable ||
      this.store.nodesConnectable ||
      this.store.elementsSelectable
    );
  }

  private get minZoomReached(): boolean {
    return this.store.viewport.zoom <= this.store.minZoom;
  }

  private get maxZoomReached(): boolean {
    return this.store.viewport.zoom >= this.store.maxZoom;
  }

  private onZoomIn() {
    this.store.zoomIn();
    this.dispatchEvent(new CustomEvent('zoom-in', { bubbles: true }));
  }

  private onZoomOut() {
    this.store.zoomOut();
    this.dispatchEvent(new CustomEvent('zoom-out', { bubbles: true }));
  }

  private onFitView() {
    this.store.fitView(this._fitViewParams);
    this.dispatchEvent(new CustomEvent('fit-view', { bubbles: true }));
  }

  private onInteractiveChange() {
    const next = !this.isInteractive;
    this.store.setInteractive(next);
    this.dispatchEvent(
      new CustomEvent('interaction-change', { detail: next, bubbles: true }),
    );
    this.updateButtonStates();
  }

  private updateButtonStates() {
    if (this.zoomInBtn) this.zoomInBtn.disabled = this.maxZoomReached;
    if (this.zoomOutBtn) this.zoomOutBtn.disabled = this.minZoomReached;
    if (this.interactiveBtn) {
      const img = this.interactiveBtn.querySelector('img')!;
      img.src = this.isInteractive ? UnlockIcon : LockIcon;
      this.interactiveBtn.title = this.isInteractive
        ? 'Disable interactivity'
        : 'Enable interactivity';
    }
  }

  private render() {
    this.innerHTML = '';
    this.zoomInBtn = null;
    this.zoomOutBtn = null;
    this.interactiveBtn = null;

    const panel = document.createElement('flow-panel') as any;
    panel.setProps?.({ position: this._position });
    panel.classList.add('flow__controls');
    this.appendChild(panel);

    // Slot: top
    const topSlot = document.createElement('slot');
    topSlot.setAttribute('name', 'top');
    panel.appendChild(topSlot);

    // Zoom buttons
    if (this._showZoom) {
      const zoomIn = makeButton(PlusIcon, 'flow__controls-zoomin', 'Zoom in');
      zoomIn.disabled = this.maxZoomReached;
      zoomIn.addEventListener('click', () => this.onZoomIn());
      panel.appendChild(zoomIn);
      this.zoomInBtn = zoomIn;

      const zoomOut = makeButton(
        MinusIcon,
        'flow__controls-zoomout',
        'Zoom out',
      );
      zoomOut.disabled = this.minZoomReached;
      zoomOut.addEventListener('click', () => this.onZoomOut());
      panel.appendChild(zoomOut);
      this.zoomOutBtn = zoomOut;
    }

    // Fit view button
    if (this._showFitView) {
      const fitView = makeButton(
        FitViewIcon,
        'flow__controls-fitview',
        'Fit view',
      );
      fitView.addEventListener('click', () => this.onFitView());
      panel.appendChild(fitView);
    }

    // Interactive toggle
    if (this._showInteractive) {
      const interactive = makeButton(
        this.isInteractive ? UnlockIcon : LockIcon,
        'flow__controls-interactive',
        this.isInteractive ? 'Disable interactivity' : 'Enable interactivity',
      );
      interactive.addEventListener('click', () => this.onInteractiveChange());
      panel.appendChild(interactive);
      this.interactiveBtn = interactive;
    }

    // Default slot
    const defaultSlot = document.createElement('slot');
    panel.appendChild(defaultSlot);
  }
}

customElements.define('flow-controls', ControlsElement);

import type { HandleProps } from '../../types';
import { Position } from '../../types';
import { useHandle, useFlowIt } from '../../composables';
import { isDef, isMouseEvent } from '../../utils';

export class HandleElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowIt>;
  private handlePointerDown!: (event: MouseEvent | TouchEvent) => void;
  private handleClick!: (event: MouseEvent) => void;

  // props
  private _position: Position = Position.Top;
  private _connectable: HandleProps['connectable'] = undefined;
  private _connectableStart = true;
  private _connectableEnd = true;
  private _handleId: string | null = null;
  private _type: 'source' | 'target' = 'source';
  private _isValidConnection: HandleProps['isValidConnection'] = undefined;
  private _nodeId = '';
  private _node: any = null;

  connectedCallback() {
    this.store = useFlowIt();

    this.classList.add('flow__handle');
    this.setupHandle();
    this.setupEventListeners();
    this.updateClasses();
  }

  disconnectedCallback() {
    this.removeEventListener('mousedown', this._onPointerDown);
    this.removeEventListener('touchstart', this._onPointerDown);
    this.removeEventListener('click', this._onClick);
  }

  setProps(
    props: HandleProps & {
      nodeId: string;
      node: any;
      nodeEl: HTMLElement | null;
    },
  ) {
    this._position = props.position ?? Position.Top;
    this._connectable = props.connectable;
    this._connectableStart = props.connectableStart ?? true;
    this._connectableEnd = props.connectableEnd ?? true;
    this._handleId = props.id ?? null;
    this._type = props.type ?? 'source';
    this._isValidConnection = props.isValidConnection ?? undefined;
    this._nodeId = props.nodeId;
    this._node = props.node;
    // nodeEl is no longer stored — handle bounds are computed by
    // updateNodeDimensions in actions.ts, which already has the nodeElement.

    this.setupHandle();
    this.updateClasses();
  }

  private setupHandle() {
    const { handlePointerDown, handleClick } = useHandle({
      nodeId: this._nodeId,
      handleId: this._handleId,
      type: this._type,
      isValidConnection: this._isValidConnection,
    });

    this.handlePointerDown = handlePointerDown;
    this.handleClick = handleClick;

    const { id: flowId } = this.store;

    // These data attributes are read by getHandleBounds (node.ts) and
    // useHandle (composables) — they must stay as attributes on the element.
    this.dataset.id = `${flowId}-${this._nodeId}-${this._handleId}-${this._type}`;
    this.dataset.handleid = this._handleId ?? '';
    this.dataset.nodeid = this._nodeId;
    this.dataset.handlepos = this._position;
  }

  private get isConnectable(): boolean {
    const { nodesConnectable } = this.store;
    const connectable = this._connectable;

    const connectedEdges = this._node
      ? this.store.getConnectedEdges([this._node])
      : [];

    if (typeof connectable === 'string' && connectable === 'single') {
      return !connectedEdges.some((edge: any) => {
        const id = edge[`${this._type}Handle`];
        if (edge[this._type] !== this._nodeId) return false;
        return id ? id === this._handleId : true;
      });
    }

    if (typeof connectable === 'number') {
      return (
        connectedEdges.filter((edge: any) => {
          const id = edge[`${this._type}Handle`];
          if (edge[this._type] !== this._nodeId) return false;
          return id ? id === this._handleId : true;
        }).length < connectable
      );
    }

    if (typeof connectable === 'function') {
      return connectable(this._node, connectedEdges);
    }

    return isDef(connectable) ? !!connectable : nodesConnectable;
  }

  private get isConnecting(): boolean {
    const { connectionStartHandle, connectionEndHandle } = this.store;
    return (
      (connectionStartHandle?.nodeId === this._nodeId &&
        connectionStartHandle?.id === this._handleId &&
        connectionStartHandle?.type === this._type) ||
      (connectionEndHandle?.nodeId === this._nodeId &&
        connectionEndHandle?.id === this._handleId &&
        connectionEndHandle?.type === this._type)
    );
  }

  private get isClickConnecting(): boolean {
    const { connectionClickStartHandle } = this.store;
    return (
      connectionClickStartHandle?.nodeId === this._nodeId &&
      connectionClickStartHandle?.id === this._handleId &&
      connectionClickStartHandle?.type === this._type
    );
  }

  private updateClasses() {
    const { noDragClassName, noPanClassName } = this.store;

    for (const pos of Object.values(Position)) {
      this.classList.remove(`flow__handle-${pos}`);
    }
    this.classList.remove('source', 'target');

    this.classList.add(
      `flow__handle-${this._position}`,
      this._type,
      noDragClassName,
      noPanClassName,
    );

    if (this._handleId) {
      this.classList.add(`flow__handle-${this._handleId}`);
    }

    this.classList.toggle('connectable', this.isConnectable);
    this.classList.toggle('connecting', this.isClickConnecting);
    this.classList.toggle('connectablestart', this._connectableStart);
    this.classList.toggle('connectableend', this._connectableEnd);
    this.classList.toggle(
      'connectionindicator',
      this.isConnectable &&
        ((this._connectableStart && !this.isConnecting) ||
          (this._connectableEnd && this.isConnecting)),
    );
  }

  private _onPointerDown = (event: MouseEvent | TouchEvent) => {
    const isMouseTriggered = isMouseEvent(event);

    if (
      this.isConnectable &&
      this._connectableStart &&
      ((isMouseTriggered && (event as MouseEvent).button === 0) ||
        !isMouseTriggered)
    ) {
      this.handlePointerDown(event);
    }
  };

  private _onClick = (event: MouseEvent) => {
    const { connectionClickStartHandle } = this.store;

    if (
      !this._nodeId ||
      (!connectionClickStartHandle && !this._connectableStart)
    ) {
      return;
    }

    if (this.isConnectable) {
      this.handleClick(event);
    }
  };

  private setupEventListeners() {
    this.addEventListener('mousedown', this._onPointerDown);
    this.addEventListener('touchstart', this._onPointerDown, { passive: true });
    this.addEventListener('click', this._onClick);
  }
}

customElements.define('flow-handle', HandleElement);

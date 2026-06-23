import type { EdgeChange, NodeChange } from '../../types';
import { SelectionMode } from '../../types';
import { useFlowKit, setupKeyPress } from '../../composables';
import {
  areSetsEqual,
  getEventPosition,
  getNodesInside,
  getSelectionChanges,
} from '../../utils';
import { getMousePosition } from './utils';

export class PaneElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  private cleanups: (() => void)[] = [];

  private selectedNodeIds = new Set<string>();
  private selectedEdgeIds = new Set<string>();
  private containerBounds: DOMRect | null = null;
  private selectionInProgress = false;
  private selectionStarted = false;

  private isSelecting = false;
  private selectionKeyPressed = false;

  connectedCallback() {
    this.store = useFlowKit();

    this.classList.add('flow__pane', 'flow__container');

    this.setupKeyListeners();
    this.setupEventListeners();
    this.render();
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
  }

  setProps(isSelecting: boolean, selectionKeyPressed: boolean) {
    this.isSelecting = isSelecting;
    this.selectionKeyPressed = selectionKeyPressed;
    this.classList.toggle('selection', isSelecting);
  }

  private get hasActiveSelection() {
    return (
      this.store.elementsSelectable &&
      (this.isSelecting || this.store.userSelectionActive)
    );
  }

  private get connectionInProgress() {
    return this.store.connectionStartHandle !== null;
  }

  private setupKeyListeners() {
    const { deleteKeyCode, multiSelectionKeyCode } = this.store;

    const deleteKeyState = setupKeyPress(
      deleteKeyCode,
      { actInsideInputWithModifier: false },
      (isPressed) => {
        if (!isPressed) return;

        this.store.removeNodes(this.store.getSelectedNodes);
        this.store.removeEdges(this.store.getSelectedEdges);
        this.store.nodesSelectionActive = false;
      },
    );

    const multiSelectKeyState = setupKeyPress(
      multiSelectionKeyCode,
      {},
      (isPressed) => {
        this.store.multiSelectionActive = isPressed;
      },
    );

    this.cleanups.push(deleteKeyState.cleanup, multiSelectKeyState.cleanup);
  }

  private wrapHandler(handler: (event: MouseEvent) => void) {
    return (event: MouseEvent) => {
      if (event.target !== this) return;
      handler(event);
    };
  }

  private onClick(event: MouseEvent) {
    if (this.selectionInProgress || this.connectionInProgress) {
      this.selectionInProgress = false;
      return;
    }

    this.store.emits.paneClick(event);
    this.store.removeSelectedElements();
    this.store.nodesSelectionActive = false;
  }

  private onContextMenu(event: MouseEvent) {
    const { panOnDrag } = this.store;
    if (Array.isArray(panOnDrag) && panOnDrag.includes(2)) {
      event.preventDefault();
      return;
    }
    this.store.emits.paneContextMenu(event);
  }

  private onWheel(event: WheelEvent) {
    this.store.emits.paneScroll(event);
  }

  private onPointerDown(event: PointerEvent) {
    this.containerBounds = this.store.flowRef?.getBoundingClientRect() ?? null;

    if (
      !this.store.elementsSelectable ||
      !this.isSelecting ||
      event.button !== 0 ||
      event.target !== this ||
      !this.containerBounds
    ) {
      return;
    }

    (event.target as Element)?.setPointerCapture?.(event.pointerId);

    const { x, y } = getMousePosition(event, this.containerBounds);

    this.selectionStarted = true;
    this.selectionInProgress = false;

    this.store.removeSelectedElements();

    this.store.userSelectionRect = {
      width: 0,
      height: 0,
      startX: x,
      startY: y,
      x,
      y,
    };

    this.store.emits.selectionStart(event);
  }

  private onPointerMove(event: PointerEvent) {
    const {
      userSelectionRect,
      viewport,
      nodes,
      selectionMode,
      connectionLookup,
      edgeLookup,
      defaultEdgeOptions,
      nodeLookup,
    } = this.store;

    if (!this.containerBounds || !userSelectionRect) return;

    this.selectionInProgress = true;

    const { x: mouseX, y: mouseY } = getEventPosition(
      event,
      this.containerBounds,
    );
    const { startX = 0, startY = 0 } = userSelectionRect;

    const nextUserSelectRect = {
      startX,
      startY,
      x: mouseX < startX ? mouseX : startX,
      y: mouseY < startY ? mouseY : startY,
      width: Math.abs(mouseX - startX),
      height: Math.abs(mouseY - startY),
    };

    const prevSelectedNodeIds = this.selectedNodeIds;
    const prevSelectedEdgeIds = this.selectedEdgeIds;

    this.selectedNodeIds = new Set(
      getNodesInside(
        nodes,
        nextUserSelectRect,
        viewport,
        selectionMode === SelectionMode.Partial,
        true,
      ).map((node) => node.id),
    );

    this.selectedEdgeIds = new Set();
    const edgesSelectable = defaultEdgeOptions?.selectable ?? true;

    for (const nodeId of this.selectedNodeIds) {
      const connections = connectionLookup.get(nodeId);
      if (!connections) continue;

      for (const { edgeId } of connections.values()) {
        const edge = edgeLookup.get(edgeId);
        if (edge && (edge.selectable ?? edgesSelectable)) {
          this.selectedEdgeIds.add(edgeId);
        }
      }
    }

    if (!areSetsEqual(prevSelectedNodeIds, this.selectedNodeIds)) {
      const changes = getSelectionChanges(
        nodeLookup,
        this.selectedNodeIds,
        true,
      ) as NodeChange[];
      this.store.emits.nodesChange(changes);
    }

    if (!areSetsEqual(prevSelectedEdgeIds, this.selectedEdgeIds)) {
      const changes = getSelectionChanges(
        edgeLookup,
        this.selectedEdgeIds,
      ) as EdgeChange[];
      this.store.emits.edgesChange(changes);
    }

    this.store.userSelectionRect = nextUserSelectRect;
    this.store.userSelectionActive = true;
    this.store.nodesSelectionActive = false;
  }

  private onPointerUp(event: PointerEvent) {
    if (event.button !== 0 || !this.selectionStarted) return;
    (event.target as Element)?.releasePointerCapture(event.pointerId);

    if (
      !this.store.userSelectionActive &&
      this.store.userSelectionRect &&
      event.target === this
    ) {
      this.onClick(event);
    }

    this.store.userSelectionActive = false;
    this.store.userSelectionRect = null;
    this.store.nodesSelectionActive = this.selectedNodeIds.size > 0;

    this.store.emits.selectionEnd(event);

    if (this.selectionKeyPressed) {
      this.selectionInProgress = false;
    }

    this.selectionStarted = false;
  }

  private setupEventListeners() {
    const onClick = (event: MouseEvent) => {
      if (this.hasActiveSelection) return;
      this.wrapHandler((e) => this.onClick(e))(event);
    };

    const onContextMenu = this.wrapHandler((e) => this.onContextMenu(e));

    const onWheel = (event: WheelEvent) => {
      if (event.target !== this) return;
      this.onWheel(event);
    };

    const onPointerEnter = (event: PointerEvent) => {
      if (!this.hasActiveSelection) this.store.emits.paneMouseEnter(event);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (this.hasActiveSelection) {
        this.onPointerDown(event);
      } else {
        this.store.emits.paneMouseMove(event);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (this.hasActiveSelection) {
        this.onPointerMove(event);
      } else {
        this.store.emits.paneMouseMove(event);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (this.hasActiveSelection) this.onPointerUp(event);
    };

    const onPointerLeave = (event: PointerEvent) => {
      this.store.emits.paneMouseLeave(event);
    };

    this.addEventListener('click', onClick);
    this.addEventListener('contextmenu', onContextMenu);
    this.addEventListener('wheel', onWheel, { passive: true });
    this.addEventListener('pointerenter', onPointerEnter);
    this.addEventListener('pointerdown', onPointerDown);
    this.addEventListener('pointermove', onPointerMove);
    this.addEventListener('pointerup', onPointerUp);
    this.addEventListener('pointerleave', onPointerLeave);

    this.cleanups.push(() => {
      this.removeEventListener('click', onClick);
      this.removeEventListener('contextmenu', onContextMenu);
      this.removeEventListener('wheel', onWheel);
      this.removeEventListener('pointerenter', onPointerEnter);
      this.removeEventListener('pointerdown', onPointerDown);
      this.removeEventListener('pointermove', onPointerMove);
      this.removeEventListener('pointerup', onPointerUp);
      this.removeEventListener('pointerleave', onPointerLeave);
    });
  }

  render() {
    this.innerHTML = '';

    const slot = document.createElement('slot');
    this.appendChild(slot);

    const {
      userSelectionActive,
      userSelectionRect,
      nodesSelectionActive,
      getSelectedNodes,
    } = this.store;

    if (userSelectionActive && userSelectionRect) {
      const userSelection = document.createElement('flow-user-selection');
      userSelection.setAttribute('rect', JSON.stringify(userSelectionRect));
      this.appendChild(userSelection);
    }

    if (nodesSelectionActive && getSelectedNodes.length) {
      const nodesSelection = document.createElement('flow-nodes-selection');
      this.appendChild(nodesSelection);
    }
  }
}

customElements.define('flow-pane', PaneElement);

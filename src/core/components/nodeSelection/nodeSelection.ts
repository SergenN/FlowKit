import { setupDrag } from '../../composables';
import { useUpdateNodePositions } from '../../composables';
import { useFlowJs } from '../../composables';
import { arrowKeyDiffs, getRectOfNodes } from '../../utils';

export class NodesSelectionElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowJs>;
  private inner: HTMLDivElement | null = null;
  private cleanups: (() => void)[] = [];

  connectedCallback() {
    this.store = useFlowJs();

    this.classList.add('flow__nodesselection', 'flow__container');

    this.render();
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
  }

  render() {
    this.innerHTML = '';

    const {
      userSelectionActive,
      viewport,
      noPanClassName,
      disableKeyboardA11y,
      emits,
    } = this.store;

    const selectedNodes = this.store.getSelectedNodes;
    const bbox = getRectOfNodes(selectedNodes());

    if (userSelectionActive || !bbox.width || !bbox.height) {
      return;
    }

    this.style.transform = `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})`;
    this.classList.add(noPanClassName);

    this.inner = document.createElement('div');
    this.inner.classList.add('flow__nodesselection-rect');
    this.inner.style.width = `${bbox.width}px`;
    this.inner.style.height = `${bbox.height}px`;
    this.inner.style.top = `${bbox.y}px`;
    this.inner.style.left = `${bbox.x}px`;

    if (!disableKeyboardA11y) {
      this.inner.tabIndex = -1;
    }

    // drag
    const cleanupDrag = setupDrag({
      el: this.inner,
      onStart: (args) => {
        emits.selectionDragStart(args);
        emits.nodeDragStart(args);
      },
      onDrag: (args) => {
        emits.selectionDrag(args);
        emits.nodeDrag(args);
      },
      onStop: (args) => {
        emits.selectionDragStop(args);
        emits.nodeDragStop(args);
      },
      onDraggingChange: (dragging) => {
        this.inner?.classList.toggle('dragging', dragging);
      },
    });
    this.cleanups.push(cleanupDrag);

    // context menu
    const onContextMenu = (event: MouseEvent) => {
      emits.selectionContextMenu({
        event,
        nodes: this.store.getSelectedNodes(),
      });
    };

    // keyboard
    const updatePositions = useUpdateNodePositions();
    const onKeyDown = (event: KeyboardEvent) => {
      if (disableKeyboardA11y) return;

      if (arrowKeyDiffs[event.key]) {
        event.preventDefault();
        updatePositions(
          { x: arrowKeyDiffs[event.key].x, y: arrowKeyDiffs[event.key].y },
          event.shiftKey,
        );
      }
    };

    this.inner.addEventListener('contextmenu', onContextMenu);
    this.inner.addEventListener('keydown', onKeyDown);

    this.cleanups.push(() => {
      this.inner?.removeEventListener('contextmenu', onContextMenu);
      this.inner?.removeEventListener('keydown', onKeyDown);
    });

    this.appendChild(this.inner);

    // focus after mount
    if (!disableKeyboardA11y) {
      queueMicrotask(() => this.inner?.focus({ preventScroll: true }));
    }
  }
}

customElements.define('flow-nodes-selection', NodesSelectionElement);

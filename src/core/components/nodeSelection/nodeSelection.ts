import {
  setupDrag,
  useUpdateNodePositions,
  useFlowKit,
} from '../../composables';
import { arrowKeyDiffs, getRectOfNodes } from '../../utils';

export class NodesSelectionElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  private cleanups: (() => void)[] = [];

  connectedCallback() {
    this.store = useFlowKit();
    this.classList.add('flow__nodesselection', 'flow__container');
    this.render();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  private cleanup() {
    for (const fn of this.cleanups) fn();
    this.cleanups = [];
  }

  render() {
    this.cleanup();
    this.innerHTML = '';

    const {
      userSelectionActive,
      viewport,
      noPanClassName,
      disableKeyboardA11y,
      emits,
    } = this.store;

    const bbox = getRectOfNodes(this.store.getSelectedNodes());

    if (userSelectionActive || !bbox.width || !bbox.height) {
      return;
    }

    this.style.transform = `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})`;
    this.classList.add(noPanClassName);

    const inner = document.createElement('div');
    inner.classList.add('flow__nodesselection-rect');
    inner.style.width = `${bbox.width}px`;
    inner.style.height = `${bbox.height}px`;
    inner.style.top = `${bbox.y}px`;
    inner.style.left = `${bbox.x}px`;

    if (!disableKeyboardA11y) {
      inner.tabIndex = -1;
    }

    const cleanupDrag = setupDrag({
      el: inner,
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
        inner.classList.toggle('dragging', dragging);
      },
    });

    const onContextMenu = (event: MouseEvent) => {
      emits.selectionContextMenu({
        event,
        nodes: this.store.getSelectedNodes(),
      });
    };

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

    inner.addEventListener('contextmenu', onContextMenu);
    inner.addEventListener('keydown', onKeyDown);

    this.cleanups.push(
      cleanupDrag,
      () => inner.removeEventListener('contextmenu', onContextMenu),
      () => inner.removeEventListener('keydown', onKeyDown),
    );

    this.appendChild(inner);

    if (!disableKeyboardA11y) {
      queueMicrotask(() => inner.focus({ preventScroll: true }));
    }
  }
}

customElements.define('flow-nodes-selection', NodesSelectionElement);

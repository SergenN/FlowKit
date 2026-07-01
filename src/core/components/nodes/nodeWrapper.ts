import {
  ARIA_NODE_DESC_KEY,
  ErrorCode,
  FlowItError,
  arrowKeyDiffs,
  calcNextPosition,
  elementSelectionKeys,
  getXYZPos,
  handleNodeClick,
  snapPosition,
} from '../../utils';
import {
  isInputDOMNode,
  setupDrag,
  useFlowIt,
  useNodeHooks,
  useUpdateNodePositions,
} from '../../composables';
import type { MouseTouchEvent } from '../../types';

export class NodeWrapperElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowIt>;
  private nodeId!: string;
  private cleanups: (() => void)[] = [];
  private dragging = false;
  private emit!: ReturnType<typeof useNodeHooks>['emit'];

  connectedCallback() {
    this.store = useFlowIt();
    this.nodeId = this.getAttribute('id') ?? '';

    this.setup();
  }

  disconnectedCallback() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
  }

  private get node() {
    return this.store.findNode(this.nodeId)!;
  }

  private get parentFlowNode() {
    return this.node?.parentId
      ? this.store.findNode(this.node.parentId)
      : undefined;
  }

  private get isDraggable() {
    return typeof this.node.draggable === 'undefined'
      ? this.store.nodesDraggable
      : this.node.draggable;
  }

  private get isSelectable() {
    return typeof this.node.selectable === 'undefined'
      ? this.store.elementsSelectable
      : this.node.selectable;
  }

  private get isConnectable() {
    return typeof this.node.connectable === 'undefined'
      ? this.store.nodesConnectable
      : this.node.connectable;
  }

  private get isFocusable() {
    return typeof this.node.focusable === 'undefined'
      ? this.store.nodesFocusable
      : this.node.focusable;
  }

  private get hasPointerEvents() {
    const { hooks } = this.store;
    return (
      this.isSelectable ||
      this.isDraggable ||
      hooks.nodeClick.hasListeners() ||
      hooks.nodeDoubleClick.hasListeners() ||
      hooks.nodeMouseEnter.hasListeners() ||
      hooks.nodeMouseMove.hasListeners() ||
      hooks.nodeMouseLeave.hasListeners()
    );
  }

  private get isInit() {
    return !!this.node.dimensions.width && !!this.node.dimensions.height;
  }

  private get zIndex() {
    const style = this.getStyle();
    return Number(this.node.zIndex ?? style.zIndex ?? 0);
  }

  private getClass() {
    return this.node.class instanceof Function
      ? this.node.class(this.node)
      : this.node.class;
  }

  private getStyle(): Record<string, string> {
    const styles = this.node.style || {};

    const width = this.node.width;

    const height = this.node.height;

    if (!styles.width && width) {
      styles.width = typeof width === 'string' ? width : `${width}px`;
    }

    if (!styles.height && height) {
      styles.height = typeof height === 'string' ? height : `${height}px`;
    }

    return styles as Record<string, string>;
  }

  private setup() {
    const node = this.node;
    if (!node) return;

    const { emit } = useNodeHooks(this.store.emits);
    this.emit = emit;

    this.setupDrag();
    this.setupKeyListeners();
    this.setupEventListeners();
    this.setupResizeObserver();
    this.clampPosition();
    this.updatePosition();
    this.render();

    // Re-render when dimensions arrive (makes node visible)
    const onNodesChange = (changes: any[]) => {
      for (const c of changes) {
        if (c.id !== this.nodeId) continue;
        if (c.type === 'dimensions') {
          this.render();
        } else if (c.type === 'position' && c.position) {
          this.updatePosition();
          this.style.transform = `translate(${this.node.computedPosition.x}px,${this.node.computedPosition.y}px)`;
        }
      }
    };

    this.store.onNodesChange(onNodesChange);
    this.cleanups.push(() => this.store.hooks.nodesChange.off(onNodesChange));

    this.store.onUpdateNodeInternals((updateIds: string[]) => {
      if (updateIds.includes(this.nodeId) || !updateIds.length) {
        this.updateInternals();
      }
    });
  }

  private setupDrag() {
    const cleanupDrag = setupDrag({
      id: this.nodeId,
      el: this as unknown as Element,
      disabled: !this.isDraggable,
      selectable: this.isSelectable,
      dragHandle: this.node.dragHandle,
      onStart: (event) => this.emit.dragStart(event),
      onDrag: (event) => this.emit.drag(event),
      onStop: (event) => this.emit.dragStop(event),
      onClick: (event) => this.onSelectNode(event),
      onDraggingChange: (dragging) => {
        this.dragging = dragging;
        this.classList.toggle('dragging', dragging);
      },
    });

    this.cleanups.push(cleanupDrag);
  }

  private setupResizeObserver() {
    if (this.node.hidden) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const updates = entries.map((entry) => {
        return {
          id: entry.target.getAttribute('data-id') as string,
          nodeElement: entry.target as HTMLDivElement,
          forceUpdate: true,
        };
      });
      queueMicrotask(() => this.store.updateNodeDimensions(updates));
    });

    resizeObserver.observe(this as unknown as Element);
    this.cleanups.push(() => resizeObserver.disconnect());
  }

  private setupKeyListeners() {
    const onKeyDown = (event: KeyboardEvent) => this.onKeyDown(event);
    this.addEventListener('keydown', onKeyDown);
    this.cleanups.push(() => this.removeEventListener('keydown', onKeyDown));
  }

  private setupEventListeners() {
    const onMouseEnter = (event: MouseEvent) => {
      if (!this.dragging) this.emit.mouseEnter({ event, node: this.node });
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!this.dragging) this.emit.mouseMove({ event, node: this.node });
    };
    const onMouseLeave = (event: MouseEvent) => {
      if (!this.dragging) this.emit.mouseLeave({ event, node: this.node });
    };
    const onContextMenu = (event: MouseEvent) =>
      this.emit.contextMenu({ event, node: this.node });
    const onDoubleClick = (event: MouseEvent) =>
      this.emit.doubleClick({ event, node: this.node });
    const onClick = (event: MouseEvent) => this.onSelectNode(event);

    this.addEventListener('mouseenter', onMouseEnter);
    this.addEventListener('mousemove', onMouseMove);
    this.addEventListener('mouseleave', onMouseLeave);
    this.addEventListener('contextmenu', onContextMenu);
    this.addEventListener('dblclick', onDoubleClick);
    this.addEventListener('click', onClick);

    this.cleanups.push(() => {
      this.removeEventListener('mouseenter', onMouseEnter);
      this.removeEventListener('mousemove', onMouseMove);
      this.removeEventListener('mouseleave', onMouseLeave);
      this.removeEventListener('contextmenu', onContextMenu);
      this.removeEventListener('dblclick', onDoubleClick);
      this.removeEventListener('click', onClick);
    });
  }

  private updatePosition() {
    const node = this.node;
    const parentFlowNode = this.parentFlowNode;
    const { elevateNodesOnSelect } = this.store;

    const xyzPos = {
      x: node.position.x,
      y: node.position.y,
      z: this.zIndex + (elevateNodesOnSelect ? (node.selected ? 1000 : 0) : 0),
    };

    if (parentFlowNode?.computedPosition) {
      node.computedPosition = getXYZPos(
        parentFlowNode.computedPosition,
        xyzPos,
      );
    } else {
      node.computedPosition = xyzPos;
    }
  }

  private clampPosition() {
    const node = this.node;
    const { snapToGrid, snapGrid, nodeExtent, emits } = this.store;
    const nextPosition = node.computedPosition;

    const { computedPosition, position } = calcNextPosition(
      node,
      snapToGrid ? snapPosition(nextPosition, snapGrid) : nextPosition,
      emits.error,
      nodeExtent,
      this.parentFlowNode,
    );

    if (
      node.computedPosition.x !== computedPosition.x ||
      node.computedPosition.y !== computedPosition.y
    ) {
      node.computedPosition = { ...node.computedPosition, ...computedPosition };
    }

    if (node.position.x !== position.x || node.position.y !== position.y) {
      node.position = position;
    }
  }

  private updateInternals() {
    this.store.updateNodeDimensions([
      {
        id: this.nodeId,
        nodeElement: this as unknown as HTMLDivElement,
        forceUpdate: true,
      },
    ]);
  }

  private onSelectNode(event: MouseTouchEvent) {
    const {
      selectNodesOnDrag,
      multiSelectionActive,
      addSelectedNodes,
      removeSelectedNodes,
      nodeDragThreshold,
    } = this.store;

    if (
      this.isSelectable &&
      (!selectNodesOnDrag || !this.isDraggable || nodeDragThreshold > 0)
    ) {
      handleNodeClick(
        this.node,
        multiSelectionActive,
        addSelectedNodes,
        removeSelectedNodes,
        false,
        this as unknown as HTMLDivElement,
      );
    }

    this.emit.click({ event, node: this.node });
  }

  private onKeyDown(event: KeyboardEvent) {
    const {
      disableKeyboardA11y,
      multiSelectionActive,
      addSelectedNodes,
      removeSelectedNodes,
    } = this.store;

    if (isInputDOMNode(event) || disableKeyboardA11y) return;

    if (elementSelectionKeys.includes(event.key) && this.isSelectable) {
      const unselect = event.key === 'Escape';

      handleNodeClick(
        this.node,
        multiSelectionActive,
        addSelectedNodes,
        removeSelectedNodes,
        unselect,
        this as unknown as HTMLDivElement,
      );
    } else if (
      this.isDraggable &&
      this.node.selected &&
      arrowKeyDiffs[event.key]
    ) {
      event.preventDefault();

      this.store.ariaLiveMessage = `Moved selected node ${event.key.replace('Arrow', '').toLowerCase()}. New position, x: ${~~this.node.position.x}, y: ${~~this.node.position.y}`;

      const updateNodePositions = useUpdateNodePositions();
      updateNodePositions(
        { x: arrowKeyDiffs[event.key].x, y: arrowKeyDiffs[event.key].y },
        event.shiftKey,
      );
    }
  }

  render() {
    const node = this.node;
    if (!node || node.hidden) {
      this.style.display = 'none';
      return;
    }

    this.style.display = '';

    const {
      id: flowId,
      noPanClassName,
      disableKeyboardA11y,
      getNodeTypes,
      emits,
    } = this.store;

    // attributes
    this.dataset.id = node.id;
    this.setAttribute('aria-roledescription', 'node');

    if (this.isFocusable) {
      this.tabIndex = 0;
      this.setAttribute('role', 'group');
      if (!disableKeyboardA11y) {
        this.setAttribute(
          'aria-describedby',
          `${ARIA_NODE_DESC_KEY}-${flowId}`,
        );
      }
    } else {
      this.removeAttribute('tabindex');
      this.removeAttribute('role');
      this.removeAttribute('aria-describedby');
    }

    if (node.ariaLabel) {
      this.setAttribute('aria-label', node.ariaLabel);
    }

    // apply dom attributes
    if (node.domAttributes) {
      for (const [key, value] of Object.entries(node.domAttributes)) {
        this.setAttribute(key, String(value));
      }
    }

    // classes
    const nodeClass = this.getClass();
    const nodeType = node.type || 'default';

    this.className = [
      'flow__node',
      `flow__node-${nodeType}`,
      this.isDraggable ? noPanClassName : '',
      this.dragging ? 'dragging' : '',
      this.isDraggable ? 'draggable' : '',
      node.selected ? 'selected' : '',
      this.isSelectable ? 'selectable' : '',
      node.isParent ? 'parent' : '',
      typeof nodeClass === 'string' ? nodeClass : '',
    ]
      .filter(Boolean)
      .join(' ');

    // styles
    const styles = this.getStyle();
    this.style.visibility = this.isInit ? 'visible' : 'hidden';
    this.style.zIndex = String(node.computedPosition.z ?? this.zIndex);
    this.style.transform = `translate(${node.computedPosition.x}px,${node.computedPosition.y}px)`;
    this.style.pointerEvents = this.hasPointerEvents ? 'all' : 'none';

    for (const [key, value] of Object.entries(styles)) {
      (this.style as any)[key] = value;
    }

    // node component
    const nodeTypes = getNodeTypes();
    let nodeTypeName = nodeType;
    let nodeCmp = nodeTypes.default;

    if (!nodeCmp) {
      emits.error(new FlowItError(ErrorCode.NODE_TYPE_MISSING, nodeType));
      nodeCmp = nodeTypes.default;
    }

    // clear and re-render inner node component
    this.innerHTML = '';

    const inner = document.createElement(
      typeof nodeCmp === 'string' ? nodeCmp : `flow-node-${nodeTypeName}`,
    ) as any;

    inner.setProps?.({
      id: node.id,
      type: node.type,
      data: node.data,
      selected: node.selected,
      resizing: node.resizing,
      dragging: this.dragging,
      connectable: this.isConnectable,
      position: node.computedPosition,
      dimensions: node.dimensions,
      parentNodeId: node.parentId,
      zIndex: node.computedPosition.z ?? this.zIndex,
      targetPosition: node.targetPosition,
      sourcePosition: node.sourcePosition,
      dragHandle: node.dragHandle,
      onUpdateNodeInternals: () => this.updateInternals(),
    });

    this.appendChild(inner);
  }
}

customElements.define(
  'flow-node-wrapper',
  NodeWrapperElement as unknown as CustomElementConstructor,
);

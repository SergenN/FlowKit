import {
  ARIA_EDGE_DESC_KEY,
  ARIA_LIVE_MESSAGE,
  ARIA_NODE_DESC_KEY,
} from '../../utils';
import { useFlowKit } from '../../composables';

export class A11yDescriptionsElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;

  connectedCallback() {
    this.store = useFlowKit();
    this.render();
  }

  render() {
    this.innerHTML = '';

    const { id, disableKeyboardA11y, ariaLiveMessage } = this.store;

    // node description — static, built once
    const nodeDesc = document.createElement('div');
    nodeDesc.id = `${ARIA_NODE_DESC_KEY}-${id}`;
    nodeDesc.style.display = 'none';
    nodeDesc.textContent = `Press enter or space to select a node.${
      !disableKeyboardA11y
        ? ' You can then use the arrow keys to move the node around, press delete to remove it and press escape to cancel.'
        : ''
    }`;
    this.appendChild(nodeDesc);

    // edge description — static, built once
    const edgeDesc = document.createElement('div');
    edgeDesc.id = `${ARIA_EDGE_DESC_KEY}-${id}`;
    edgeDesc.style.display = 'none';
    edgeDesc.textContent =
      'Press enter or space to select an edge. You can then press delete to remove it or press escape to cancel.';
    this.appendChild(edgeDesc);

    // live region — only needed when keyboard a11y is enabled
    if (!disableKeyboardA11y) {
      const liveRegion = document.createElement('div');
      liveRegion.id = `${ARIA_LIVE_MESSAGE}-${id}`;
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      Object.assign(liveRegion.style, {
        position: 'absolute',
        width: '1px',
        height: '1px',
        margin: '-1px',
        border: '0',
        padding: '0',
        overflow: 'hidden',
        clip: 'rect(0px, 0px, 0px, 0px)',
        clipPath: 'inset(100%)',
      });
      liveRegion.textContent = ariaLiveMessage;
      this.appendChild(liveRegion);
    }
  }
}

customElements.define('flow-a11y-descriptions', A11yDescriptionsElement);

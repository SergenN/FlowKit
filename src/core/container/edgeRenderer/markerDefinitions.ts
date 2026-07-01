import type { EdgeMarkerType, MarkerProps, MarkerType } from '../../types';
import { useFlowKit } from '../../composables';
import { getMarkerId } from '../../utils';

export class MarkerDefinitionsElement extends HTMLElement {
  private store!: ReturnType<typeof useFlowKit>;
  // Set by edgeRenderer before appending this element
  defsEl: SVGDefsElement | null = null;

  connectedCallback() {
    this.store = useFlowKit();
    this.style.display = 'none';
    this.render();
  }

  private getMarkers(): MarkerProps[] {
    const {
      id: flowId,
      edges,
      connectionLineOptions,
      defaultMarkerColor,
    } = this.store;

    const ids = new Set<string>();
    const markers: MarkerProps[] = [];

    const createMarker = (marker?: EdgeMarkerType) => {
      if (!marker) return;

      const markerId = getMarkerId(marker, flowId);
      if (ids.has(markerId)) return;

      if (typeof marker === 'object') {
        markers.push({
          ...marker,
          id: markerId,
          color: marker.color || defaultMarkerColor,
        });
      } else {
        markers.push({
          id: markerId,
          color: defaultMarkerColor,
          type: marker as MarkerType,
        });
      }

      ids.add(markerId);
    };

    for (const marker of [
      connectionLineOptions.markerEnd,
      connectionLineOptions.markerStart,
    ]) {
      createMarker(marker);
    }

    for (const edge of edges) {
      for (const marker of [edge.markerStart, edge.markerEnd]) {
        createMarker(marker);
      }
    }

    return markers.sort((a, b) => a.id.localeCompare(b.id));
  }

  render() {
    const defs = this.defsEl;
    if (!defs) return;

    // Clear existing markers from defs
    defs.innerHTML = '';

    for (const marker of this.getMarkers()) {
      const markerSymbol = document.createElement('flow-marker-symbol') as any;
      markerSymbol.defsEl = defs;
      markerSymbol.setAttribute('id', marker.id);
      markerSymbol.setAttribute('type', marker.type ?? '');
      markerSymbol.setAttribute('color', marker.color ?? '');
      if (marker.width)
        markerSymbol.setAttribute('width', String(marker.width));
      if (marker.height)
        markerSymbol.setAttribute('height', String(marker.height));
      if (marker.markerUnits)
        markerSymbol.setAttribute('marker-units', marker.markerUnits);
      if (marker.strokeWidth)
        markerSymbol.setAttribute('stroke-width', String(marker.strokeWidth));
      if (marker.orient) markerSymbol.setAttribute('orient', marker.orient);

      // Append to the HTML body temporarily so connectedCallback fires,
      // then the symbol injects its <marker> into defs and removes itself
      document.body.appendChild(markerSymbol);
      markerSymbol.remove();
    }
  }
}

customElements.define('flow-marker-definitions', MarkerDefinitionsElement);

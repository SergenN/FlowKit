/**
 * Returns the current node id.
 * In a web component context, pass the id directly as a parameter or attribute
 * rather than relying on context injection.
 */
export function useNodeId(id: string): string {
  return id;
}

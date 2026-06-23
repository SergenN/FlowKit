import type { Position } from '../core/types';

export type Align = 'center' | 'start' | 'end';

export interface NodeToolbarProps {
  nodeId?: string | string[];
  isVisible?: boolean;
  position?: Position;
  offset?: number;
  align?: Align;
}

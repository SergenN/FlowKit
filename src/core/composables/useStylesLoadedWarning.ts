import { ErrorCode, FlowItError } from '../utils';
import { FlowHooksEmit } from '../types';

export function checkStylesLoaded(emits: FlowHooksEmit) {
  const pane = document.querySelector('.flow__pane');

  if (pane && !(window.getComputedStyle(pane).zIndex === '1')) {
    emits.error(new FlowItError(ErrorCode.MISSING_STYLES));
  }
}
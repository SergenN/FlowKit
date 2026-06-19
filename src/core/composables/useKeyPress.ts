export interface UseKeyPressOptions {
  target?: EventTarget | null;
  actInsideInputWithModifier?: boolean;
  preventDefault?: boolean;
}

type KeyOrCode = 'key' | 'code';
type PressedKeys = Set<string>;

const inputTags = ['INPUT', 'SELECT', 'TEXTAREA'];

export function isInputDOMNode(event: KeyboardEvent): boolean {
  const target = (event.composedPath?.()[0] || event.target) as HTMLElement;

  const hasAttribute =
    typeof target?.hasAttribute === 'function'
      ? target.hasAttribute('contenteditable')
      : false;
  const closest =
    typeof target?.closest === 'function' ? target.closest('.nokey') : null;

  return inputTags.includes(target?.nodeName) || hasAttribute || !!closest;
}

function wasModifierPressed(event: KeyboardEvent) {
  return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
}

function isKeyMatch(
  pressedKey: string,
  keyToMatch: string,
  pressedKeys: Set<string>,
  isKeyUp: boolean,
) {
  const keyCombination = keyToMatch
    .replace('+', '\n')
    .replace('\n\n', '\n+')
    .split('\n')
    .map((k) => k.trim().toLowerCase());

  if (keyCombination.length === 1) {
    return pressedKey.toLowerCase() === keyToMatch.toLowerCase();
  }

  if (!isKeyUp) {
    pressedKeys.add(pressedKey.toLowerCase());
  }

  const isMatch = keyCombination.every(
    (key, index) =>
      pressedKeys.has(key) &&
      Array.from(pressedKeys.values())[index] === keyCombination[index],
  );

  if (isKeyUp) {
    pressedKeys.delete(pressedKey.toLowerCase());
  }

  return isMatch;
}

function useKeyOrCode(code: string, keysToWatch: string | string[]): KeyOrCode {
  return keysToWatch.includes(code) ? 'code' : 'key';
}

function createKeyPredicate(
  keyFilter: string | string[],
  pressedKeys: PressedKeys,
) {
  return (event: KeyboardEvent) => {
    if (!event.code && !event.key) return false;

    const keyOrCode = useKeyOrCode(event.code, keyFilter);

    if (Array.isArray(keyFilter)) {
      return keyFilter.some((key) =>
        isKeyMatch(event[keyOrCode], key, pressedKeys, event.type === 'keyup'),
      );
    }

    return isKeyMatch(
      event[keyOrCode],
      keyFilter,
      pressedKeys,
      event.type === 'keyup',
    );
  };
}

export type KeyFilter =
  | string
  | string[]
  | ((event: KeyboardEvent) => boolean)
  | null
  | false;

export interface KeyPressState {
  isPressed: boolean;
  cleanup: () => void;
}

export function setupKeyPress(
  keyFilter: KeyFilter | boolean | null,
  options?: UseKeyPressOptions,
  onChange?: (isPressed: boolean) => void,
): KeyPressState {
  const target =
    options?.target ?? (typeof document !== 'undefined' ? document : null);

  let isPressed = keyFilter === true;
  let modifierPressed = false;
  const pressedKeys = new Set<string>();

  let currentFilter = createKeyFilterFn(keyFilter);

  function setIsPressed(value: boolean) {
    isPressed = value;
    onChange?.(value);
  }

  function reset() {
    modifierPressed = false;
    pressedKeys.clear();
    setIsPressed(keyFilter === true);
  }

  function createKeyFilterFn(
    kf: KeyFilter | boolean | null,
  ): (event: KeyboardEvent) => boolean {
    if (kf === null || kf === false) {
      reset();
      return () => false;
    }

    if (typeof kf === 'boolean') {
      reset();
      setIsPressed(kf);
      return () => false;
    }

    if (Array.isArray(kf) || typeof kf === 'string') {
      return createKeyPredicate(kf, pressedKeys);
    }

    return kf;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!currentFilter(e)) return;

    const actInsideInputWithModifier =
      options?.actInsideInputWithModifier ?? true;
    const preventDefault = options?.preventDefault ?? false;

    modifierPressed = wasModifierPressed(e);

    const preventAction =
      (!modifierPressed || (modifierPressed && !actInsideInputWithModifier)) &&
      isInputDOMNode(e);
    if (preventAction) return;

    const eventTarget = (e.composedPath?.()[0] || e.target) as Element | null;
    const isInteractiveElement =
      eventTarget?.nodeName === 'BUTTON' || eventTarget?.nodeName === 'A';

    if (!preventDefault && (modifierPressed || !isInteractiveElement)) {
      e.preventDefault();
    }

    setIsPressed(true);
  }

  function onKeyUp(e: KeyboardEvent) {
    if (!currentFilter(e)) return;
    if (!isPressed) return;

    const actInsideInputWithModifier =
      options?.actInsideInputWithModifier ?? true;
    const preventAction =
      (!modifierPressed || (modifierPressed && !actInsideInputWithModifier)) &&
      isInputDOMNode(e);
    if (preventAction) return;

    modifierPressed = false;
    setIsPressed(false);
  }

  function onBlurOrContextMenu() {
    reset();
  }

  if (target) {
    target.addEventListener('keydown', onKeyDown as EventListener);
    target.addEventListener('keyup', onKeyUp as EventListener);
    target.addEventListener('blur', onBlurOrContextMenu);
    target.addEventListener('contextmenu', onBlurOrContextMenu);
  }

  function cleanup() {
    if (target) {
      target.removeEventListener('keydown', onKeyDown as EventListener);
      target.removeEventListener('keyup', onKeyUp as EventListener);
      target.removeEventListener('blur', onBlurOrContextMenu);
      target.removeEventListener('contextmenu', onBlurOrContextMenu);
    }
  }

  return { isPressed, cleanup };
}

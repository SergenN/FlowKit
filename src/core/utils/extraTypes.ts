/**
 * A key filter — replaces `KeyFilter` from @vueuse/core.
 * Accepts a key string (e.g. 'Escape'), key code, array of those,
 * a predicate function, or null/false to disable.
 */
export type KeyFilter =
  | string
  | string[]
  | ((event: KeyboardEvent) => boolean)
  | null
  | false;

export interface EventHook<T> {
  on: (fn: (param: T) => void) => { off: () => void };
  off: (fn: (param: T) => void) => void;
  trigger: (param: T) => Promise<PromiseSettledResult<any>[]>;
}

export type EventHookOn<T> = (fn: (param: T) => void) => { off: () => void };
export type EventHookTrigger<T> = (param: T) => Promise<PromiseSettledResult<any>[]>;
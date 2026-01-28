export const INTERNAL_SUBSCRIBE: unique symbol = Symbol('subscribe');
export const INTERNAL_REGISTER_EDITOR: unique symbol = Symbol('registerEditor');
export const INTERNAL_UNREGISTER_EDITOR: unique symbol = Symbol('unregisterEditor');
export const INTERNAL_BOUND: unique symbol = Symbol('bound');
export const INTERNAL_SET_ID: unique symbol = Symbol('setId');
export const INTERNAL_EMIT: unique symbol = Symbol('emit');
export const NOOP_SUBSCRIBE = () => () => {};

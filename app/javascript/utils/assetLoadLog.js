const TAG = "[geor.me/assets]";

/** Dev-only logging for lazy JS / vendor script loading. */
export function assetLog(...args) {
  if (import.meta.env.DEV) {
    console.debug(TAG, ...args);
  }
}

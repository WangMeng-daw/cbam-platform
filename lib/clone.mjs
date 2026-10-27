// Accounting inputs and configuration are JSON data. This also supports Safari 14,
// Firefox 88 and Chromium 90, which predate native structuredClone.
export const clone = value => JSON.parse(JSON.stringify(value));

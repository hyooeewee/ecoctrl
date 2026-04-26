// Client-side route prefixes are fixed conventions; lws / vite proxy
// rewrites them to the real backend ${API_BASE_URL}${API_PREFIX|STATIC_PREFIX}
// at request time, so client code stays portable across environments.

export const API_PREFIX = "/api";
export const STATIC_PREFIX = "/static";

// Client-side route prefixes are fixed conventions; Caddy / Vite dev proxy
// rewrites them to the real backend at request time, so client code stays
// portable across environments.
//
// STATIC_PREFIX is not currently imported by any frontend component; it is
// consumed at the infra layer (Caddyfile rewrite, Docker Compose env var).

export const API_PREFIX = "/api";
export const STATIC_PREFIX = "/static";

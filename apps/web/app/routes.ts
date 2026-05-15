import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("floors", "routes/floors.tsx"),
  route("systems", "routes/systems.tsx"),
  route("analysis", "routes/analysis.tsx"),
  route("settings", "routes/settings.tsx"),
  // Silences Chrome DevTools self-detection probe in development
  route(".well-known/*", "routes/well-known.tsx"),
] satisfies RouteConfig;

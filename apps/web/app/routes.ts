import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/dashboard-layout.tsx", [
    index("routes/home.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
  // Silences Chrome DevTools self-detection probe in development
  route(".well-known/*", "routes/well-known.tsx"),
] satisfies RouteConfig;

// Silences Chrome DevTools self-detection probe in development.
// SPA build requires a component export; the actual 204 response
// is handled by the dev server proxy in development.
export default function WellKnown() {
  return null;
}

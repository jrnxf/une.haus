// Minimal ambient types for the workerd-only "cloudflare:workers" module.
// The app deliberately avoids the full @cloudflare/workers-types ambient
// globals; the one import site (src/db) treats the binding as opaque.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>
}

// /oauth/authorize is a server route with no page in the React router, so a
// client-side navigate there renders nothing. The browser must load it.
// Only same-site /oauth/ paths qualify, so this is no open redirect.
export function isServerRedirect(path: string | undefined): path is string {
  return Boolean(path?.startsWith("/oauth/"))
}

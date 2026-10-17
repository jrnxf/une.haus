// The service worker's behaviour, kept apart from its entry
// (src/service-worker.ts) so it can be tested without a browser.
//
// It does one thing: when a page load fails because there is no connection,
// it answers with the offline page. It caches nothing, so it can never serve
// a stale page, server function result or API response; every request goes to
// the network exactly as it would without the worker.

// Structural types for the parts of the worker scope used here. The DOM lib
// the app compiles against has no worker globals, and the webworker lib
// cannot sit beside it.
type ExtendableEvent = {
  waitUntil: (promise: Promise<unknown>) => void
}

export type FetchEvent = {
  request: Request
  /** The navigation preload response, when preload is on and this is a navigation. */
  preloadResponse?: Promise<Response | undefined>
  respondWith: (response: Promise<Response>) => void
}

type WorkerScope = {
  addEventListener(
    type: "install" | "activate",
    listener: (event: ExtendableEvent) => void,
  ): void
  addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void
  skipWaiting: () => Promise<void>
  clients: { claim: () => Promise<void> }
  registration: {
    navigationPreload?: { enable: () => Promise<void> }
  }
}

function offlineResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}

/**
 * Loads a page from the network, or answers with the offline page when the
 * network cannot be reached. An error the server returns (404, 500) is still
 * a response and is passed through untouched.
 */
async function loadPage(event: FetchEvent, html: string): Promise<Response> {
  try {
    const preloaded = await event.preloadResponse
    return preloaded ?? (await fetch(event.request))
  } catch {
    return offlineResponse(html)
  }
}

/**
 * Whether the worker answers this request. Only page loads: assets, server
 * functions and API calls are left to the browser.
 */
function isPageLoad(request: Request): boolean {
  return request.mode === "navigate" && request.method === "GET"
}

export function startOfflineWorker(scope: WorkerScope, html: string): void {
  // The page lives inside the worker script, so a deploy that changes the
  // page or this code changes the script's bytes, and the browser installs
  // the new worker. It takes over at once: there is no cache to migrate.
  scope.addEventListener("install", (event) => {
    event.waitUntil(scope.skipWaiting())
  })

  scope.addEventListener("activate", (event) => {
    event.waitUntil(
      Promise.all([
        // Start the page request while the worker boots instead of after,
        // so page loads are not slowed down by the worker.
        scope.registration.navigationPreload?.enable(),
        scope.clients.claim(),
      ]),
    )
  })

  scope.addEventListener("fetch", (event) => {
    if (!isPageLoad(event.request)) return
    event.respondWith(loadPage(event, html))
  })
}

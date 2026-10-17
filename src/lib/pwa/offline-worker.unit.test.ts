import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"

import { type FetchEvent, startOfflineWorker } from "./offline-worker"

const PAGE = "<!doctype html><h1>you’re offline</h1>"

type Listener = (event: never) => void

// Starts the worker on a stand-in scope and returns its listeners.
function start() {
  const listeners = new Map<string, Listener>()
  const scope = {
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, listener)
    },
    skipWaiting: mock(() => Promise.resolve()),
    clients: { claim: mock(() => Promise.resolve()) },
    registration: {
      navigationPreload: { enable: mock(() => Promise.resolve()) },
    },
  }
  startOfflineWorker(scope, PAGE)
  const listener = (type: string) => {
    const found = listeners.get(type)
    if (!found) throw new Error(`no ${type} listener`)
    return found as (event: unknown) => void
  }
  return { scope, listener }
}

// A browser refuses to build a navigation Request, so stand one in.
function request(mode: RequestMode, method = "GET") {
  return { url: "https://une.haus/tricks", mode, method } as Request
}

// Dispatches a fetch event and returns the response the worker answered
// with, or undefined when it left the request to the browser.
async function dispatch(
  req: Request,
  preloadResponse?: Promise<Response | undefined>,
) {
  const { listener } = start()
  let answer: Promise<Response> | undefined
  const event: FetchEvent = {
    request: req,
    preloadResponse,
    respondWith: (response) => {
      answer = response
    },
  }
  listener("fetch")(event)
  return answer && (await answer)
}

afterEach(() => {
  mock.restore()
})

describe("offline worker", () => {
  test("answers a page load with no connection with the offline page", async () => {
    spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    )
    const response = await dispatch(request("navigate"))
    expect(response?.status).toBe(200)
    expect(response?.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    )
    expect(response?.headers.get("cache-control")).toBe("no-store")
    expect(await response?.text()).toBe(PAGE)
  })

  test("answers with the offline page when the preload fails", async () => {
    const fetchSpy = spyOn(globalThis, "fetch")
    const response = await dispatch(
      request("navigate"),
      Promise.reject(new TypeError("Failed to fetch")),
    )
    expect(await response?.text()).toBe(PAGE)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test("passes a page from the network through untouched", async () => {
    const page = new Response("<h1>tricks</h1>")
    spyOn(globalThis, "fetch").mockResolvedValue(page)
    expect(await dispatch(request("navigate"))).toBe(page)
  })

  test("passes a server error through instead of claiming to be offline", async () => {
    const error = new Response("boom", { status: 500 })
    spyOn(globalThis, "fetch").mockResolvedValue(error)
    expect(await dispatch(request("navigate"))).toBe(error)
  })

  test("uses the preloaded page without fetching it again", async () => {
    const fetchSpy = spyOn(globalThis, "fetch")
    const page = new Response("<h1>tricks</h1>")
    expect(await dispatch(request("navigate"), Promise.resolve(page))).toBe(
      page,
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test("fetches the page when there is no preload", async () => {
    const page = new Response("<h1>tricks</h1>")
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(page)
    expect(
      await dispatch(request("navigate"), Promise.resolve(undefined)),
    ).toBe(page)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  test("leaves everything but page loads to the browser", async () => {
    const fetchSpy = spyOn(globalThis, "fetch")
    // assets, server functions, API calls
    expect(await dispatch(request("cors"))).toBeUndefined()
    expect(await dispatch(request("same-origin", "POST"))).toBeUndefined()
    expect(await dispatch(request("no-cors"))).toBeUndefined()
    // a form post is a page load the worker cannot answer offline
    expect(await dispatch(request("navigate", "POST"))).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test("takes over at once and turns on navigation preload", async () => {
    const { scope, listener } = start()
    const waits: Promise<unknown>[] = []
    const event = { waitUntil: (p: Promise<unknown>) => waits.push(p) }
    listener("install")(event)
    listener("activate")(event)
    await Promise.all(waits)
    expect(scope.skipWaiting).toHaveBeenCalledTimes(1)
    expect(scope.clients.claim).toHaveBeenCalledTimes(1)
    expect(scope.registration.navigationPreload.enable).toHaveBeenCalledTimes(1)
  })
})

describe("offline page", () => {
  test("stands alone, with only the font filled in at build", async () => {
    const html = await Bun.file(new URL("offline.html", import.meta.url)).text()
    expect(html.split("GEIST_MONO_URL")).toHaveLength(2)
    // nothing it could load is reachable with no connection
    expect(html).not.toMatch(/\b(?:src|href)=["'](?!#)/)
    expect(html).not.toMatch(/url\((?!GEIST_MONO_URL\)|#)/)
  })
})

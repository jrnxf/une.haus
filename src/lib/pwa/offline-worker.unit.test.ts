import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { JSDOM } from "jsdom"

import { type FetchEvent, startOfflineWorker } from "./offline-worker"

const PAGE = "<!doctype html><h1>you’re offline</h1>"

type Listener = (event: never) => void

// Starts the worker on a stand-in scope and returns its listeners.
function start(html = PAGE) {
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
  startOfflineWorker(scope, html)
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
  html?: string,
) {
  const { listener } = start(html)
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

// Every URL the rules of a stylesheet load, including nested and imported.
function cssUrls(rules: CSSRuleList): string[] {
  return [...rules].flatMap((rule) => {
    if ("styleSheet" in rule) return [(rule as CSSImportRule).href]
    if ("cssRules" in rule) return cssUrls((rule as CSSGroupingRule).cssRules)
    if (!("style" in rule)) return []
    const { cssText } = (rule as CSSStyleRule).style
    return [...cssText.matchAll(/url\(\s*["']?([^"')]+)/g)].map(
      ([, url]) => url,
    )
  })
}

describe("offline page", () => {
  test("is what the worker serves with no connection, and loads nothing", async () => {
    const source = await Bun.file(
      new URL("offline.html", import.meta.url),
    ).text()
    // filled in the way src/service-worker.ts builds the worker
    const font = "data:font/woff2;base64,AAAA"
    spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    )
    const response = await dispatch(
      request("navigate"),
      undefined,
      source.replace("GEIST_MONO_URL", font),
    )
    const html = (await response?.text()) ?? ""
    const { document } = new JSDOM(html).window

    expect(document.querySelector("h1")?.textContent).toBe("you’re offline")
    const button = document.querySelector("button")
    expect(button?.textContent).toBe("try again")
    expect(button?.type).toBe("button")

    // no element points anywhere but inside the page
    const links = [...document.querySelectorAll("*")].flatMap((element) =>
      [...element.attributes]
        .filter((attribute) =>
          ["src", "srcset", "href", "xlink:href", "poster", "data"].includes(
            attribute.name,
          ),
        )
        .map((attribute) => attribute.value),
    )
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(link).toStartWith("#")

    // the only stylesheet url is the inlined font
    const urls = [...document.styleSheets].flatMap((sheet) =>
      cssUrls(sheet.cssRules),
    )
    expect(urls).toContain(font)
    for (const url of urls) {
      if (url !== font) expect(url).toStartWith("#")
    }
  })
})

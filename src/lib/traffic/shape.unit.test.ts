import {
  countSlow,
  errorRate,
  fillDaily,
  formatCount,
  formatMs,
  groupSpeed,
  lastDays,
  rateVital,
  routeOfPath,
  shapeReferrers,
} from "./shape"

describe("rateVital", () => {
  it("rates at the Core Web Vitals thresholds", () => {
    expect(rateVital("lcpMs", 2500)).toBe("good")
    expect(rateVital("lcpMs", 2501)).toBe("ok")
    expect(rateVital("lcpMs", 4001)).toBe("poor")
    expect(rateVital("inpMs", 200)).toBe("good")
    expect(rateVital("inpMs", 456)).toBe("ok")
    expect(rateVital("cls", 0.3)).toBe("poor")
  })
})

describe("routeOfPath", () => {
  it("turns a segment of digits into an id", () => {
    expect(routeOfPath("/posts/123")).toBe("/posts/$id")
    expect(routeOfPath("/games/rius/sets/7/submissions/42")).toBe(
      "/games/rius/sets/$id/submissions/$id",
    )
  })

  it("keeps a path with no id", () => {
    expect(routeOfPath("/")).toBe("/")
    expect(routeOfPath("/games/rius/active")).toBe("/games/rius/active")
    expect(routeOfPath("/posts/")).toBe("/posts")
  })
})

describe("groupSpeed", () => {
  it("joins the paths of one kind, weighted by samples", () => {
    const rows = groupSpeed([
      {
        path: "/posts/1",
        samples: 30,
        lcpMicros: 1_000_000,
        inpMicros: 100_000,
        cls: 0,
      },
      {
        path: "/posts/2",
        samples: 10,
        lcpMicros: 3_000_000,
        inpMicros: 300_000,
        cls: 0.4,
      },
    ])
    expect(rows).toEqual([
      { route: "/posts/$id", samples: 40, lcpMs: 1500, inpMs: 150, cls: 0.1 },
    ])
  })

  it("puts the slowest page first and drops empty rows", () => {
    const rows = groupSpeed([
      {
        path: "/",
        samples: 340,
        lcpMicros: 848_000,
        inpMicros: 192_000,
        cls: 0,
      },
      {
        path: "/vault/9",
        samples: 20,
        lcpMicros: 4_300_000,
        inpMicros: 110_000,
        cls: 0,
      },
      { path: "/ask", samples: 0, lcpMicros: 9_000_000, inpMicros: 0, cls: 0 },
    ])
    expect(rows.map((row) => row.route)).toEqual(["/vault/$id", "/"])
  })
})

describe("groupSpeed with gaps", () => {
  it("leaves a vital that cloudflare could not measure as null", () => {
    const rows = groupSpeed([
      { path: "/posts", samples: 100, lcpMicros: 0, inpMicros: 0, cls: -1 },
      {
        path: "/posts/",
        samples: 100,
        lcpMicros: 0,
        inpMicros: 80_000,
        cls: -1,
      },
    ])
    expect(rows).toEqual([
      { route: "/posts", samples: 200, lcpMs: null, inpMs: 40, cls: null },
    ])
  })
})

describe("countSlow", () => {
  it("does not count a page with no measure", () => {
    expect(
      countSlow([
        { route: "/posts", samples: 1, lcpMs: null, inpMs: null, cls: null },
      ]),
    ).toBe(0)
  })

  it("counts a page with any vital that is not good", () => {
    expect(
      countSlow([
        { route: "/", samples: 1, lcpMs: 800, inpMs: 100, cls: 0 },
        { route: "/posts", samples: 1, lcpMs: 300, inpMs: 456, cls: 0 },
        { route: "/vault/$id", samples: 1, lcpMs: 4300, inpMs: 100, cls: 0 },
      ]),
    ).toBe(2)
  })
})

describe("shapeReferrers", () => {
  it("names an empty host direct and drops the site's own host", () => {
    expect(
      shapeReferrers(
        [
          { host: "", visits: 2890 },
          { host: "une.haus", visits: 0 },
          { host: "example.com", visits: 3210 },
          { host: "www.google.com", visits: 10 },
        ],
        "example.com",
      ),
    ).toEqual([
      { label: "direct", value: 2890 },
      { label: "google.com", value: 10 },
    ])
  })

  it("names an android app and joins rows with one label", () => {
    expect(
      shapeReferrers(
        [
          { host: "com.google.android.googlequicksearchbox", visits: 40 },
          { host: "google.com", visits: 5 },
          { host: "www.google.com", visits: 10 },
        ],
        "example.com",
      ),
    ).toEqual([
      { label: "google app", value: 40 },
      { label: "google.com", value: 15 },
    ])
  })
})

describe("days", () => {
  it("lists the last days in UTC, oldest first", () => {
    expect(lastDays(3, new Date("2026-03-02T10:00:00Z"))).toEqual([
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ])
  })

  it("fills a day with no data with zero", () => {
    expect(
      fillDaily(
        [{ day: "2026-03-02", visits: 7, pageViews: 9 }],
        ["2026-03-01", "2026-03-02"],
      ),
    ).toEqual([
      { day: "2026-03-01", visits: 0, pageViews: 0 },
      { day: "2026-03-02", visits: 7, pageViews: 9 },
    ])
  })
})

describe("errorRate", () => {
  it("does not count a client that left as a failure", () => {
    expect(
      errorRate([
        { status: "success", requests: 990 },
        { status: "clientDisconnected", requests: 5 },
        { status: "scriptThrewException", requests: 5 },
      ]),
    ).toBe(0.5)
  })

  it("is zero with no requests", () => {
    expect(errorRate([])).toBe(0)
  })
})

describe("format", () => {
  it("shortens a large count", () => {
    expect(formatCount(1234)).toBe("1,234")
    expect(formatCount(61_234)).toBe("61.2k")
    expect(formatCount(2_100_000)).toBe("2.1M")
    expect(formatCount(3_646_346_441)).toBe("3.6B")
  })

  it("shows a second from 1000 ms", () => {
    expect(formatMs(96)).toBe("96 ms")
    expect(formatMs(848)).toBe("848 ms")
    expect(formatMs(4300)).toBe("4.3 s")
  })
})

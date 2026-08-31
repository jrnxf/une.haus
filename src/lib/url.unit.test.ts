import { stringifySearch } from "./url"

// The invariant that prevents SSR redirect loops: TanStack Start normalizes
// incoming URLs through URLSearchParams before the router compares them to
// the stringified canonical URL. stringifySearch output must therefore be a
// fixed point of that normalization — re-encoding it must change nothing.
function isStableUnderUrlNormalization(searchStr: string): boolean {
  if (searchStr === "") return true
  const renormalized = new URLSearchParams(searchStr.slice(1)).toString()
  return `?${renormalized}` === searchStr
}

describe("stringifySearch", () => {
  it("is stable under URLSearchParams normalization (SSR redirect-loop guard)", () => {
    const cases: Array<Record<string, unknown>> = [
      { redirect: "/vault" },
      { redirect: "/posts/create" },
      { riders: "1,20,~CustomName,30" },
      { tags: ["flatland", "street"] },
      { q: "a/b,c~d e" },
      { w: "12-1", prelimTime: 60 },
      {},
    ]
    for (const search of cases) {
      const result = stringifySearch(search)
      expect(isStableUnderUrlNormalization(result)).toBe(true)
    }
  })

  it("uses canonical URLSearchParams encoding for commas", () => {
    const result = stringifySearch({ riders: "1,2,3" })
    expect(result).toBe("?riders=1%2C2%2C3")
  })

  it("uses canonical URLSearchParams encoding for slashes", () => {
    const result = stringifySearch({ redirect: "/posts/create" })
    expect(result).toBe("?redirect=%2Fposts%2Fcreate")
  })

  it("handles multiple params", () => {
    const result = stringifySearch({
      riders: "1,2,3",
      tags: "a,b,c",
    })
    expect(result).toContain("riders=1%2C2%2C3")
    expect(result).toContain("tags=a%2Cb%2Cc")
  })

  it("keeps spaces encoded", () => {
    const result = stringifySearch({ name: "John Doe" })
    expect(result).not.toBe("?name=John Doe")
    expect(isStableUnderUrlNormalization(result)).toBe(true)
  })

  it("handles empty search object", () => {
    const result = stringifySearch({})
    expect(result).toBe("")
  })

  it("handles numeric values", () => {
    const result = stringifySearch({
      riders: "1,2,3",
      prelimTime: 60,
      battleTime: 90,
    })
    expect(result).toContain("prelimTime=60")
    expect(result).toContain("battleTime=90")
  })

  it("handles winners param format", () => {
    const result = stringifySearch({ w: "12-1" })
    expect(result).toBe("?w=12-1")
  })

  it("flattens string arrays into comma-separated values", () => {
    const result = stringifySearch({ tags: ["flatland", "street"] })
    expect(result).toBe("?tags=flatland%2Cstreet")
    expect(result).not.toContain("%5B")
    expect(result).not.toContain("%5D")
  })

  it("flattens number arrays into comma-separated values", () => {
    const result = stringifySearch({ ids: [1, 2, 3] })
    expect(result).toBe("?ids=1%2C2%2C3")
  })

  it("leaves non-array values unchanged", () => {
    const result = stringifySearch({ q: "hello", page: 1 })
    expect(result).toContain("q=hello")
    expect(result).toContain("page=1")
  })
})

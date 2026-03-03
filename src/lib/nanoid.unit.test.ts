import { nano } from "./nanoid"

describe("nano", () => {
  it("generates a 12-character lowercase alphanumeric string", () => {
    const id = nano()
    expect(id).toHaveLength(12)
    expect(id).toMatch(/^[0-9a-z]+$/)
  })

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => nano()))
    expect(ids.size).toBe(1000)
  })
})

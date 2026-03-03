import { describe, expect, it } from "bun:test"

import { countSelected, toggleFilterValue } from "./filters"

import type { ActiveFilter, FilterOption } from "./filters"

// --- countSelected ---

describe("countSelected", () => {
  const flat: FilterOption[] = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "c", label: "C" },
  ]

  it("counts matching leaf values", () => {
    expect(countSelected(flat, ["a", "c"])).toBe(2)
  })

  it("returns 0 when no values match", () => {
    expect(countSelected(flat, ["x"])).toBe(0)
  })

  it("returns 0 for empty values", () => {
    expect(countSelected(flat, [])).toBe(0)
  })

  it("returns 0 for empty options", () => {
    expect(countSelected([], ["a"])).toBe(0)
  })

  it("counts through one level of nesting", () => {
    const nested: FilterOption[] = [
      {
        value: "group",
        label: "Group",
        children: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
      { value: "c", label: "C" },
    ]
    expect(countSelected(nested, ["a", "c"])).toBe(2)
  })

  it("counts through deep nesting", () => {
    const deep: FilterOption[] = [
      {
        value: "l1",
        label: "L1",
        children: [
          {
            value: "l2",
            label: "L2",
            children: [{ value: "leaf", label: "Leaf" }],
          },
        ],
      },
    ]
    expect(countSelected(deep, ["leaf"])).toBe(1)
    expect(countSelected(deep, ["l1"])).toBe(0)
    expect(countSelected(deep, ["l2"])).toBe(0)
  })

  it("ignores branch values (only counts leaves)", () => {
    const nested: FilterOption[] = [
      {
        value: "group",
        label: "Group",
        children: [{ value: "a", label: "A" }],
      },
    ]
    expect(countSelected(nested, ["group"])).toBe(0)
    expect(countSelected(nested, ["a"])).toBe(1)
  })

  it("counts across multiple branches", () => {
    const multi: FilterOption[] = [
      {
        value: "g1",
        label: "G1",
        children: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
      {
        value: "g2",
        label: "G2",
        children: [
          { value: "c", label: "C" },
          { value: "d", label: "D" },
        ],
      },
    ]
    expect(countSelected(multi, ["a", "c", "d"])).toBe(3)
    expect(countSelected(multi, ["b"])).toBe(1)
  })
})

// --- toggleFilterValue ---

describe("toggleFilterValue", () => {
  it("adds a new filter when field does not exist", () => {
    const result = toggleFilterValue([], "status", "done")
    expect(result).toEqual([
      { id: "", field: "status", operator: "", values: ["done"] },
    ])
  })

  it("adds a value to an existing filter", () => {
    const filters: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: ["done"] },
    ]
    const result = toggleFilterValue(filters, "status", "todo")
    expect(result).toEqual([
      { id: "1", field: "status", operator: "is", values: ["done", "todo"] },
    ])
  })

  it("removes a value when toggling an existing value", () => {
    const filters: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: ["done", "todo"] },
    ]
    const result = toggleFilterValue(filters, "status", "done")
    expect(result).toEqual([
      { id: "1", field: "status", operator: "is", values: ["todo"] },
    ])
  })

  it("removes the filter entirely when last value is toggled off", () => {
    const filters: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: ["done"] },
    ]
    const result = toggleFilterValue(filters, "status", "done")
    expect(result).toEqual([])
  })

  it("does not affect other filters", () => {
    const filters: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: ["done"] },
      { id: "2", field: "priority", operator: "is", values: ["high"] },
    ]
    const result = toggleFilterValue(filters, "status", "todo")
    expect(result).toEqual([
      { id: "1", field: "status", operator: "is", values: ["done", "todo"] },
      { id: "2", field: "priority", operator: "is", values: ["high"] },
    ])
  })

  it("preserves other filters when removing a filter entirely", () => {
    const filters: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: ["done"] },
      { id: "2", field: "priority", operator: "is", values: ["high"] },
    ]
    const result = toggleFilterValue(filters, "status", "done")
    expect(result).toEqual([
      { id: "2", field: "priority", operator: "is", values: ["high"] },
    ])
  })

  it("handles toggling on a brand new field with existing filters", () => {
    const filters: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: ["done"] },
    ]
    const result = toggleFilterValue(filters, "priority", "high")
    expect(result).toEqual([
      { id: "1", field: "status", operator: "is", values: ["done"] },
      { id: "", field: "priority", operator: "", values: ["high"] },
    ])
  })
})

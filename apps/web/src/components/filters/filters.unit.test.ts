import { describe, expect, it } from "bun:test"

import {
  addFilterByField,
  countSelected,
  getFieldsSortedByActive,
  toggleFilterByField,
  toggleFilterValue,
} from "./filters"

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

describe("getFieldsSortedByActive", () => {
  const fields = [
    { key: "name", label: "name" },
    { key: "status", label: "status" },
    { key: "tags", label: "tags" },
  ]

  it("moves active fields to the bottom", () => {
    const filters: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: [] },
    ]

    expect(getFieldsSortedByActive(fields, filters).map((f) => f.key)).toEqual([
      "name",
      "tags",
      "status",
    ])
  })

  it("preserves field order when all are active", () => {
    const filters: ActiveFilter[] = [
      { id: "1", field: "name", operator: "contains", values: [] },
      { id: "2", field: "status", operator: "is", values: [] },
      { id: "3", field: "tags", operator: "includes", values: [] },
    ]

    expect(getFieldsSortedByActive(fields, filters).map((f) => f.key)).toEqual([
      "name",
      "status",
      "tags",
    ])
  })
})

describe("addFilterByField", () => {
  const fields = [
    {
      key: "name",
      label: "name",
      type: "text" as const,
      defaultOperator: "contains",
    },
    {
      key: "status",
      label: "status",
      type: "select" as const,
      defaultOperator: "is",
    },
  ]

  it("creates a new empty chip using the field default operator", () => {
    const result = addFilterByField([], fields, "name")

    expect(result).toHaveLength(1)
    expect(result[0]?.field).toBe("name")
    expect(result[0]?.operator).toBe("contains")
    expect(result[0]?.values).toEqual([])
    expect(typeof result[0]?.id).toBe("string")
  })

  it("does not add duplicate chips for the same field", () => {
    const existing: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: [] },
    ]

    const result = addFilterByField(existing, fields, "status")

    expect(result).toBe(existing)
    expect(result).toHaveLength(1)
  })
})

describe("toggleFilterByField", () => {
  const fields = [
    {
      key: "name",
      label: "name",
      type: "text" as const,
      defaultOperator: "contains",
    },
    {
      key: "status",
      label: "status",
      type: "select" as const,
      defaultOperator: "is",
    },
  ]

  it("adds a filter when field is not active", () => {
    const result = toggleFilterByField([], fields, "name")

    expect(result).toHaveLength(1)
    expect(result[0]?.field).toBe("name")
    expect(result[0]?.values).toEqual([])
  })

  it("removes a filter when field is active", () => {
    const existing: ActiveFilter[] = [
      { id: "1", field: "status", operator: "is", values: ["done"] },
      { id: "2", field: "name", operator: "contains", values: ["john"] },
    ]

    const result = toggleFilterByField(existing, fields, "status")

    expect(result).toEqual([
      { id: "2", field: "name", operator: "contains", values: ["john"] },
    ])
  })
})

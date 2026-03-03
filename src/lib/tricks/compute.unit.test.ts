import {
  buildIndexes,
  buildTricksData,
  computeAllNeighbors,
  computeDepthsAndDependents,
  describeModifierDiff,
  modifierDirection,
} from "./compute"
import { type Trick, type TrickModifiers } from "./types"

// ── helpers ──────────────────────────────────────────────────────────

function baseMods(overrides: Partial<TrickModifiers> = {}): TrickModifiers {
  return {
    flips: 0,
    spin: 0,
    wrap: "none",
    twist: 0,
    fakie: false,
    tire: "none",
    switchStance: false,
    late: false,
    ...overrides,
  }
}

function makeTrick(overrides: Partial<Trick> & { id: string }): Trick {
  return {
    name: overrides.id,
    alternateNames: [],
    elements: [],
    description: "",
    videos: [],
    prerequisite: null,
    optionalPrerequisite: null,
    isCompound: false,
    compositions: [],
    notes: null,
    referenceVideoUrl: null,
    referenceVideoTimestamp: null,
    modifiers: baseMods(),
    neighbors: [],
    depth: 0,
    dependents: [],
    ...overrides,
  }
}

// ── computeDepthsAndDependents ────────────────────────────────────

describe("computeDepthsAndDependents", () => {
  it("sets root tricks to depth 0", () => {
    const tricks = [makeTrick({ id: "a" }), makeTrick({ id: "b" })]
    computeDepthsAndDependents(tricks)
    expect(tricks[0]?.depth).toBe(0)
    expect(tricks[1]?.depth).toBe(0)
  })

  it("computes depth via prerequisite chain", () => {
    const tricks = [
      makeTrick({ id: "a" }),
      makeTrick({ id: "b", prerequisite: "a" }),
      makeTrick({ id: "c", prerequisite: "b" }),
    ]
    computeDepthsAndDependents(tricks)
    expect(tricks[0]?.depth).toBe(0)
    expect(tricks[1]?.depth).toBe(1)
    expect(tricks[2]?.depth).toBe(2)
  })

  it("builds dependents lists from prerequisites", () => {
    const tricks = [
      makeTrick({ id: "a" }),
      makeTrick({ id: "b", prerequisite: "a" }),
      makeTrick({ id: "c", prerequisite: "a" }),
    ]
    computeDepthsAndDependents(tricks)
    expect(tricks[0]?.dependents).toContain("b")
    expect(tricks[0]?.dependents).toContain("c")
  })

  it("builds dependents from optional prerequisites", () => {
    const tricks = [
      makeTrick({ id: "a" }),
      makeTrick({ id: "b", optionalPrerequisite: "a" }),
    ]
    computeDepthsAndDependents(tricks)
    expect(tricks[0]?.dependents).toContain("b")
  })

  it("handles disconnected tricks by setting depth 0", () => {
    const tricks = [
      makeTrick({ id: "a" }),
      makeTrick({ id: "b", prerequisite: "nonexistent" }),
    ]
    computeDepthsAndDependents(tricks)
    expect(tricks[1]?.depth).toBe(0)
  })

  it("handles branching prerequisites", () => {
    const tricks = [
      makeTrick({ id: "root" }),
      makeTrick({ id: "left", prerequisite: "root" }),
      makeTrick({ id: "right", prerequisite: "root" }),
      makeTrick({ id: "deep", prerequisite: "left" }),
    ]
    computeDepthsAndDependents(tricks)
    expect(tricks[0]?.depth).toBe(0)
    expect(tricks[1]?.depth).toBe(1)
    expect(tricks[2]?.depth).toBe(1)
    expect(tricks[3]?.depth).toBe(2)
  })

  it("resets depth and dependents before computing", () => {
    const tricks = [
      makeTrick({ id: "a", depth: 99, dependents: ["old"] }),
      makeTrick({ id: "b", prerequisite: "a", depth: 99 }),
    ]
    computeDepthsAndDependents(tricks)
    expect(tricks[0]?.depth).toBe(0)
    expect(tricks[1]?.depth).toBe(1)
    expect(tricks[0]?.dependents).toEqual(["b"])
  })

  it("handles empty array", () => {
    const tricks: Trick[] = []
    computeDepthsAndDependents(tricks)
    expect(tricks).toEqual([])
  })
})

// ── describeModifierDiff ──────────────────────────────────────────

describe("describeModifierDiff", () => {
  it("returns 'nearby' when modifiers are identical", () => {
    const m = baseMods()
    expect(describeModifierDiff(m, m)).toBe("nearby")
  })

  it("describes increased flips", () => {
    expect(describeModifierDiff(baseMods(), baseMods({ flips: 1 }))).toBe(
      "more flips",
    )
  })

  it("describes decreased flips", () => {
    expect(
      describeModifierDiff(baseMods({ flips: 2 }), baseMods({ flips: 1 })),
    ).toBe("less flips")
  })

  it("describes added wrap", () => {
    expect(describeModifierDiff(baseMods(), baseMods({ wrap: "side" }))).toBe(
      "add side",
    )
  })

  it("describes removed wrap", () => {
    expect(describeModifierDiff(baseMods({ wrap: "side" }), baseMods())).toBe(
      "remove side",
    )
  })

  it("describes changed wrap (lateral)", () => {
    expect(
      describeModifierDiff(
        baseMods({ wrap: "side" }),
        baseMods({ wrap: "backside" }),
      ),
    ).toBe("add backside")
  })

  it("describes added tire", () => {
    expect(
      describeModifierDiff(baseMods(), baseMods({ tire: "to tire" })),
    ).toBe("add tire")
  })

  it("describes removed tire", () => {
    expect(
      describeModifierDiff(baseMods({ tire: "to tire" }), baseMods()),
    ).toBe("remove tire")
  })

  it("describes boolean toggle additions", () => {
    expect(describeModifierDiff(baseMods(), baseMods({ fakie: true }))).toBe(
      "add fakie",
    )
    expect(
      describeModifierDiff(baseMods(), baseMods({ switchStance: true })),
    ).toBe("add switch")
    expect(describeModifierDiff(baseMods(), baseMods({ late: true }))).toBe(
      "add late",
    )
  })

  it("describes boolean toggle removals", () => {
    expect(describeModifierDiff(baseMods({ fakie: true }), baseMods())).toBe(
      "remove fakie",
    )
  })

  it("describes multiple changes", () => {
    const result = describeModifierDiff(
      baseMods(),
      baseMods({ flips: 1, fakie: true }),
    )
    expect(result).toContain("more flips")
    expect(result).toContain("add fakie")
  })

  it("describes spin changes", () => {
    expect(describeModifierDiff(baseMods(), baseMods({ spin: 180 }))).toBe(
      "more spins",
    )
    expect(
      describeModifierDiff(baseMods({ spin: 360 }), baseMods({ spin: 180 })),
    ).toBe("less spins")
  })

  it("describes twist changes", () => {
    expect(describeModifierDiff(baseMods(), baseMods({ twist: 180 }))).toBe(
      "more twists",
    )
  })
})

// ── modifierDirection ─────────────────────────────────────────────

describe("modifierDirection", () => {
  it("returns 'adds' when complexity increases", () => {
    expect(modifierDirection(baseMods(), baseMods({ flips: 1 }))).toBe("adds")
  })

  it("returns 'removes' when complexity decreases", () => {
    expect(modifierDirection(baseMods({ flips: 2 }), baseMods())).toBe(
      "removes",
    )
  })

  it("returns 'adds' when balanced (tie goes to adds)", () => {
    expect(
      modifierDirection(baseMods({ flips: 1 }), baseMods({ fakie: true })),
    ).toBe("adds")
  })

  it("returns 'adds' for identical modifiers", () => {
    expect(modifierDirection(baseMods(), baseMods())).toBe("adds")
  })

  it("counts wrap none→something as adds", () => {
    expect(modifierDirection(baseMods(), baseMods({ wrap: "side" }))).toBe(
      "adds",
    )
  })

  it("counts wrap something→none as removes", () => {
    expect(modifierDirection(baseMods({ wrap: "side" }), baseMods())).toBe(
      "removes",
    )
  })

  it("counts lateral wrap change as adds", () => {
    expect(
      modifierDirection(
        baseMods({ wrap: "side" }),
        baseMods({ wrap: "backside" }),
      ),
    ).toBe("adds")
  })

  it("counts tire none→something as adds", () => {
    expect(modifierDirection(baseMods(), baseMods({ tire: "to tire" }))).toBe(
      "adds",
    )
  })

  it("counts tire something→none as removes", () => {
    expect(modifierDirection(baseMods({ tire: "from tire" }), baseMods())).toBe(
      "removes",
    )
  })

  it("counts boolean toggle true as adds", () => {
    expect(modifierDirection(baseMods(), baseMods({ fakie: true }))).toBe(
      "adds",
    )
    expect(
      modifierDirection(baseMods(), baseMods({ switchStance: true })),
    ).toBe("adds")
    expect(modifierDirection(baseMods(), baseMods({ late: true }))).toBe("adds")
  })

  it("counts boolean toggle false as removes", () => {
    expect(modifierDirection(baseMods({ late: true }), baseMods())).toBe(
      "removes",
    )
  })

  it("handles multiple changes with net adds", () => {
    expect(
      modifierDirection(
        baseMods(),
        baseMods({ flips: 1, spin: 180, fakie: true }),
      ),
    ).toBe("adds")
  })

  it("handles multiple changes with net removes", () => {
    expect(
      modifierDirection(
        baseMods({ flips: 2, spin: 360, fakie: true }),
        baseMods(),
      ),
    ).toBe("removes")
  })
})

// ── computeAllNeighbors ───────────────────────────────────────────

describe("computeAllNeighbors", () => {
  it("connects simple tricks that differ by one flip", () => {
    const tricks = [
      makeTrick({ id: "a", modifiers: baseMods({ flips: 0 }) }),
      makeTrick({ id: "b", modifiers: baseMods({ flips: 1 }) }),
    ]
    computeAllNeighbors(tricks)
    expect(tricks[0]?.neighbors.some((n) => n.id === "b")).toBe(true)
    expect(tricks[1]?.neighbors.some((n) => n.id === "a")).toBe(true)
  })

  it("does not connect tricks differing by two dimensions", () => {
    const tricks = [
      makeTrick({ id: "a", modifiers: baseMods() }),
      makeTrick({
        id: "b",
        modifiers: baseMods({ flips: 1, spin: 180 }),
      }),
    ]
    computeAllNeighbors(tricks)
    expect(tricks[0]?.neighbors.some((n) => n.id === "b")).toBe(false)
  })

  it("connects simple tricks that differ by spin", () => {
    const tricks = [
      makeTrick({ id: "a", modifiers: baseMods({ spin: 0 }) }),
      makeTrick({ id: "b", modifiers: baseMods({ spin: 90 }) }),
    ]
    computeAllNeighbors(tricks)
    expect(tricks[0]?.neighbors.some((n) => n.id === "b")).toBe(true)
  })

  it("connects simple tricks that differ by fakie toggle", () => {
    const tricks = [
      makeTrick({ id: "a", modifiers: baseMods() }),
      makeTrick({ id: "b", modifiers: baseMods({ fakie: true }) }),
    ]
    computeAllNeighbors(tricks)
    expect(tricks[0]?.neighbors.some((n) => n.id === "b")).toBe(true)
  })

  it("connects compound tricks to their component tricks", () => {
    const tricks = [
      makeTrick({ id: "flip", modifiers: baseMods({ flips: 1 }) }),
      makeTrick({
        id: "combo",
        isCompound: true,
        compositions: [
          {
            componentId: "flip",
            componentName: "Flip",
            position: 0,
            catchType: null,
          },
        ],
        modifiers: baseMods(),
      }),
    ]
    computeAllNeighbors(tricks)

    // Compound should list component
    expect(tricks[1]?.neighbors.some((n) => n.id === "flip")).toBe(true)
    // Simple should list compound
    expect(tricks[0]?.neighbors.some((n) => n.id === "combo")).toBe(true)
  })

  it("labels compound-component neighbors correctly", () => {
    const tricks = [
      makeTrick({ id: "flip" }),
      makeTrick({
        id: "combo",
        isCompound: true,
        compositions: [
          {
            componentId: "flip",
            componentName: "Flip",
            position: 0,
            catchType: null,
          },
        ],
      }),
    ]
    computeAllNeighbors(tricks)

    const compoundNeighbor = tricks[1]?.neighbors.find((n) => n.id === "flip")
    expect(compoundNeighbor?.label).toBe("component")
    expect(compoundNeighbor?.direction).toBe("removes")

    const simpleNeighbor = tricks[0]?.neighbors.find((n) => n.id === "combo")
    expect(simpleNeighbor?.label).toBe("compound")
    expect(simpleNeighbor?.direction).toBe("adds")
  })

  it("handles empty tricks array", () => {
    const tricks: Trick[] = []
    computeAllNeighbors(tricks)
    expect(tricks).toEqual([])
  })

  it("connects compound siblings sharing a component", () => {
    const component = makeTrick({
      id: "flip",
      modifiers: baseMods({ flips: 1 }),
    })
    const combo1 = makeTrick({
      id: "combo1",
      isCompound: true,
      compositions: [
        {
          componentId: "flip",
          componentName: "Flip",
          position: 0,
          catchType: null,
        },
        {
          componentId: "spin",
          componentName: "Spin",
          position: 1,
          catchType: null,
        },
      ],
    })
    const combo2 = makeTrick({
      id: "combo2",
      isCompound: true,
      compositions: [
        {
          componentId: "flip",
          componentName: "Flip",
          position: 0,
          catchType: null,
        },
        {
          componentId: "roll",
          componentName: "Roll",
          position: 1,
          catchType: null,
        },
      ],
    })
    const spin = makeTrick({ id: "spin", modifiers: baseMods({ spin: 180 }) })
    const roll = makeTrick({ id: "roll", modifiers: baseMods({ twist: 180 }) })

    const tricks = [component, combo1, combo2, spin, roll]
    computeAllNeighbors(tricks)

    // combo1 and combo2 share "flip" component, so they're siblings
    expect(combo1.neighbors.some((n) => n.id === "combo2")).toBe(true)
    expect(combo2.neighbors.some((n) => n.id === "combo1")).toBe(true)
  })
})

// ── buildIndexes ──────────────────────────────────────────────────

describe("buildIndexes", () => {
  it("builds byId lookup", () => {
    const tricks = [
      makeTrick({ id: "a", depth: 0 }),
      makeTrick({ id: "b", depth: 0 }),
    ]
    const result = buildIndexes(tricks)
    expect(result.byId.a).toBe(tricks[0])
    expect(result.byId.b).toBe(tricks[1])
  })

  it("groups tricks by element", () => {
    const tricks = [
      makeTrick({ id: "a", elements: ["spin"], depth: 0 }),
      makeTrick({ id: "b", elements: ["spin", "flip"], depth: 0 }),
      makeTrick({ id: "c", elements: ["flip"], depth: 0 }),
    ]
    const result = buildIndexes(tricks)
    expect(result.byElement.spin).toHaveLength(2)
    expect(result.byElement.flip).toHaveLength(2)
  })

  it("sorts elements by predefined order", () => {
    const tricks = [
      makeTrick({ id: "a", elements: ["flip"], depth: 0 }),
      makeTrick({ id: "b", elements: ["spin"], depth: 0 }),
      makeTrick({ id: "c", elements: ["wrap"], depth: 0 }),
    ]
    const result = buildIndexes(tricks)
    expect(result.elements).toEqual(["spin", "flip", "wrap"])
  })

  it("puts unknown elements after predefined ones", () => {
    const tricks = [
      makeTrick({ id: "a", elements: ["spin"], depth: 0 }),
      makeTrick({ id: "b", elements: ["zebra"], depth: 0 }),
    ]
    const result = buildIndexes(tricks)
    expect(result.elements.indexOf("spin")).toBeLessThan(
      result.elements.indexOf("zebra"),
    )
  })

  it("sorts tricks within each element by depth then name", () => {
    const tricks = [
      makeTrick({ id: "c", name: "crankflip", elements: ["flip"], depth: 1 }),
      makeTrick({
        id: "a",
        name: "doubleflip",
        elements: ["flip"],
        depth: 0,
      }),
      makeTrick({ id: "b", name: "backflip", elements: ["flip"], depth: 0 }),
    ]
    const result = buildIndexes(tricks)
    const flipIds = result.byElement.flip?.map((t) => t.id)
    // depth 0 comes first (b, a sorted alphabetically), then depth 1 (c)
    expect(flipIds).toEqual(["b", "a", "c"])
  })

  it("handles empty tricks array", () => {
    const result = buildIndexes([])
    expect(result.byId).toEqual({})
    expect(result.byElement).toEqual({})
    expect(result.elements).toEqual([])
  })
})

// ── buildTricksData ───────────────────────────────────────────────

describe("buildTricksData", () => {
  it("returns complete TricksData with depths, neighbors, and indexes", () => {
    const tricks = [
      makeTrick({
        id: "a",
        elements: ["spin"],
        modifiers: baseMods({ spin: 0 }),
      }),
      makeTrick({
        id: "b",
        elements: ["spin"],
        prerequisite: "a",
        modifiers: baseMods({ spin: 90 }),
      }),
    ]
    const result = buildTricksData(tricks)

    // Depths computed
    expect(result.byId.a?.depth).toBe(0)
    expect(result.byId.b?.depth).toBe(1)

    // Neighbors computed
    expect(result.byId.a?.neighbors.length).toBeGreaterThan(0)

    // Indexes built
    expect(result.elements).toContain("spin")
    expect(result.byElement.spin).toHaveLength(2)
  })
})

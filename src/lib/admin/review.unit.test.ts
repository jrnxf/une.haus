import {
  countKinds,
  glossaryEditReview,
  listChange,
  plainList,
  plainText,
  sortQueue,
  submissionReview,
  textChange,
  trickSuggestionReview,
  vaultSuggestionReview,
} from "./review"

describe("textChange", () => {
  it("returns null when the value does not change", () => {
    expect(textChange("name", "kickflip", "kickflip")).toBeNull()
  })

  it("treats an empty string and null as the same value", () => {
    expect(textChange("notes", null, "")).toBeNull()
    expect(textChange("notes", "  ", undefined)).toBeNull()
  })

  it("compares a number as text", () => {
    expect(textChange("year landed", 2006, 2005)).toEqual({
      kind: "text",
      label: "year landed",
      before: "2006",
      after: "2005",
    })
  })

  it("shows a cleared value as null", () => {
    expect(textChange("notes", "old", null)).toMatchObject({
      before: "old",
      after: null,
    })
  })
})

describe("listChange", () => {
  it("returns null when only the order changes", () => {
    expect(
      listChange("elements", ["flip", "spin"], ["spin", "flip"]),
    ).toBeNull()
  })

  it("splits kept, added and removed items", () => {
    expect(listChange("elements", ["flip", "spin"], ["flip", "roll"])).toEqual({
      kind: "list",
      label: "elements",
      kept: ["flip"],
      added: ["roll"],
      removed: ["spin"],
    })
  })
})

describe("plain rows", () => {
  it("drops an empty value", () => {
    expect(plainText("notes", null)).toBeNull()
    expect(plainText("notes", " ")).toBeNull()
    expect(plainList("elements", [])).toBeNull()
  })

  it("keeps a value with no change", () => {
    expect(plainText("year landed", 2026)).toMatchObject({
      before: "2026",
      after: "2026",
    })
  })
})

describe("submissionReview", () => {
  const submission = {
    name: "sidespin hickflip",
    alternateNames: null,
    description: "a hickflip with a 180 sidespin",
    inventedBy: null,
    yearLanded: 2026,
    notes: null,
    videoUrl: "https://example.com/v/abc",
    videoTimestamp: "0:42",
    elementAssignments: [{ element: { name: "flip" } }],
    relationships: [
      {
        type: "optional_prerequisite",
        targetTrick: { id: 118, name: "hickflip" },
      },
    ],
  }

  it("lists only the fields that have a value", () => {
    const { fields } = submissionReview(submission)
    expect(fields.map((f) => f.label)).toEqual([
      "description",
      "year landed",
      "elements",
      "relationships",
      "video",
      "video timestamp",
    ])
  })

  it("names the target trick of a relationship", () => {
    const { fields } = submissionReview(submission)
    expect(fields.find((f) => f.label === "relationships")).toMatchObject({
      kept: ["optional prerequisite: hickflip"],
    })
  })

  it("keeps the trick id in the raw payload", () => {
    const { raw } = submissionReview(submission)
    expect(JSON.parse(raw).relationships).toEqual([
      { targetId: 118, type: "optional_prerequisite" },
    ])
  })
})

describe("trickSuggestionReview", () => {
  const trick = {
    name: "treyflip",
    alternateNames: ["360 flip"],
    description: null,
    inventedBy: null,
    yearLanded: 2006,
    notes: null,
    elementAssignments: [{ element: { name: "flip" } }],
    outgoingRelationships: [
      { type: "prerequisite", targetTrick: { id: 1, name: "crankflip" } },
    ],
  }

  it("shows only the fields in the diff", () => {
    const { fields } = trickSuggestionReview(trick, { yearLanded: 2005 }, [])
    expect(fields).toEqual([
      { kind: "text", label: "year landed", before: "2006", after: "2005" },
    ])
  })

  it("drops a diff field that equals the current value", () => {
    const { fields } = trickSuggestionReview(trick, { name: "treyflip" }, [])
    expect(fields).toEqual([])
  })

  it("names added and removed relationships", () => {
    const { fields, raw } = trickSuggestionReview(
      trick,
      {
        relationships: {
          added: [{ targetId: 2, type: "related" }],
          removed: [{ targetId: 1, type: "prerequisite" }],
        },
      },
      [{ id: 2, type: "related", name: "unispin" }],
    )
    expect(fields).toEqual([
      {
        kind: "list",
        label: "relationships",
        kept: [],
        added: ["related: unispin"],
        removed: ["prerequisite: crankflip"],
      },
    ])
    expect(JSON.parse(raw.modified).relationships).toEqual([
      { targetId: 2, type: "related" },
    ])
  })

  it("falls back to the trick id when the name is missing", () => {
    const { fields } = trickSuggestionReview(
      trick,
      {
        relationships: {
          added: [{ targetId: 9, type: "related" }],
          removed: [],
        },
      },
      [],
    )
    expect(fields[0]).toMatchObject({ added: ["related: #9"] })
  })

  it("shows a video in the diff as new", () => {
    const { fields } = trickSuggestionReview(
      trick,
      { videoUrl: "https://example.com/v/abc" },
      [],
    )
    expect(fields).toEqual([
      {
        kind: "text",
        label: "video",
        before: null,
        after: "https://example.com/v/abc",
      },
    ])
  })
})

describe("glossaryEditReview", () => {
  it("shows the changed description only", () => {
    const { fields } = glossaryEditReview(
      { name: "switch", description: "old" },
      { description: "new" },
    )
    expect(fields).toEqual([
      { kind: "text", label: "description", before: "old", after: "new" },
    ])
  })
})

describe("vaultSuggestionReview", () => {
  const video = {
    title: null,
    legacyTitle: "defect 2",
    disciplines: ["street"],
    riders: [{ userId: 4, name: null, user: { name: "jun okada" } }],
  }

  it("falls back to the legacy title", () => {
    const { fields } = vaultSuggestionReview(video, {
      title: "defect 2 - full part",
    })
    expect(fields).toEqual([
      {
        kind: "text",
        label: "title",
        before: "defect 2",
        after: "defect 2 - full part",
      },
    ])
  })

  it("shows an added rider", () => {
    const { fields } = vaultSuggestionReview(video, {
      riders: [
        { userId: 4, name: "jun okada" },
        { userId: null, name: "lea fontaine" },
      ],
    })
    expect(fields).toEqual([
      {
        kind: "list",
        label: "riders",
        kept: ["jun okada"],
        added: ["lea fontaine"],
        removed: [],
      },
    ])
  })
})

describe("queue", () => {
  it("sorts the oldest item first", () => {
    const sorted = sortQueue([
      { id: "new", createdAt: new Date("2026-03-02T00:00:00Z") },
      { id: "old", createdAt: new Date("2026-03-01T00:00:00Z") },
    ])
    expect(sorted.map((item) => item.id)).toEqual(["old", "new"])
  })

  it("counts only the kinds that have items", () => {
    expect(
      countKinds([{ kind: "video" }, { kind: "flag" }, { kind: "video" }]),
    ).toEqual([
      { kind: "video", count: 2 },
      { kind: "flag", count: 1 },
    ])
  })
})

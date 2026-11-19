import { describe, expect, test } from "bun:test"

import { cardRefs, MAX_LINKS } from "~/lib/ask/cards"
import { askSchema } from "~/lib/ask/schemas"
import { stepLabel } from "~/lib/ask/tools"

describe("cardRefs", () => {
  test("finds posts, sets and videos in answer order", () => {
    const answer =
      "see [the set](/games/rius/sets/12), [a post](/posts/3) and [a clip](/vault/7)."
    expect(cardRefs(answer)).toEqual([
      { kind: "riu set", id: 12, path: "/games/rius/sets/12" },
      { kind: "post", id: 3, path: "/posts/3" },
      { kind: "video", id: 7, path: "/vault/7" },
    ])
  })

  test("finds riders and tricks, and skips repeats and plain text", () => {
    const answer =
      "[alex](/users/4) posted [part 2](/posts/9) about [a unispin](/tricks/5). /posts/8 again [part 2](/posts/9)"
    expect(cardRefs(answer)).toEqual([
      { kind: "rider", id: 4, path: "/users/4" },
      { kind: "post", id: 9, path: "/posts/9" },
      { kind: "trick", id: 5, path: "/tricks/5" },
    ])
  })

  test("stops at the link limit", () => {
    const answer = Array.from(
      { length: MAX_LINKS + 3 },
      (_, id) => `[p](/posts/${id})`,
    ).join(" ")
    expect(cardRefs(answer)).toHaveLength(MAX_LINKS)
  })
})

describe("stepLabel", () => {
  test("says what a tool does in plain words", () => {
    expect(stepLabel("get_riu_set", { setId: 2672 })).toBe(
      "looking at riu set 2672",
    )
    expect(stepLabel("get_riu_round", {})).toBe(
      "looking at the active riu round",
    )
    expect(stepLabel("unknown_tool", {})).toBe("looking things up")
  })
})

describe("askSchema", () => {
  test("needs the thread to end with a question", () => {
    const ok = askSchema.safeParse({
      messages: [{ role: "user", content: "hi" }],
    })
    const bad = askSchema.safeParse({
      messages: [{ role: "assistant", content: "hi" }],
    })
    expect(ok.success).toBe(true)
    expect(bad.success).toBe(false)
  })
})

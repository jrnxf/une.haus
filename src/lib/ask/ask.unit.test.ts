import { describe, expect, test } from "bun:test"

import { cardRefs, MAX_LINKS, postPoster } from "~/lib/ask/cards"
import { type AskStep, STEP_MIN_MS, stepTitle } from "~/lib/ask/hooks"
import { askSystemPrompt } from "~/lib/ask/prompt"
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

describe("postPoster", () => {
  const none = { playbackId: null, imageId: null, youtubeVideoId: null }

  test("uses the uploaded video first", () => {
    expect(
      postPoster({ ...none, playbackId: "abc", imageId: "img" }),
    ).toStartWith("https://image.mux.com/abc/thumbnail.webp")
  })

  test("uses the photo", () => {
    expect(postPoster({ ...none, imageId: "img" })).toContain("/img/width=480")
  })

  test("uses the YouTube thumbnail", () => {
    expect(postPoster({ ...none, youtubeVideoId: "dQw4w9WgXcQ" })).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    )
  })

  test("has no poster for a text post", () => {
    expect(postPoster(none)).toBeNull()
  })
})

describe("askSystemPrompt", () => {
  test("names the member who asks, so 'my bio' resolves", () => {
    const prompt = askSystemPrompt("2026-11-20", { id: 42, name: "Ada Rider" })
    expect(prompt).toContain('The member asking is "Ada Rider", user id 42')
    expect(prompt).toContain("/users/42")
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
    expect(stepLabel("search_videos", { sort: "likes" })).toBe(
      "ranking the vault by likes",
    )
    expect(stepLabel("unknown_tool", {})).toBe("looking things up")
  })
})

describe("stepTitle", () => {
  const step = (label: string, at: number): AskStep => ({
    label,
    tool: "tool",
    args: "{}",
    at,
  })

  test("says thinking before any step", () => {
    expect(stepTitle([], false, 0)).toEqual({ title: "thinking", next: null })
  })

  test("holds a fast step label for the minimum time", () => {
    const steps = [step("looking at a round", 1000)]
    expect(stepTitle(steps, true, 1060)).toEqual({
      title: "looking at a round",
      next: 1000 + STEP_MIN_MS,
    })
    expect(stepTitle(steps, true, 1000 + STEP_MIN_MS)).toEqual({
      title: "thinking",
      next: null,
    })
  })

  test("keeps the label while the tool runs", () => {
    expect(stepTitle([step("a", 0)], false, 5000)).toEqual({
      title: "a",
      next: null,
    })
  })

  test("shows steps that arrive together one after another", () => {
    const steps = [step("a", 0), step("b", 10), step("c", 20)]
    expect(stepTitle(steps, true, 20).title).toBe("a")
    expect(stepTitle(steps, true, STEP_MIN_MS).title).toBe("b")
    expect(stepTitle(steps, true, 2 * STEP_MIN_MS).title).toBe("c")
    expect(stepTitle(steps, true, 3 * STEP_MIN_MS).title).toBe("thinking")
  })

  test("never goes back to an earlier label when the clock is old", () => {
    expect(stepTitle([step("a", 500)], true, 0)).toEqual({
      title: "a",
      next: 500 + STEP_MIN_MS,
    })
    // "a" had its time and "thinking" showed. Then "b" arrives, and the
    // clock is still from when "thinking" started.
    const steps = [step("a", 0), step("b", 2000)]
    expect(stepTitle(steps, false, STEP_MIN_MS).title).toBe("b")
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

import { describe, expect, it } from "bun:test"

import {
  contentTypes,
  labels,
  likeableTypes,
  messageTypeFor,
  messageTypes,
  queryKeyFor,
} from "~/lib/engagement/manifest"

/**
 * These assertions cover what the compile-time drift guards in `manifest.ts`
 * can't: the *content* of the projection (label wording, parent→message
 * pairing, and which facade a query key resolves to). The `AssertEqual` guards
 * already lock the type *unions* to the registry.
 */
describe("engagement manifest", () => {
  it("composes likeableTypes from content + message types with no overlap", () => {
    expect(likeableTypes).toEqual([...contentTypes, ...messageTypes])
    const unique = new Set<string>(likeableTypes)
    expect(unique.size).toBe(likeableTypes.length)
  })

  it("labels every likeable type with lowercase, human-readable copy", () => {
    for (const type of likeableTypes) {
      const label = labels[type]
      expect(label.length).toBeGreaterThan(0)
      expect(label).toBe(label.toLowerCase())
    }
  })

  it("never labels a message type with its raw type string", () => {
    // Guards the regression where message labels read "riuSetMessage" etc.
    // instead of the human word "message".
    for (const type of messageTypes) {
      expect(labels[type]).not.toBe(type)
      expect(labels[type]).toBe("message")
    }
  })

  it("pairs each message parent with its `${parent}Message` type", () => {
    expect(messageTypeFor("chat")).toBe("chatMessage")
    expect(messageTypeFor("post")).toBe("postMessage")
    expect(messageTypeFor("riuSet")).toBe("riuSetMessage")
    expect(messageTypeFor("riuSubmission")).toBe("riuSubmissionMessage")
    expect(messageTypeFor("utvVideo")).toBe("utvVideoMessage")
    expect(messageTypeFor("biuSet")).toBe("biuSetMessage")
    expect(messageTypeFor("siuSet")).toBe("siuSetMessage")
  })

  it("resolves each content type's detail query key to the right facade", () => {
    expect(queryKeyFor("post", 1)).toEqual(["posts.get", { postId: 1 }])
    expect(queryKeyFor("riuSet", 1)).toEqual([
      "games.rius.sets.get",
      { setId: 1 },
    ])
    expect(queryKeyFor("riuSubmission", 1)).toEqual([
      "games.rius.submissions.get",
      { submissionId: 1 },
    ])
    expect(queryKeyFor("biuSet", 1)).toEqual([
      "games.bius.sets.get",
      { setId: 1 },
    ])
    expect(queryKeyFor("siuSet", 1)).toEqual([
      "games.sius.sets.get",
      { setId: 1 },
    ])
    expect(queryKeyFor("utvVideo", 1)).toEqual(["utv.video", 1])
  })
})

import { describe, expect, it } from "bun:test"

import { storageToHTML, tiptapToStorage } from "~/lib/mentions/parse"

const userMap = new Map([
  [1, { name: "Alice Johnson" }],
  [2, { name: "Bob Smith" }],
  [42, { name: "colby" }],
])

describe("storageToHTML", () => {
  it("converts storage format with mentions to HTML", () => {
    expect(storageToHTML("hello @[42] world", userMap)).toBe(
      '<p>hello <span data-type="mention" data-id="42" data-label="colby"></span> world</p>',
    )
  })

  it("converts multiple mentions", () => {
    expect(storageToHTML("@[1] and @[2]", userMap)).toBe(
      '<p><span data-type="mention" data-id="1" data-label="Alice Johnson"></span> and <span data-type="mention" data-id="2" data-label="Bob Smith"></span></p>',
    )
  })

  it("preserves unknown user IDs with fallback label", () => {
    expect(storageToHTML("hi @[999]", userMap)).toBe(
      '<p>hi <span data-type="mention" data-id="999" data-label="unknown"></span></p>',
    )
  })

  it("handles text with no mentions", () => {
    expect(storageToHTML("plain text", userMap)).toBe("<p>plain text</p>")
  })

  it("handles bold and italic", () => {
    expect(storageToHTML("**bold** and *italic*", userMap)).toBe(
      "<p><strong>bold</strong> and <em>italic</em></p>",
    )
  })
})

describe("tiptapToStorage", () => {
  it("converts tiptap doc with mentions to storage format", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "hello " },
              { type: "mention", attrs: { id: 42, label: "colby" } },
              { type: "text", text: " world" },
            ],
          },
        ],
      }),
    ).toBe("hello @[42] world")
  })

  it("converts multiple mentions", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "mention", attrs: { id: 1, label: "Alice Johnson" } },
              { type: "text", text: " and " },
              { type: "mention", attrs: { id: 2, label: "Bob Smith" } },
            ],
          },
        ],
      }),
    ).toBe("@[1] and @[2]")
  })

  it("handles text with no mentions", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "plain text" }],
          },
        ],
      }),
    ).toBe("plain text")
  })
})

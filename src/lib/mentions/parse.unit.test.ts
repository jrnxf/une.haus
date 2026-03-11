import { describe, expect, it } from "bun:test"

import {
  extractMentionedUserIds,
  parseRichTokens,
  storageToHTML,
  stripMentionTokens,
  stripMentionTokensPlain,
  tiptapToStorage,
} from "./parse"

// -- extractMentionedUserIds --

describe("extractMentionedUserIds", () => {
  it("extracts a single mention", () => {
    expect(extractMentionedUserIds("hey @[42] nice trick")).toEqual([42])
  })

  it("extracts multiple mentions", () => {
    expect(extractMentionedUserIds("@[1] and @[2] should watch @[3]")).toEqual([
      1, 2, 3,
    ])
  })

  it("deduplicates repeated mentions", () => {
    expect(extractMentionedUserIds("@[5] said hi to @[5]")).toEqual([5])
  })

  it("returns empty array when no mentions", () => {
    expect(extractMentionedUserIds("just plain text")).toEqual([])
  })

  it("handles empty string", () => {
    expect(extractMentionedUserIds("")).toEqual([])
  })

  it("ignores malformed mention tokens", () => {
    expect(extractMentionedUserIds("@[abc] @[] @[1")).toEqual([])
  })

  it("extracts mentions alongside bold/italic markdown", () => {
    expect(
      extractMentionedUserIds("**hey** @[10] that was *sick* @[20]"),
    ).toEqual([10, 20])
  })

  it("handles mentions at start and end of string", () => {
    expect(extractMentionedUserIds("@[1] hello @[2]")).toEqual([1, 2])
  })
})

// -- stripMentionTokens --

const resolveUser = (id: number) => {
  const map: Record<number, string> = { 1: "alice", 2: "bob" }
  return map[id]
}

describe("stripMentionTokens", () => {
  it("replaces mention tokens with @name", () => {
    expect(stripMentionTokens("hey @[1]!", resolveUser)).toBe("hey @alice!")
  })

  it("replaces multiple mentions", () => {
    expect(stripMentionTokens("@[1] and @[2]", resolveUser)).toBe(
      "@alice and @bob",
    )
  })

  it("shows deleted user for unknown IDs", () => {
    expect(stripMentionTokens("@[999] left", resolveUser)).toBe(
      "@deleted user left",
    )
  })

  it("handles text with no mentions", () => {
    expect(stripMentionTokens("plain text", resolveUser)).toBe("plain text")
  })
})

// -- stripMentionTokensPlain --

describe("stripMentionTokensPlain", () => {
  it("replaces mentions with @user", () => {
    expect(stripMentionTokensPlain("hey @[42]!")).toBe("hey @user!")
  })

  it("replaces multiple mentions", () => {
    expect(stripMentionTokensPlain("@[1] and @[2]")).toBe("@user and @user")
  })

  it("handles text with no mentions", () => {
    expect(stripMentionTokensPlain("plain text")).toBe("plain text")
  })
})

// -- parseRichTokens --

describe("parseRichTokens", () => {
  it("returns a single text token for plain text", () => {
    expect(parseRichTokens("hello world")).toEqual([
      { type: "text", value: "hello world" },
    ])
  })

  it("returns empty array for empty string", () => {
    expect(parseRichTokens("")).toEqual([])
  })

  it("parses a mention token", () => {
    expect(parseRichTokens("hey @[42] nice")).toEqual([
      { type: "text", value: "hey " },
      { type: "mention", userId: 42 },
      { type: "text", value: " nice" },
    ])
  })

  it("parses bold text", () => {
    expect(parseRichTokens("this is **bold** text")).toEqual([
      { type: "text", value: "this is " },
      { type: "bold", children: [{ type: "text", value: "bold" }] },
      { type: "text", value: " text" },
    ])
  })

  it("parses italic text", () => {
    expect(parseRichTokens("this is *italic* text")).toEqual([
      { type: "text", value: "this is " },
      { type: "italic", children: [{ type: "text", value: "italic" }] },
      { type: "text", value: " text" },
    ])
  })

  it("parses mixed bold and italic", () => {
    expect(parseRichTokens("**bold** and *italic*")).toEqual([
      { type: "bold", children: [{ type: "text", value: "bold" }] },
      { type: "text", value: " and " },
      { type: "italic", children: [{ type: "text", value: "italic" }] },
    ])
  })

  it("parses mentions with bold and italic", () => {
    expect(parseRichTokens("@[1] did a **sick** *trick*")).toEqual([
      { type: "mention", userId: 1 },
      { type: "text", value: " did a " },
      { type: "bold", children: [{ type: "text", value: "sick" }] },
      { type: "text", value: " " },
      { type: "italic", children: [{ type: "text", value: "trick" }] },
    ])
  })

  it("handles adjacent tokens with no text between", () => {
    expect(parseRichTokens("**bold***italic*")).toEqual([
      { type: "bold", children: [{ type: "text", value: "bold" }] },
      { type: "italic", children: [{ type: "text", value: "italic" }] },
    ])
  })

  it("handles multiple mentions", () => {
    expect(parseRichTokens("@[1] and @[2]")).toEqual([
      { type: "mention", userId: 1 },
      { type: "text", value: " and " },
      { type: "mention", userId: 2 },
    ])
  })

  it("does not parse single asterisks inside words as italic", () => {
    // *text* requires the asterisks to wrap text - this is a valid italic
    expect(parseRichTokens("a*b")).toEqual([{ type: "text", value: "a*b" }])
  })

  it("handles bold with special characters inside", () => {
    expect(parseRichTokens("**hello world!**")).toEqual([
      { type: "bold", children: [{ type: "text", value: "hello world!" }] },
    ])
  })

  it("prefers bold over italic for ** markers", () => {
    // **text** should be bold, not italic wrapping *text*
    const tokens = parseRichTokens("**bold text**")
    expect(tokens).toEqual([
      { type: "bold", children: [{ type: "text", value: "bold text" }] },
    ])
  })

  it("parses layered bold+italic (***...***)", () => {
    expect(parseRichTokens("***both***")).toEqual([
      {
        type: "bold",
        children: [
          { type: "italic", children: [{ type: "text", value: "both" }] },
        ],
      },
    ])
  })

  it("parses layered strike wrapping bold", () => {
    expect(parseRichTokens("~~**text**~~")).toEqual([
      {
        type: "strike",
        children: [
          { type: "bold", children: [{ type: "text", value: "text" }] },
        ],
      },
    ])
  })

  it("parses layered underline wrapping italic", () => {
    expect(parseRichTokens("__*text*__")).toEqual([
      {
        type: "underline",
        children: [
          { type: "italic", children: [{ type: "text", value: "text" }] },
        ],
      },
    ])
  })

  it("parses all four marks layered", () => {
    expect(parseRichTokens("~~__***text***__~~")).toEqual([
      {
        type: "strike",
        children: [
          {
            type: "underline",
            children: [
              {
                type: "bold",
                children: [
                  {
                    type: "italic",
                    children: [{ type: "text", value: "text" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  it("handles content at the start with no leading text", () => {
    expect(parseRichTokens("@[5] is here")).toEqual([
      { type: "mention", userId: 5 },
      { type: "text", value: " is here" },
    ])
  })

  it("handles content at the end with no trailing text", () => {
    expect(parseRichTokens("look at @[5]")).toEqual([
      { type: "text", value: "look at " },
      { type: "mention", userId: 5 },
    ])
  })

  it("preserves whitespace and newlines in text tokens", () => {
    expect(parseRichTokens("line 1\nline 2")).toEqual([
      { type: "text", value: "line 1\nline 2" },
    ])
  })
})

// -- storageToHTML --

describe("storageToHTML", () => {
  const userMap = new Map([
    [1, { name: "alice" }],
    [2, { name: "bob" }],
    [42, { name: "colby" }],
  ])

  it("converts plain text to a paragraph", () => {
    expect(storageToHTML("hello", userMap)).toBe("<p>hello</p>")
  })

  it("converts empty string to empty paragraph", () => {
    expect(storageToHTML("", userMap)).toBe("<p></p>")
  })

  it("converts mentions to span elements", () => {
    expect(storageToHTML("hey @[42]!", userMap)).toBe(
      '<p>hey <span data-type="mention" data-id="42" data-label="colby"></span>!</p>',
    )
  })

  it("converts bold to strong elements", () => {
    expect(storageToHTML("**bold**", userMap)).toBe(
      "<p><strong>bold</strong></p>",
    )
  })

  it("converts italic to em elements", () => {
    expect(storageToHTML("*italic*", userMap)).toBe("<p><em>italic</em></p>")
  })

  it("handles multiline content as multiple paragraphs", () => {
    expect(storageToHTML("line 1\nline 2", userMap)).toBe(
      "<p>line 1</p><p>line 2</p>",
    )
  })

  it("handles empty lines as br paragraphs", () => {
    expect(storageToHTML("a\n\nb", userMap)).toBe("<p>a</p><p><br></p><p>b</p>")
  })

  it("escapes HTML entities in text", () => {
    expect(storageToHTML("<script>", userMap)).toBe("<p>&lt;script&gt;</p>")
  })

  it("escapes quotes in mention labels", () => {
    const mapWithQuotes = new Map([[1, { name: 'O"Brien' }]])
    expect(storageToHTML("@[1]", mapWithQuotes)).toBe(
      '<p><span data-type="mention" data-id="1" data-label="O&quot;Brien"></span></p>',
    )
  })

  it("handles unknown mention user IDs", () => {
    expect(storageToHTML("@[999]", userMap)).toBe(
      '<p><span data-type="mention" data-id="999" data-label="unknown"></span></p>',
    )
  })

  it("converts multiple mentions on the same line", () => {
    expect(storageToHTML("@[1] and @[2]", userMap)).toBe(
      '<p><span data-type="mention" data-id="1" data-label="alice"></span> and <span data-type="mention" data-id="2" data-label="bob"></span></p>',
    )
  })

  it("converts mixed mentions, bold, and italic", () => {
    expect(storageToHTML("@[42] did a **sick** *trick*", userMap)).toBe(
      '<p><span data-type="mention" data-id="42" data-label="colby"></span> did a <strong>sick</strong> <em>trick</em></p>',
    )
  })

  it("handles three or more lines", () => {
    expect(storageToHTML("a\nb\nc", userMap)).toBe("<p>a</p><p>b</p><p>c</p>")
  })

  it("converts layered bold+italic to nested HTML", () => {
    expect(storageToHTML("***both***", userMap)).toBe(
      "<p><strong><em>both</em></strong></p>",
    )
  })

  it("converts all four marks layered to nested HTML", () => {
    expect(storageToHTML("~~__***text***__~~", userMap)).toBe(
      "<p><s><u><strong><em>text</em></strong></u></s></p>",
    )
  })

  it("converts strike wrapping bold to nested HTML", () => {
    expect(storageToHTML("~~**bold**~~", userMap)).toBe(
      "<p><s><strong>bold</strong></s></p>",
    )
  })

  it("escapes ampersands in text", () => {
    expect(storageToHTML("foo & bar", userMap)).toBe("<p>foo &amp; bar</p>")
  })
})

// -- tiptapToStorage --

describe("tiptapToStorage", () => {
  it("converts paragraph text to plain text", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "hello" }],
          },
        ],
      }),
    ).toBe("hello")
  })

  it("converts mention nodes to @[id]", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "hey " },
              {
                type: "mention",
                attrs: { id: 42, label: "colby" },
              },
              { type: "text", text: "!" },
            ],
          },
        ],
      }),
    ).toBe("hey @[42]!")
  })

  it("converts bold marks to ** syntax", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bold",
                marks: [{ type: "bold" }],
              },
            ],
          },
        ],
      }),
    ).toBe("**bold**")
  })

  it("converts italic marks to * syntax", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "italic",
                marks: [{ type: "italic" }],
              },
            ],
          },
        ],
      }),
    ).toBe("*italic*")
  })

  it("converts bold+italic marks", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "both",
                marks: [{ type: "bold" }, { type: "italic" }],
              },
            ],
          },
        ],
      }),
    ).toBe("***both***")
  })

  it("converts multiple paragraphs to newline-separated text", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "line 1" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "line 2" }],
          },
        ],
      }),
    ).toBe("line 1\nline 2")
  })

  it("converts hardBreak to newline", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "a" },
              { type: "hardBreak" },
              { type: "text", text: "b" },
            ],
          },
        ],
      }),
    ).toBe("a\nb")
  })

  it("returns empty string for empty doc", () => {
    expect(tiptapToStorage({ type: "doc" })).toBe("")
  })

  it("handles empty paragraphs", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [{ type: "paragraph" }],
      }),
    ).toBe("")
  })

  it("handles mixed inline content: text, mention, bold, italic", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "mention", attrs: { id: 1, label: "alice" } },
              { type: "text", text: " did a " },
              {
                type: "text",
                text: "sick",
                marks: [{ type: "bold" }],
              },
              { type: "text", text: " " },
              {
                type: "text",
                text: "trick",
                marks: [{ type: "italic" }],
              },
            ],
          },
        ],
      }),
    ).toBe("@[1] did a **sick** *trick*")
  })

  it("handles mention at end of paragraph", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "hello " },
              { type: "mention", attrs: { id: 5, label: "user" } },
            ],
          },
        ],
      }),
    ).toBe("hello @[5]")
  })

  it("handles mention-only paragraph", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "mention", attrs: { id: 42, label: "colby" } }],
          },
        ],
      }),
    ).toBe("@[42]")
  })

  it("handles multiple mentions in one paragraph", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "mention", attrs: { id: 1, label: "alice" } },
              { type: "text", text: " and " },
              { type: "mention", attrs: { id: 2, label: "bob" } },
            ],
          },
        ],
      }),
    ).toBe("@[1] and @[2]")
  })

  it("ignores unknown node types gracefully", () => {
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "hello" },
              { type: "unknownNode" },
              { type: "text", text: " world" },
            ],
          },
        ],
      }),
    ).toBe("hello world")
  })
})

// -- round-trip: storage → HTML → (conceptual) → storage --
// These verify storageToHTML produces HTML consistent with what
// tiptapToStorage expects from the corresponding tiptap JSON.

describe("round-trip consistency", () => {
  const userMap = new Map([
    [1, { name: "alice" }],
    [42, { name: "colby" }],
  ])

  it("plain text survives round-trip", () => {
    const storage = "hello world"
    const html = storageToHTML(storage, userMap)
    expect(html).toBe("<p>hello world</p>")
    // tiptap would parse this to a doc with one paragraph containing "hello world"
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "hello world" }],
          },
        ],
      }),
    ).toBe(storage)
  })

  it("mention survives round-trip", () => {
    const storage = "hey @[42] nice"
    const html = storageToHTML(storage, userMap)
    expect(html).toContain('data-type="mention"')
    expect(html).toContain('data-id="42"')
    // tiptap would parse the mention span to a mention node
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "hey " },
              { type: "mention", attrs: { id: 42, label: "colby" } },
              { type: "text", text: " nice" },
            ],
          },
        ],
      }),
    ).toBe(storage)
  })

  it("bold survives round-trip", () => {
    const storage = "this is **bold** text"
    const html = storageToHTML(storage, userMap)
    expect(html).toBe("<p>this is <strong>bold</strong> text</p>")
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "this is " },
              { type: "text", text: "bold", marks: [{ type: "bold" }] },
              { type: "text", text: " text" },
            ],
          },
        ],
      }),
    ).toBe(storage)
  })

  it("italic survives round-trip", () => {
    const storage = "this is *italic* text"
    const html = storageToHTML(storage, userMap)
    expect(html).toBe("<p>this is <em>italic</em> text</p>")
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "this is " },
              { type: "text", text: "italic", marks: [{ type: "italic" }] },
              { type: "text", text: " text" },
            ],
          },
        ],
      }),
    ).toBe(storage)
  })

  it("multiline survives round-trip", () => {
    const storage = "line 1\nline 2"
    const html = storageToHTML(storage, userMap)
    expect(html).toBe("<p>line 1</p><p>line 2</p>")
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "line 1" }] },
          { type: "paragraph", content: [{ type: "text", text: "line 2" }] },
        ],
      }),
    ).toBe(storage)
  })

  it("complex message survives round-trip", () => {
    const storage = "@[1] did a **sick** *trick*"
    const html = storageToHTML(storage, userMap)
    expect(html).toContain('data-id="1"')
    expect(html).toContain("<strong>sick</strong>")
    expect(html).toContain("<em>trick</em>")
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "mention", attrs: { id: 1, label: "alice" } },
              { type: "text", text: " did a " },
              { type: "text", text: "sick", marks: [{ type: "bold" }] },
              { type: "text", text: " " },
              { type: "text", text: "trick", marks: [{ type: "italic" }] },
            ],
          },
        ],
      }),
    ).toBe(storage)
  })

  it("bold+italic survives round-trip", () => {
    const storage = "***both***"
    const html = storageToHTML(storage, userMap)
    expect(html).toBe("<p><strong><em>both</em></strong></p>")
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "both",
                marks: [{ type: "bold" }, { type: "italic" }],
              },
            ],
          },
        ],
      }),
    ).toBe(storage)
  })

  it("all four marks survive round-trip", () => {
    const storage = "~~__***text***__~~"
    const html = storageToHTML(storage, userMap)
    expect(html).toBe("<p><s><u><strong><em>text</em></strong></u></s></p>")
    expect(
      tiptapToStorage({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "text",
                marks: [
                  { type: "bold" },
                  { type: "italic" },
                  { type: "underline" },
                  { type: "strike" },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe(storage)
  })
})

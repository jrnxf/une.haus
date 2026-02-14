import { describe, expect, it } from "vitest";

import {
  createPostSchema,
  deletePostSchema,
  getPostSchema,
  listPostsSchema,
  updatePostSchema,
} from "../schemas";

describe("getPostSchema", () => {
  it("accepts numeric postId", () => {
    const result = getPostSchema.safeParse({ postId: 123 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.postId).toBe(123);
    }
  });

  it("coerces string to number", () => {
    const result = getPostSchema.safeParse({ postId: "456" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.postId).toBe(456);
    }
  });

  it("rejects non-numeric string", () => {
    const result = getPostSchema.safeParse({ postId: "not-a-number" });
    expect(result.success).toBe(false);
  });

  it("rejects missing postId", () => {
    const result = getPostSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("createPostSchema", () => {
  const validPost = {
    title: "My Post Title",
    content: "This is the post content.",
    tags: ["flatland"] as const,
  };

  describe("title validation", () => {
    it("accepts valid title", () => {
      const result = createPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        title: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Title is required");
      }
    });

    it("rejects title over 60 characters", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        title: "a".repeat(61),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Title must be less than 60 characters",
        );
      }
    });

    it("accepts title exactly 60 characters", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        title: "a".repeat(60),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("content validation", () => {
    it("accepts valid content", () => {
      const result = createPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it("rejects empty content", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        content: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Content is required");
      }
    });
  });

  describe("tags validation", () => {
    it("accepts single valid tag", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        tags: ["flatland"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts multiple valid tags", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        tags: ["flatland", "street", "trials"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty tags array", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        tags: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "At least one tag is required",
        );
      }
    });

    it("rejects more than 3 tags", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        tags: ["flatland", "street", "trials", "freestyle"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // The max(3) validation triggers
        const hasMaxError = result.error.issues.some(
          (issue) =>
            issue.message === "No more than three tags allowed" ||
            issue.message.includes("maximum"),
        );
        expect(hasMaxError).toBe(true);
      }
    });

    it("rejects invalid tag", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        tags: ["invalid-tag"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("media validation", () => {
    it("accepts no media (undefined)", () => {
      const result = createPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it("accepts null media", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        media: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts image media", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        media: { type: "image", value: "image-id-123" },
      });
      expect(result.success).toBe(true);
    });

    it("accepts video media", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        media: { type: "video", value: "asset-id-456" },
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid YouTube URL and extracts ID", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        media: {
          type: "youtube",
          value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.media) {
        expect(result.data.media.value).toBe("dQw4w9WgXcQ");
      }
    });

    it("accepts YouTube short URL", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        media: { type: "youtube", value: "https://youtu.be/dQw4w9WgXcQ" },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.media) {
        expect(result.data.media.value).toBe("dQw4w9WgXcQ");
      }
    });

    it("rejects invalid YouTube URL", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        media: { type: "youtube", value: "not-a-youtube-url" },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid YouTube URL");
      }
    });

    it("rejects unknown media type", () => {
      const result = createPostSchema.safeParse({
        ...validPost,
        media: { type: "unknown", value: "something" },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updatePostSchema", () => {
  const validUpdate = {
    postId: 123,
    title: "Updated Title",
    content: "Updated content.",
    tags: ["street"] as const,
  };

  it("accepts valid update data", () => {
    const result = updatePostSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("requires postId", () => {
    const { postId, ...withoutId } = validUpdate;
    const result = updatePostSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it("inherits title validation from createPostSchema", () => {
    const result = updatePostSchema.safeParse({
      ...validUpdate,
      title: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("deletePostSchema", () => {
  it("accepts numeric postId", () => {
    const result = deletePostSchema.safeParse(123);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(123);
    }
  });

  it("rejects non-number", () => {
    const result = deletePostSchema.safeParse("not-a-number");
    expect(result.success).toBe(false);
  });
});

describe("listPostsSchema", () => {
  it("accepts empty object", () => {
    const result = listPostsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts cursor", () => {
    const result = listPostsSchema.safeParse({ cursor: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe(10);
    }
  });

  it("accepts null cursor", () => {
    const result = listPostsSchema.safeParse({ cursor: null });
    expect(result.success).toBe(true);
  });

  it("accepts search query", () => {
    const result = listPostsSchema.safeParse({ q: "unicycle" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe("unicycle");
    }
  });

  it("accepts tags filter", () => {
    const result = listPostsSchema.safeParse({ tags: ["flatland", "street"] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["flatland", "street"]);
    }
  });

  it("accepts all parameters together", () => {
    const result = listPostsSchema.safeParse({
      cursor: 5,
      q: "search term",
      tags: ["trials"],
    });
    expect(result.success).toBe(true);
  });

  it("drops invalid tags", () => {
    const result = listPostsSchema.safeParse({ tags: ["invalid"] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toBeUndefined();
    }
  });
});

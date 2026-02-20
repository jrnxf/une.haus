
import {
  getNotificationAction,
  getNotificationMessage,
  getNotificationUrl,
} from "./utils";

describe("getNotificationUrl", () => {
  it("returns correct URL for post", () => {
    expect(getNotificationUrl("post", 123)).toBe("/posts/123");
  });

  it("returns correct URL for riuSet", () => {
    expect(getNotificationUrl("riuSet", 456)).toBe("/games/rius/sets/456");
  });

  it("returns correct URL for riuSubmission", () => {
    expect(getNotificationUrl("riuSubmission", 789)).toBe(
      "/games/rius/submissions/789",
    );
  });

  it("returns correct URL for biuSet", () => {
    expect(getNotificationUrl("biuSet", 100)).toBe("/games/bius/sets/100");
  });

  it("returns correct URL for utvVideo", () => {
    expect(getNotificationUrl("utvVideo", 200)).toBe("/vault/200");
  });

  it("returns correct URL for user", () => {
    expect(getNotificationUrl("user", 300)).toBe("/users/300");
  });

  it("returns fallback URL for unknown type", () => {
    // @ts-expect-error - testing unknown type
    expect(getNotificationUrl("unknown", 999)).toBe("/");
  });
});

describe("getNotificationMessage", () => {
  describe("like notifications", () => {
    it("formats single actor like", () => {
      const msg = getNotificationMessage("like", "post", 1, ["Alice"]);
      expect(msg).toBe("Alice liked your post");
    });

    it("formats single actor like with title", () => {
      const msg = getNotificationMessage(
        "like",
        "post",
        1,
        ["Alice"],
        "My Post",
      );
      expect(msg).toBe('Alice liked your post: "My Post"');
    });

    it("formats two actors like", () => {
      const msg = getNotificationMessage("like", "utvVideo", 2, [
        "Alice",
        "Bob",
      ]);
      expect(msg).toBe("Alice and Bob liked your video");
    });

    it("formats single actor with more total", () => {
      const msg = getNotificationMessage("like", "post", 5, ["Alice"]);
      expect(msg).toBe("Alice and 4 others liked your post");
    });

    it("formats two actors with more total", () => {
      const msg = getNotificationMessage("like", "riuSet", 10, [
        "Alice",
        "Bob",
      ]);
      expect(msg).toBe("Alice, Bob and 8 others liked your RIU set");
    });

    it("formats three actors", () => {
      const msg = getNotificationMessage("like", "post", 3, [
        "Alice",
        "Bob",
        "Charlie",
      ]);
      expect(msg).toBe("Alice, Bob and Charlie liked your post");
    });
  });

  describe("comment notifications", () => {
    it("formats single comment", () => {
      const msg = getNotificationMessage("comment", "post", 1, ["Alice"]);
      expect(msg).toBe("Alice commented on your post");
    });

    it("formats comment with title", () => {
      const msg = getNotificationMessage(
        "comment",
        "utvVideo",
        1,
        ["Bob"],
        "Cool Video",
      );
      expect(msg).toBe('Bob commented on your video: "Cool Video"');
    });
  });

  describe("follow notifications", () => {
    it("formats single follow", () => {
      const msg = getNotificationMessage("follow", "user", 1, ["Alice"]);
      expect(msg).toBe("Alice started following you");
    });

    it("formats multiple follows", () => {
      const msg = getNotificationMessage("follow", "user", 3, ["Alice", "Bob"]);
      expect(msg).toBe("Alice, Bob and 1 other started following you");
    });
  });

  describe("new_content notifications", () => {
    it("formats single new content", () => {
      const msg = getNotificationMessage("new_content", "post", 1, ["Alice"]);
      expect(msg).toBe("Alice posted post");
    });

    it("formats multiple new content", () => {
      const msg = getNotificationMessage("new_content", "post", 5, ["Alice"]);
      expect(msg).toBe("Alice and 4 others created new content");
    });
  });

  describe("edge cases", () => {
    it("handles empty actor names", () => {
      const msg = getNotificationMessage("like", "post", 1, []);
      expect(msg).toBe("Someone liked your post");
    });

    it("handles unknown notification type", () => {
      // @ts-expect-error - testing unknown type
      const msg = getNotificationMessage("unknown", "post", 1, ["Alice"]);
      expect(msg).toBe("You have a new notification");
    });

    it("handles unknown entity type", () => {
      // @ts-expect-error - testing unknown type
      const msg = getNotificationMessage("like", "unknown", 1, ["Alice"]);
      expect(msg).toBe("Alice liked your content");
    });
  });

  describe("formatActors edge cases (via getNotificationMessage)", () => {
    it("singular other when count is 1 more than names", () => {
      const msg = getNotificationMessage("like", "post", 2, ["Alice"]);
      expect(msg).toBe("Alice and 1 other liked your post");
    });

    it("plural others when count is 2+ more than names", () => {
      const msg = getNotificationMessage("like", "post", 3, ["Alice"]);
      expect(msg).toBe("Alice and 2 others liked your post");
    });

    it("two names with exactly matching count", () => {
      const msg = getNotificationMessage("like", "post", 2, ["Alice", "Bob"]);
      expect(msg).toBe("Alice and Bob liked your post");
    });

    it("two names with higher count shows singular other", () => {
      const msg = getNotificationMessage("like", "post", 3, ["Alice", "Bob"]);
      expect(msg).toBe("Alice, Bob and 1 other liked your post");
    });
  });
});

describe("entity type formatting", () => {
  it.each([
    ["post", "post"],
    ["riuSet", "RIU set"],
    ["riuSubmission", "RIU submission"],
    ["biuSet", "BIU set"],
    ["utvVideo", "video"],
    ["user", "profile"],
    ["trickSubmission", "trick submission"],
    ["trickSuggestion", "trick suggestion"],
    ["trickVideo", "trick video"],
  ] as const)("formats %s as %s", (entityType, expected) => {
    const msg = getNotificationMessage("like", entityType, 1, ["Test"]);
    expect(msg).toContain(expected);
  });
});

describe("review notifications", () => {
  it("formats approved review notification message", () => {
    const msg = getNotificationMessage(
      "review",
      "trickSubmission",
      1,
      ["Admin"],
      "approved",
    );
    expect(msg).toBe("Your trick submission was approved");
  });

  it("formats rejected review notification message", () => {
    const msg = getNotificationMessage(
      "review",
      "trickVideo",
      1,
      ["Admin"],
      "rejected",
    );
    expect(msg).toBe("Your trick video was rejected");
  });
});

describe("getNotificationAction", () => {
  it("formats like action", () => {
    expect(getNotificationAction("like", "post")).toBe("liked your post");
  });

  it("formats like action with title", () => {
    expect(getNotificationAction("like", "post", "My Post")).toBe(
      'liked your post "My Post"',
    );
  });

  it("formats comment action", () => {
    expect(getNotificationAction("comment", "utvVideo")).toBe(
      "commented on your video",
    );
  });

  it("formats comment action with title", () => {
    expect(getNotificationAction("comment", "riuSet", "Cool Set")).toBe(
      'commented on your RIU set "Cool Set"',
    );
  });

  it("formats follow action", () => {
    expect(getNotificationAction("follow", "user")).toBe(
      "started following you",
    );
  });

  it("formats new_content action", () => {
    expect(getNotificationAction("new_content", "post")).toBe("posted post");
  });

  it("formats new_content action with title", () => {
    expect(getNotificationAction("new_content", "utvVideo", "My Video")).toBe(
      'posted video "My Video"',
    );
  });

  it("formats review action", () => {
    expect(getNotificationAction("review", "trickSubmission", "approved")).toBe(
      "trick submission was approved",
    );
  });

  it("formats review rejection", () => {
    expect(getNotificationAction("review", "trickVideo", "rejected")).toBe(
      "trick video was rejected",
    );
  });

  it("handles unknown type", () => {
    // @ts-expect-error - testing unknown type
    expect(getNotificationAction("unknown", "post")).toBe(
      "sent you a notification",
    );
  });
});

describe("getNotificationUrl with data", () => {
  it("returns trick URL with slug for trickSubmission", () => {
    expect(
      getNotificationUrl("trickSubmission", 123, { trickSlug: "kickflip" }),
    ).toBe("/tricks/kickflip");
  });

  it("returns trick URL with slug for trickSuggestion", () => {
    expect(
      getNotificationUrl("trickSuggestion", 456, { trickSlug: "heelflip" }),
    ).toBe("/tricks/heelflip");
  });

  it("returns trick URL with slug for trickVideo", () => {
    expect(
      getNotificationUrl("trickVideo", 789, { trickSlug: "tre-flip" }),
    ).toBe("/tricks/tre-flip");
  });

  it("returns fallback /tricks when no slug provided", () => {
    expect(getNotificationUrl("trickSubmission", 123, {})).toBe("/tricks");
    expect(getNotificationUrl("trickVideo", 456, null)).toBe("/tricks");
    expect(getNotificationUrl("trickSuggestion", 789)).toBe("/tricks");
  });
});

import {
  type NotificationPreferences,
  shouldCreateNotification,
} from "./helpers.server"

const defaults: NotificationPreferences = {
  likesEnabled: true,
  commentsEnabled: true,
  followsEnabled: true,
  newContentEnabled: true,
  mentionsEnabled: true,
}

describe("shouldCreateNotification", () => {
  describe("self-notification prevention", () => {
    it("returns false when actorId equals userId", () => {
      expect(
        shouldCreateNotification({ actorId: 1, userId: 1, type: "like" }, null),
      ).toBe(false)
    })

    it("returns true when actorId differs from userId", () => {
      expect(
        shouldCreateNotification({ actorId: 2, userId: 1, type: "like" }, null),
      ).toBe(true)
    })

    it("returns true when actorId is undefined", () => {
      expect(
        shouldCreateNotification(
          { actorId: undefined, userId: 1, type: "like" },
          null,
        ),
      ).toBe(true)
    })
  })

  describe("no settings (defaults)", () => {
    it("allows all notification types when settings are null", () => {
      for (const type of [
        "like",
        "comment",
        "follow",
        "new_content",
        "mention",
      ] as const) {
        expect(
          shouldCreateNotification({ actorId: 2, userId: 1, type }, null),
        ).toBe(true)
      }
    })
  })

  describe("preference checks", () => {
    it("skips like when likesEnabled is false", () => {
      expect(
        shouldCreateNotification(
          { actorId: 2, userId: 1, type: "like" },
          {
            ...defaults,
            likesEnabled: false,
          },
        ),
      ).toBe(false)
    })

    it("skips comment when commentsEnabled is false", () => {
      expect(
        shouldCreateNotification(
          { actorId: 2, userId: 1, type: "comment" },
          {
            ...defaults,
            commentsEnabled: false,
          },
        ),
      ).toBe(false)
    })

    it("skips follow when followsEnabled is false", () => {
      expect(
        shouldCreateNotification(
          { actorId: 2, userId: 1, type: "follow" },
          {
            ...defaults,
            followsEnabled: false,
          },
        ),
      ).toBe(false)
    })

    it("skips new_content when newContentEnabled is false", () => {
      expect(
        shouldCreateNotification(
          { actorId: 2, userId: 1, type: "new_content" },
          { ...defaults, newContentEnabled: false },
        ),
      ).toBe(false)
    })

    it("skips mention when mentionsEnabled is false", () => {
      expect(
        shouldCreateNotification(
          { actorId: 2, userId: 1, type: "mention" },
          { ...defaults, mentionsEnabled: false },
        ),
      ).toBe(false)
    })

    it("allows like when likesEnabled is true", () => {
      expect(
        shouldCreateNotification(
          { actorId: 2, userId: 1, type: "like" },
          defaults,
        ),
      ).toBe(true)
    })
  })

  describe("system notification bypass", () => {
    const disabledAll: NotificationPreferences = {
      likesEnabled: false,
      commentsEnabled: false,
      followsEnabled: false,
      newContentEnabled: false,
      mentionsEnabled: false,
    }

    it.each(["archive_request", "chain_archived", "review", "flag"] as const)(
      "allows %s even when all preferences are disabled",
      (type) => {
        expect(
          shouldCreateNotification(
            { actorId: 2, userId: 1, type },
            disabledAll,
          ),
        ).toBe(true)
      },
    )

    it.each(["archive_request", "chain_archived", "review", "flag"] as const)(
      "allows %s when settings are null",
      (type) => {
        expect(
          shouldCreateNotification({ actorId: 2, userId: 1, type }, null),
        ).toBe(true)
      },
    )
  })

  describe("self-notification takes priority over system bypass", () => {
    it("returns false for system type when actorId equals userId", () => {
      expect(
        shouldCreateNotification(
          { actorId: 1, userId: 1, type: "review" },
          null,
        ),
      ).toBe(false)
    })
  })
})

import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations"

import { type TournamentState } from "~/lib/tourney/types"

export const TRICK_SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const

export const trickSubmissionStatusEnum = pgEnum(
  "trick_submission_status",
  TRICK_SUBMISSION_STATUSES,
)
export const RIU_STATUSES = ["archived", "active", "upcoming"] as const
// enums
export const riuStatusEnum = pgEnum("riu_status", RIU_STATUSES)

export const SIU_STATUSES = ["active", "archived"] as const
export const siuStatusEnum = pgEnum("siu_status", SIU_STATUSES)

export const USER_TYPES = ["user", "admin", "test"] as const
export const userTypeEnum = pgEnum("user_type", USER_TYPES)

export const USER_DISCIPLINES = [
  "street",
  "flatland",
  "trials",
  "freestyle",
  "mountain",
  "distance",
  "other",
] as const

export type UserDiscipline = (typeof USER_DISCIPLINES)[number]

export const POST_TAGS = [
  "flatland",
  "street",
  "trials",
  "freestyle",
  "mountain",
  "distance",
  "random",
  "memes",
  "buy",
  "sell",
  "nbds",
  "til",
  "bails",
] as const

type PostTag = (typeof POST_TAGS)[number]

export const postTagEnum = pgEnum("post_tag", POST_TAGS)

// Notification enums
export const NOTIFICATION_TYPES = [
  "like",
  "message_like",
  "comment",
  "follow",
  "new_content",
  "archive_request",
  "chain_archived",
  "review",
  "flag",
  "mention",
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const notificationTypeEnum = pgEnum(
  "notification_type",
  NOTIFICATION_TYPES,
)

export const NOTIFICATION_ENTITY_TYPES = [
  "chat",
  "post",
  "riuSet",
  "riuSubmission",
  "biuSet",
  "siuSet",
  "siu",
  "utvVideo",
  "utvVideoSuggestion",
  "user",
  "trickSubmission",
  "trickSuggestion",
  "trickVideo",
  "glossaryProposal",
] as const

export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[number]

export const notificationEntityTypeEnum = pgEnum(
  "notification_entity_type",
  NOTIFICATION_ENTITY_TYPES,
)

export const users = pgTable("users", {
  avatarId: text("avatar_id"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  disciplines: json("disciplines").$type<UserDiscipline[]>(),
  email: text("email").unique().notNull(),
  id: serial("id").primaryKey(),
  lastSeenAt: timestamp("last_seen_at"),
  name: text("name").notNull(),
  notifyWhenShop: boolean("notify_when_shop").notNull().default(false),
  type: userTypeEnum("type").default("user"),
})

export const userLocations = pgTable("user_locations", {
  countryCode: text("country_code").notNull(),
  countryName: text("country_name").notNull(),
  label: text("label").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const userSocials = pgTable("user_socials", {
  facebook: text("facebook"),

  instagram: text("instagram"),
  spotify: text("spotify"),
  tiktok: text("tiktok"),
  twitter: text("twitter"),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  youtube: text("youtube"),
})

export const authCodes = pgTable("auth_codes", {
  id: text("id").primaryKey(),
  email: text("email"),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
})

export const posts = pgTable("posts", {
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  id: serial("id").primaryKey(),
  imageId: text("image_id"),
  tags: json("tags").$type<PostTag[]>().default([]),

  title: text("title").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  muxAssetId: text("mux_asset_id").references(() => muxVideos.assetId, {
    onDelete: "set null",
  }),

  youtubeVideoId: text("youtube_video_id"),
})

export const chatMessages = pgTable("chat_messages", {
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const chatMessageLikes = pgTable(
  "chat_message_likes",
  {
    chatMessageId: integer("chat_message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.chatMessageId, t.userId] })],
)

export const postMessages = pgTable("post_messages", {
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const postLikes = pgTable(
  "post_likes",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
)

export const postMessageLikes = pgTable(
  "post_message_likes",
  {
    postMessageId: integer("post_message_id")
      .notNull()
      .references(() => postMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postMessageId, t.userId] })],
)

export const riuSetMessages = pgTable("riu_set_messages", {
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  id: serial("id").primaryKey(),
  riuSetId: integer("riu_set_id")
    .notNull()
    .references(() => riuSets.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const riuSetLikes = pgTable(
  "riu_set_likes",
  {
    riuSetId: integer("riu_set_id")
      .notNull()
      .references(() => riuSets.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.riuSetId, t.userId] })],
)

export const riuSetMessageLikes = pgTable(
  "riu_set_message_likes",
  {
    riuSetMessageId: integer("riu_set_message_id")
      .notNull()
      .references(() => riuSetMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.riuSetMessageId, t.userId] })],
)

export const riuSubmissionMessages = pgTable("riu_submission_messages", {
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  id: serial("id").primaryKey(),
  riuSubmissionId: integer("riu_submission_id")
    .notNull()
    .references(() => riuSubmissions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const riuSubmissionMessageLikes = pgTable(
  "riu_submission_message_likes",
  {
    riuSubmissionMessageId: integer("riu_submission_message_id")
      .notNull()
      .references(() => riuSubmissionMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.riuSubmissionMessageId, t.userId] })],
)

export const riuSubmissionLikes = pgTable(
  "riu_submission_likes",
  {
    riuSubmissionId: integer("riu_submission_id")
      .notNull()
      .references(() => riuSubmissions.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.riuSubmissionId, t.userId] })],
)

export const utvVideos = pgTable("utv_videos", {
  id: serial("id").primaryKey(),
  legacyUrl: text("legacy_url").notNull(),
  legacyTitle: text("legacy_title").notNull(),
  title: text("title").notNull().default(""),
  thumbnailScale: real("thumbnail_scale").notNull().default(1),
  thumbnailSeconds: integer("thumbnail_seconds").notNull().default(30),
  titleConfidenceScore: integer("title_confidence_score").notNull().default(-1),
  disciplines: json("disciplines").$type<UserDiscipline[]>(),
  muxAssetId: text("mux_asset_id").references(() => muxVideos.assetId, {
    onDelete: "set null",
  }),
})

export const utvVideoRiders = pgTable("utv_video_riders", {
  id: serial("id").primaryKey(),
  utvVideoId: integer("utv_video_id")
    .notNull()
    .references(() => utvVideos.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  name: text("name"),
  order: integer("order").notNull().default(0),
})

export const utvVideoLikes = pgTable(
  "utv_video_likes",
  {
    utvVideoId: integer("utv_video_id")
      .notNull()
      .references(() => utvVideos.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.utvVideoId, t.userId] })],
)

export const utvVideoMessages = pgTable("utv_video_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  utvVideoId: integer("utv_video_id")
    .notNull()
    .references(() => utvVideos.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const utvVideoMessageLikes = pgTable(
  "utv_video_message_likes",
  {
    utvVideoMessageId: integer("utv_video_message_id")
      .notNull()
      .references(() => utvVideoMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.utvVideoMessageId, t.userId] })],
)

// UTV Video Suggestions (edits to existing videos)
export type UtvVideoSuggestionDiff = {
  title?: string
  disciplines?: UserDiscipline[] | null
  riders?: { userId: number | null; name: string | null }[]
}

export const utvVideoSuggestions = pgTable("utv_video_suggestions", {
  id: serial("id").primaryKey(),
  utvVideoId: integer("utv_video_id")
    .notNull()
    .references(() => utvVideos.id, { onDelete: "cascade" }),
  diff: json("diff").$type<UtvVideoSuggestionDiff>().notNull(),
  reason: text("reason"),
  status: trickSubmissionStatusEnum("status").notNull().default("pending"),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const utvClaps = pgTable("utv_claps", {
  id: serial("id").primaryKey(),
  count: integer("count").notNull().default(0),
})

export const muxVideos = pgTable("mux_videos", {
  assetId: text("asset_id").primaryKey(),
  playbackId: text("playback_id").unique(),
  uploadId: text("upload_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const rius = pgTable("rius", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at"),
  status: riuStatusEnum("status").default("upcoming"),
})

export const riuSets = pgTable("riu_sets", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  instructions: text("instructions"),
  id: serial("id").primaryKey(),
  name: text("name").notNull(),

  riuId: integer("riu_id")
    .notNull()
    .references(() => rius.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  muxAssetId: text("mux_asset_id")
    .references(() => muxVideos.assetId, {
      onDelete: "set null",
    })
    .notNull(),
})

export const riuSubmissions = pgTable("riu_submissions", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  id: serial("id").primaryKey(),

  riuSetId: integer("riu_set_id")
    .notNull()
    .references(() => riuSets.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  muxAssetId: text("mux_asset_id")
    .references(() => muxVideos.assetId, {
      onDelete: "set null",
    })
    .notNull(),
})

// BIU (Back It Up) Game Tables
export const bius = pgTable("bius", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const biuSets = pgTable("biu_sets", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  biuId: integer("biu_id")
    .notNull()
    .references(() => bius.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  muxAssetId: text("mux_asset_id")
    .references(() => muxVideos.assetId, { onDelete: "set null" })
    .notNull(),

  name: text("name").notNull(),
  position: integer("position").notNull(),
  parentSetId: integer("parent_set_id"),
  deletedAt: timestamp("deleted_at"),
})

export const biuSetLikes = pgTable(
  "biu_set_likes",
  {
    biuSetId: integer("biu_set_id")
      .notNull()
      .references(() => biuSets.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.biuSetId, t.userId] })],
)

export const biuSetMessages = pgTable("biu_set_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  biuSetId: integer("biu_set_id")
    .notNull()
    .references(() => biuSets.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const biuSetMessageLikes = pgTable(
  "biu_set_message_likes",
  {
    biuSetMessageId: integer("biu_set_message_id")
      .notNull()
      .references(() => biuSetMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.biuSetMessageId, t.userId] })],
)

// SIU (Stack It Up) Game Tables
export const sius = pgTable("sius", {
  id: serial("id").primaryKey(),
  status: siuStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
})

export const siuSets = pgTable("siu_sets", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  siuId: integer("siu_id")
    .notNull()
    .references(() => sius.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  muxAssetId: text("mux_asset_id")
    .references(() => muxVideos.assetId, { onDelete: "set null" })
    .notNull(),

  name: text("name").notNull(),
  position: integer("position").notNull(),
  parentSetId: integer("parent_set_id"),
  deletedAt: timestamp("deleted_at"),
})

export const siuArchiveVotes = pgTable(
  "siu_archive_votes",
  {
    siuId: integer("siu_id")
      .notNull()
      .references(() => sius.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.siuId, t.userId] })],
)

export const siuSetLikes = pgTable(
  "siu_set_likes",
  {
    siuSetId: integer("siu_set_id")
      .notNull()
      .references(() => siuSets.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.siuSetId, t.userId] })],
)

export const siuSetMessages = pgTable("siu_set_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  siuSetId: integer("siu_set_id")
    .notNull()
    .references(() => siuSets.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const siuSetMessageLikes = pgTable(
  "siu_set_message_likes",
  {
    siuSetMessageId: integer("siu_set_message_id")
      .notNull()
      .references(() => siuSetMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.siuSetMessageId, t.userId] })],
)

export const userFollows = pgTable(
  "user_follows",
  {
    followedByUserId: integer("followed_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followedUserId: integer("followed_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.followedUserId, t.followedByUserId] })],
)

// Notifications
export type NotificationData = {
  actorName?: string
  actorAvatarId?: string | null
  entityTitle?: string
  entityPreview?: string
  trickId?: number
  messageId?: number
}

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    type: notificationTypeEnum("type").notNull(),
    entityType: notificationEntityTypeEnum("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    data: json("data").$type<NotificationData>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
    emailedAt: timestamp("emailed_at"),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.readAt),
    index("notifications_grouping_idx").on(t.userId, t.entityType, t.entityId),
    index("notifications_created_at_idx").on(t.createdAt),
  ],
)

export const EMAIL_DIGEST_FREQUENCIES = ["off", "weekly", "monthly"] as const
export type EmailDigestFrequency = (typeof EMAIL_DIGEST_FREQUENCIES)[number]

export const EMAIL_REMINDER_TYPES = ["digest", "game_start"] as const
export type EmailReminderType = (typeof EMAIL_REMINDER_TYPES)[number]

export const userNotificationSettings = pgTable("user_notification_settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // In-app notification toggles
  likesEnabled: boolean("likes_enabled").notNull().default(true),
  commentsEnabled: boolean("comments_enabled").notNull().default(true),
  followsEnabled: boolean("follows_enabled").notNull().default(true),
  newContentEnabled: boolean("new_content_enabled").notNull().default(true),
  mentionsEnabled: boolean("mentions_enabled").notNull().default(true),
  // Email digest preferences (opt-in, default off)
  emailDigestFrequency: text("email_digest_frequency")
    .$type<EmailDigestFrequency>()
    .notNull()
    .default("off"),
  emailDigestDayOfWeek: integer("email_digest_day_of_week").default(0), // 0=Sunday
  emailDigestDayOfMonth: integer("email_digest_day_of_month").default(1), // 1st of month
  emailDigestHourUtc: integer("email_digest_hour_utc").default(9), // 9am UTC
  // Game start reminder preferences (opt-in, default off)
  gameStartReminderEnabled: boolean("game_start_reminder_enabled")
    .notNull()
    .default(false),
  gameStartReminderHoursBefore: integer(
    "game_start_reminder_hours_before",
  ).default(24),
  // Global email unsubscribe
  emailUnsubscribedAll: boolean("email_unsubscribed_all")
    .notNull()
    .default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Track sent email reminders to avoid duplicates
export const emailRemindersSent = pgTable(
  "email_reminders_sent",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reminderType: text("reminder_type").$type<EmailReminderType>().notNull(),
    riuId: integer("riu_id").references(() => rius.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (t) => [
    index("email_reminders_sent_user_type_riu_idx").on(
      t.userId,
      t.reminderType,
      t.riuId,
    ),
  ],
)

// Flags
export const FLAG_ENTITY_TYPES = [
  "post",
  "biuSet",
  "siuSet",
  "riuSet",
  "riuSubmission",
  "postMessage",
  "biuSetMessage",
  "siuSetMessage",
  "riuSetMessage",
  "riuSubmissionMessage",
  "utvVideoMessage",
  "chatMessage",
] as const

export type FlagEntityType = (typeof FLAG_ENTITY_TYPES)[number]

export const flagEntityTypeEnum = pgEnum("flag_entity_type", FLAG_ENTITY_TYPES)

export const flags = pgTable("flags", {
  id: serial("id").primaryKey(),
  entityType: flagEntityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  reason: text("reason").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: integer("resolved_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  resolution: text("resolution"), // "dismissed" or "removed"
  parentEntityId: integer("parent_entity_id"), // only for message flags
})

/**
 * Relations
 */

export const usersRelations = relations(users, ({ many, one }) => ({
  chatMessages: many(chatMessages),
  followedByUsers: many(userFollows, { relationName: "followedByUsers" }),
  followingUsers: many(userFollows, { relationName: "followingUsers" }),
  likedPosts: many(postLikes),
  likedRiuSubmissions: many(riuSubmissionLikes),
  location: one(userLocations),
  notifications: many(notifications),
  notificationSettings: one(userNotificationSettings),
  posts: many(posts),
  riuSetMessages: many(riuSetMessages),
  riuSubmissionMessages: many(riuSubmissionMessages),
  socials: one(userSocials),
  authCodes: many(authCodes),
}))

export const authCodesRelations = relations(authCodes, ({ one }) => ({
  user: one(users, { fields: [authCodes.email], references: [users.email] }),
}))

export const locationsRelations = relations(userLocations, ({ one }) => ({
  user: one(users, { fields: [userLocations.userId], references: [users.id] }),
}))

export const userSocialsRelations = relations(userSocials, ({ one }) => ({
  user: one(users, { fields: [userSocials.userId], references: [users.id] }),
}))

// POSTS
export const postsRelations = relations(posts, ({ many, one }) => ({
  likes: many(postLikes),
  messages: many(postMessages),
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  video: one(muxVideos, {
    fields: [posts.muxAssetId],
    references: [muxVideos.assetId],
  }),
}))

export const utvVideosRelations = relations(utvVideos, ({ one, many }) => ({
  video: one(muxVideos, {
    fields: [utvVideos.muxAssetId],
    references: [muxVideos.assetId],
  }),
  likes: many(utvVideoLikes),
  messages: many(utvVideoMessages),
  riders: many(utvVideoRiders),
  suggestions: many(utvVideoSuggestions),
}))

export const utvVideoRidersRelations = relations(utvVideoRiders, ({ one }) => ({
  utvVideo: one(utvVideos, {
    fields: [utvVideoRiders.utvVideoId],
    references: [utvVideos.id],
  }),
  user: one(users, {
    fields: [utvVideoRiders.userId],
    references: [users.id],
  }),
}))

export const utvVideoLikesRelations = relations(utvVideoLikes, ({ one }) => ({
  utvVideo: one(utvVideos, {
    fields: [utvVideoLikes.utvVideoId],
    references: [utvVideos.id],
  }),
  user: one(users, {
    fields: [utvVideoLikes.userId],
    references: [users.id],
  }),
}))

export const utvVideoMessagesRelations = relations(
  utvVideoMessages,
  ({ one, many }) => ({
    utvVideo: one(utvVideos, {
      fields: [utvVideoMessages.utvVideoId],
      references: [utvVideos.id],
    }),
    user: one(users, {
      fields: [utvVideoMessages.userId],
      references: [users.id],
    }),
    likes: many(utvVideoMessageLikes),
  }),
)

export const utvVideoMessageLikesRelations = relations(
  utvVideoMessageLikes,
  ({ one }) => ({
    message: one(utvVideoMessages, {
      fields: [utvVideoMessageLikes.utvVideoMessageId],
      references: [utvVideoMessages.id],
    }),
    user: one(users, {
      fields: [utvVideoMessageLikes.userId],
      references: [users.id],
    }),
  }),
)

export const utvVideoSuggestionsRelations = relations(
  utvVideoSuggestions,
  ({ one }) => ({
    utvVideo: one(utvVideos, {
      fields: [utvVideoSuggestions.utvVideoId],
      references: [utvVideos.id],
    }),
    submittedBy: one(users, {
      fields: [utvVideoSuggestions.submittedByUserId],
      references: [users.id],
      relationName: "submittedByUser",
    }),
    reviewedBy: one(users, {
      fields: [utvVideoSuggestions.reviewedByUserId],
      references: [users.id],
      relationName: "reviewedByUser",
    }),
  }),
)

export const riusRelations = relations(rius, ({ many }) => ({
  // likes: many(postLikes),
  sets: many(riuSets),
}))

export const riuSetsRelations = relations(riuSets, ({ many, one }) => ({
  likes: many(riuSetLikes),
  messages: many(riuSetMessages),
  riu: one(rius, { fields: [riuSets.riuId], references: [rius.id] }),
  submissions: many(riuSubmissions),
  user: one(users, { fields: [riuSets.userId], references: [users.id] }),
  video: one(muxVideos, {
    fields: [riuSets.muxAssetId],
    references: [muxVideos.assetId],
  }),
}))

export const riuSubmissionsRelations = relations(
  riuSubmissions,
  ({ one, many }) => ({
    likes: many(riuSubmissionLikes),
    messages: many(riuSubmissionMessages),
    riuSet: one(riuSets, {
      fields: [riuSubmissions.riuSetId],
      references: [riuSets.id],
    }),
    user: one(users, {
      fields: [riuSubmissions.userId],
      references: [users.id],
    }),
    video: one(muxVideos, {
      fields: [riuSubmissions.muxAssetId],
      references: [muxVideos.assetId],
    }),
  }),
)

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, { fields: [postLikes.postId], references: [posts.id] }),
  user: one(users, { fields: [postLikes.userId], references: [users.id] }),
}))

export const postMessagesRelations = relations(
  postMessages,
  ({ many, one }) => ({
    likes: many(postMessageLikes),
    post: one(posts, { fields: [postMessages.postId], references: [posts.id] }),
    user: one(users, { fields: [postMessages.userId], references: [users.id] }),
  }),
)

export const postMessageLikesRelations = relations(
  postMessageLikes,
  ({ one }) => ({
    postMessage: one(postMessages, {
      fields: [postMessageLikes.postMessageId],
      references: [postMessages.id],
    }),
    user: one(users, {
      fields: [postMessageLikes.userId],
      references: [users.id],
    }),
  }),
)

// CHAT
export const chatMessagesRelations = relations(
  chatMessages,
  ({ many, one }) => ({
    likes: many(chatMessageLikes),
    user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
  }),
)

export const chatMessageLikesRelations = relations(
  chatMessageLikes,
  ({ one }) => ({
    chatMessage: one(chatMessages, {
      fields: [chatMessageLikes.chatMessageId],
      references: [chatMessages.id],
    }),
    user: one(users, {
      fields: [chatMessageLikes.userId],
      references: [users.id],
    }),
  }),
)

// RIU SET MESSAGES
export const riuSetMessagesRelations = relations(
  riuSetMessages,
  ({ many, one }) => ({
    likes: many(riuSetMessageLikes),
    riuSet: one(riuSets, {
      fields: [riuSetMessages.riuSetId],
      references: [riuSets.id],
    }),
    user: one(users, {
      fields: [riuSetMessages.userId],
      references: [users.id],
    }),
  }),
)

export const riuSetLikesRelations = relations(riuSetLikes, ({ one }) => ({
  riuSet: one(riuSets, {
    fields: [riuSetLikes.riuSetId],
    references: [riuSets.id],
  }),
  user: one(users, {
    fields: [riuSetLikes.userId],
    references: [users.id],
  }),
}))

export const riuSetMessageLikesRelations = relations(
  riuSetMessageLikes,
  ({ one }) => ({
    riuSetMessage: one(riuSetMessages, {
      fields: [riuSetMessageLikes.riuSetMessageId],
      references: [riuSetMessages.id],
    }),
    user: one(users, {
      fields: [riuSetMessageLikes.userId],
      references: [users.id],
    }),
  }),
)

// RIU SUBMISSION MESSAGES
export const riuSubmissionMessagesRelations = relations(
  riuSubmissionMessages,
  ({ many, one }) => ({
    likes: many(riuSubmissionMessageLikes),
    riuSubmission: one(riuSubmissions, {
      fields: [riuSubmissionMessages.riuSubmissionId],
      references: [riuSubmissions.id],
    }),
    user: one(users, {
      fields: [riuSubmissionMessages.userId],
      references: [users.id],
    }),
  }),
)

export const riuSubmissionMessageLikesRelations = relations(
  riuSubmissionMessageLikes,
  ({ one }) => ({
    riuSubmissionMessage: one(riuSubmissionMessages, {
      fields: [riuSubmissionMessageLikes.riuSubmissionMessageId],
      references: [riuSubmissionMessages.id],
    }),
    user: one(users, {
      fields: [riuSubmissionMessageLikes.userId],
      references: [users.id],
    }),
  }),
)

export const riuSubmissionLikesRelations = relations(
  riuSubmissionLikes,
  ({ one }) => ({
    riuSubmission: one(riuSubmissions, {
      fields: [riuSubmissionLikes.riuSubmissionId],
      references: [riuSubmissions.id],
    }),
    user: one(users, {
      fields: [riuSubmissionLikes.userId],
      references: [users.id],
    }),
  }),
)

// BIU Relations
export const biusRelations = relations(bius, ({ many }) => ({
  sets: many(biuSets),
}))

export const biuSetsRelations = relations(biuSets, ({ one, many }) => ({
  biu: one(bius, {
    fields: [biuSets.biuId],
    references: [bius.id],
  }),
  user: one(users, {
    fields: [biuSets.userId],
    references: [users.id],
  }),
  video: one(muxVideos, {
    fields: [biuSets.muxAssetId],
    references: [muxVideos.assetId],
  }),
  parentSet: one(biuSets, {
    fields: [biuSets.parentSetId],
    references: [biuSets.id],
    relationName: "parentChild",
  }),
  childSets: many(biuSets, { relationName: "parentChild" }),
  likes: many(biuSetLikes),
  messages: many(biuSetMessages),
}))

export const biuSetLikesRelations = relations(biuSetLikes, ({ one }) => ({
  biuSet: one(biuSets, {
    fields: [biuSetLikes.biuSetId],
    references: [biuSets.id],
  }),
  user: one(users, {
    fields: [biuSetLikes.userId],
    references: [users.id],
  }),
}))

export const biuSetMessagesRelations = relations(
  biuSetMessages,
  ({ one, many }) => ({
    biuSet: one(biuSets, {
      fields: [biuSetMessages.biuSetId],
      references: [biuSets.id],
    }),
    user: one(users, {
      fields: [biuSetMessages.userId],
      references: [users.id],
    }),
    likes: many(biuSetMessageLikes),
  }),
)

export const biuSetMessageLikesRelations = relations(
  biuSetMessageLikes,
  ({ one }) => ({
    message: one(biuSetMessages, {
      fields: [biuSetMessageLikes.biuSetMessageId],
      references: [biuSetMessages.id],
    }),
    user: one(users, {
      fields: [biuSetMessageLikes.userId],
      references: [users.id],
    }),
  }),
)

// SIU Relations
export const siusRelations = relations(sius, ({ many }) => ({
  sets: many(siuSets),
  archiveVotes: many(siuArchiveVotes),
}))

export const siuSetsRelations = relations(siuSets, ({ one, many }) => ({
  siu: one(sius, {
    fields: [siuSets.siuId],
    references: [sius.id],
  }),
  user: one(users, {
    fields: [siuSets.userId],
    references: [users.id],
  }),
  video: one(muxVideos, {
    fields: [siuSets.muxAssetId],
    references: [muxVideos.assetId],
  }),
  parentSet: one(siuSets, {
    fields: [siuSets.parentSetId],
    references: [siuSets.id],
    relationName: "parentChild",
  }),
  childSets: many(siuSets, { relationName: "parentChild" }),
  likes: many(siuSetLikes),
  messages: many(siuSetMessages),
}))

export const siuArchiveVotesRelations = relations(
  siuArchiveVotes,
  ({ one }) => ({
    siu: one(sius, {
      fields: [siuArchiveVotes.siuId],
      references: [sius.id],
    }),
    user: one(users, {
      fields: [siuArchiveVotes.userId],
      references: [users.id],
    }),
  }),
)

export const siuSetLikesRelations = relations(siuSetLikes, ({ one }) => ({
  siuSet: one(siuSets, {
    fields: [siuSetLikes.siuSetId],
    references: [siuSets.id],
  }),
  user: one(users, {
    fields: [siuSetLikes.userId],
    references: [users.id],
  }),
}))

export const siuSetMessagesRelations = relations(
  siuSetMessages,
  ({ one, many }) => ({
    siuSet: one(siuSets, {
      fields: [siuSetMessages.siuSetId],
      references: [siuSets.id],
    }),
    user: one(users, {
      fields: [siuSetMessages.userId],
      references: [users.id],
    }),
    likes: many(siuSetMessageLikes),
  }),
)

export const siuSetMessageLikesRelations = relations(
  siuSetMessageLikes,
  ({ one }) => ({
    message: one(siuSetMessages, {
      fields: [siuSetMessageLikes.siuSetMessageId],
      references: [siuSetMessages.id],
    }),
    user: one(users, {
      fields: [siuSetMessageLikes.userId],
      references: [users.id],
    }),
  }),
)

// Notification Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "notificationActor",
  }),
}))

export const flagsRelations = relations(flags, ({ one }) => ({
  user: one(users, {
    fields: [flags.userId],
    references: [users.id],
    relationName: "flagUser",
  }),
  resolvedByUser: one(users, {
    fields: [flags.resolvedByUserId],
    references: [users.id],
    relationName: "flagResolvedByUser",
  }),
}))

export const userNotificationSettingsRelations = relations(
  userNotificationSettings,
  ({ one }) => ({
    user: one(users, {
      fields: [userNotificationSettings.userId],
      references: [users.id],
    }),
  }),
)

export const emailRemindersSentRelations = relations(
  emailRemindersSent,
  ({ one }) => ({
    user: one(users, {
      fields: [emailRemindersSent.userId],
      references: [users.id],
    }),
    riu: one(rius, {
      fields: [emailRemindersSent.riuId],
      references: [rius.id],
    }),
  }),
)

export type InsertChatMessage = typeof chatMessages.$inferInsert
export type InsertLocation = typeof userLocations.$inferInsert

export type InsertPost = typeof posts.$inferInsert
export type InsertUser = typeof users.$inferInsert

export type SelectChatMessage = typeof chatMessages.$inferSelect
export type SelectLocation = typeof userLocations.$inferSelect

export type SelectPost = typeof posts.$inferSelect
export type SelectUser = typeof users.$inferSelect

// Trick Enums
export const CATCH_TYPES = ["one-foot", "two-foot"] as const
export const catchTypeEnum = pgEnum("catch_type", CATCH_TYPES)

export const TRICK_RELATIONSHIP_TYPES = [
  "prerequisite",
  "optional_prerequisite",
  "related",
] as const
export const trickRelationshipTypeEnum = pgEnum(
  "trick_relationship_type",
  TRICK_RELATIONSHIP_TYPES,
)

export const TRICK_VIDEO_STATUSES = ["active", "pending", "rejected"] as const
export const trickVideoStatusEnum = pgEnum(
  "trick_video_status",
  TRICK_VIDEO_STATUSES,
)

// Trick Modifiers (global, apply to any trick)
export const trickModifiers = pgTable("trick_modifiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Trick Elements (components that make up a trick: spin, flip, twist, etc.)
export const trickElements = pgTable("trick_elements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Core Tricks Table
export const tricks = pgTable("tricks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  alternateNames: json("alternate_names").$type<string[]>().default([]),
  description: text("description"),
  inventedBy: text("invented_by"),
  inventedByUserId: integer("invented_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  yearLanded: integer("year_landed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Trick Videos (multiple per trick)
export const trickVideos = pgTable(
  "trick_videos",
  {
    id: serial("id").primaryKey(),
    trickId: integer("trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    muxAssetId: text("mux_asset_id")
      .notNull()
      .references(() => muxVideos.assetId, { onDelete: "cascade" }),
    status: trickVideoStatusEnum("status").notNull().default("pending"),
    sortOrder: integer("sort_order").notNull().default(0),
    submittedByUserId: integer("submitted_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewedByUserId: integer("reviewed_by_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),
    reviewedAt: timestamp("reviewed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("trick_videos_trick_id_idx").on(t.trickId),
    index("trick_videos_status_idx").on(t.status),
  ],
)

// Trick Element Assignments (many-to-many)
export const trickElementAssignments = pgTable(
  "trick_element_assignments",
  {
    trickId: integer("trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    elementId: integer("element_id")
      .notNull()
      .references(() => trickElements.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickId, t.elementId] })],
)

// Trick Relationships (directed graph)
export const trickRelationships = pgTable(
  "trick_relationships",
  {
    id: serial("id").primaryKey(),
    sourceTrickId: integer("source_trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    targetTrickId: integer("target_trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    type: trickRelationshipTypeEnum("type").notNull(),
  },
  (t) => [
    index("trick_relationships_source_idx").on(t.sourceTrickId),
    index("trick_relationships_target_idx").on(t.targetTrickId),
  ],
)

// Trick Submissions (user-submitted for review)
export const trickSubmissions = pgTable("trick_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  alternateNames: json("alternate_names").$type<string[]>().default([]),
  description: text("description"),
  inventedBy: text("invented_by"),
  inventedByUserId: integer("invented_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  yearLanded: integer("year_landed"),
  videoUrl: text("video_url"),
  videoTimestamp: text("video_timestamp"),
  notes: text("notes"),
  status: trickSubmissionStatusEnum("status").notNull().default("pending"),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Trick Submission Element Assignments
export const trickSubmissionElementAssignments = pgTable(
  "trick_submission_element_assignments",
  {
    submissionId: integer("submission_id")
      .notNull()
      .references(() => trickSubmissions.id, { onDelete: "cascade" }),
    elementId: integer("element_id")
      .notNull()
      .references(() => trickElements.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.elementId] })],
)

// Trick Submission Relationships
export const trickSubmissionRelationships = pgTable(
  "trick_submission_relationships",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id")
      .notNull()
      .references(() => trickSubmissions.id, { onDelete: "cascade" }),
    targetTrickId: integer("target_trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    type: trickRelationshipTypeEnum("type").notNull(),
  },
)

// Trick Suggestions (edits to existing tricks)
export type TrickSuggestionDiff = {
  name?: string
  alternateNames?: string[]
  description?: string | null
  inventedBy?: string | null
  yearLanded?: number | null
  videoUrl?: string | null
  videoTimestamp?: string | null
  notes?: string | null
  elements?: string[]
  relationships?: {
    added: { targetId: number; type: string }[]
    removed: { targetId: number; type: string }[]
  }
}

export const trickSuggestions = pgTable("trick_suggestions", {
  id: serial("id").primaryKey(),
  trickId: integer("trick_id")
    .notNull()
    .references(() => tricks.id, { onDelete: "cascade" }),
  diff: json("diff").$type<TrickSuggestionDiff>().notNull(),
  reason: text("reason"),
  status: trickSubmissionStatusEnum("status").notNull().default("pending"),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Glossary Proposals (community-submitted element/modifier create or edit proposals)
export const GLOSSARY_PROPOSAL_ACTIONS = ["create", "edit"] as const
export const GLOSSARY_PROPOSAL_TYPES = ["element", "modifier"] as const

export const glossaryProposalActionEnum = pgEnum(
  "glossary_proposal_action",
  GLOSSARY_PROPOSAL_ACTIONS,
)
export const glossaryProposalTypeEnum = pgEnum(
  "glossary_proposal_type",
  GLOSSARY_PROPOSAL_TYPES,
)

export type GlossaryProposalDiff = {
  name?: string
  description?: string | null
}

export const glossaryProposals = pgTable("glossary_proposals", {
  id: serial("id").primaryKey(),
  action: glossaryProposalActionEnum("action").notNull(),
  type: glossaryProposalTypeEnum("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetId: integer("target_id"),
  diff: json("diff").$type<GlossaryProposalDiff>(),
  reason: text("reason"),
  status: trickSubmissionStatusEnum("status").notNull().default("pending"),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Trick Engagement Tables
export const trickLikes = pgTable(
  "trick_likes",
  {
    trickId: integer("trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickId, t.userId] })],
)

export const trickMessages = pgTable("trick_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  trickId: integer("trick_id")
    .notNull()
    .references(() => tricks.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const trickMessageLikes = pgTable(
  "trick_message_likes",
  {
    trickMessageId: integer("trick_message_id")
      .notNull()
      .references(() => trickMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickMessageId, t.userId] })],
)

// Trick Relations
export const trickModifiersRelations = relations(trickModifiers, () => ({}))

export const trickElementsRelations = relations(trickElements, ({ many }) => ({
  assignments: many(trickElementAssignments),
}))

export const tricksRelations = relations(tricks, ({ many }) => ({
  videos: many(trickVideos),
  elementAssignments: many(trickElementAssignments),
  outgoingRelationships: many(trickRelationships, {
    relationName: "sourceRelationships",
  }),
  incomingRelationships: many(trickRelationships, {
    relationName: "targetRelationships",
  }),
  likes: many(trickLikes),
  messages: many(trickMessages),
  suggestions: many(trickSuggestions),
}))

export const trickVideosRelations = relations(trickVideos, ({ one }) => ({
  trick: one(tricks, {
    fields: [trickVideos.trickId],
    references: [tricks.id],
  }),
  video: one(muxVideos, {
    fields: [trickVideos.muxAssetId],
    references: [muxVideos.assetId],
  }),
  submittedBy: one(users, {
    fields: [trickVideos.submittedByUserId],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [trickVideos.reviewedByUserId],
    references: [users.id],
  }),
}))

export const trickElementAssignmentsRelations = relations(
  trickElementAssignments,
  ({ one }) => ({
    trick: one(tricks, {
      fields: [trickElementAssignments.trickId],
      references: [tricks.id],
    }),
    element: one(trickElements, {
      fields: [trickElementAssignments.elementId],
      references: [trickElements.id],
    }),
  }),
)

export const trickRelationshipsRelations = relations(
  trickRelationships,
  ({ one }) => ({
    sourceTrick: one(tricks, {
      fields: [trickRelationships.sourceTrickId],
      references: [tricks.id],
      relationName: "sourceRelationships",
    }),
    targetTrick: one(tricks, {
      fields: [trickRelationships.targetTrickId],
      references: [tricks.id],
      relationName: "targetRelationships",
    }),
  }),
)

export const trickSubmissionsRelations = relations(
  trickSubmissions,
  ({ one, many }) => ({
    submittedBy: one(users, {
      fields: [trickSubmissions.submittedByUserId],
      references: [users.id],
    }),
    reviewedBy: one(users, {
      fields: [trickSubmissions.reviewedByUserId],
      references: [users.id],
    }),
    elementAssignments: many(trickSubmissionElementAssignments),
    relationships: many(trickSubmissionRelationships),
  }),
)

export const trickSubmissionElementAssignmentsRelations = relations(
  trickSubmissionElementAssignments,
  ({ one }) => ({
    submission: one(trickSubmissions, {
      fields: [trickSubmissionElementAssignments.submissionId],
      references: [trickSubmissions.id],
    }),
    element: one(trickElements, {
      fields: [trickSubmissionElementAssignments.elementId],
      references: [trickElements.id],
    }),
  }),
)

export const trickSubmissionRelationshipsRelations = relations(
  trickSubmissionRelationships,
  ({ one }) => ({
    submission: one(trickSubmissions, {
      fields: [trickSubmissionRelationships.submissionId],
      references: [trickSubmissions.id],
    }),
    targetTrick: one(tricks, {
      fields: [trickSubmissionRelationships.targetTrickId],
      references: [tricks.id],
    }),
  }),
)

export const trickSuggestionsRelations = relations(
  trickSuggestions,
  ({ one }) => ({
    trick: one(tricks, {
      fields: [trickSuggestions.trickId],
      references: [tricks.id],
    }),
    submittedBy: one(users, {
      fields: [trickSuggestions.submittedByUserId],
      references: [users.id],
    }),
    reviewedBy: one(users, {
      fields: [trickSuggestions.reviewedByUserId],
      references: [users.id],
    }),
  }),
)

export const trickLikesRelations = relations(trickLikes, ({ one }) => ({
  trick: one(tricks, {
    fields: [trickLikes.trickId],
    references: [tricks.id],
  }),
  user: one(users, {
    fields: [trickLikes.userId],
    references: [users.id],
  }),
}))

export const trickMessagesRelations = relations(
  trickMessages,
  ({ one, many }) => ({
    trick: one(tricks, {
      fields: [trickMessages.trickId],
      references: [tricks.id],
    }),
    user: one(users, {
      fields: [trickMessages.userId],
      references: [users.id],
    }),
    likes: many(trickMessageLikes),
  }),
)

export const trickMessageLikesRelations = relations(
  trickMessageLikes,
  ({ one }) => ({
    message: one(trickMessages, {
      fields: [trickMessageLikes.trickMessageId],
      references: [trickMessages.id],
    }),
    user: one(users, {
      fields: [trickMessageLikes.userId],
      references: [users.id],
    }),
  }),
)

// Glossary Proposal Relations
export const glossaryProposalsRelations = relations(
  glossaryProposals,
  ({ one }) => ({
    submittedBy: one(users, {
      fields: [glossaryProposals.submittedByUserId],
      references: [users.id],
      relationName: "submittedByUser",
    }),
    reviewedBy: one(users, {
      fields: [glossaryProposals.reviewedByUserId],
      references: [users.id],
      relationName: "reviewedByUser",
    }),
  }),
)

// Tournaments

export const TOURNEY_PHASES = [
  "setup",
  "prelims",
  "ranking",
  "bracket",
  "complete",
] as const

export const tourneyPhaseEnum = pgEnum("tourney_phase", TOURNEY_PHASES)

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  phase: tourneyPhaseEnum("phase").notNull().default("setup"),
  createdByUserId: integer("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  state: json("state").$type<TournamentState>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const tournamentsRelations = relations(tournaments, ({ one }) => ({
  createdBy: one(users, {
    fields: [tournaments.createdByUserId],
    references: [users.id],
  }),
}))

// make sure to reset sequences when seeding. eg
// SELECT setval('users_id_seq', (SELECT MAX(id) FROM users), true);

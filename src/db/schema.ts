import { sql } from "drizzle-orm"
import { relations } from "drizzle-orm/relations"
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { RIU_STATUSES } from "~/lib/games/rius/lifecycle"
import { type TournamentState } from "~/lib/tourney/types"

export const TRICK_SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const

// enums

export const SIU_STATUSES = ["active", "archived"] as const

export const USER_TYPES = ["user", "admin", "test"] as const

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
  "game_activity",
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

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

export const users = sqliteTable("users", {
  avatarId: text("avatar_id"),
  bio: text("bio"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  disciplines: text("disciplines", { mode: "json" }).$type<UserDiscipline[]>(),
  email: text("email").unique().notNull(),
  id: integer("id").primaryKey({ autoIncrement: true }),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
  name: text("name").notNull(),
  arcadeHighScore: integer("arcade_high_score").notNull().default(0),
  notifyWhenShop: integer("notify_when_shop", { mode: "boolean" })
    .notNull()
    .default(false),
  type: text("type", { enum: USER_TYPES }).default("user"),
})

export const userLocations = sqliteTable("user_locations", {
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

export const userSocials = sqliteTable("user_socials", {
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

export const authCodes = sqliteTable("auth_codes", {
  id: text("id").primaryKey(),
  email: text("email"),
  code: text("code").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
})

// Fixed-window rate-limit counters (auth code send/entry). Enforced in the
// database because Workers isolates share no process memory — an in-memory
// limiter multiplies an attacker's budget by the isolate count.
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetsAt: integer("resets_at", { mode: "timestamp_ms" }).notNull(),
})

// Presence: one row per online subject ("user:<id>" or "anon:<ip hash>"),
// upserted by the 15s presence poll and pruned lazily on read. Replaces the
// old in-memory maps — Workers isolates share no process memory.
export const presence = sqliteTable("presence", {
  subject: text("subject").primaryKey(),
  userId: integer("user_id"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
})

export const posts = sqliteTable(
  "posts",
  {
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
    id: integer("id").primaryKey({ autoIncrement: true }),
    imageId: text("image_id"),
    tags: text("tags", { mode: "json" }).$type<PostTag[]>().default([]),

    title: text("title").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    muxAssetId: text("mux_asset_id").references(() => muxVideos.assetId, {
      onDelete: "set null",
    }),

    youtubeVideoId: text("youtube_video_id"),
  },
  (t) => [index("posts_user_created_idx").on(t.userId, t.createdAt)],
)

export const chatMessages = sqliteTable("chat_messages", {
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),

  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const chatMessageLikes = sqliteTable(
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

export const postMessages = sqliteTable(
  "post_messages",
  {
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),

    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [index("post_messages_user_created_idx").on(t.userId, t.createdAt)],
)

export const postLikes = sqliteTable(
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

export const postMessageLikes = sqliteTable(
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

export const riuSetMessages = sqliteTable("riu_set_messages", {
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),

  id: integer("id").primaryKey({ autoIncrement: true }),
  riuSetId: integer("riu_set_id")
    .notNull()
    .references(() => riuSets.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const riuSetLikes = sqliteTable(
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

export const riuSetMessageLikes = sqliteTable(
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

export const riuSubmissionMessages = sqliteTable("riu_submission_messages", {
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),

  id: integer("id").primaryKey({ autoIncrement: true }),
  riuSubmissionId: integer("riu_submission_id")
    .notNull()
    .references(() => riuSubmissions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const riuSubmissionMessageLikes = sqliteTable(
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

export const riuSubmissionLikes = sqliteTable(
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

export const utvVideos = sqliteTable("utv_videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  legacyUrl: text("legacy_url").notNull(),
  legacyTitle: text("legacy_title").notNull(),
  title: text("title").notNull().default(""),
  thumbnailScale: real("thumbnail_scale").notNull().default(1),
  thumbnailSeconds: integer("thumbnail_seconds").notNull().default(30),
  titleConfidenceScore: integer("title_confidence_score").notNull().default(-1),
  disciplines: text("disciplines", { mode: "json" }).$type<UserDiscipline[]>(),
  muxAssetId: text("mux_asset_id").references(() => muxVideos.assetId, {
    onDelete: "set null",
  }),
})

export const utvVideoRiders = sqliteTable("utv_video_riders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  utvVideoId: integer("utv_video_id")
    .notNull()
    .references(() => utvVideos.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  name: text("name"),
  order: integer("order").notNull().default(0),
})

export const utvVideoLikes = sqliteTable(
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

export const utvVideoMessages = sqliteTable("utv_video_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  utvVideoId: integer("utv_video_id")
    .notNull()
    .references(() => utvVideos.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const utvVideoMessageLikes = sqliteTable(
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

export const utvVideoSuggestions = sqliteTable("utv_video_suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  utvVideoId: integer("utv_video_id")
    .notNull()
    .references(() => utvVideos.id, { onDelete: "cascade" }),
  diff: text("diff", { mode: "json" })
    .$type<UtvVideoSuggestionDiff>()
    .notNull(),
  reason: text("reason"),
  status: text("status", { enum: TRICK_SUBMISSION_STATUSES })
    .notNull()
    .default("pending"),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  reviewNotes: text("review_notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

export const utvClaps = sqliteTable("utv_claps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  count: integer("count").notNull().default(0),
})

export const muxVideos = sqliteTable("mux_videos", {
  assetId: text("asset_id").primaryKey(),
  playbackId: text("playback_id").unique(),
  uploadId: text("upload_id").unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

export const rius = sqliteTable(
  "rius",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
    id: integer("id").primaryKey({ autoIncrement: true }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: RIU_STATUSES }).default("upcoming"),
  },
  (t) => [
    // The rotation invariant, enforced by the database: at most one active and
    // at most one upcoming round can exist at a time. Archived rounds are
    // unconstrained history.
    uniqueIndex("rius_one_active_idx")
      .on(t.status)
      .where(sql`${t.status} = 'active'`),
    uniqueIndex("rius_one_upcoming_idx")
      .on(t.status)
      .where(sql`${t.status} = 'upcoming'`),
  ],
)

export const riuSets = sqliteTable(
  "riu_sets",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
    instructions: text("instructions"),
    id: integer("id").primaryKey({ autoIncrement: true }),
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
  },
  (t) => [
    index("riu_sets_user_created_idx").on(t.userId, t.createdAt),
    index("riu_sets_riu_id_idx").on(t.riuId),
  ],
)

export const riuSubmissions = sqliteTable(
  "riu_submissions",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
    id: integer("id").primaryKey({ autoIncrement: true }),

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
  },
  (t) => [
    unique().on(t.riuSetId, t.userId),
    index("riu_submissions_user_created_idx").on(t.userId, t.createdAt),
  ],
)

// BIU (Back It Up) Game Tables
export const bius = sqliteTable("bius", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

export const biuSets = sqliteTable(
  "biu_sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),

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
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("biu_sets_user_created_idx").on(t.userId, t.createdAt),
    index("biu_sets_biu_id_idx").on(t.biuId),
    // Chain integrity, enforced by the database (D1 has no interactive
    // transactions): a live set can be continued at most once, and a round
    // can hold at most one live set per position.
    uniqueIndex("biu_sets_one_child_uq")
      .on(t.parentSetId)
      .where(sql`parent_set_id IS NOT NULL AND deleted_at IS NULL`),
    uniqueIndex("biu_sets_round_position_uq")
      .on(t.biuId, t.position)
      .where(sql`deleted_at IS NULL`),
  ],
)

export const biuSetLikes = sqliteTable(
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

export const biuSetMessages = sqliteTable("biu_set_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  biuSetId: integer("biu_set_id")
    .notNull()
    .references(() => biuSets.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const biuSetMessageLikes = sqliteTable(
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
export const sius = sqliteTable("sius", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status", { enum: SIU_STATUSES }).default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
})

export const siuSets = sqliteTable(
  "siu_sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),

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
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("siu_sets_user_created_idx").on(t.userId, t.createdAt),
    index("siu_sets_siu_id_idx").on(t.siuId),
    // Same chain-integrity indexes as biu_sets — see that table's comment.
    uniqueIndex("siu_sets_one_child_uq")
      .on(t.parentSetId)
      .where(sql`parent_set_id IS NOT NULL AND deleted_at IS NULL`),
    uniqueIndex("siu_sets_round_position_uq")
      .on(t.siuId, t.position)
      .where(sql`deleted_at IS NULL`),
  ],
)

export const siuArchiveVotes = sqliteTable(
  "siu_archive_votes",
  {
    siuId: integer("siu_id")
      .notNull()
      .references(() => sius.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  },
  (t) => [primaryKey({ columns: [t.siuId, t.userId] })],
)

export const siuSetLikes = sqliteTable(
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

export const siuSetMessages = sqliteTable("siu_set_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  siuSetId: integer("siu_set_id")
    .notNull()
    .references(() => siuSets.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const siuSetMessageLikes = sqliteTable(
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

export const userFollows = sqliteTable(
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

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    entityType: text("entity_type", {
      enum: NOTIFICATION_ENTITY_TYPES,
    }).notNull(),
    entityId: integer("entity_id").notNull(),
    data: text("data", { mode: "json" }).$type<NotificationData>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    emailedAt: integer("emailed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.readAt),
    index("notifications_grouping_idx").on(t.userId, t.entityType, t.entityId),
    index("notifications_created_at_idx").on(t.createdAt),
    index("notifications_user_emailed_created_idx").on(
      t.userId,
      t.emailedAt,
      t.createdAt,
    ),
  ],
)

export const EMAIL_DIGEST_FREQUENCIES = ["off", "weekly", "monthly"] as const
export type EmailDigestFrequency = (typeof EMAIL_DIGEST_FREQUENCIES)[number]

export const EMAIL_REMINDER_TYPES = ["digest", "game_start"] as const
export type EmailReminderType = (typeof EMAIL_REMINDER_TYPES)[number]

export const userNotificationSettings = sqliteTable(
  "user_notification_settings",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    // In-app notification toggles
    likesEnabled: integer("likes_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    commentsEnabled: integer("comments_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    followsEnabled: integer("follows_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    newContentEnabled: integer("new_content_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    mentionsEnabled: integer("mentions_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    gameActivityEnabled: integer("game_activity_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    // Email digest preferences (opt-in, default off)
    emailDigestFrequency: text("email_digest_frequency")
      .$type<EmailDigestFrequency>()
      .notNull()
      .default("off"),
    emailDigestDayOfWeek: integer("email_digest_day_of_week").default(0), // 0=Sunday
    emailDigestDayOfMonth: integer("email_digest_day_of_month").default(1), // 1st of month
    emailDigestHourUtc: integer("email_digest_hour_utc").default(9), // 9am UTC
    // Game start reminder preferences (opt-in, default off)
    gameStartReminderEnabled: integer("game_start_reminder_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    gameStartReminderHoursBefore: integer(
      "game_start_reminder_hours_before",
    ).default(24),
    // Global email unsubscribe
    emailUnsubscribedAll: integer("email_unsubscribed_all", { mode: "boolean" })
      .notNull()
      .default(false),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  },
)

// Track sent email reminders to avoid duplicates
export const emailRemindersSent = sqliteTable(
  "email_reminders_sent",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reminderType: text("reminder_type").$type<EmailReminderType>().notNull(),
    riuId: integer("riu_id").references(() => rius.id, { onDelete: "cascade" }),
    sentAt: integer("sent_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
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

export const flags = sqliteTable("flags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type", { enum: FLAG_ENTITY_TYPES }).notNull(),
  entityId: integer("entity_id").notNull(),
  reason: text("reason").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
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

export const TRICK_RELATIONSHIP_TYPES = [
  "prerequisite",
  "optional_prerequisite",
  "related",
] as const

export const TRICK_VIDEO_STATUSES = ["active", "pending", "rejected"] as const

// Trick Modifiers (global, apply to any trick)
export const trickModifiers = sqliteTable("trick_modifiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

// Trick Elements (components that make up a trick: spin, flip, twist, etc.)
export const trickElements = sqliteTable("trick_elements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

// Core Tricks Table
export const tricks = sqliteTable("tricks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  alternateNames: text("alternate_names", { mode: "json" })
    .$type<string[]>()
    .default([]),
  description: text("description"),
  inventedBy: text("invented_by"),
  inventedByUserId: integer("invented_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  yearLanded: integer("year_landed"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

// Trick Videos (multiple per trick)
export const trickVideos = sqliteTable(
  "trick_videos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    trickId: integer("trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    muxAssetId: text("mux_asset_id")
      .notNull()
      .references(() => muxVideos.assetId, { onDelete: "cascade" }),
    status: text("status", { enum: TRICK_VIDEO_STATUSES })
      .notNull()
      .default("pending"),
    sortOrder: integer("sort_order").notNull().default(0),
    // Admin-curated ordering: pinned videos (max 3 per trick) lead the
    // carousel. Null = not pinned; lower rank shows first.
    pinnedRank: integer("pinned_rank"),
    submittedByUserId: integer("submitted_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewedByUserId: integer("reviewed_by_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  },
  (t) => [
    index("trick_videos_trick_id_idx").on(t.trickId),
    index("trick_videos_status_idx").on(t.status),
    index("trick_videos_submitted_by_idx").on(t.submittedByUserId),
    uniqueIndex("trick_videos_trick_asset_user_uq").on(
      t.trickId,
      t.muxAssetId,
      t.submittedByUserId,
    ),
    uniqueIndex("trick_videos_pinned_rank_uq")
      .on(t.trickId, t.pinnedRank)
      .where(sql`pinned_rank is not null`),
  ],
)

// Trick Element Assignments (many-to-many)
export const trickElementAssignments = sqliteTable(
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
export const trickRelationships = sqliteTable(
  "trick_relationships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceTrickId: integer("source_trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    targetTrickId: integer("target_trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    type: text("type", { enum: TRICK_RELATIONSHIP_TYPES }).notNull(),
  },
  (t) => [
    index("trick_relationships_source_idx").on(t.sourceTrickId),
    index("trick_relationships_target_idx").on(t.targetTrickId),
  ],
)

// Trick Submissions (user-submitted for review)
export const trickSubmissions = sqliteTable("trick_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  alternateNames: text("alternate_names", { mode: "json" })
    .$type<string[]>()
    .default([]),
  description: text("description"),
  inventedBy: text("invented_by"),
  inventedByUserId: integer("invented_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  yearLanded: integer("year_landed"),
  videoUrl: text("video_url"),
  videoTimestamp: text("video_timestamp"),
  notes: text("notes"),
  status: text("status", { enum: TRICK_SUBMISSION_STATUSES })
    .notNull()
    .default("pending"),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  reviewNotes: text("review_notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

// Trick Submission Element Assignments
export const trickSubmissionElementAssignments = sqliteTable(
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
export const trickSubmissionRelationships = sqliteTable(
  "trick_submission_relationships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    submissionId: integer("submission_id")
      .notNull()
      .references(() => trickSubmissions.id, { onDelete: "cascade" }),
    targetTrickId: integer("target_trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    type: text("type", { enum: TRICK_RELATIONSHIP_TYPES }).notNull(),
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

export const trickSuggestions = sqliteTable("trick_suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trickId: integer("trick_id")
    .notNull()
    .references(() => tricks.id, { onDelete: "cascade" }),
  diff: text("diff", { mode: "json" }).$type<TrickSuggestionDiff>().notNull(),
  reason: text("reason"),
  status: text("status", { enum: TRICK_SUBMISSION_STATUSES })
    .notNull()
    .default("pending"),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  reviewNotes: text("review_notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

// Glossary Proposals (community-submitted element/modifier create or edit proposals)
export const GLOSSARY_PROPOSAL_ACTIONS = ["create", "edit"] as const
export const GLOSSARY_PROPOSAL_TYPES = ["element", "modifier"] as const

export type GlossaryProposalDiff = {
  name?: string
  description?: string | null
}

export const glossaryProposals = sqliteTable("glossary_proposals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  action: text("action", { enum: GLOSSARY_PROPOSAL_ACTIONS }).notNull(),
  type: text("type", { enum: GLOSSARY_PROPOSAL_TYPES }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetId: integer("target_id"),
  diff: text("diff", { mode: "json" }).$type<GlossaryProposalDiff>(),
  reason: text("reason"),
  status: text("status", { enum: TRICK_SUBMISSION_STATUSES })
    .notNull()
    .default("pending"),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  reviewNotes: text("review_notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

// Trick Engagement Tables
export const trickLikes = sqliteTable(
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

export const trickMessages = sqliteTable("trick_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  trickId: integer("trick_id")
    .notNull()
    .references(() => tricks.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const trickMessageLikes = sqliteTable(
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

export const tournaments = sqliteTable("tournaments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  phase: text("phase", { enum: TOURNEY_PHASES }).notNull().default("setup"),
  createdByUserId: integer("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  state: text("state", { mode: "json" }).$type<TournamentState>().notNull(),
  // Stamped by the admin client's periodic heartbeat; the SSE poll loop
  // relays it so viewers can tell whether the admin is still driving.
  adminHeartbeatAt: integer("admin_heartbeat_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
})

export const tournamentsRelations = relations(tournaments, ({ one }) => ({
  createdBy: one(users, {
    fields: [tournaments.createdByUserId],
    references: [users.id],
  }),
}))

// make sure to reset sequences when seeding. eg
// SELECT setval('users_id_seq', (SELECT MAX(id) FROM users), true);

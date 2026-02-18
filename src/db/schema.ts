import { sql } from "drizzle-orm";
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
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";

import type { NeighborLink } from "~/lib/tricks/types";
import type { TournamentState } from "~/lib/tourney/types";

export const TRICK_SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export const trickSubmissionStatusEnum = pgEnum(
  "trick_submission_status",
  TRICK_SUBMISSION_STATUSES,
);
export const RIU_STATUSES = ["archived", "active", "upcoming"] as const;
// enums
export const riuStatusEnum = pgEnum("riu_status", RIU_STATUSES);

export const BIU_CHAIN_STATUSES = ["active", "completed", "flagged"] as const;
export const biuChainStatusEnum = pgEnum(
  "biu_chain_status",
  BIU_CHAIN_STATUSES,
);

export const SIU_CHAIN_STATUSES = ["active", "archived"] as const;
export const siuChainStatusEnum = pgEnum(
  "siu_chain_status",
  SIU_CHAIN_STATUSES,
);

export const USER_TYPES = ["user", "admin", "test"] as const;
export const userTypeEnum = pgEnum("user_type", USER_TYPES);

export const USER_DISCIPLINES = [
  "street",
  "flatland",
  "trials",
  "freestyle",
  "mountain",
  "distance",
  "other",
] as const;

export type UserDiscipline = (typeof USER_DISCIPLINES)[number];

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
] as const;

type PostTag = (typeof POST_TAGS)[number];

export const postTagEnum = pgEnum("post_tag", POST_TAGS);

// Notification enums
export const NOTIFICATION_TYPES = [
  "like",
  "comment",
  "follow",
  "new_content",
  "archive_request",
  "chain_archived",
  "review",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationTypeEnum = pgEnum(
  "notification_type",
  NOTIFICATION_TYPES,
);

export const NOTIFICATION_ENTITY_TYPES = [
  "post",
  "riuSet",
  "riuSubmission",
  "biuSet",
  "siuStack",
  "siuChain",
  "utvVideo",
  "utvVideoSuggestion",
  "user",
  "trickSubmission",
  "trickSuggestion",
  "trickVideo",
] as const;

export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[number];

export const notificationEntityTypeEnum = pgEnum(
  "notification_entity_type",
  NOTIFICATION_ENTITY_TYPES,
);

export const users = pgTable("users", {
  avatarId: text("avatar_id"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  disciplines: json("disciplines").$type<UserDiscipline[]>(),
  email: text("email").unique().notNull(),
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  notifyWhenShop: boolean("notify_when_shop").notNull().default(false),
  type: userTypeEnum("type").default("user"),
});

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
});

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
});

export const authCodes = pgTable("auth_codes", {
  id: text("id").primaryKey(),
  email: text("email"),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

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
});

export const chatMessages = pgTable("chat_messages", {
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

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
);

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
});

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
);

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
);

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
});

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
);

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
);

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
});

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
);

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
);

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
});

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
});

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
);

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
});

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
);

// UTV Video Suggestions (edits to existing videos)
export type UtvVideoSuggestionDiff = {
  title?: { old: string; new: string };
  disciplines?: { old: UserDiscipline[] | null; new: UserDiscipline[] | null };
  riders?: {
    old: { userId: number | null; name: string | null }[];
    new: { userId: number | null; name: string | null }[];
  };
};

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
});

export const utvVideoSuggestionLikes = pgTable(
  "utv_video_suggestion_likes",
  {
    utvVideoSuggestionId: integer("utv_video_suggestion_id")
      .notNull()
      .references(() => utvVideoSuggestions.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.utvVideoSuggestionId, t.userId] })],
);

export const utvVideoSuggestionMessages = pgTable(
  "utv_video_suggestion_messages",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    suggestionId: integer("suggestion_id")
      .notNull()
      .references(() => utvVideoSuggestions.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
);

export const utvVideoSuggestionMessageLikes = pgTable(
  "utv_video_sug_msg_likes",
  {
    utvVideoSuggestionMessageId: integer("utv_video_suggestion_message_id")
      .notNull()
      .references(() => utvVideoSuggestionMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.utvVideoSuggestionMessageId, t.userId] })],
);

export const utvClaps = pgTable("utv_claps", {
  id: serial("id").primaryKey(),
  count: integer("count").notNull().default(0),
});

export const muxVideos = pgTable("mux_videos", {
  assetId: text("asset_id").primaryKey(),
  playbackId: text("playback_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Temporary mapping for in-flight uploads (uploadId -> assetId)
export const muxUploadMappings = pgTable("mux_upload_mappings", {
  uploadId: text("upload_id").primaryKey(),
  assetId: text("asset_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rius = pgTable("rius", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at"),
  status: riuStatusEnum("status").default("upcoming"),
});

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
});

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
});

// BIU (Back It Up) Game Tables
export const biuChains = pgTable("biu_chains", {
  id: serial("id").primaryKey(),
  status: biuChainStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const biuSets = pgTable("biu_sets", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  chainId: integer("chain_id")
    .notNull()
    .references(() => biuChains.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  muxAssetId: text("mux_asset_id")
    .references(() => muxVideos.assetId, { onDelete: "set null" })
    .notNull(),

  name: text("name").notNull(),
  position: integer("position").notNull(),
  parentSetId: integer("parent_set_id"),

  flaggedAt: timestamp("flagged_at"),
  flaggedByUserId: integer("flagged_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  flagReason: text("flag_reason"),
  flagResolvedAt: timestamp("flag_resolved_at"),
});

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
);

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
});

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
);

// SIU (Stack It Up) Game Tables
export const siuChains = pgTable("siu_chains", {
  id: serial("id").primaryKey(),
  status: siuChainStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const siuStacks = pgTable("siu_stacks", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  chainId: integer("chain_id")
    .notNull()
    .references(() => siuChains.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  muxAssetId: text("mux_asset_id")
    .references(() => muxVideos.assetId, { onDelete: "set null" })
    .notNull(),

  name: text("name").notNull(),
  position: integer("position").notNull(),
  parentStackId: integer("parent_stack_id"),
});

export const siuStackArchiveVotes = pgTable(
  "siu_stack_archive_votes",
  {
    chainId: integer("chain_id")
      .notNull()
      .references(() => siuChains.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.userId] })],
);

export const siuStackLikes = pgTable(
  "siu_stack_likes",
  {
    siuStackId: integer("siu_stack_id")
      .notNull()
      .references(() => siuStacks.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.siuStackId, t.userId] })],
);

export const siuStackMessages = pgTable("siu_stack_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  siuStackId: integer("siu_stack_id")
    .notNull()
    .references(() => siuStacks.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const siuStackMessageLikes = pgTable(
  "siu_stack_message_likes",
  {
    siuStackMessageId: integer("siu_stack_message_id")
      .notNull()
      .references(() => siuStackMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.siuStackMessageId, t.userId] })],
);

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
);

// Notifications
export type NotificationData = {
  actorName?: string;
  actorAvatarId?: string | null;
  entityTitle?: string;
  entityPreview?: string;
  trickSlug?: string;
};

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
);

export const EMAIL_DIGEST_FREQUENCIES = ["daily", "weekly"] as const;
export type EmailDigestFrequency = (typeof EMAIL_DIGEST_FREQUENCIES)[number];

export const EMAIL_REMINDER_TYPES = [
  "digest",
  "game_start",
  "pre_trick",
] as const;
export type EmailReminderType = (typeof EMAIL_REMINDER_TYPES)[number];

export const userNotificationSettings = pgTable("user_notification_settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // In-app notification toggles
  likesEnabled: boolean("likes_enabled").notNull().default(true),
  commentsEnabled: boolean("comments_enabled").notNull().default(true),
  followsEnabled: boolean("follows_enabled").notNull().default(true),
  newContentEnabled: boolean("new_content_enabled").notNull().default(true),
  // Email digest preferences (opt-in, default off)
  emailDigestEnabled: boolean("email_digest_enabled").notNull().default(false),
  emailDigestFrequency: text("email_digest_frequency")
    .$type<EmailDigestFrequency>()
    .default("weekly"),
  emailDigestDayOfWeek: integer("email_digest_day_of_week").default(0), // 0=Sunday
  emailDigestHourUtc: integer("email_digest_hour_utc").default(9), // 9am UTC
  // Game start reminder preferences (opt-in, default off)
  gameStartReminderEnabled: boolean("game_start_reminder_enabled")
    .notNull()
    .default(false),
  gameStartReminderHoursBefore: integer(
    "game_start_reminder_hours_before",
  ).default(24),
  // Pre-game trick reminder preferences (opt-in, default off)
  preTrickReminderEnabled: boolean("pre_trick_reminder_enabled")
    .notNull()
    .default(false),
  preTrickReminderDaysBefore: integer("pre_trick_reminder_days_before").default(
    1,
  ),
  // Global email unsubscribe
  emailUnsubscribedAll: boolean("email_unsubscribed_all")
    .notNull()
    .default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
);

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
}));

export const authCodesRelations = relations(authCodes, ({ one }) => ({
  user: one(users, { fields: [authCodes.email], references: [users.email] }),
}));

export const locationsRelations = relations(userLocations, ({ one }) => ({
  user: one(users, { fields: [userLocations.userId], references: [users.id] }),
}));

export const userSocialsRelations = relations(userSocials, ({ one }) => ({
  user: one(users, { fields: [userSocials.userId], references: [users.id] }),
}));

// POSTS
export const postsRelations = relations(posts, ({ many, one }) => ({
  likes: many(postLikes),
  messages: many(postMessages),
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  video: one(muxVideos, {
    fields: [posts.muxAssetId],
    references: [muxVideos.assetId],
  }),
}));

export const utvVideosRelations = relations(utvVideos, ({ one, many }) => ({
  video: one(muxVideos, {
    fields: [utvVideos.muxAssetId],
    references: [muxVideos.assetId],
  }),
  likes: many(utvVideoLikes),
  messages: many(utvVideoMessages),
  riders: many(utvVideoRiders),
  suggestions: many(utvVideoSuggestions),
}));

export const utvVideoRidersRelations = relations(utvVideoRiders, ({ one }) => ({
  utvVideo: one(utvVideos, {
    fields: [utvVideoRiders.utvVideoId],
    references: [utvVideos.id],
  }),
  user: one(users, {
    fields: [utvVideoRiders.userId],
    references: [users.id],
  }),
}));

export const utvVideoLikesRelations = relations(utvVideoLikes, ({ one }) => ({
  utvVideo: one(utvVideos, {
    fields: [utvVideoLikes.utvVideoId],
    references: [utvVideos.id],
  }),
  user: one(users, {
    fields: [utvVideoLikes.userId],
    references: [users.id],
  }),
}));

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
);

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
);

export const utvVideoSuggestionsRelations = relations(
  utvVideoSuggestions,
  ({ one, many }) => ({
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
    likes: many(utvVideoSuggestionLikes),
    messages: many(utvVideoSuggestionMessages),
  }),
);

export const utvVideoSuggestionLikesRelations = relations(
  utvVideoSuggestionLikes,
  ({ one }) => ({
    suggestion: one(utvVideoSuggestions, {
      fields: [utvVideoSuggestionLikes.utvVideoSuggestionId],
      references: [utvVideoSuggestions.id],
    }),
    user: one(users, {
      fields: [utvVideoSuggestionLikes.userId],
      references: [users.id],
    }),
  }),
);

export const utvVideoSuggestionMessagesRelations = relations(
  utvVideoSuggestionMessages,
  ({ one, many }) => ({
    suggestion: one(utvVideoSuggestions, {
      fields: [utvVideoSuggestionMessages.suggestionId],
      references: [utvVideoSuggestions.id],
    }),
    user: one(users, {
      fields: [utvVideoSuggestionMessages.userId],
      references: [users.id],
    }),
    likes: many(utvVideoSuggestionMessageLikes),
  }),
);

export const utvVideoSuggestionMessageLikesRelations = relations(
  utvVideoSuggestionMessageLikes,
  ({ one }) => ({
    message: one(utvVideoSuggestionMessages, {
      fields: [utvVideoSuggestionMessageLikes.utvVideoSuggestionMessageId],
      references: [utvVideoSuggestionMessages.id],
    }),
    user: one(users, {
      fields: [utvVideoSuggestionMessageLikes.userId],
      references: [users.id],
    }),
  }),
);

export const riusRelations = relations(rius, ({ many }) => ({
  // likes: many(postLikes),
  sets: many(riuSets),
}));

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
}));

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
);

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, { fields: [postLikes.postId], references: [posts.id] }),
  user: one(users, { fields: [postLikes.userId], references: [users.id] }),
}));

export const postMessagesRelations = relations(
  postMessages,
  ({ many, one }) => ({
    likes: many(postMessageLikes),
    post: one(posts, { fields: [postMessages.postId], references: [posts.id] }),
    user: one(users, { fields: [postMessages.userId], references: [users.id] }),
  }),
);

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
);

// CHAT
export const chatMessagesRelations = relations(
  chatMessages,
  ({ many, one }) => ({
    likes: many(chatMessageLikes),
    user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
  }),
);

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
);

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
);

export const riuSetLikesRelations = relations(riuSetLikes, ({ one }) => ({
  riuSet: one(riuSets, {
    fields: [riuSetLikes.riuSetId],
    references: [riuSets.id],
  }),
  user: one(users, {
    fields: [riuSetLikes.userId],
    references: [users.id],
  }),
}));

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
);

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
);

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
);

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
);

// BIU Relations
export const biuChainsRelations = relations(biuChains, ({ many }) => ({
  sets: many(biuSets),
}));

export const biuSetsRelations = relations(biuSets, ({ one, many }) => ({
  chain: one(biuChains, {
    fields: [biuSets.chainId],
    references: [biuChains.id],
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
  flaggedByUser: one(users, {
    fields: [biuSets.flaggedByUserId],
    references: [users.id],
  }),
}));

export const biuSetLikesRelations = relations(biuSetLikes, ({ one }) => ({
  biuSet: one(biuSets, {
    fields: [biuSetLikes.biuSetId],
    references: [biuSets.id],
  }),
  user: one(users, {
    fields: [biuSetLikes.userId],
    references: [users.id],
  }),
}));

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
);

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
);

// SIU Relations
export const siuChainsRelations = relations(siuChains, ({ many }) => ({
  stacks: many(siuStacks),
  archiveVotes: many(siuStackArchiveVotes),
}));

export const siuStacksRelations = relations(siuStacks, ({ one, many }) => ({
  chain: one(siuChains, {
    fields: [siuStacks.chainId],
    references: [siuChains.id],
  }),
  user: one(users, {
    fields: [siuStacks.userId],
    references: [users.id],
  }),
  video: one(muxVideos, {
    fields: [siuStacks.muxAssetId],
    references: [muxVideos.assetId],
  }),
  parentStack: one(siuStacks, {
    fields: [siuStacks.parentStackId],
    references: [siuStacks.id],
    relationName: "parentChild",
  }),
  childStacks: many(siuStacks, { relationName: "parentChild" }),
  likes: many(siuStackLikes),
  messages: many(siuStackMessages),
}));

export const siuStackArchiveVotesRelations = relations(
  siuStackArchiveVotes,
  ({ one }) => ({
    chain: one(siuChains, {
      fields: [siuStackArchiveVotes.chainId],
      references: [siuChains.id],
    }),
    user: one(users, {
      fields: [siuStackArchiveVotes.userId],
      references: [users.id],
    }),
  }),
);

export const siuStackLikesRelations = relations(siuStackLikes, ({ one }) => ({
  siuStack: one(siuStacks, {
    fields: [siuStackLikes.siuStackId],
    references: [siuStacks.id],
  }),
  user: one(users, {
    fields: [siuStackLikes.userId],
    references: [users.id],
  }),
}));

export const siuStackMessagesRelations = relations(
  siuStackMessages,
  ({ one, many }) => ({
    siuStack: one(siuStacks, {
      fields: [siuStackMessages.siuStackId],
      references: [siuStacks.id],
    }),
    user: one(users, {
      fields: [siuStackMessages.userId],
      references: [users.id],
    }),
    likes: many(siuStackMessageLikes),
  }),
);

export const siuStackMessageLikesRelations = relations(
  siuStackMessageLikes,
  ({ one }) => ({
    message: one(siuStackMessages, {
      fields: [siuStackMessageLikes.siuStackMessageId],
      references: [siuStackMessages.id],
    }),
    user: one(users, {
      fields: [siuStackMessageLikes.userId],
      references: [users.id],
    }),
  }),
);

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
}));

export const userNotificationSettingsRelations = relations(
  userNotificationSettings,
  ({ one }) => ({
    user: one(users, {
      fields: [userNotificationSettings.userId],
      references: [users.id],
    }),
  }),
);

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
);

export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type InsertLocation = typeof userLocations.$inferInsert;

export type InsertPost = typeof posts.$inferInsert;
export type InsertUser = typeof users.$inferInsert;

export type SelectChatMessage = typeof chatMessages.$inferSelect;
export type SelectLocation = typeof userLocations.$inferSelect;

export type SelectPost = typeof posts.$inferSelect;
export type SelectUser = typeof users.$inferSelect;

// Trick Enums
export const CATCH_TYPES = ["one-foot", "two-foot"] as const;
export const catchTypeEnum = pgEnum("catch_type", CATCH_TYPES);

export const TRICK_RELATIONSHIP_TYPES = [
  "prerequisite",
  "optional_prerequisite",
  "related",
] as const;
export const trickRelationshipTypeEnum = pgEnum(
  "trick_relationship_type",
  TRICK_RELATIONSHIP_TYPES,
);

export const TRICK_VIDEO_STATUSES = ["active", "pending", "rejected"] as const;
export const trickVideoStatusEnum = pgEnum(
  "trick_video_status",
  TRICK_VIDEO_STATUSES,
);

// Trick Modifiers (global, apply to any trick)
export const trickModifiers = pgTable("trick_modifiers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Trick Elements (components that make up a trick: spin, flip, twist, etc.)
export const trickElements = pgTable("trick_elements", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Core Tricks Table
export const tricks = pgTable(
  "tricks",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    alternateNames: json("alternate_names").$type<string[]>().default([]),
    definition: text("definition"),
    isPrefix: boolean("is_prefix").notNull().default(false),
    inventedBy: text("invented_by"),
    yearLanded: integer("year_landed"),
    notes: text("notes"),
    flips: integer("flips").notNull().default(0),
    spin: integer("spin").notNull().default(0),
    wrap: text("wrap").notNull().default("none"),
    twist: integer("twist").notNull().default(0),
    fakie: boolean("fakie").notNull().default(false),
    tire: text("tire").notNull().default("none"),
    switchStance: boolean("switch").notNull().default(false),
    late: boolean("late").notNull().default(false),
    depth: integer("depth").notNull().default(0),
    dependentSlugs: json("dependent_slugs")
      .$type<string[]>()
      .notNull()
      .default([]),
    neighborLinks: json("neighbor_links")
      .$type<NeighborLink[]>()
      .notNull()
      .default([]),
    isCompound: boolean("is_compound").notNull().default(false),
    referenceVideoUrl: text("reference_video_url"),
    referenceVideoTimestamp: text("reference_video_timestamp"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("tricks_slug_idx").on(t.slug),
    uniqueIndex("tricks_modifiers_unique")
      .on(
        t.flips,
        t.spin,
        t.wrap,
        t.twist,
        t.fakie,
        t.tire,
        t.switchStance,
        t.late,
      )
      .where(sql`NOT ${t.isCompound}`),
  ],
);

// Trick Compositions (compound trick -> component trick mappings)
export const trickCompositions = pgTable(
  "trick_compositions",
  {
    id: serial("id").primaryKey(),
    compoundTrickId: integer("compound_trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    componentTrickId: integer("component_trick_id")
      .notNull()
      .references(() => tricks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    catchType: catchTypeEnum("catch_type"),
  },
  (t) => [
    index("trick_compositions_compound_idx").on(t.compoundTrickId),
    unique("trick_compositions_unique").on(t.compoundTrickId, t.position),
  ],
);

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
);

// Trick Video Engagement Tables
export const trickVideoLikes = pgTable(
  "trick_video_likes",
  {
    trickVideoId: integer("trick_video_id")
      .notNull()
      .references(() => trickVideos.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickVideoId, t.userId] })],
);

export const trickVideoMessages = pgTable("trick_video_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  trickVideoId: integer("trick_video_id")
    .notNull()
    .references(() => trickVideos.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const trickVideoMessageLikes = pgTable(
  "trick_video_message_likes",
  {
    trickVideoMessageId: integer("trick_video_message_id")
      .notNull()
      .references(() => trickVideoMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickVideoMessageId, t.userId] })],
);

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
);

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
);

// Trick Submissions (user-submitted for review)
export const trickSubmissions = pgTable("trick_submissions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  alternateNames: json("alternate_names").$type<string[]>().default([]),
  definition: text("definition"),
  isPrefix: boolean("is_prefix").notNull().default(false),
  inventedBy: text("invented_by"),
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
});

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
);

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
);

// Trick Suggestions (edits to existing tricks)
export type TrickSuggestionDiff = {
  name?: { old: string; new: string };
  alternateNames?: { old: string[]; new: string[] };
  definition?: { old: string | null; new: string | null };
  isPrefix?: { old: boolean; new: boolean };
  inventedBy?: { old: string | null; new: string | null };
  yearLanded?: { old: number | null; new: number | null };
  videoUrl?: { old: string | null; new: string | null };
  videoTimestamp?: { old: string | null; new: string | null };
  notes?: { old: string | null; new: string | null };
  elements?: { old: string[]; new: string[] };
  relationships?: {
    added: { targetSlug: string; type: string }[];
    removed: { targetSlug: string; type: string }[];
  };
};

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
});

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
);

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
});

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
);

// Trick Submission Engagement Tables
export const trickSubmissionLikes = pgTable(
  "trick_submission_likes",
  {
    trickSubmissionId: integer("trick_submission_id")
      .notNull()
      .references(() => trickSubmissions.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickSubmissionId, t.userId] })],
);

export const trickSubmissionMessages = pgTable("trick_submission_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  submissionId: integer("submission_id")
    .notNull()
    .references(() => trickSubmissions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const trickSubmissionMessageLikes = pgTable(
  "trick_submission_message_likes",
  {
    trickSubmissionMessageId: integer("trick_submission_message_id")
      .notNull()
      .references(() => trickSubmissionMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickSubmissionMessageId, t.userId] })],
);

// Trick Suggestion Engagement Tables
export const trickSuggestionLikes = pgTable(
  "trick_suggestion_likes",
  {
    trickSuggestionId: integer("trick_suggestion_id")
      .notNull()
      .references(() => trickSuggestions.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickSuggestionId, t.userId] })],
);

export const trickSuggestionMessages = pgTable("trick_suggestion_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  suggestionId: integer("suggestion_id")
    .notNull()
    .references(() => trickSuggestions.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const trickSuggestionMessageLikes = pgTable(
  "trick_suggestion_message_likes",
  {
    trickSuggestionMessageId: integer("trick_suggestion_message_id")
      .notNull()
      .references(() => trickSuggestionMessages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trickSuggestionMessageId, t.userId] })],
);

// Trick Relations
export const trickModifiersRelations = relations(trickModifiers, () => ({}));

export const trickElementsRelations = relations(trickElements, ({ many }) => ({
  assignments: many(trickElementAssignments),
}));

export const tricksRelations = relations(tricks, ({ many }) => ({
  videos: many(trickVideos),
  elementAssignments: many(trickElementAssignments),
  outgoingRelationships: many(trickRelationships, {
    relationName: "sourceRelationships",
  }),
  incomingRelationships: many(trickRelationships, {
    relationName: "targetRelationships",
  }),
  compositions: many(trickCompositions, {
    relationName: "compoundCompositions",
  }),
  usedInCompounds: many(trickCompositions, { relationName: "componentOf" }),
  likes: many(trickLikes),
  messages: many(trickMessages),
  suggestions: many(trickSuggestions),
}));

export const trickCompositionsRelations = relations(
  trickCompositions,
  ({ one }) => ({
    compoundTrick: one(tricks, {
      fields: [trickCompositions.compoundTrickId],
      references: [tricks.id],
      relationName: "compoundCompositions",
    }),
    componentTrick: one(tricks, {
      fields: [trickCompositions.componentTrickId],
      references: [tricks.id],
      relationName: "componentOf",
    }),
  }),
);

export const trickVideosRelations = relations(trickVideos, ({ one, many }) => ({
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
  likes: many(trickVideoLikes),
  messages: many(trickVideoMessages),
}));

export const trickVideoLikesRelations = relations(
  trickVideoLikes,
  ({ one }) => ({
    trickVideo: one(trickVideos, {
      fields: [trickVideoLikes.trickVideoId],
      references: [trickVideos.id],
    }),
    user: one(users, {
      fields: [trickVideoLikes.userId],
      references: [users.id],
    }),
  }),
);

export const trickVideoMessagesRelations = relations(
  trickVideoMessages,
  ({ one, many }) => ({
    trickVideo: one(trickVideos, {
      fields: [trickVideoMessages.trickVideoId],
      references: [trickVideos.id],
    }),
    user: one(users, {
      fields: [trickVideoMessages.userId],
      references: [users.id],
    }),
    likes: many(trickVideoMessageLikes),
  }),
);

export const trickVideoMessageLikesRelations = relations(
  trickVideoMessageLikes,
  ({ one }) => ({
    message: one(trickVideoMessages, {
      fields: [trickVideoMessageLikes.trickVideoMessageId],
      references: [trickVideoMessages.id],
    }),
    user: one(users, {
      fields: [trickVideoMessageLikes.userId],
      references: [users.id],
    }),
  }),
);

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
);

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
);

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
    likes: many(trickSubmissionLikes),
    messages: many(trickSubmissionMessages),
  }),
);

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
);

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
);

export const trickSuggestionsRelations = relations(
  trickSuggestions,
  ({ one, many }) => ({
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
    likes: many(trickSuggestionLikes),
    messages: many(trickSuggestionMessages),
  }),
);

export const trickLikesRelations = relations(trickLikes, ({ one }) => ({
  trick: one(tricks, {
    fields: [trickLikes.trickId],
    references: [tricks.id],
  }),
  user: one(users, {
    fields: [trickLikes.userId],
    references: [users.id],
  }),
}));

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
);

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
);

export const trickSubmissionLikesRelations = relations(
  trickSubmissionLikes,
  ({ one }) => ({
    submission: one(trickSubmissions, {
      fields: [trickSubmissionLikes.trickSubmissionId],
      references: [trickSubmissions.id],
    }),
    user: one(users, {
      fields: [trickSubmissionLikes.userId],
      references: [users.id],
    }),
  }),
);

export const trickSubmissionMessagesRelations = relations(
  trickSubmissionMessages,
  ({ one, many }) => ({
    submission: one(trickSubmissions, {
      fields: [trickSubmissionMessages.submissionId],
      references: [trickSubmissions.id],
    }),
    user: one(users, {
      fields: [trickSubmissionMessages.userId],
      references: [users.id],
    }),
    likes: many(trickSubmissionMessageLikes),
  }),
);

export const trickSubmissionMessageLikesRelations = relations(
  trickSubmissionMessageLikes,
  ({ one }) => ({
    message: one(trickSubmissionMessages, {
      fields: [trickSubmissionMessageLikes.trickSubmissionMessageId],
      references: [trickSubmissionMessages.id],
    }),
    user: one(users, {
      fields: [trickSubmissionMessageLikes.userId],
      references: [users.id],
    }),
  }),
);

export const trickSuggestionLikesRelations = relations(
  trickSuggestionLikes,
  ({ one }) => ({
    suggestion: one(trickSuggestions, {
      fields: [trickSuggestionLikes.trickSuggestionId],
      references: [trickSuggestions.id],
    }),
    user: one(users, {
      fields: [trickSuggestionLikes.userId],
      references: [users.id],
    }),
  }),
);

export const trickSuggestionMessagesRelations = relations(
  trickSuggestionMessages,
  ({ one, many }) => ({
    suggestion: one(trickSuggestions, {
      fields: [trickSuggestionMessages.suggestionId],
      references: [trickSuggestions.id],
    }),
    user: one(users, {
      fields: [trickSuggestionMessages.userId],
      references: [users.id],
    }),
    likes: many(trickSuggestionMessageLikes),
  }),
);

export const trickSuggestionMessageLikesRelations = relations(
  trickSuggestionMessageLikes,
  ({ one }) => ({
    message: one(trickSuggestionMessages, {
      fields: [trickSuggestionMessageLikes.trickSuggestionMessageId],
      references: [trickSuggestionMessages.id],
    }),
    user: one(users, {
      fields: [trickSuggestionMessageLikes.userId],
      references: [users.id],
    }),
  }),
);

// Tournaments

export const TOURNEY_PHASES = [
  "setup",
  "prelims",
  "ranking",
  "bracket",
  "complete",
] as const;

export const tourneyPhaseEnum = pgEnum("tourney_phase", TOURNEY_PHASES);

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
});

export const tournamentsRelations = relations(tournaments, ({ one }) => ({
  createdBy: one(users, {
    fields: [tournaments.createdByUserId],
    references: [users.id],
  }),
}));

// make sure to reset sequences when seeding. eg
// SELECT setval('users_id_seq', (SELECT MAX(id) FROM users), true);

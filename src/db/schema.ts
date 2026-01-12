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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";

export const RIU_STATUSES = ["archived", "active", "upcoming"] as const;
// enums
export const riuStatusEnum = pgEnum("riu_status", RIU_STATUSES);

export const BIU_CHAIN_STATUSES = ["active", "completed", "flagged"] as const;
export const biuChainStatusEnum = pgEnum("biu_chain_status", BIU_CHAIN_STATUSES);

export const USER_TYPES = ["user", "admin", "test"] as const;
export const userTypeEnum = pgEnum("user_type", USER_TYPES);

export const USER_DISCIPLINES = [
  "street",
  "flatland",
  "trials",
  "freestyle",
  "mountain",
  "distance",
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
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationTypeEnum = pgEnum("notification_type", NOTIFICATION_TYPES);

export const NOTIFICATION_ENTITY_TYPES = [
  "post",
  "riuSet",
  "riuSubmission",
  "biuSet",
  "utvVideo",
  "user",
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
  muxAssetId: text("mux_asset_id").references(() => muxVideos.assetId, {
    onDelete: "set null",
  }),
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

export const utvClaps = pgTable("utv_claps", {
  id: serial("id").primaryKey(),
  count: integer("count").notNull().default(0),
});

export const muxVideos = pgTable("mux_videos", {
  assetId: text("asset_id").primaryKey(),
  playbackId: text("playback_id").unique(),
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

export const userNotificationSettings = pgTable("user_notification_settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  likesEnabled: boolean("likes_enabled").notNull().default(true),
  commentsEnabled: boolean("comments_enabled").notNull().default(true),
  followsEnabled: boolean("follows_enabled").notNull().default(true),
  newContentEnabled: boolean("new_content_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type InsertLocation = typeof userLocations.$inferInsert;

export type InsertPost = typeof posts.$inferInsert;
export type InsertUser = typeof users.$inferInsert;

export type SelectChatMessage = typeof chatMessages.$inferSelect;
export type SelectLocation = typeof userLocations.$inferSelect;

export type SelectPost = typeof posts.$inferSelect;
export type SelectUser = typeof users.$inferSelect;

// make sure to reset sequences when seeding. eg
// SELECT setval('users_id_seq', (SELECT MAX(id) FROM users), true);

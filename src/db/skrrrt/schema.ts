import { sql } from "drizzle-orm"
import {
  boolean,
  date,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  pgView,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations"

export const epostTag = pgEnum("EPostTag", [
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
])
export const eriuStatus = pgEnum("ERiuStatus", [
  "upcoming",
  "active",
  "archived",
])
export const euserDiscipline = pgEnum("EUserDiscipline", [
  "flatland",
  "street",
  "trials",
  "freestyle",
  "mountain",
  "distance",
])
export const euserLocation = pgEnum("EUserLocation", ["hometown", "current"])
export const euserRole = pgEnum("EUserRole", ["admin", "user", "test"])
export const euserTier = pgEnum("EUserTier", [
  "none",
  "bronze",
  "silver",
  "gold",
])

export const chatMessages = pgTable(
  "chat_messages",
  {
    authorId: integer("author_id").notNull(),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial().primaryKey().notNull(),
    text: text().notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [users.id],
      name: "messages_author_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const postMessages = pgTable(
  "post_messages",
  {
    authorId: integer("author_id").notNull(),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial().primaryKey().notNull(),
    postId: integer("post_id").notNull(),
    text: text().notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [users.id],
      name: "post_messages_author_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.postId],
      foreignColumns: [posts.id],
      name: "post_messages_post_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const muxVideos = pgTable(
  "mux_videos",
  {
    assetId: text("asset_id"),
    id: serial().primaryKey().notNull(),
    playbackId: text("playback_id"),
    uploadId: text("upload_id"),
  },
  (table) => [
    uniqueIndex("mux_videos_asset_id_key").using(
      "btree",
      table.assetId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("mux_videos_playback_id_key").using(
      "btree",
      table.playbackId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("mux_videos_upload_id_key").using(
      "btree",
      table.uploadId.asc().nullsLast().op("text_ops"),
    ),
  ],
)

export const rius = pgTable("rius", {
  createdAt: timestamp("created_at", {
    mode: "string",
    precision: 6,
    withTimezone: true,
  })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  finishedAt: timestamp("finished_at", {
    mode: "string",
    precision: 6,
    withTimezone: true,
  }),
  id: serial().primaryKey().notNull(),
  status: eriuStatus().notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
    precision: 6,
    withTimezone: true,
  })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const riuSets = pgTable(
  "riu_sets",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial().primaryKey().notNull(),
    instructions: text().notNull(),
    riuId: integer("riu_id").notNull(),
    setById: integer("set_by_id").notNull(),
    title: text().notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.riuId],
      foreignColumns: [rius.id],
      name: "riu_sets_riu_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.setById],
      foreignColumns: [users.id],
      name: "riu_sets_set_by_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const riuSubmissionMessages = pgTable(
  "riu_submission_messages",
  {
    authorId: integer("author_id").notNull(),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial().primaryKey().notNull(),
    riuSubmissionId: integer("riu_submission_id").notNull(),
    text: text().notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [users.id],
      name: "riu_submission_messages_author_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.riuSubmissionId],
      foreignColumns: [riuSubmissions.id],
      name: "riu_submission_messages_riu_submission_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const riuSubmissions = pgTable(
  "riu_submissions",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial().primaryKey().notNull(),
    riuId: integer("riu_id").notNull(),
    riuSetId: integer("riu_set_id").notNull(),
    submittedById: integer("submitted_by_id").notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.riuId],
      foreignColumns: [rius.id],
      name: "riu_submissions_riu_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.riuSetId],
      foreignColumns: [riuSets.id],
      name: "riu_submissions_riu_set_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.submittedById],
      foreignColumns: [users.id],
      name: "riu_submissions_submitted_by_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    token: text().primaryKey().notNull(),
    tokenExpiry: timestamp("token_expiry", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    }).notNull(),
    userId: integer("user_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "refresh_tokens_user_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const riuSetMessages = pgTable(
  "riu_set_messages",
  {
    authorId: integer("author_id").notNull(),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial().primaryKey().notNull(),
    riuSetId: integer("riu_set_id").notNull(),
    text: text().notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [users.id],
      name: "riu_set_messages_author_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.riuSetId],
      foreignColumns: [riuSets.id],
      name: "riu_set_messages_riu_set_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const posts = pgTable(
  "posts",
  {
    body: text().notNull(),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    embedHtml: text("embed_html"),
    embedUrl: text("embed_url"),
    id: serial().primaryKey().notNull(),
    imageUrl: text("image_url"),
    oembed: jsonb(),
    postedById: integer("posted_by_id").notNull(),
    title: text(),
    updatedAt: timestamp("updated_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.postedById],
      foreignColumns: [users.id],
      name: "posts_posted_by_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const userSocials = pgTable(
  "user_socials",
  {
    facebook: text(),
    instagram: text(),
    spotify: text(),
    tiktok: text(),
    twitter: text(),
    userId: integer("user_id").primaryKey().notNull(),
    youtube: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_socials_user_id_fkey",
    }).onDelete("cascade"),
  ],
)

export const prismaMigrations = pgTable("_prisma_migrations", {
  appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
  checksum: varchar({ length: 64 }).notNull(),
  finishedAt: timestamp("finished_at", { mode: "string", withTimezone: true }),
  id: varchar({ length: 36 }).primaryKey().notNull(),
  logs: text(),
  migrationName: varchar("migration_name", { length: 255 }).notNull(),
  rolledBackAt: timestamp("rolled_back_at", {
    mode: "string",
    withTimezone: true,
  }),
  startedAt: timestamp("started_at", { mode: "string", withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const users = pgTable(
  "users",
  {
    activity: jsonb(),
    avatar: text(),
    bio: text(),
    birthday: date(),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    currentSetup: text("current_setup"),
    email: text().notNull(),
    favoriteTricks: jsonb("favorite_tricks"),
    fullName: text("full_name").notNull(),
    id: serial().primaryKey().notNull(),
    interests: jsonb(),
    lastOnlineAt: timestamp("last_online_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    }),
    nbds: jsonb(),
    password: text().notNull(),
    profession: text(),
    role: euserRole().default("user").notNull(),
    teams: jsonb(),
    tier: euserTier().default("none").notNull(),
    trickTodos: jsonb("trick_todos"),
    updatedAt: timestamp("updated_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    username: text(),
    verifiedEmail: boolean("verified_email").default(false).notNull(),
    willingToHost: boolean("willing_to_host").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("users_email_key").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("users_username_key").using(
      "btree",
      table.username.asc().nullsLast().op("text_ops"),
    ),
  ],
)

export const muxVideoRiuSets = pgTable(
  "mux_video_riu_sets",
  {
    muxVideoId: integer("mux_video_id").notNull(),
    riuSetId: integer("riu_set_id").notNull(),
  },
  (table) => [
    uniqueIndex("mux_video_riu_sets_mux_video_id_key").using(
      "btree",
      table.muxVideoId.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("mux_video_riu_sets_riu_set_id_key").using(
      "btree",
      table.riuSetId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.muxVideoId],
      foreignColumns: [muxVideos.id],
      name: "mux_video_riu_sets_mux_video_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.riuSetId],
      foreignColumns: [riuSets.id],
      name: "mux_video_riu_sets_riu_set_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({
      columns: [table.riuSetId, table.muxVideoId],
      name: "mux_video_riu_sets_pkey",
    }),
  ],
)

export const muxVideoPosts = pgTable(
  "mux_video_posts",
  {
    muxVideoId: integer("mux_video_id").notNull(),
    postId: integer("post_id").notNull(),
  },
  (table) => [
    uniqueIndex("mux_video_posts_mux_video_id_key").using(
      "btree",
      table.muxVideoId.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("mux_video_posts_post_id_key").using(
      "btree",
      table.postId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.muxVideoId],
      foreignColumns: [muxVideos.id],
      name: "mux_video_posts_mux_video_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.postId],
      foreignColumns: [posts.id],
      name: "mux_video_posts_post_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({
      columns: [table.postId, table.muxVideoId],
      name: "mux_video_posts_pkey",
    }),
  ],
)

export const muxVideoRiuSubmissions = pgTable(
  "mux_video_riu_submissions",
  {
    muxVideoId: integer("mux_video_id").notNull(),
    riuSubmissionId: integer("riu_submission_id").notNull(),
  },
  (table) => [
    uniqueIndex("mux_video_riu_submissions_mux_video_id_key").using(
      "btree",
      table.muxVideoId.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("mux_video_riu_submissions_riu_submission_id_key").using(
      "btree",
      table.riuSubmissionId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.muxVideoId],
      foreignColumns: [muxVideos.id],
      name: "mux_video_riu_submissions_mux_video_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.riuSubmissionId],
      foreignColumns: [riuSubmissions.id],
      name: "mux_video_riu_submissions_riu_submission_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({
      columns: [table.riuSubmissionId, table.muxVideoId],
      name: "mux_video_riu_submissions_pkey",
    }),
  ],
)

export const userDisciplines = pgTable(
  "user_disciplines",
  {
    discipline: euserDiscipline().notNull(),
    userId: integer("user_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_disciplines_user_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.discipline, table.userId],
      name: "user_disciplines_pkey",
    }),
  ],
)

export const likesPostUser = pgTable(
  "likes_post_user",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    likedByUserId: integer("liked_by_user_id").notNull(),
    postId: integer("post_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.likedByUserId],
      foreignColumns: [users.id],
      name: "likes_post_user_liked_by_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.postId],
      foreignColumns: [posts.id],
      name: "likes_post_user_post_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.postId, table.likedByUserId],
      name: "likes_post_user_pkey",
    }),
  ],
)

export const likesRiuSetMessageUser = pgTable(
  "likes_riu_set_message_user",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    likedByUserId: integer("liked_by_user_id").notNull(),
    riuSetMessageId: integer("riu_set_message_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.likedByUserId],
      foreignColumns: [users.id],
      name: "likes_riu_set_message_user_liked_by_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.riuSetMessageId],
      foreignColumns: [riuSetMessages.id],
      name: "likes_riu_set_message_user_riu_set_message_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.riuSetMessageId, table.likedByUserId],
      name: "likes_riu_set_message_user_pkey",
    }),
  ],
)

export const likesRiuSetUser = pgTable(
  "likes_riu_set_user",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    likedByUserId: integer("liked_by_user_id").notNull(),
    riuSetId: integer("riu_set_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.likedByUserId],
      foreignColumns: [users.id],
      name: "likes_riu_set_user_liked_by_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.riuSetId],
      foreignColumns: [riuSets.id],
      name: "likes_riu_set_user_riu_set_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.riuSetId, table.likedByUserId],
      name: "likes_riu_set_user_pkey",
    }),
  ],
)

export const likesRiuSubmissionMessageUser = pgTable(
  "likes_riu_submission_message_user",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    likedByUserId: integer("liked_by_user_id").notNull(),
    riuSubmissionMessageId: integer("riu_submission_message_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.likedByUserId],
      foreignColumns: [users.id],
      name: "likes_riu_submission_message_user_liked_by_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.riuSubmissionMessageId],
      foreignColumns: [riuSubmissionMessages.id],
      name: "likes_riu_submission_message_user_riu_submission_message_id_fke",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.riuSubmissionMessageId, table.likedByUserId],
      name: "likes_riu_submission_message_user_pkey",
    }),
  ],
)

export const likesRiuSubmissionUser = pgTable(
  "likes_riu_submission_user",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    likedByUserId: integer("liked_by_user_id").notNull(),
    riuSubmissionId: integer("riu_submission_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.likedByUserId],
      foreignColumns: [users.id],
      name: "likes_riu_submission_user_liked_by_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.riuSubmissionId],
      foreignColumns: [riuSubmissions.id],
      name: "likes_riu_submission_user_riu_submission_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.riuSubmissionId, table.likedByUserId],
      name: "likes_riu_submission_user_pkey",
    }),
  ],
)

export const likesUserUser = pgTable(
  "likes_user_user",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    likedByUserId: integer("liked_by_user_id").notNull(),
    likedUserId: integer("liked_user_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.likedByUserId],
      foreignColumns: [users.id],
      name: "likes_user_user_liked_by_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.likedUserId],
      foreignColumns: [users.id],
      name: "likes_user_user_liked_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({
      columns: [table.likedUserId, table.likedByUserId],
      name: "likes_user_user_pkey",
    }),
  ],
)

export const postTags = pgTable(
  "post_tags",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    postId: integer("post_id").notNull(),
    tag: epostTag().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.postId],
      foreignColumns: [posts.id],
      name: "post_tags_post_id_fkey",
    }).onDelete("cascade"),
    primaryKey({ columns: [table.tag, table.postId], name: "post_tags_pkey" }),
  ],
)

export const likesPostMessageUser = pgTable(
  "likes_post_message_user",
  {
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    likedByUserId: integer("liked_by_user_id").notNull(),
    postMessageId: integer("post_message_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.likedByUserId],
      foreignColumns: [users.id],
      name: "likes_post_message_user_liked_by_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.postMessageId],
      foreignColumns: [postMessages.id],
      name: "likes_post_message_user_post_message_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.postMessageId, table.likedByUserId],
      name: "likes_post_message_user_pkey",
    }),
  ],
)

export const likesChatMessageUser = pgTable(
  "likes_chat_message_user",
  {
    chatMessageId: integer("chat_message_id").notNull(),
    createdAt: timestamp("created_at", {
      mode: "string",
      precision: 6,
      withTimezone: true,
    })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    likedByUserId: integer("liked_by_user_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.chatMessageId],
      foreignColumns: [chatMessages.id],
      name: "likes_message_user_chat_message_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.likedByUserId],
      foreignColumns: [users.id],
      name: "likes_message_user_liked_by_user_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.chatMessageId, table.likedByUserId],
      name: "likes_chat_message_user_pkey",
    }),
  ],
)

export const userLocations = pgTable(
  "user_locations",
  {
    countryLongName: text("country_long_name").notNull(),
    countryShortName: text("country_short_name").notNull(),
    formattedAddress: text("formatted_address").notNull(),
    lat: numeric().notNull(),
    lng: numeric().notNull(),
    type: euserLocation().notNull(),
    userId: integer("user_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "locations_user_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.type, table.userId],
      name: "user_locations_pkey",
    }),
  ],
)
export const usersSafe = pgView("users_safe", {
  avatar: text(),
  bio: text(),
  createdAt: timestamp("created_at", {
    mode: "string",
    precision: 6,
    withTimezone: true,
  }),
  fullName: text("full_name"),
  id: integer(),
  profession: text(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
    precision: 6,
    withTimezone: true,
  }),
  username: text(),
}).as(
  sql`SELECT users.id, users.username, users.full_name, users.bio, users.profession, users.avatar, users.created_at, users.updated_at FROM users`,
)

export const chatMessagesRelations = relations(
  chatMessages,
  ({ many, one }) => ({
    likesChatMessageUsers: many(likesChatMessageUser),
    user: one(users, {
      fields: [chatMessages.authorId],
      references: [users.id],
    }),
  }),
)

export const usersRelations = relations(users, ({ many }) => ({
  chatMessages: many(chatMessages),
  likesChatMessageUsers: many(likesChatMessageUser),
  likesPostMessageUsers: many(likesPostMessageUser),
  likesPostUsers: many(likesPostUser),
  likesRiuSetMessageUsers: many(likesRiuSetMessageUser),
  likesRiuSetUsers: many(likesRiuSetUser),
  likesRiuSubmissionMessageUsers: many(likesRiuSubmissionMessageUser),
  likesRiuSubmissionUsers: many(likesRiuSubmissionUser),
  likesUserUsers_likedByUserId: many(likesUserUser, {
    relationName: "likesUserUser_likedByUserId_users_id",
  }),
  likesUserUsers_likedUserId: many(likesUserUser, {
    relationName: "likesUserUser_likedUserId_users_id",
  }),
  postMessages: many(postMessages),
  posts: many(posts),
  refreshTokens: many(refreshTokens),
  riuSetMessages: many(riuSetMessages),
  riuSets: many(riuSets),
  riuSubmissionMessages: many(riuSubmissionMessages),
  riuSubmissions: many(riuSubmissions),
  userDisciplines: many(userDisciplines),
  userLocations: many(userLocations),
  userSocials: many(userSocials),
}))

export const postMessagesRelations = relations(
  postMessages,
  ({ many, one }) => ({
    likesPostMessageUsers: many(likesPostMessageUser),
    post: one(posts, {
      fields: [postMessages.postId],
      references: [posts.id],
    }),
    user: one(users, {
      fields: [postMessages.authorId],
      references: [users.id],
    }),
  }),
)

export const postsRelations = relations(posts, ({ many, one }) => ({
  likesPostUsers: many(likesPostUser),
  muxVideoPosts: many(muxVideoPosts),
  postMessages: many(postMessages),
  postTags: many(postTags),
  user: one(users, {
    fields: [posts.postedById],
    references: [users.id],
  }),
}))

export const riuSetsRelations = relations(riuSets, ({ many, one }) => ({
  likesRiuSetUsers: many(likesRiuSetUser),
  muxVideoRiuSets: many(muxVideoRiuSets),
  rius: one(rius, {
    fields: [riuSets.riuId],
    references: [rius.id],
  }),
  riuSetMessages: many(riuSetMessages),
  riuSubmissions: many(riuSubmissions),
  user: one(users, {
    fields: [riuSets.setById],
    references: [users.id],
  }),
}))

export const riusRelations = relations(rius, ({ many }) => ({
  riuSets: many(riuSets),
  riuSubmissions: many(riuSubmissions),
}))

export const riuSubmissionMessagesRelations = relations(
  riuSubmissionMessages,
  ({ many, one }) => ({
    likesRiuSubmissionMessageUsers: many(likesRiuSubmissionMessageUser),
    riuSubmission: one(riuSubmissions, {
      fields: [riuSubmissionMessages.riuSubmissionId],
      references: [riuSubmissions.id],
    }),
    user: one(users, {
      fields: [riuSubmissionMessages.authorId],
      references: [users.id],
    }),
  }),
)

export const riuSubmissionsRelations = relations(
  riuSubmissions,
  ({ many, one }) => ({
    likesRiuSubmissionUsers: many(likesRiuSubmissionUser),
    muxVideoRiuSubmissions: many(muxVideoRiuSubmissions),
    rius: one(rius, {
      fields: [riuSubmissions.riuId],
      references: [rius.id],
    }),
    riuSet: one(riuSets, {
      fields: [riuSubmissions.riuSetId],
      references: [riuSets.id],
    }),
    riuSubmissionMessages: many(riuSubmissionMessages),
    user: one(users, {
      fields: [riuSubmissions.submittedById],
      references: [users.id],
    }),
  }),
)

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}))

export const riuSetMessagesRelations = relations(
  riuSetMessages,
  ({ many, one }) => ({
    likesRiuSetMessageUsers: many(likesRiuSetMessageUser),
    riuSet: one(riuSets, {
      fields: [riuSetMessages.riuSetId],
      references: [riuSets.id],
    }),
    user: one(users, {
      fields: [riuSetMessages.authorId],
      references: [users.id],
    }),
  }),
)

export const userSocialsRelations = relations(userSocials, ({ one }) => ({
  user: one(users, {
    fields: [userSocials.userId],
    references: [users.id],
  }),
}))

export const muxVideoRiuSetsRelations = relations(
  muxVideoRiuSets,
  ({ one }) => ({
    muxVideo: one(muxVideos, {
      fields: [muxVideoRiuSets.muxVideoId],
      references: [muxVideos.id],
    }),
    riuSet: one(riuSets, {
      fields: [muxVideoRiuSets.riuSetId],
      references: [riuSets.id],
    }),
  }),
)

export const muxVideosRelations = relations(muxVideos, ({ many }) => ({
  muxVideoPosts: many(muxVideoPosts),
  muxVideoRiuSets: many(muxVideoRiuSets),
  muxVideoRiuSubmissions: many(muxVideoRiuSubmissions),
}))

export const muxVideoPostsRelations = relations(muxVideoPosts, ({ one }) => ({
  muxVideo: one(muxVideos, {
    fields: [muxVideoPosts.muxVideoId],
    references: [muxVideos.id],
  }),
  post: one(posts, {
    fields: [muxVideoPosts.postId],
    references: [posts.id],
  }),
}))

export const muxVideoRiuSubmissionsRelations = relations(
  muxVideoRiuSubmissions,
  ({ one }) => ({
    muxVideo: one(muxVideos, {
      fields: [muxVideoRiuSubmissions.muxVideoId],
      references: [muxVideos.id],
    }),
    riuSubmission: one(riuSubmissions, {
      fields: [muxVideoRiuSubmissions.riuSubmissionId],
      references: [riuSubmissions.id],
    }),
  }),
)

export const userDisciplinesRelations = relations(
  userDisciplines,
  ({ one }) => ({
    user: one(users, {
      fields: [userDisciplines.userId],
      references: [users.id],
    }),
  }),
)

export const likesPostUserRelations = relations(likesPostUser, ({ one }) => ({
  post: one(posts, {
    fields: [likesPostUser.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [likesPostUser.likedByUserId],
    references: [users.id],
  }),
}))

export const likesRiuSetMessageUserRelations = relations(
  likesRiuSetMessageUser,
  ({ one }) => ({
    riuSetMessage: one(riuSetMessages, {
      fields: [likesRiuSetMessageUser.riuSetMessageId],
      references: [riuSetMessages.id],
    }),
    user: one(users, {
      fields: [likesRiuSetMessageUser.likedByUserId],
      references: [users.id],
    }),
  }),
)

export const likesRiuSetUserRelations = relations(
  likesRiuSetUser,
  ({ one }) => ({
    riuSet: one(riuSets, {
      fields: [likesRiuSetUser.riuSetId],
      references: [riuSets.id],
    }),
    user: one(users, {
      fields: [likesRiuSetUser.likedByUserId],
      references: [users.id],
    }),
  }),
)

export const likesRiuSubmissionMessageUserRelations = relations(
  likesRiuSubmissionMessageUser,
  ({ one }) => ({
    riuSubmissionMessage: one(riuSubmissionMessages, {
      fields: [likesRiuSubmissionMessageUser.riuSubmissionMessageId],
      references: [riuSubmissionMessages.id],
    }),
    user: one(users, {
      fields: [likesRiuSubmissionMessageUser.likedByUserId],
      references: [users.id],
    }),
  }),
)

export const likesRiuSubmissionUserRelations = relations(
  likesRiuSubmissionUser,
  ({ one }) => ({
    riuSubmission: one(riuSubmissions, {
      fields: [likesRiuSubmissionUser.riuSubmissionId],
      references: [riuSubmissions.id],
    }),
    user: one(users, {
      fields: [likesRiuSubmissionUser.likedByUserId],
      references: [users.id],
    }),
  }),
)

export const likesUserUserRelations = relations(likesUserUser, ({ one }) => ({
  user_likedByUserId: one(users, {
    fields: [likesUserUser.likedByUserId],
    references: [users.id],
    relationName: "likesUserUser_likedByUserId_users_id",
  }),
  user_likedUserId: one(users, {
    fields: [likesUserUser.likedUserId],
    references: [users.id],
    relationName: "likesUserUser_likedUserId_users_id",
  }),
}))

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
}))

export const likesPostMessageUserRelations = relations(
  likesPostMessageUser,
  ({ one }) => ({
    postMessage: one(postMessages, {
      fields: [likesPostMessageUser.postMessageId],
      references: [postMessages.id],
    }),
    user: one(users, {
      fields: [likesPostMessageUser.likedByUserId],
      references: [users.id],
    }),
  }),
)

export const likesChatMessageUserRelations = relations(
  likesChatMessageUser,
  ({ one }) => ({
    chatMessage: one(chatMessages, {
      fields: [likesChatMessageUser.chatMessageId],
      references: [chatMessages.id],
    }),
    user: one(users, {
      fields: [likesChatMessageUser.likedByUserId],
      references: [users.id],
    }),
  }),
)

export const userLocationsRelations = relations(userLocations, ({ one }) => ({
  user: one(users, {
    fields: [userLocations.userId],
    references: [users.id],
  }),
}))

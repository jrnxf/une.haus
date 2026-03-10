-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."EPostTag" AS ENUM('flatland', 'street', 'trials', 'freestyle', 'mountain', 'distance', 'random', 'memes', 'buy', 'sell', 'nbds', 'til', 'bails');--> statement-breakpoint
CREATE TYPE "public"."ERiuStatus" AS ENUM('upcoming', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."EUserDiscipline" AS ENUM('flatland', 'street', 'trials', 'freestyle', 'mountain', 'distance');--> statement-breakpoint
CREATE TYPE "public"."EUserLocation" AS ENUM('hometown', 'current');--> statement-breakpoint
CREATE TYPE "public"."EUserRole" AS ENUM('admin', 'user', 'test');--> statement-breakpoint
CREATE TYPE "public"."EUserTier" AS ENUM('none', 'bronze', 'silver', 'gold');--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"author_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mux_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" text,
	"asset_id" text,
	"playback_id" text
);
--> statement-breakpoint
CREATE TABLE "rius" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "ERiuStatus" NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"finished_at" timestamp(6) with time zone
);
--> statement-breakpoint
CREATE TABLE "riu_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"riu_id" integer NOT NULL,
	"set_by_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riu_submission_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"author_id" integer NOT NULL,
	"riu_submission_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riu_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"riu_set_id" integer NOT NULL,
	"riu_id" integer NOT NULL,
	"submitted_by_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"token_expiry" timestamp(6) with time zone NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riu_set_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"riu_set_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"image_url" text,
	"embed_url" text,
	"embed_html" text,
	"oembed" jsonb,
	"posted_by_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_socials" (
	"facebook" text,
	"instagram" text,
	"twitter" text,
	"youtube" text,
	"tiktok" text,
	"spotify" text,
	"user_id" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"verified_email" boolean DEFAULT false NOT NULL,
	"password" text NOT NULL,
	"username" text,
	"full_name" text NOT NULL,
	"role" "EUserRole" DEFAULT 'user' NOT NULL,
	"tier" "EUserTier" DEFAULT 'none' NOT NULL,
	"bio" text,
	"profession" text,
	"avatar" text,
	"current_setup" text,
	"birthday" date,
	"last_online_at" timestamp(6) with time zone,
	"willing_to_host" boolean DEFAULT false NOT NULL,
	"trick_todos" jsonb,
	"teams" jsonb,
	"favorite_tricks" jsonb,
	"interests" jsonb,
	"nbds" jsonb,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"activity" jsonb
);
--> statement-breakpoint
CREATE TABLE "mux_video_riu_sets" (
	"riu_set_id" integer NOT NULL,
	"mux_video_id" integer NOT NULL,
	CONSTRAINT "mux_video_riu_sets_pkey" PRIMARY KEY("riu_set_id","mux_video_id")
);
--> statement-breakpoint
CREATE TABLE "mux_video_posts" (
	"post_id" integer NOT NULL,
	"mux_video_id" integer NOT NULL,
	CONSTRAINT "mux_video_posts_pkey" PRIMARY KEY("post_id","mux_video_id")
);
--> statement-breakpoint
CREATE TABLE "mux_video_riu_submissions" (
	"riu_submission_id" integer NOT NULL,
	"mux_video_id" integer NOT NULL,
	CONSTRAINT "mux_video_riu_submissions_pkey" PRIMARY KEY("riu_submission_id","mux_video_id")
);
--> statement-breakpoint
CREATE TABLE "user_disciplines" (
	"discipline" "EUserDiscipline" NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "user_disciplines_pkey" PRIMARY KEY("discipline","user_id")
);
--> statement-breakpoint
CREATE TABLE "likes_post_user" (
	"post_id" integer NOT NULL,
	"liked_by_user_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_post_user_pkey" PRIMARY KEY("post_id","liked_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "likes_riu_set_message_user" (
	"riu_set_message_id" integer NOT NULL,
	"liked_by_user_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_riu_set_message_user_pkey" PRIMARY KEY("riu_set_message_id","liked_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "likes_riu_set_user" (
	"riu_set_id" integer NOT NULL,
	"liked_by_user_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_riu_set_user_pkey" PRIMARY KEY("riu_set_id","liked_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "likes_riu_submission_message_user" (
	"riu_submission_message_id" integer NOT NULL,
	"liked_by_user_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_riu_submission_message_user_pkey" PRIMARY KEY("riu_submission_message_id","liked_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "likes_riu_submission_user" (
	"riu_submission_id" integer NOT NULL,
	"liked_by_user_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_riu_submission_user_pkey" PRIMARY KEY("riu_submission_id","liked_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "likes_user_user" (
	"liked_user_id" integer NOT NULL,
	"liked_by_user_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_user_user_pkey" PRIMARY KEY("liked_user_id","liked_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"tag" "EPostTag" NOT NULL,
	"post_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "post_tags_pkey" PRIMARY KEY("tag","post_id")
);
--> statement-breakpoint
CREATE TABLE "likes_post_message_user" (
	"post_message_id" integer NOT NULL,
	"liked_by_user_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_post_message_user_pkey" PRIMARY KEY("post_message_id","liked_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "likes_chat_message_user" (
	"chat_message_id" integer NOT NULL,
	"liked_by_user_id" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_chat_message_user_pkey" PRIMARY KEY("chat_message_id","liked_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"type" "EUserLocation" NOT NULL,
	"lat" numeric NOT NULL,
	"lng" numeric NOT NULL,
	"country_long_name" text NOT NULL,
	"country_short_name" text NOT NULL,
	"formatted_address" text NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "user_locations_pkey" PRIMARY KEY("type","user_id")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_messages" ADD CONSTRAINT "post_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_messages" ADD CONSTRAINT "post_messages_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_sets" ADD CONSTRAINT "riu_sets_riu_id_fkey" FOREIGN KEY ("riu_id") REFERENCES "public"."rius"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_sets" ADD CONSTRAINT "riu_sets_set_by_id_fkey" FOREIGN KEY ("set_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submission_messages" ADD CONSTRAINT "riu_submission_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submission_messages" ADD CONSTRAINT "riu_submission_messages_riu_submission_id_fkey" FOREIGN KEY ("riu_submission_id") REFERENCES "public"."riu_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submissions" ADD CONSTRAINT "riu_submissions_riu_id_fkey" FOREIGN KEY ("riu_id") REFERENCES "public"."rius"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submissions" ADD CONSTRAINT "riu_submissions_riu_set_id_fkey" FOREIGN KEY ("riu_set_id") REFERENCES "public"."riu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submissions" ADD CONSTRAINT "riu_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_set_messages" ADD CONSTRAINT "riu_set_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_set_messages" ADD CONSTRAINT "riu_set_messages_riu_set_id_fkey" FOREIGN KEY ("riu_set_id") REFERENCES "public"."riu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_socials" ADD CONSTRAINT "user_socials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mux_video_riu_sets" ADD CONSTRAINT "mux_video_riu_sets_mux_video_id_fkey" FOREIGN KEY ("mux_video_id") REFERENCES "public"."mux_videos"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mux_video_riu_sets" ADD CONSTRAINT "mux_video_riu_sets_riu_set_id_fkey" FOREIGN KEY ("riu_set_id") REFERENCES "public"."riu_sets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mux_video_posts" ADD CONSTRAINT "mux_video_posts_mux_video_id_fkey" FOREIGN KEY ("mux_video_id") REFERENCES "public"."mux_videos"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mux_video_posts" ADD CONSTRAINT "mux_video_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mux_video_riu_submissions" ADD CONSTRAINT "mux_video_riu_submissions_mux_video_id_fkey" FOREIGN KEY ("mux_video_id") REFERENCES "public"."mux_videos"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mux_video_riu_submissions" ADD CONSTRAINT "mux_video_riu_submissions_riu_submission_id_fkey" FOREIGN KEY ("riu_submission_id") REFERENCES "public"."riu_submissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_disciplines" ADD CONSTRAINT "user_disciplines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_post_user" ADD CONSTRAINT "likes_post_user_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_post_user" ADD CONSTRAINT "likes_post_user_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_riu_set_message_user" ADD CONSTRAINT "likes_riu_set_message_user_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_riu_set_message_user" ADD CONSTRAINT "likes_riu_set_message_user_riu_set_message_id_fkey" FOREIGN KEY ("riu_set_message_id") REFERENCES "public"."riu_set_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_riu_set_user" ADD CONSTRAINT "likes_riu_set_user_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_riu_set_user" ADD CONSTRAINT "likes_riu_set_user_riu_set_id_fkey" FOREIGN KEY ("riu_set_id") REFERENCES "public"."riu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_riu_submission_message_user" ADD CONSTRAINT "likes_riu_submission_message_user_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_riu_submission_message_user" ADD CONSTRAINT "likes_riu_submission_message_user_riu_submission_message_id_fke" FOREIGN KEY ("riu_submission_message_id") REFERENCES "public"."riu_submission_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_riu_submission_user" ADD CONSTRAINT "likes_riu_submission_user_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_riu_submission_user" ADD CONSTRAINT "likes_riu_submission_user_riu_submission_id_fkey" FOREIGN KEY ("riu_submission_id") REFERENCES "public"."riu_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_user_user" ADD CONSTRAINT "likes_user_user_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "likes_user_user" ADD CONSTRAINT "likes_user_user_liked_user_id_fkey" FOREIGN KEY ("liked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_post_message_user" ADD CONSTRAINT "likes_post_message_user_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_post_message_user" ADD CONSTRAINT "likes_post_message_user_post_message_id_fkey" FOREIGN KEY ("post_message_id") REFERENCES "public"."post_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_chat_message_user" ADD CONSTRAINT "likes_message_user_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes_chat_message_user" ADD CONSTRAINT "likes_message_user_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mux_videos_asset_id_key" ON "mux_videos" USING btree ("asset_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mux_videos_playback_id_key" ON "mux_videos" USING btree ("playback_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mux_videos_upload_id_key" ON "mux_videos" USING btree ("upload_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mux_video_riu_sets_mux_video_id_key" ON "mux_video_riu_sets" USING btree ("mux_video_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mux_video_riu_sets_riu_set_id_key" ON "mux_video_riu_sets" USING btree ("riu_set_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mux_video_posts_mux_video_id_key" ON "mux_video_posts" USING btree ("mux_video_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mux_video_posts_post_id_key" ON "mux_video_posts" USING btree ("post_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mux_video_riu_submissions_mux_video_id_key" ON "mux_video_riu_submissions" USING btree ("mux_video_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mux_video_riu_submissions_riu_submission_id_key" ON "mux_video_riu_submissions" USING btree ("riu_submission_id" int4_ops);--> statement-breakpoint
CREATE VIEW "public"."users_safe" AS (SELECT users.id, users.username, users.full_name, users.bio, users.profession, users.avatar, users.created_at, users.updated_at FROM users);
*/
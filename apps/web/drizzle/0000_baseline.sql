CREATE TYPE "public"."catch_type" AS ENUM('one-foot', 'two-foot');--> statement-breakpoint
CREATE TYPE "public"."flag_entity_type" AS ENUM('post', 'biuSet', 'siuSet', 'riuSet', 'riuSubmission', 'postMessage', 'biuSetMessage', 'siuSetMessage', 'riuSetMessage', 'riuSubmissionMessage', 'utvVideoMessage', 'chatMessage');--> statement-breakpoint
CREATE TYPE "public"."glossary_proposal_action" AS ENUM('create', 'edit');--> statement-breakpoint
CREATE TYPE "public"."glossary_proposal_type" AS ENUM('element', 'modifier');--> statement-breakpoint
CREATE TYPE "public"."notification_entity_type" AS ENUM('chat', 'post', 'riuSet', 'riuSubmission', 'biuSet', 'siuSet', 'siu', 'utvVideo', 'utvVideoSuggestion', 'user', 'trickSubmission', 'trickSuggestion', 'trickVideo', 'glossaryProposal');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('like', 'message_like', 'comment', 'follow', 'new_content', 'archive_request', 'chain_archived', 'review', 'flag', 'mention');--> statement-breakpoint
CREATE TYPE "public"."post_tag" AS ENUM('flatland', 'street', 'trials', 'freestyle', 'mountain', 'distance', 'random', 'memes', 'buy', 'sell', 'nbds', 'til', 'bails');--> statement-breakpoint
CREATE TYPE "public"."riu_status" AS ENUM('archived', 'active', 'upcoming');--> statement-breakpoint
CREATE TYPE "public"."siu_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."tourney_phase" AS ENUM('setup', 'prelims', 'ranking', 'bracket', 'complete');--> statement-breakpoint
CREATE TYPE "public"."trick_relationship_type" AS ENUM('prerequisite', 'optional_prerequisite', 'related');--> statement-breakpoint
CREATE TYPE "public"."trick_submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."trick_video_status" AS ENUM('active', 'pending', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('user', 'admin', 'test');--> statement-breakpoint
CREATE TABLE "auth_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biu_set_likes" (
	"biu_set_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "biu_set_likes_biu_set_id_user_id_pk" PRIMARY KEY("biu_set_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "biu_set_message_likes" (
	"biu_set_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "biu_set_message_likes_biu_set_message_id_user_id_pk" PRIMARY KEY("biu_set_message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "biu_set_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"biu_set_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biu_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"biu_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"mux_asset_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"parent_set_id" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bius" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message_likes" (
	"chat_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "chat_message_likes_chat_message_id_user_id_pk" PRIMARY KEY("chat_message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_reminders_sent" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reminder_type" text NOT NULL,
	"riu_id" integer,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" "flag_entity_type" NOT NULL,
	"entity_id" integer NOT NULL,
	"reason" text NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" integer,
	"resolution" text,
	"parent_entity_id" integer
);
--> statement-breakpoint
CREATE TABLE "glossary_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "glossary_proposal_action" NOT NULL,
	"type" "glossary_proposal_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_id" integer,
	"diff" json,
	"reason" text,
	"status" "trick_submission_status" DEFAULT 'pending' NOT NULL,
	"submitted_by_user_id" integer NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mux_videos" (
	"asset_id" text PRIMARY KEY NOT NULL,
	"playback_id" text,
	"upload_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mux_videos_playback_id_unique" UNIQUE("playback_id"),
	CONSTRAINT "mux_videos_upload_id_unique" UNIQUE("upload_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"actor_id" integer,
	"type" "notification_type" NOT NULL,
	"entity_type" "notification_entity_type" NOT NULL,
	"entity_id" integer NOT NULL,
	"data" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"emailed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "post_likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_message_likes" (
	"post_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "post_message_likes_post_message_id_user_id_pk" PRIMARY KEY("post_message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_messages" (
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"image_id" text,
	"tags" json DEFAULT '[]'::json,
	"title" text NOT NULL,
	"user_id" integer NOT NULL,
	"mux_asset_id" text,
	"youtube_video_id" text
);
--> statement-breakpoint
CREATE TABLE "riu_set_likes" (
	"riu_set_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "riu_set_likes_riu_set_id_user_id_pk" PRIMARY KEY("riu_set_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "riu_set_message_likes" (
	"riu_set_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "riu_set_message_likes_riu_set_message_id_user_id_pk" PRIMARY KEY("riu_set_message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "riu_set_messages" (
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"riu_set_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riu_sets" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"instructions" text,
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"riu_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"mux_asset_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riu_submission_likes" (
	"riu_submission_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "riu_submission_likes_riu_submission_id_user_id_pk" PRIMARY KEY("riu_submission_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "riu_submission_message_likes" (
	"riu_submission_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "riu_submission_message_likes_riu_submission_message_id_user_id_pk" PRIMARY KEY("riu_submission_message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "riu_submission_messages" (
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"riu_submission_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riu_submissions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"riu_set_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"mux_asset_id" text NOT NULL,
	CONSTRAINT "riu_submissions_riu_set_id_user_id_unique" UNIQUE("riu_set_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "rius" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone,
	"status" "riu_status" DEFAULT 'upcoming'
);
--> statement-breakpoint
CREATE TABLE "siu_archive_votes" (
	"siu_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "siu_archive_votes_siu_id_user_id_pk" PRIMARY KEY("siu_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "siu_set_likes" (
	"siu_set_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "siu_set_likes_siu_set_id_user_id_pk" PRIMARY KEY("siu_set_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "siu_set_message_likes" (
	"siu_set_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "siu_set_message_likes_siu_set_message_id_user_id_pk" PRIMARY KEY("siu_set_message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "siu_set_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"siu_set_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siu_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"siu_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"mux_asset_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"parent_set_id" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sius" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "siu_status" DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"phase" "tourney_phase" DEFAULT 'setup' NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"state" json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "trick_element_assignments" (
	"trick_id" integer NOT NULL,
	"element_id" integer NOT NULL,
	CONSTRAINT "trick_element_assignments_trick_id_element_id_pk" PRIMARY KEY("trick_id","element_id")
);
--> statement-breakpoint
CREATE TABLE "trick_elements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trick_likes" (
	"trick_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "trick_likes_trick_id_user_id_pk" PRIMARY KEY("trick_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "trick_message_likes" (
	"trick_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "trick_message_likes_trick_message_id_user_id_pk" PRIMARY KEY("trick_message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "trick_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trick_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trick_modifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trick_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_trick_id" integer NOT NULL,
	"target_trick_id" integer NOT NULL,
	"type" "trick_relationship_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trick_submission_element_assignments" (
	"submission_id" integer NOT NULL,
	"element_id" integer NOT NULL,
	CONSTRAINT "trick_submission_element_assignments_submission_id_element_id_pk" PRIMARY KEY("submission_id","element_id")
);
--> statement-breakpoint
CREATE TABLE "trick_submission_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"target_trick_id" integer NOT NULL,
	"type" "trick_relationship_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trick_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alternate_names" json DEFAULT '[]'::json,
	"description" text,
	"invented_by" text,
	"invented_by_user_id" integer,
	"year_landed" integer,
	"video_url" text,
	"video_timestamp" text,
	"notes" text,
	"status" "trick_submission_status" DEFAULT 'pending' NOT NULL,
	"submitted_by_user_id" integer NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trick_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trick_id" integer NOT NULL,
	"diff" json NOT NULL,
	"reason" text,
	"status" "trick_submission_status" DEFAULT 'pending' NOT NULL,
	"submitted_by_user_id" integer NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trick_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"trick_id" integer NOT NULL,
	"mux_asset_id" text NOT NULL,
	"status" "trick_video_status" DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"submitted_by_user_id" integer NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tricks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alternate_names" json DEFAULT '[]'::json,
	"description" text,
	"invented_by" text,
	"invented_by_user_id" integer,
	"year_landed" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"followed_by_user_id" integer NOT NULL,
	"followed_user_id" integer NOT NULL,
	CONSTRAINT "user_follows_followed_user_id_followed_by_user_id_pk" PRIMARY KEY("followed_user_id","followed_by_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"country_code" text NOT NULL,
	"country_name" text NOT NULL,
	"label" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "user_locations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_notification_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"likes_enabled" boolean DEFAULT true NOT NULL,
	"comments_enabled" boolean DEFAULT true NOT NULL,
	"follows_enabled" boolean DEFAULT true NOT NULL,
	"new_content_enabled" boolean DEFAULT true NOT NULL,
	"mentions_enabled" boolean DEFAULT true NOT NULL,
	"email_digest_frequency" text DEFAULT 'off' NOT NULL,
	"email_digest_day_of_week" integer DEFAULT 0,
	"email_digest_day_of_month" integer DEFAULT 1,
	"email_digest_hour_utc" integer DEFAULT 9,
	"game_start_reminder_enabled" boolean DEFAULT false NOT NULL,
	"game_start_reminder_hours_before" integer DEFAULT 24,
	"email_unsubscribed_all" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_socials" (
	"facebook" text,
	"instagram" text,
	"spotify" text,
	"tiktok" text,
	"twitter" text,
	"user_id" integer NOT NULL,
	"youtube" text,
	CONSTRAINT "user_socials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"avatar_id" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disciplines" json,
	"email" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"last_seen_at" timestamp with time zone,
	"name" text NOT NULL,
	"arcade_high_score" integer DEFAULT 0 NOT NULL,
	"notify_when_shop" boolean DEFAULT false NOT NULL,
	"type" "user_type" DEFAULT 'user',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "utv_claps" (
	"id" serial PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utv_video_likes" (
	"utv_video_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "utv_video_likes_utv_video_id_user_id_pk" PRIMARY KEY("utv_video_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "utv_video_message_likes" (
	"utv_video_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "utv_video_message_likes_utv_video_message_id_user_id_pk" PRIMARY KEY("utv_video_message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "utv_video_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"utv_video_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utv_video_riders" (
	"id" serial PRIMARY KEY NOT NULL,
	"utv_video_id" integer NOT NULL,
	"user_id" integer,
	"name" text,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utv_video_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"utv_video_id" integer NOT NULL,
	"diff" json NOT NULL,
	"reason" text,
	"status" "trick_submission_status" DEFAULT 'pending' NOT NULL,
	"submitted_by_user_id" integer NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utv_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"legacy_url" text NOT NULL,
	"legacy_title" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"thumbnail_scale" real DEFAULT 1 NOT NULL,
	"thumbnail_seconds" integer DEFAULT 30 NOT NULL,
	"title_confidence_score" integer DEFAULT -1 NOT NULL,
	"disciplines" json,
	"mux_asset_id" text
);
--> statement-breakpoint
ALTER TABLE "biu_set_likes" ADD CONSTRAINT "biu_set_likes_biu_set_id_biu_sets_id_fk" FOREIGN KEY ("biu_set_id") REFERENCES "public"."biu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biu_set_likes" ADD CONSTRAINT "biu_set_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biu_set_message_likes" ADD CONSTRAINT "biu_set_message_likes_biu_set_message_id_biu_set_messages_id_fk" FOREIGN KEY ("biu_set_message_id") REFERENCES "public"."biu_set_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biu_set_message_likes" ADD CONSTRAINT "biu_set_message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biu_set_messages" ADD CONSTRAINT "biu_set_messages_biu_set_id_biu_sets_id_fk" FOREIGN KEY ("biu_set_id") REFERENCES "public"."biu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biu_set_messages" ADD CONSTRAINT "biu_set_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biu_sets" ADD CONSTRAINT "biu_sets_biu_id_bius_id_fk" FOREIGN KEY ("biu_id") REFERENCES "public"."bius"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biu_sets" ADD CONSTRAINT "biu_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biu_sets" ADD CONSTRAINT "biu_sets_mux_asset_id_mux_videos_asset_id_fk" FOREIGN KEY ("mux_asset_id") REFERENCES "public"."mux_videos"("asset_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_likes" ADD CONSTRAINT "chat_message_likes_chat_message_id_chat_messages_id_fk" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_likes" ADD CONSTRAINT "chat_message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_reminders_sent" ADD CONSTRAINT "email_reminders_sent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_reminders_sent" ADD CONSTRAINT "email_reminders_sent_riu_id_rius_id_fk" FOREIGN KEY ("riu_id") REFERENCES "public"."rius"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_proposals" ADD CONSTRAINT "glossary_proposals_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_proposals" ADD CONSTRAINT "glossary_proposals_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_message_likes" ADD CONSTRAINT "post_message_likes_post_message_id_post_messages_id_fk" FOREIGN KEY ("post_message_id") REFERENCES "public"."post_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_message_likes" ADD CONSTRAINT "post_message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_messages" ADD CONSTRAINT "post_messages_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_messages" ADD CONSTRAINT "post_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_mux_asset_id_mux_videos_asset_id_fk" FOREIGN KEY ("mux_asset_id") REFERENCES "public"."mux_videos"("asset_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_set_likes" ADD CONSTRAINT "riu_set_likes_riu_set_id_riu_sets_id_fk" FOREIGN KEY ("riu_set_id") REFERENCES "public"."riu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_set_likes" ADD CONSTRAINT "riu_set_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_set_message_likes" ADD CONSTRAINT "riu_set_message_likes_riu_set_message_id_riu_set_messages_id_fk" FOREIGN KEY ("riu_set_message_id") REFERENCES "public"."riu_set_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_set_message_likes" ADD CONSTRAINT "riu_set_message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_set_messages" ADD CONSTRAINT "riu_set_messages_riu_set_id_riu_sets_id_fk" FOREIGN KEY ("riu_set_id") REFERENCES "public"."riu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_set_messages" ADD CONSTRAINT "riu_set_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_sets" ADD CONSTRAINT "riu_sets_riu_id_rius_id_fk" FOREIGN KEY ("riu_id") REFERENCES "public"."rius"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_sets" ADD CONSTRAINT "riu_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_sets" ADD CONSTRAINT "riu_sets_mux_asset_id_mux_videos_asset_id_fk" FOREIGN KEY ("mux_asset_id") REFERENCES "public"."mux_videos"("asset_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submission_likes" ADD CONSTRAINT "riu_submission_likes_riu_submission_id_riu_submissions_id_fk" FOREIGN KEY ("riu_submission_id") REFERENCES "public"."riu_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submission_likes" ADD CONSTRAINT "riu_submission_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submission_message_likes" ADD CONSTRAINT "riu_submission_message_likes_riu_submission_message_id_riu_submission_messages_id_fk" FOREIGN KEY ("riu_submission_message_id") REFERENCES "public"."riu_submission_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submission_message_likes" ADD CONSTRAINT "riu_submission_message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submission_messages" ADD CONSTRAINT "riu_submission_messages_riu_submission_id_riu_submissions_id_fk" FOREIGN KEY ("riu_submission_id") REFERENCES "public"."riu_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submission_messages" ADD CONSTRAINT "riu_submission_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submissions" ADD CONSTRAINT "riu_submissions_riu_set_id_riu_sets_id_fk" FOREIGN KEY ("riu_set_id") REFERENCES "public"."riu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submissions" ADD CONSTRAINT "riu_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riu_submissions" ADD CONSTRAINT "riu_submissions_mux_asset_id_mux_videos_asset_id_fk" FOREIGN KEY ("mux_asset_id") REFERENCES "public"."mux_videos"("asset_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_archive_votes" ADD CONSTRAINT "siu_archive_votes_siu_id_sius_id_fk" FOREIGN KEY ("siu_id") REFERENCES "public"."sius"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_archive_votes" ADD CONSTRAINT "siu_archive_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_set_likes" ADD CONSTRAINT "siu_set_likes_siu_set_id_siu_sets_id_fk" FOREIGN KEY ("siu_set_id") REFERENCES "public"."siu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_set_likes" ADD CONSTRAINT "siu_set_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_set_message_likes" ADD CONSTRAINT "siu_set_message_likes_siu_set_message_id_siu_set_messages_id_fk" FOREIGN KEY ("siu_set_message_id") REFERENCES "public"."siu_set_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_set_message_likes" ADD CONSTRAINT "siu_set_message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_set_messages" ADD CONSTRAINT "siu_set_messages_siu_set_id_siu_sets_id_fk" FOREIGN KEY ("siu_set_id") REFERENCES "public"."siu_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_set_messages" ADD CONSTRAINT "siu_set_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_sets" ADD CONSTRAINT "siu_sets_siu_id_sius_id_fk" FOREIGN KEY ("siu_id") REFERENCES "public"."sius"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_sets" ADD CONSTRAINT "siu_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siu_sets" ADD CONSTRAINT "siu_sets_mux_asset_id_mux_videos_asset_id_fk" FOREIGN KEY ("mux_asset_id") REFERENCES "public"."mux_videos"("asset_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_element_assignments" ADD CONSTRAINT "trick_element_assignments_trick_id_tricks_id_fk" FOREIGN KEY ("trick_id") REFERENCES "public"."tricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_element_assignments" ADD CONSTRAINT "trick_element_assignments_element_id_trick_elements_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."trick_elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_likes" ADD CONSTRAINT "trick_likes_trick_id_tricks_id_fk" FOREIGN KEY ("trick_id") REFERENCES "public"."tricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_likes" ADD CONSTRAINT "trick_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_message_likes" ADD CONSTRAINT "trick_message_likes_trick_message_id_trick_messages_id_fk" FOREIGN KEY ("trick_message_id") REFERENCES "public"."trick_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_message_likes" ADD CONSTRAINT "trick_message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_messages" ADD CONSTRAINT "trick_messages_trick_id_tricks_id_fk" FOREIGN KEY ("trick_id") REFERENCES "public"."tricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_messages" ADD CONSTRAINT "trick_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_relationships" ADD CONSTRAINT "trick_relationships_source_trick_id_tricks_id_fk" FOREIGN KEY ("source_trick_id") REFERENCES "public"."tricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_relationships" ADD CONSTRAINT "trick_relationships_target_trick_id_tricks_id_fk" FOREIGN KEY ("target_trick_id") REFERENCES "public"."tricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_submission_element_assignments" ADD CONSTRAINT "trick_submission_element_assignments_submission_id_trick_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."trick_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_submission_element_assignments" ADD CONSTRAINT "trick_submission_element_assignments_element_id_trick_elements_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."trick_elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_submission_relationships" ADD CONSTRAINT "trick_submission_relationships_submission_id_trick_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."trick_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_submission_relationships" ADD CONSTRAINT "trick_submission_relationships_target_trick_id_tricks_id_fk" FOREIGN KEY ("target_trick_id") REFERENCES "public"."tricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_submissions" ADD CONSTRAINT "trick_submissions_invented_by_user_id_users_id_fk" FOREIGN KEY ("invented_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_submissions" ADD CONSTRAINT "trick_submissions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_submissions" ADD CONSTRAINT "trick_submissions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_suggestions" ADD CONSTRAINT "trick_suggestions_trick_id_tricks_id_fk" FOREIGN KEY ("trick_id") REFERENCES "public"."tricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_suggestions" ADD CONSTRAINT "trick_suggestions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_suggestions" ADD CONSTRAINT "trick_suggestions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_videos" ADD CONSTRAINT "trick_videos_trick_id_tricks_id_fk" FOREIGN KEY ("trick_id") REFERENCES "public"."tricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_videos" ADD CONSTRAINT "trick_videos_mux_asset_id_mux_videos_asset_id_fk" FOREIGN KEY ("mux_asset_id") REFERENCES "public"."mux_videos"("asset_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_videos" ADD CONSTRAINT "trick_videos_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trick_videos" ADD CONSTRAINT "trick_videos_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tricks" ADD CONSTRAINT "tricks_invented_by_user_id_users_id_fk" FOREIGN KEY ("invented_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followed_by_user_id_users_id_fk" FOREIGN KEY ("followed_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followed_user_id_users_id_fk" FOREIGN KEY ("followed_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_socials" ADD CONSTRAINT "user_socials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_likes" ADD CONSTRAINT "utv_video_likes_utv_video_id_utv_videos_id_fk" FOREIGN KEY ("utv_video_id") REFERENCES "public"."utv_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_likes" ADD CONSTRAINT "utv_video_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_message_likes" ADD CONSTRAINT "utv_video_message_likes_utv_video_message_id_utv_video_messages_id_fk" FOREIGN KEY ("utv_video_message_id") REFERENCES "public"."utv_video_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_message_likes" ADD CONSTRAINT "utv_video_message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_messages" ADD CONSTRAINT "utv_video_messages_utv_video_id_utv_videos_id_fk" FOREIGN KEY ("utv_video_id") REFERENCES "public"."utv_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_messages" ADD CONSTRAINT "utv_video_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_riders" ADD CONSTRAINT "utv_video_riders_utv_video_id_utv_videos_id_fk" FOREIGN KEY ("utv_video_id") REFERENCES "public"."utv_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_riders" ADD CONSTRAINT "utv_video_riders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_suggestions" ADD CONSTRAINT "utv_video_suggestions_utv_video_id_utv_videos_id_fk" FOREIGN KEY ("utv_video_id") REFERENCES "public"."utv_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_suggestions" ADD CONSTRAINT "utv_video_suggestions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_video_suggestions" ADD CONSTRAINT "utv_video_suggestions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utv_videos" ADD CONSTRAINT "utv_videos_mux_asset_id_mux_videos_asset_id_fk" FOREIGN KEY ("mux_asset_id") REFERENCES "public"."mux_videos"("asset_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_reminders_sent_user_type_riu_idx" ON "email_reminders_sent" USING btree ("user_id","reminder_type","riu_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_grouping_idx" ON "notifications" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trick_relationships_source_idx" ON "trick_relationships" USING btree ("source_trick_id");--> statement-breakpoint
CREATE INDEX "trick_relationships_target_idx" ON "trick_relationships" USING btree ("target_trick_id");--> statement-breakpoint
CREATE INDEX "trick_videos_trick_id_idx" ON "trick_videos" USING btree ("trick_id");--> statement-breakpoint
CREATE INDEX "trick_videos_status_idx" ON "trick_videos" USING btree ("status");
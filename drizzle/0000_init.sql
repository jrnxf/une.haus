CREATE TABLE `auth_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `biu_set_likes` (
	`biu_set_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`biu_set_id`, `user_id`),
	FOREIGN KEY (`biu_set_id`) REFERENCES `biu_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `biu_set_message_likes` (
	`biu_set_message_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`biu_set_message_id`, `user_id`),
	FOREIGN KEY (`biu_set_message_id`) REFERENCES `biu_set_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `biu_set_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`biu_set_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`biu_set_id`) REFERENCES `biu_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `biu_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`biu_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`mux_asset_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`parent_set_id` integer,
	`deleted_at` integer,
	FOREIGN KEY (`biu_id`) REFERENCES `bius`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mux_asset_id`) REFERENCES `mux_videos`(`asset_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `biu_sets_user_created_idx` ON `biu_sets` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `biu_sets_biu_id_idx` ON `biu_sets` (`biu_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `biu_sets_one_child_uq` ON `biu_sets` (`parent_set_id`) WHERE parent_set_id IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `biu_sets_round_position_uq` ON `biu_sets` (`biu_id`,`position`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `bius` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_message_likes` (
	`chat_message_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`chat_message_id`, `user_id`),
	FOREIGN KEY (`chat_message_id`) REFERENCES `chat_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `email_reminders_sent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`reminder_type` text NOT NULL,
	`riu_id` integer,
	`sent_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`riu_id`) REFERENCES `rius`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_reminders_sent_user_type_riu_idx` ON `email_reminders_sent` (`user_id`,`reminder_type`,`riu_id`);--> statement-breakpoint
CREATE TABLE `flags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`reason` text NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`resolved_at` integer,
	`resolved_by_user_id` integer,
	`resolution` text,
	`parent_entity_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `glossary_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`target_id` integer,
	`diff` text,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_user_id` integer NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_at` integer,
	`review_notes` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `mux_videos` (
	`asset_id` text PRIMARY KEY NOT NULL,
	`playback_id` text,
	`upload_id` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mux_videos_playback_id_unique` ON `mux_videos` (`playback_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mux_videos_upload_id_unique` ON `mux_videos` (`upload_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`actor_id` integer,
	`type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`data` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`read_at` integer,
	`emailed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_unread_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `notifications_grouping_idx` ON `notifications` (`user_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `notifications_created_at_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_emailed_created_idx` ON `notifications` (`user_id`,`emailed_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `post_likes` (
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `post_message_likes` (
	`post_message_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`post_message_id`, `user_id`),
	FOREIGN KEY (`post_message_id`) REFERENCES `post_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `post_messages` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_messages_user_created_idx` ON `post_messages` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `posts` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`image_id` text,
	`tags` text DEFAULT '[]',
	`title` text NOT NULL,
	`user_id` integer NOT NULL,
	`mux_asset_id` text,
	`youtube_video_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mux_asset_id`) REFERENCES `mux_videos`(`asset_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `posts_user_created_idx` ON `posts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `presence` (
	`subject` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`resets_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `riu_set_likes` (
	`riu_set_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`riu_set_id`, `user_id`),
	FOREIGN KEY (`riu_set_id`) REFERENCES `riu_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `riu_set_message_likes` (
	`riu_set_message_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`riu_set_message_id`, `user_id`),
	FOREIGN KEY (`riu_set_message_id`) REFERENCES `riu_set_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `riu_set_messages` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`riu_set_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`riu_set_id`) REFERENCES `riu_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `riu_sets` (
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`instructions` text,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`riu_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`mux_asset_id` text NOT NULL,
	FOREIGN KEY (`riu_id`) REFERENCES `rius`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mux_asset_id`) REFERENCES `mux_videos`(`asset_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `riu_sets_user_created_idx` ON `riu_sets` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `riu_sets_riu_id_idx` ON `riu_sets` (`riu_id`);--> statement-breakpoint
CREATE TABLE `riu_submission_likes` (
	`riu_submission_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`riu_submission_id`, `user_id`),
	FOREIGN KEY (`riu_submission_id`) REFERENCES `riu_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `riu_submission_message_likes` (
	`riu_submission_message_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`riu_submission_message_id`, `user_id`),
	FOREIGN KEY (`riu_submission_message_id`) REFERENCES `riu_submission_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `riu_submission_messages` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`riu_submission_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`riu_submission_id`) REFERENCES `riu_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `riu_submissions` (
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`riu_set_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`mux_asset_id` text NOT NULL,
	FOREIGN KEY (`riu_set_id`) REFERENCES `riu_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mux_asset_id`) REFERENCES `mux_videos`(`asset_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `riu_submissions_user_created_idx` ON `riu_submissions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `riu_submissions_riu_set_id_user_id_unique` ON `riu_submissions` (`riu_set_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `rius` (
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer,
	`status` text DEFAULT 'upcoming'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rius_one_active_idx` ON `rius` (`status`) WHERE "rius"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX `rius_one_upcoming_idx` ON `rius` (`status`) WHERE "rius"."status" = 'upcoming';--> statement-breakpoint
CREATE TABLE `siu_archive_votes` (
	`siu_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	PRIMARY KEY(`siu_id`, `user_id`),
	FOREIGN KEY (`siu_id`) REFERENCES `sius`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `siu_set_likes` (
	`siu_set_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`siu_set_id`, `user_id`),
	FOREIGN KEY (`siu_set_id`) REFERENCES `siu_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `siu_set_message_likes` (
	`siu_set_message_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`siu_set_message_id`, `user_id`),
	FOREIGN KEY (`siu_set_message_id`) REFERENCES `siu_set_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `siu_set_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`siu_set_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`siu_set_id`) REFERENCES `siu_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `siu_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`siu_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`mux_asset_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`parent_set_id` integer,
	`deleted_at` integer,
	FOREIGN KEY (`siu_id`) REFERENCES `sius`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mux_asset_id`) REFERENCES `mux_videos`(`asset_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `siu_sets_user_created_idx` ON `siu_sets` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `siu_sets_siu_id_idx` ON `siu_sets` (`siu_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `siu_sets_one_child_uq` ON `siu_sets` (`parent_set_id`) WHERE parent_set_id IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `siu_sets_round_position_uq` ON `siu_sets` (`siu_id`,`position`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `sius` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'active',
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`ended_at` integer
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`phase` text DEFAULT 'setup' NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`state` text NOT NULL,
	`admin_heartbeat_at` integer,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tournaments_code_unique` ON `tournaments` (`code`);--> statement-breakpoint
CREATE TABLE `trick_element_assignments` (
	`trick_id` integer NOT NULL,
	`element_id` integer NOT NULL,
	PRIMARY KEY(`trick_id`, `element_id`),
	FOREIGN KEY (`trick_id`) REFERENCES `tricks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`element_id`) REFERENCES `trick_elements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trick_elements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trick_likes` (
	`trick_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`trick_id`, `user_id`),
	FOREIGN KEY (`trick_id`) REFERENCES `tricks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trick_message_likes` (
	`trick_message_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`trick_message_id`, `user_id`),
	FOREIGN KEY (`trick_message_id`) REFERENCES `trick_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trick_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`trick_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`trick_id`) REFERENCES `tricks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trick_modifiers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trick_relationships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_trick_id` integer NOT NULL,
	`target_trick_id` integer NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`source_trick_id`) REFERENCES `tricks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_trick_id`) REFERENCES `tricks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trick_relationships_source_idx` ON `trick_relationships` (`source_trick_id`);--> statement-breakpoint
CREATE INDEX `trick_relationships_target_idx` ON `trick_relationships` (`target_trick_id`);--> statement-breakpoint
CREATE TABLE `trick_submission_element_assignments` (
	`submission_id` integer NOT NULL,
	`element_id` integer NOT NULL,
	PRIMARY KEY(`submission_id`, `element_id`),
	FOREIGN KEY (`submission_id`) REFERENCES `trick_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`element_id`) REFERENCES `trick_elements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trick_submission_relationships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`submission_id` integer NOT NULL,
	`target_trick_id` integer NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `trick_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_trick_id`) REFERENCES `tricks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trick_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`alternate_names` text DEFAULT '[]',
	`description` text,
	`invented_by` text,
	`invented_by_user_id` integer,
	`year_landed` integer,
	`video_url` text,
	`video_timestamp` text,
	`notes` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_user_id` integer NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_at` integer,
	`review_notes` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`invented_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `trick_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trick_id` integer NOT NULL,
	`diff` text NOT NULL,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_user_id` integer NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_at` integer,
	`review_notes` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`trick_id`) REFERENCES `tricks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `trick_videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trick_id` integer NOT NULL,
	`mux_asset_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`pinned_rank` integer,
	`submitted_by_user_id` integer NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`trick_id`) REFERENCES `tricks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mux_asset_id`) REFERENCES `mux_videos`(`asset_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `trick_videos_trick_id_idx` ON `trick_videos` (`trick_id`);--> statement-breakpoint
CREATE INDEX `trick_videos_status_idx` ON `trick_videos` (`status`);--> statement-breakpoint
CREATE INDEX `trick_videos_submitted_by_idx` ON `trick_videos` (`submitted_by_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `trick_videos_trick_asset_user_uq` ON `trick_videos` (`trick_id`,`mux_asset_id`,`submitted_by_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `trick_videos_pinned_rank_uq` ON `trick_videos` (`trick_id`,`pinned_rank`) WHERE pinned_rank is not null;--> statement-breakpoint
CREATE TABLE `tricks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`alternate_names` text DEFAULT '[]',
	`description` text,
	`invented_by` text,
	`invented_by_user_id` integer,
	`year_landed` integer,
	`notes` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`invented_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user_follows` (
	`followed_by_user_id` integer NOT NULL,
	`followed_user_id` integer NOT NULL,
	PRIMARY KEY(`followed_user_id`, `followed_by_user_id`),
	FOREIGN KEY (`followed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`followed_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_locations` (
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	`label` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_locations_user_id_unique` ON `user_locations` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_notification_settings` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`likes_enabled` integer DEFAULT true NOT NULL,
	`comments_enabled` integer DEFAULT true NOT NULL,
	`follows_enabled` integer DEFAULT true NOT NULL,
	`new_content_enabled` integer DEFAULT true NOT NULL,
	`mentions_enabled` integer DEFAULT true NOT NULL,
	`game_activity_enabled` integer DEFAULT true NOT NULL,
	`email_digest_frequency` text DEFAULT 'off' NOT NULL,
	`email_digest_day_of_week` integer DEFAULT 0,
	`email_digest_day_of_month` integer DEFAULT 1,
	`email_digest_hour_utc` integer DEFAULT 9,
	`game_start_reminder_enabled` integer DEFAULT false NOT NULL,
	`game_start_reminder_hours_before` integer DEFAULT 24,
	`email_unsubscribed_all` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_socials` (
	`facebook` text,
	`instagram` text,
	`spotify` text,
	`tiktok` text,
	`twitter` text,
	`user_id` integer NOT NULL,
	`youtube` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_socials_user_id_unique` ON `user_socials` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`avatar_id` text,
	`bio` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`disciplines` text,
	`email` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`last_seen_at` integer,
	`name` text NOT NULL,
	`arcade_high_score` integer DEFAULT 0 NOT NULL,
	`notify_when_shop` integer DEFAULT false NOT NULL,
	`type` text DEFAULT 'user'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `utv_claps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `utv_video_likes` (
	`utv_video_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`utv_video_id`, `user_id`),
	FOREIGN KEY (`utv_video_id`) REFERENCES `utv_videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `utv_video_message_likes` (
	`utv_video_message_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`utv_video_message_id`, `user_id`),
	FOREIGN KEY (`utv_video_message_id`) REFERENCES `utv_video_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `utv_video_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`utv_video_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`utv_video_id`) REFERENCES `utv_videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `utv_video_riders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`utv_video_id` integer NOT NULL,
	`user_id` integer,
	`name` text,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`utv_video_id`) REFERENCES `utv_videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `utv_video_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`utv_video_id` integer NOT NULL,
	`diff` text NOT NULL,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_user_id` integer NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_at` integer,
	`review_notes` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`utv_video_id`) REFERENCES `utv_videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `utv_videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`legacy_url` text NOT NULL,
	`legacy_title` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`thumbnail_scale` real DEFAULT 1 NOT NULL,
	`thumbnail_seconds` integer DEFAULT 30 NOT NULL,
	`title_confidence_score` integer DEFAULT -1 NOT NULL,
	`disciplines` text,
	`mux_asset_id` text,
	FOREIGN KEY (`mux_asset_id`) REFERENCES `mux_videos`(`asset_id`) ON UPDATE no action ON DELETE set null
);

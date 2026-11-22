CREATE TABLE `ask_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`day` text NOT NULL,
	`source` text NOT NULL,
	`tools` text NOT NULL,
	`turns` integer NOT NULL,
	`cost_microusd` integer NOT NULL,
	`error` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ask_events_day_idx` ON `ask_events` (`day`);--> statement-breakpoint
CREATE INDEX `ask_events_user_day_idx` ON `ask_events` (`user_id`,`day`);--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`day` text NOT NULL,
	`user_id` integer NOT NULL,
	`feature` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`actions` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `user_id`, `feature`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_activity_user_day_idx` ON `daily_activity` (`user_id`,`day`);--> statement-breakpoint
CREATE TABLE `daily_page_views` (
	`day` text NOT NULL,
	`route` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `route`)
);

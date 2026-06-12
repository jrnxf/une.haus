ALTER TYPE "public"."notification_type" ADD VALUE 'game_activity';--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD COLUMN "game_activity_enabled" boolean DEFAULT true NOT NULL;
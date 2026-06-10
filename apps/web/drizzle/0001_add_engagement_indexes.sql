CREATE INDEX "biu_sets_user_created_idx" ON "biu_sets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "biu_sets_biu_id_idx" ON "biu_sets" USING btree ("biu_id");--> statement-breakpoint
CREATE INDEX "notifications_user_emailed_created_idx" ON "notifications" USING btree ("user_id","emailed_at","created_at");--> statement-breakpoint
CREATE INDEX "post_messages_user_created_idx" ON "post_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_user_created_idx" ON "posts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "riu_sets_user_created_idx" ON "riu_sets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "riu_sets_riu_id_idx" ON "riu_sets" USING btree ("riu_id");--> statement-breakpoint
CREATE INDEX "riu_submissions_user_created_idx" ON "riu_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "siu_sets_user_created_idx" ON "siu_sets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "siu_sets_siu_id_idx" ON "siu_sets" USING btree ("siu_id");
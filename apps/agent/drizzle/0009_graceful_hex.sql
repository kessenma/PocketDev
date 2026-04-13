CREATE TABLE `push_log` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text,
	`type` text NOT NULL,
	`task_id` text,
	`title` text NOT NULL,
	`success` integer NOT NULL,
	`relay_status_code` integer,
	`sent_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `devices` ADD `apns_token` text;--> statement-breakpoint
ALTER TABLE `devices` ADD `apns_token_updated_at` text;
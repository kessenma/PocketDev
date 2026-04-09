CREATE TABLE `task_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`turn_number` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `turn_count` integer DEFAULT 1;
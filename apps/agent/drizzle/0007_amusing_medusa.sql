CREATE TABLE `env_vars` (
	`id` text PRIMARY KEY NOT NULL,
	`project_path` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`comment` text,
	`is_secret` integer DEFAULT 0,
	`is_multiline` integer DEFAULT 0,
	`order` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `env_vars_project_key_unique` ON `env_vars` (`project_path`,`key`);
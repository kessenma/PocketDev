CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`absolute_path` text NOT NULL,
	`remote_url` text,
	`owner` text,
	`source` text DEFAULT 'local' NOT NULL,
	`default_branch` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	`last_used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_absolute_path_unique` ON `projects` (`absolute_path`);--> statement-breakpoint
CREATE TABLE `passkey_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` integer NOT NULL,
	`credential_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`credential_device_type` text,
	`credential_backed_up` integer DEFAULT 0,
	`transports` text,
	`device_name` text,
	`aaguid` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_used_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passkey_credentials_credential_id_unique` ON `passkey_credentials` (`credential_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `mode` text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE `tasks` ADD `model` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `project_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `project_name` text;
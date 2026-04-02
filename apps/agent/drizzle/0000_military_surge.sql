CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`name` text,
	`platform` text,
	`created_at` text DEFAULT (datetime('now')),
	`last_seen_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `server_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`stream` text NOT NULL,
	`line` text NOT NULL,
	`timestamp` text DEFAULT (datetime('now')),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt` text NOT NULL,
	`agent_type` text DEFAULT 'claude',
	`status` text DEFAULT 'pending',
	`working_directory` text,
	`created_at` text DEFAULT (datetime('now')),
	`started_at` text,
	`completed_at` text,
	`exit_code` integer
);
--> statement-breakpoint
CREATE TABLE `plan_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`role` text NOT NULL,
	`text` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`required` integer DEFAULT 0,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`file_path` text,
	`completed` integer DEFAULT 0,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`agent_name` text,
	`status` text DEFAULT 'pending',
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`resolved_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tool_paths` (
	`tool_id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`version` text,
	`installed` integer DEFAULT 1,
	`authenticated` integer DEFAULT 0,
	`detected_at` text DEFAULT (datetime('now')),
	`manually_set` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `admin_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_accounts_email_unique` ON `admin_accounts` (`email`);
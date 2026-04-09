CREATE TABLE `git_commit_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`commit_id` text NOT NULL,
	`path` text NOT NULL,
	`old_path` text,
	`kind` text NOT NULL,
	`additions` integer DEFAULT 0,
	`deletions` integer DEFAULT 0,
	FOREIGN KEY (`commit_id`) REFERENCES `git_commits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `git_commits` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sha` text NOT NULL,
	`short_sha` text NOT NULL,
	`message` text NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text,
	`committed_at` text NOT NULL,
	`branch` text,
	`additions` integer DEFAULT 0,
	`deletions` integer DEFAULT 0,
	`files_changed` integer DEFAULT 0,
	`synced_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `task_commits` (
	`task_id` text NOT NULL,
	`commit_id` text NOT NULL,
	PRIMARY KEY(`task_id`, `commit_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commit_id`) REFERENCES `git_commits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `last_synced_sha` text;
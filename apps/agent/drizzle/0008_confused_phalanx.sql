CREATE TABLE `device_offline_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`project_id` text NOT NULL,
	`branch` text NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`total_bytes` integer DEFAULT 0 NOT NULL,
	`downloaded_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_offline_snapshots_device_project_branch` ON `device_offline_snapshots` (`device_id`,`project_id`,`branch`);
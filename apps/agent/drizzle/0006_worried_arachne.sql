ALTER TABLE `admin_accounts` ADD `role` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_accounts` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_accounts` ADD `reviewed_by_user_id` integer;--> statement-breakpoint
ALTER TABLE `admin_accounts` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `admin_accounts` ADD `last_login_at` text;--> statement-breakpoint
UPDATE `admin_accounts`
SET `role` = 'owner',
    `status` = 'active',
    `reviewed_at` = COALESCE(`reviewed_at`, `created_at`)
WHERE `id` = (
  SELECT `id`
  FROM `admin_accounts`
  ORDER BY `id`
  LIMIT 1
);--> statement-breakpoint
INSERT OR IGNORE INTO `server_config` (`key`, `value`)
VALUES ('console_signup_enabled', '1');

ALTER TABLE `traffic_reports` ADD `clear_votes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `traffic_reports` ADD `last_confirmed_at` text;--> statement-breakpoint
ALTER TABLE `traffic_reports` ADD `cleared_at` text;--> statement-breakpoint
CREATE INDEX `traffic_reports_cleared_idx` ON `traffic_reports` (`cleared_at`);
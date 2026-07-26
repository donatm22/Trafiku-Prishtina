CREATE TABLE `traffic_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`location_name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`severity` text NOT NULL,
	`confirmations` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `traffic_reports_expires_idx` ON `traffic_reports` (`expires_at`);--> statement-breakpoint
CREATE INDEX `traffic_reports_type_idx` ON `traffic_reports` (`type`);
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created` text NOT NULL,
	`detail` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `config_history` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`payload` text NOT NULL,
	`created` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `configurations` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`payload` text NOT NULL,
	`updated` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`mode` text NOT NULL,
	`cn` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`payload` text NOT NULL,
	`region` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);

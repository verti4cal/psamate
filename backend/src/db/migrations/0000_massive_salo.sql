CREATE TABLE `charges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`energy_added_kwh` real,
	`start_soc` real,
	`end_soc` real,
	`cost` real,
	`location_lat` real,
	`location_lng` real,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trip_waypoints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_id` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`distance_km` real,
	`energy_consumed` real,
	`start_lat` real,
	`start_lng` real,
	`end_lat` real,
	`end_lng` real,
	`avg_speed_kmh` real,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicle_status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`battery_level` real,
	`range_km` real,
	`latitude` real,
	`longitude` real,
	`mileage_km` real,
	`is_charging` integer,
	`is_moving` integer,
	`doors_locked` integer,
	`raw_json` text,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vin` text NOT NULL,
	`brand` text NOT NULL,
	`label` text NOT NULL,
	`model` text,
	`year` integer,
	`is_electric` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_vin_unique` ON `vehicles` (`vin`);
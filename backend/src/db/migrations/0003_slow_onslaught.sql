ALTER TABLE `vehicle_status` ADD `outside_temp_c` real;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `is_daytime` integer;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `speed_kmh` real;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `heading_deg` real;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `gps_signal_quality` integer;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `fix_status` text;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `ignition_state` text;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `plugged_in` integer;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `charging_status` text;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `charging_mode` text;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `charging_rate` real;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `remaining_charge_minutes` integer;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `battery_capacity_wh` real;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `battery_residual_wh` real;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `battery_health_percent` real;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `battery_12v_voltage` real;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `privacy_state` text;--> statement-breakpoint
ALTER TABLE `vehicle_status` ADD `service_type` text;
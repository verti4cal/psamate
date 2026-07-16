ALTER TABLE `vehicles` ADD `psa_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_psa_id_unique` ON `vehicles` (`psa_id`);
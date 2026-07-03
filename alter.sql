ALTER TABLE `rooms` 
  ADD COLUMN `venue_info` VARCHAR(255) NULL,
  ADD COLUMN `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `is_template` TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE `timers`
  ADD COLUMN `parent_id` VARCHAR(36) NULL,
  ADD COLUMN `pic` VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN `timer_mode` ENUM('countdown','countup','clock','time_of_day') NOT NULL DEFAULT 'countdown',
  ADD COLUMN `attachment_url` TEXT NULL,
  ADD COLUMN `attachment_path` TEXT NULL,
  ADD COLUMN `is_locked` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `planned_start` BIGINT NULL;

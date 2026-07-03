CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin','owner','operator') NOT NULL DEFAULT 'owner',
  `api_token` VARCHAR(64) NULL,
  `created_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_email` (`email`),
  UNIQUE KEY `idx_token` (`api_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Password for both users is "admin"
-- bcrypt hash of "admin" generated for PHP password_verify
REPLACE INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `api_token`, `created_at`) VALUES
('superadmin-001', 'Super Administrator', 'superadmin@example.com', '$2y$12$NU3T4exlsEa2IR8VSdQ48efIc1750qqy678//uItgtyeW.nys8RoG', 'superadmin', 'token-superadmin', 1700000000000),
('user1-001', 'Testing User 1', 'user1@example.com', '$2y$12$NU3T4exlsEa2IR8VSdQ48efIc1750qqy678//uItgtyeW.nys8RoG', 'owner', 'token-user1', 1700000000000);

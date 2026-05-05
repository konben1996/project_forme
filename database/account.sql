-- Computer Store account database schema
-- Compatible with MySQL 8+ / MariaDB 10.4+
-- Run this file directly to create the account-related tables.

CREATE DATABASE IF NOT EXISTS computer_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE computer_store;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS user_addresses;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin', 'support') NOT NULL DEFAULT 'customer',
  status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL,
  remember_token VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_status (status),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(60) NOT NULL DEFAULT 'Địa chỉ mặc định',
  recipient_name VARCHAR(120) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  address_line VARCHAR(255) NOT NULL,
  ward VARCHAR(120) DEFAULT NULL,
  district VARCHAR(120) DEFAULT NULL,
  province VARCHAR(120) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_addresses_user_id (user_id),
  KEY idx_user_addresses_is_default (is_default),
  CONSTRAINT fk_user_addresses_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_user_id (user_id),
  UNIQUE KEY uq_password_reset_tokens_token_hash (token_hash),
  KEY idx_password_reset_tokens_expires_at (expires_at),
  CONSTRAINT fk_password_reset_tokens_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sessions (
  id CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_sessions_user_id (user_id),
  KEY idx_user_sessions_expires_at (expires_at),
  CONSTRAINT fk_user_sessions_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (
  full_name,
  email,
  phone,
  password_hash,
  role,
  status,
  email_verified_at,
  last_login_at,
  remember_token
) VALUES
  (
    'Nguyễn Anh',
    'nguyen.anh@example.com',
    '0900123456',
    '$2y$10$e0NR5fG3T7mC1p8rj7Y1qO0P7ZJkq1n9W3M1r7P1vQ4w8m5NQG0tG',
    'customer',
    'active',
    '2026-04-12 08:30:00',
    '2026-04-12 09:15:00',
    NULL
  ),
  (
    'Admin Computer Store',
    'admin@computerstore.vn',
    '0900000001',
    '$2y$10$wX8vQj4L4G0n3pQm8f7m1u1C0v3r5s9d2f6h8j0k1l2m3n4p5q6r',
    'admin',
    'active',
    '2026-04-01 08:00:00',
    '2026-04-05 09:00:00',
    NULL
  ),
  (
    'Hỗ trợ khách hàng',
    'support@computerstore.vn',
    '0900000002',
    '$2y$10$K4mN7pQ2xR5sT8uV1wY3zA0bC4dE6fG8hI1jK3lM5nO7pQ9rS1tU',
    'support',
    'active',
    '2026-04-01 08:00:00',
    NULL,
    NULL
  );

INSERT INTO user_addresses (
  user_id,
  label,
  recipient_name,
  recipient_phone,
  address_line,
  ward,
  district,
  province,
  is_default
) VALUES
  (
    1,
    'Nhà riêng',
    'Nguyễn Anh',
    '0900123456',
    '12 Nguyễn Huệ',
    'Bến Nghé',
    'Quận 1',
    'TP. Hồ Chí Minh',
    1
  ),
  (
    1,
    'Văn phòng',
    'Nguyễn Anh',
    '0900123456',
    '268 Lý Thường Kiệt',
    'Phường 14',
    'Quận 10',
    'TP. Hồ Chí Minh',
    0
  );

INSERT INTO password_reset_tokens (
  user_id,
  token_hash,
  expires_at,
  used_at
) VALUES
  (
    1,
    '$2y$10$resetTokenExampleHashForUser01',
    '2026-04-06 23:59:59',
    NULL
  );

INSERT INTO user_sessions (
  id,
  user_id,
  ip_address,
  user_agent,
  expires_at
) VALUES
  (
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    1,
    '127.0.0.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    '2026-04-20 23:59:59'
  );

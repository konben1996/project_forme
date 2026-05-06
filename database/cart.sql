-- Computer Store cart database schema
-- Compatible with MySQL 8+ / MariaDB 10.4+
-- Creates tables needed for cart page (cart.html) and cart persistence.

CREATE DATABASE IF NOT EXISTS computer_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE computer_store;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;

SET FOREIGN_KEY_CHECKS = 1;

-- One cart per user (for active session/order flow)
CREATE TABLE carts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,

  status ENUM('open', 'submitted', 'abandoned') NOT NULL DEFAULT 'open',

  -- snapshot totals (optional, useful for faster reads)
  items_count INT UNSIGNED NOT NULL DEFAULT 0,
  subtotal_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_carts_user_open (user_id, status),

  KEY idx_carts_user_id (user_id),
  KEY idx_carts_status (status),

  CONSTRAINT fk_carts_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,

  quantity INT UNSIGNED NOT NULL DEFAULT 1,

  -- Keep price snapshot so cart won't change when product price changes later
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit_sale_price DECIMAL(12,2) DEFAULT NULL,

  -- snapshot line totals
  line_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_items_cart_product (cart_id, product_id),

  KEY idx_cart_items_cart_id (cart_id),
  KEY idx_cart_items_product_id (product_id),

  CONSTRAINT fk_cart_items_cart_id
    FOREIGN KEY (cart_id) REFERENCES carts (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_cart_items_product_id
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for computer e-commerce website
-- MySQL 8+
-- Run after tables.sql and before seed.sql

USE computer_store;

ALTER TABLE roles
  ADD UNIQUE KEY uq_roles_name (name),
  ADD UNIQUE KEY uq_roles_slug (slug);

ALTER TABLE users
  ADD UNIQUE KEY uq_users_email (email),
  ADD KEY idx_users_role_id (role_id);

ALTER TABLE user_addresses
  ADD KEY idx_user_addresses_user_id (user_id);

ALTER TABLE brands
  ADD UNIQUE KEY uq_brands_name (name),
  ADD UNIQUE KEY uq_brands_slug (slug);

ALTER TABLE categories
  ADD UNIQUE KEY uq_categories_slug (slug),
  ADD KEY idx_categories_parent_id (parent_id),
  ADD KEY idx_categories_sort_order (sort_order);

ALTER TABLE attributes
  ADD UNIQUE KEY uq_attributes_name (name),
  ADD UNIQUE KEY uq_attributes_slug (slug),
  ADD KEY idx_attributes_data_type (data_type),
  ADD KEY idx_attributes_is_filterable (is_filterable);

ALTER TABLE attribute_values
  ADD UNIQUE KEY uq_attribute_values_attribute_slug (attribute_id, value_slug),
  ADD KEY idx_attribute_values_attribute_id (attribute_id);

ALTER TABLE warehouses
  ADD UNIQUE KEY uq_warehouses_code (code),
  ADD KEY idx_warehouses_is_active (is_active);

ALTER TABLE products
  ADD UNIQUE KEY uq_products_slug (slug),
  ADD UNIQUE KEY uq_products_sku (sku),
  ADD KEY idx_products_category_id (category_id),
  ADD KEY idx_products_brand_id (brand_id),
  ADD KEY idx_products_status (status),
  ADD KEY idx_products_sort_order (sort_order);

ALTER TABLE product_images
  ADD KEY idx_product_images_product_id (product_id),
  ADD KEY idx_product_images_sort_order (sort_order);

ALTER TABLE product_specs
  ADD UNIQUE KEY uq_product_specs_product_id (product_id);

ALTER TABLE product_attribute_values
  ADD KEY idx_product_attribute_values_product_id (product_id),
  ADD KEY idx_product_attribute_values_attribute_id (attribute_id),
  ADD KEY idx_product_attribute_values_attribute_value_id (attribute_value_id);

ALTER TABLE inventories
  ADD UNIQUE KEY uq_inventories_product_warehouse (product_id, warehouse_id),
  ADD KEY idx_inventories_product_id (product_id),
  ADD KEY idx_inventories_warehouse_id (warehouse_id);

ALTER TABLE inventory_transactions
  ADD KEY idx_inventory_transactions_inventory_id (inventory_id),
  ADD KEY idx_inventory_transactions_warehouse_id (warehouse_id),
  ADD KEY idx_inventory_transactions_created_by (created_by);

ALTER TABLE coupons
  ADD UNIQUE KEY uq_coupons_code (code),
  ADD KEY idx_coupons_is_active (is_active);

ALTER TABLE wishlists
  ADD UNIQUE KEY uq_wishlists_user_id (user_id),
  ADD KEY idx_wishlists_user_id (user_id);

ALTER TABLE wishlist_items
  ADD UNIQUE KEY uq_wishlist_items_wishlist_product (wishlist_id, product_id),
  ADD KEY idx_wishlist_items_product_id (product_id);

ALTER TABLE carts
  ADD KEY idx_carts_user_id (user_id);

ALTER TABLE cart_items
  ADD UNIQUE KEY uq_cart_items_cart_product (cart_id, product_id),
  ADD KEY idx_cart_items_product_id (product_id);

ALTER TABLE orders
  ADD UNIQUE KEY uq_orders_order_code (order_code),
  ADD KEY idx_orders_user_id (user_id),
  ADD KEY idx_orders_address_id (address_id),
  ADD KEY idx_orders_coupon_id (coupon_id),
  ADD KEY idx_orders_order_status (order_status);

ALTER TABLE order_items
  ADD KEY idx_order_items_order_id (order_id),
  ADD KEY idx_order_items_product_id (product_id);

ALTER TABLE order_status_history
  ADD KEY idx_order_status_history_order_id (order_id),
  ADD KEY idx_order_status_history_changed_by (changed_by);

ALTER TABLE payments
  ADD KEY idx_payments_order_id (order_id),
  ADD KEY idx_payments_payment_status (payment_status);

ALTER TABLE reviews
  ADD UNIQUE KEY uq_reviews_product_user (product_id, user_id),
  ADD KEY idx_reviews_product_id (product_id),
  ADD KEY idx_reviews_user_id (user_id);

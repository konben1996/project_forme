-- Seed data for computer e-commerce website
-- Run after tables.sql and indexes.sql
-- MySQL 8+

USE computer_store;

-- Roles
INSERT IGNORE INTO roles (name, slug) VALUES
('Admin', 'admin'),
('Customer', 'customer');

-- Categories
INSERT IGNORE INTO categories (parent_id, name, slug, thumbnail_url, meta_title, meta_description, description, sort_order, is_featured, is_active) VALUES
(NULL, 'Laptop', 'laptop', NULL, 'Laptop', 'Máy tính xách tay', 'Máy tính xách tay', 1, 1, 1),
(NULL, 'PC Gaming', 'pc-gaming', NULL, 'PC Gaming', 'Máy tính để bàn chơi game', 'Máy tính để bàn chơi game', 2, 1, 1),
(NULL, 'Linh kiện', 'linh-kien', NULL, 'Linh kiện', 'CPU, GPU, RAM, SSD, mainboard', 'CPU, GPU, RAM, SSD, mainboard', 3, 1, 1),
(NULL, 'Phụ kiện', 'phu-kien', NULL, 'Phụ kiện', 'Chuột, bàn phím, tai nghe, màn hình', 'Chuột, bàn phím, tai nghe, màn hình', 4, 1, 1);

-- Brands
INSERT IGNORE INTO brands (name, slug, website_url, logo_url, description) VALUES
('Apple', 'apple', 'https://www.apple.com', NULL, 'Thương hiệu Apple'),
('ASUS', 'asus', 'https://www.asus.com', NULL, 'Thương hiệu ASUS'),
('MSI', 'msi', 'https://www.msi.com', NULL, 'Thương hiệu MSI'),
('Lenovo', 'lenovo', 'https://www.lenovo.com', NULL, 'Thương hiệu Lenovo'),
('Acer', 'acer', 'https://www.acer.com', NULL, 'Thương hiệu Acer'),
('Dell', 'dell', 'https://www.dell.com', NULL, 'Thương hiệu Dell'),
('Intel', 'intel', 'https://www.intel.com', NULL, 'Thương hiệu Intel'),
('Kingston', 'kingston', 'https://www.kingston.com', NULL, 'Thương hiệu Kingston'),
('Samsung', 'samsung', 'https://www.samsung.com', NULL, 'Thương hiệu Samsung'),
('Logitech', 'logitech', 'https://www.logitech.com', NULL, 'Thương hiệu Logitech'),
('Keychron', 'keychron', 'https://www.keychron.com', NULL, 'Thương hiệu Keychron');

-- Attributes
INSERT IGNORE INTO attributes (name, slug, data_type, unit, is_filterable, is_active) VALUES
('CPU', 'cpu', 'text', NULL, 1, 1),
('GPU', 'gpu', 'text', NULL, 1, 1),
('RAM', 'ram', 'text', 'GB', 1, 1),
('Storage', 'storage', 'text', 'GB', 1, 1),
('Screen Size', 'screen-size', 'number', 'inch', 1, 1),
('Refresh Rate', 'refresh-rate', 'number', 'Hz', 1, 1),
('Color', 'color', 'option', NULL, 1, 1),
('Warranty', 'warranty', 'number', 'month', 1, 1),
('Form Factor', 'form-factor', 'text', NULL, 1, 1),
('DPI', 'dpi', 'number', 'dpi', 1, 1),
('Switch Type', 'switch-type', 'text', NULL, 1, 1),
('Connectivity', 'connectivity', 'text', NULL, 1, 1);

-- Attribute values
INSERT IGNORE INTO attribute_values (attribute_id, value_label, value_slug, sort_order, is_active)
SELECT id, 'Đen', 'den', 1, 1 FROM attributes WHERE slug = 'color';

INSERT IGNORE INTO attribute_values (attribute_id, value_label, value_slug, sort_order, is_active)
SELECT id, 'Bạc', 'bac', 2, 1 FROM attributes WHERE slug = 'color';

INSERT IGNORE INTO attribute_values (attribute_id, value_label, value_slug, sort_order, is_active)
SELECT id, 'Xám', 'xam', 3, 1 FROM attributes WHERE slug = 'color';

INSERT IGNORE INTO attribute_values (attribute_id, value_label, value_slug, sort_order, is_active)
SELECT id, 'Trắng', 'trang', 4, 1 FROM attributes WHERE slug = 'color';

-- Warehouses
INSERT IGNORE INTO warehouses (code, name, address_line, ward, district, province, country, phone, is_active) VALUES
('WH-MAIN', 'Kho chính', 'Số 1 Đường Trung Tâm', NULL, 'Quận 1', 'TP. Hồ Chí Minh', 'Vietnam', '0900000000', 1);

-- Users
INSERT IGNORE INTO users (role_id, full_name, email, password_hash, phone, avatar_url, is_active)
SELECT r.id, 'Admin Demo', 'admin@computerstore.vn', 'bcrypt_admin_demo_hash', '0900000001', NULL, 1
FROM roles r
WHERE r.slug = 'admin';

INSERT IGNORE INTO users (role_id, full_name, email, password_hash, phone, avatar_url, is_active)
SELECT r.id, 'Nguyễn Minh', 'minh.nguyen@example.com', 'bcrypt_customer_demo_hash', '0901234567', NULL, 1
FROM roles r
WHERE r.slug = 'customer';

INSERT IGNORE INTO user_addresses (
  user_id, recipient_name, recipient_phone, address_line, ward, district, province, country, postal_code, is_default
)
SELECT u.id, 'Nguyễn Minh', '0901234567', '123 Nguyễn Trãi', 'Phường 1', 'Quận 5', 'TP. Hồ Chí Minh', 'Vietnam', '700000', 1
FROM users u
WHERE u.email = 'minh.nguyen@example.com';

-- Products
INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Lenovo IdeaPad Slim 5 14IRH8', 'lenovo-ideapad-slim-5-14irh8', 'LNV-SLIM5-14IRH8', NULL,
       'Laptop mỏng nhẹ cho học tập và văn phòng', 'Lenovo IdeaPad Slim 5 14IRH8',
       'Laptop mỏng nhẹ cho học tập và văn phòng',
       'Lenovo IdeaPad Slim 5 14IRH8 phù hợp cho học tập, làm việc văn phòng và di chuyển thường xuyên.',
       22990000.00, 20990000.00, 18500000.00, 1.460, 1, 24, 'active', 1
FROM categories c
JOIN brands b ON b.slug = 'lenovo'
WHERE c.slug = 'laptop';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'ASUS TUF Gaming F15 FX507ZU', 'asus-tuf-gaming-f15-fx507zu', 'ASU-TUF-F15-FX507ZU', NULL,
       'Laptop gaming hiệu năng cao, tản nhiệt tốt', 'ASUS TUF Gaming F15 FX507ZU',
       'Laptop gaming hiệu năng cao, tản nhiệt tốt',
       'ASUS TUF Gaming F15 FX507ZU là lựa chọn mạnh mẽ cho chơi game và làm đồ họa cơ bản.',
       29990000.00, 27990000.00, 24800000.00, 2.200, 2, 24, 'active', 1
FROM categories c
JOIN brands b ON b.slug = 'asus'
WHERE c.slug = 'laptop';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Apple MacBook Air M2 13.6-inch', 'apple-macbook-air-m2-136', 'APL-MBA-M2-136', NULL,
       'Laptop mỏng nhẹ cho sinh viên và dân văn phòng', 'Apple MacBook Air M2 13.6-inch',
       'Laptop mỏng nhẹ cho sinh viên và dân văn phòng',
       'Apple MacBook Air M2 13.6-inch phù hợp cho học tập, làm việc và di chuyển thường xuyên.',
       27990000.00, 25990000.00, 23500000.00, 1.240, 5, 12, 'active', 1
FROM categories c
JOIN brands b ON b.slug = 'apple'
WHERE c.slug = 'laptop';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Acer Nitro V 15 ANV15-51', 'acer-nitro-v-15-anv15-51', 'ACR-NITRO-V15-ANV15-51', NULL,
       'Laptop gaming tầm trung hiệu năng tốt', 'Acer Nitro V 15 ANV15-51',
       'Laptop gaming tầm trung hiệu năng tốt',
       'Acer Nitro V 15 ANV15-51 là lựa chọn phù hợp cho gaming, học tập và làm đồ họa cơ bản.',
       22990000.00, 21990000.00, 19400000.00, 2.100, 6, 24, 'active', 1
FROM categories c
JOIN brands b ON b.slug = 'acer'
WHERE c.slug = 'laptop';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'ASUS ROG Strix G10DK', 'asus-rog-strix-g10dk', 'ASU-ROG-G10DK', NULL,
       'PC gaming đồng bộ mạnh mẽ', 'ASUS ROG Strix G10DK',
       'PC gaming đồng bộ mạnh mẽ',
       'ASUS ROG Strix G10DK là bộ PC gaming tối ưu cho chơi game và làm việc đa nhiệm.',
       32990000.00, 30990000.00, 27500000.00, 8.000, 7, 24, 'active', 1
FROM categories c
JOIN brands b ON b.slug = 'asus'
WHERE c.slug = 'pc-gaming';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'MSI MAG Infinite S3 13TC', 'msi-mag-infinite-s3-13tc', 'MSI-MAG-INFINITE-S3-13TC', NULL,
       'PC gaming cao cấp cho trải nghiệm mượt', 'MSI MAG Infinite S3 13TC',
       'PC gaming cao cấp cho trải nghiệm mượt',
       'MSI MAG Infinite S3 13TC phù hợp cho gaming nặng, livestream và làm việc sáng tạo.',
       40990000.00, 38990000.00, 33900000.00, 9.200, 8, 24, 'active', 1
FROM categories c
JOIN brands b ON b.slug = 'msi'
WHERE c.slug = 'pc-gaming';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Intel Core i7-14700K', 'intel-core-i7-14700k', 'INT-I7-14700K', NULL,
       'CPU cao cấp cho gaming và làm việc nặng', 'Intel Core i7-14700K',
       'CPU cao cấp cho gaming và làm việc nặng',
       'Intel Core i7-14700K là bộ vi xử lý mạnh mẽ dành cho gaming, render và xử lý đa nhiệm.',
       11990000.00, 10990000.00, 9300000.00, 0.100, 9, 36, 'active', 0
FROM categories c
JOIN brands b ON b.slug = 'intel'
WHERE c.slug = 'linh-kien';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Samsung 990 PRO 1TB', 'samsung-990-pro-1tb', 'SAM-990PRO-1TB', NULL,
       'SSD NVMe hiệu năng cao', 'Samsung 990 PRO 1TB',
       'SSD NVMe hiệu năng cao',
       'Samsung 990 PRO 1TB mang lại tốc độ đọc ghi vượt trội cho hệ thống và game.',
       4990000.00, 4490000.00, 3950000.00, 0.020, 10, 60, 'active', 0
FROM categories c
JOIN brands b ON b.slug = 'samsung'
WHERE c.slug = 'linh-kien';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Kingston Fury Beast 16GB DDR5 5600', 'kingston-fury-beast-16gb-ddr5-5600', 'KIN-FURY-16GB-DDR5-5600', NULL,
       'RAM DDR5 cho gaming và đa nhiệm', 'Kingston Fury Beast 16GB DDR5 5600',
       'RAM DDR5 cho gaming và đa nhiệm',
       'Kingston Fury Beast 16GB DDR5 5600 giúp tăng hiệu năng cho PC gaming và đồ họa.',
       1890000.00, 1690000.00, 1450000.00, 0.030, 11, 60, 'active', 0
FROM categories c
JOIN brands b ON b.slug = 'kingston'
WHERE c.slug = 'linh-kien';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Dell UltraSharp U2723QE', 'dell-ultrasharp-u2723qe', 'DEL-U2723QE', NULL,
       'Màn hình 27 inch 4K chuyên cho công việc', 'Dell UltraSharp U2723QE',
       'Màn hình 27 inch 4K chuyên cho công việc',
       'Dell UltraSharp U2723QE là màn hình 4K sắc nét, phù hợp làm việc văn phòng, thiết kế và giải trí.',
       13990000.00, 12990000.00, 11200000.00, 6.200, 3, 36, 'active', 1
FROM categories c
JOIN brands b ON b.slug = 'dell'
WHERE c.slug = 'phu-kien';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Logitech G102 Lightsync', 'logitech-g102-lightsync', 'LOG-G102-LIGHTSYNC', NULL,
       'Chuột gaming phổ biến, độ nhạy tốt', 'Logitech G102 Lightsync',
       'Chuột gaming phổ biến, độ nhạy tốt',
       'Logitech G102 Lightsync là mẫu chuột gaming gọn nhẹ, phù hợp học tập và chơi game.',
       399000.00, 299000.00, 185000.00, 0.085, 12, 24, 'active', 0
FROM categories c
JOIN brands b ON b.slug = 'logitech'
WHERE c.slug = 'phu-kien';

INSERT IGNORE INTO products (
  category_id, brand_id, name, slug, sku, barcode, short_description, meta_title, meta_description,
  description, base_price, sale_price, cost_price, weight_kg, sort_order, warranty_months, status, is_featured
)
SELECT c.id, b.id, 'Keychron K2 V2', 'keychron-k2-v2', 'KEY-K2-V2', NULL,
       'Bàn phím cơ không dây gọn gàng', 'Keychron K2 V2',
       'Bàn phím cơ không dây gọn gàng',
       'Keychron K2 V2 là bàn phím cơ layout 75% hỗ trợ kết nối Bluetooth và USB-C.',
       2190000.00, 1990000.00, 1650000.00, 0.800, 13, 12, 'active', 0
FROM categories c
JOIN brands b ON b.slug = 'keychron'
WHERE c.slug = 'phu-kien';

-- Product images
INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=Lenovo+IdeaPad+Slim+5', 'Lenovo IdeaPad Slim 5 14IRH8', 1, 1
FROM products p WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=ASUS+TUF+Gaming+F15', 'ASUS TUF Gaming F15 FX507ZU', 1, 1
FROM products p WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=Apple+MacBook+Air+M2', 'Apple MacBook Air M2 13.6-inch', 1, 1
FROM products p WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=Acer+Nitro+V+15', 'Acer Nitro V 15 ANV15-51', 1, 1
FROM products p WHERE p.slug = 'acer-nitro-v-15-anv15-51';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=ASUS+ROG+Strix+G10DK', 'ASUS ROG Strix G10DK', 1, 1
FROM products p WHERE p.slug = 'asus-rog-strix-g10dk';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=MSI+MAG+Infinite+S3', 'MSI MAG Infinite S3 13TC', 1, 1
FROM products p WHERE p.slug = 'msi-mag-infinite-s3-13tc';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=Intel+Core+i7-14700K', 'Intel Core i7-14700K', 1, 1
FROM products p WHERE p.slug = 'intel-core-i7-14700k';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=Samsung+990+PRO+1TB', 'Samsung 990 PRO 1TB', 1, 1
FROM products p WHERE p.slug = 'samsung-990-pro-1tb';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=Kingston+Fury+Beast+DDR5', 'Kingston Fury Beast 16GB DDR5 5600', 1, 1
FROM products p WHERE p.slug = 'kingston-fury-beast-16gb-ddr5-5600';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=Logitech+G102+Lightsync', 'Logitech G102 Lightsync', 1, 1
FROM products p WHERE p.slug = 'logitech-g102-lightsync';

INSERT IGNORE INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, 'https://placehold.co/1200x800?text=Keychron+K2+V2', 'Keychron K2 V2', 1, 1
FROM products p WHERE p.slug = 'keychron-k2-v2';

-- Product specs
INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, 'Intel Core i5-13420H', 'Intel Iris Xe Graphics', '16GB DDR5', '512GB NVMe SSD',
       '14 inch', '1920x1200', '56Wh', '1.46kg', 'Windows 11', '2x USB-A, 1x USB-C, HDMI', '24 tháng'
FROM products p WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, 'Intel Core i7-13620H', 'NVIDIA GeForce RTX 4060 8GB', '16GB DDR5', '1TB NVMe SSD',
       '15.6 inch', '1920x1080 144Hz', '90Wh', '2.20kg', 'Windows 11', 'USB-C, USB-A, HDMI', '24 tháng'
FROM products p WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, 'Apple M2', 'Apple M2 8-core GPU', '8GB Unified Memory', '256GB SSD',
       '13.6 inch', '2560x1664', '52.6Wh', '1.24kg', 'macOS', '2x Thunderbolt, MagSafe', '12 tháng'
FROM products p WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, 'Intel Core i5-13420H', 'NVIDIA GeForce RTX 4050 6GB', '16GB DDR5', '512GB NVMe SSD',
       '15.6 inch', '1920x1080 144Hz', '57.5Wh', '2.10kg', 'Windows 11', 'USB-C, USB-A, HDMI', '24 tháng'
FROM products p WHERE p.slug = 'acer-nitro-v-15-anv15-51';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, 'AMD Ryzen 7 5700X', 'NVIDIA GeForce RTX 4060 8GB', '16GB DDR4', '1TB NVMe SSD',
       NULL, NULL, NULL, '8.00kg', 'Windows 11', 'USB-A, USB-C, HDMI, LAN', '24 tháng'
FROM products p WHERE p.slug = 'asus-rog-strix-g10dk';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, 'Intel Core i7-13700F', 'NVIDIA GeForce RTX 4070 12GB', '32GB DDR5', '1TB NVMe SSD',
       NULL, NULL, NULL, '9.20kg', 'Windows 11', 'USB-A, USB-C, HDMI, LAN', '24 tháng'
FROM products p WHERE p.slug = 'msi-mag-infinite-s3-13tc';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, '20 Cores / 28 Threads', NULL, NULL, NULL,
       NULL, NULL, NULL, '0.100kg', 'N/A', 'Socket LGA1700', '36 tháng'
FROM products p WHERE p.slug = 'intel-core-i7-14700k';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, NULL, NULL, NULL, '1000GB NVMe SSD',
       NULL, NULL, NULL, '0.020kg', 'N/A', 'PCIe 4.0 x4', '60 tháng'
FROM products p WHERE p.slug = 'samsung-990-pro-1tb';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, NULL, NULL, '16GB DDR5 5600', NULL,
       NULL, NULL, NULL, '0.030kg', 'N/A', 'Desktop DIMM', '60 tháng'
FROM products p WHERE p.slug = 'kingston-fury-beast-16gb-ddr5-5600';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, '0.085kg', 'Windows / macOS', 'USB-A', '24 tháng'
FROM products p WHERE p.slug = 'logitech-g102-lightsync';

INSERT IGNORE INTO product_specs (
  product_id, cpu, gpu, ram, storage, screen_size, screen_resolution, battery, weight, operating_system, ports, warranty
)
SELECT p.id, NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, '0.800kg', 'Windows / macOS', 'Bluetooth, USB-C', '12 tháng'
FROM products p WHERE p.slug = 'keychron-k2-v2';

-- Product attribute values
INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, 'Intel Core i5-13420H', NULL, NULL, NULL, 1
FROM products p JOIN attributes a ON a.slug = 'cpu'
WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '16GB DDR5', NULL, NULL, NULL, 2
FROM products p JOIN attributes a ON a.slug = 'ram'
WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '512GB NVMe SSD', NULL, NULL, NULL, 3
FROM products p JOIN attributes a ON a.slug = 'storage'
WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, NULL, 14.0, NULL, NULL, 4
FROM products p JOIN attributes a ON a.slug = 'screen-size'
WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, av.id, NULL, NULL, NULL, NULL, 5
FROM products p JOIN attributes a ON a.slug = 'color'
JOIN attribute_values av ON av.attribute_id = a.id AND av.value_slug = 'bac'
WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, NULL, 24, NULL, NULL, 6
FROM products p JOIN attributes a ON a.slug = 'warranty'
WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, 'Intel Core i7-13620H', NULL, NULL, NULL, 1
FROM products p JOIN attributes a ON a.slug = 'cpu'
WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, 'NVIDIA GeForce RTX 4060 8GB', NULL, NULL, NULL, 2
FROM products p JOIN attributes a ON a.slug = 'gpu'
WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '16GB DDR5', NULL, NULL, NULL, 3
FROM products p JOIN attributes a ON a.slug = 'ram'
WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '1TB NVMe SSD', NULL, NULL, NULL, 4
FROM products p JOIN attributes a ON a.slug = 'storage'
WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, NULL, 15.6, NULL, NULL, 5
FROM products p JOIN attributes a ON a.slug = 'screen-size'
WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, NULL, 144, NULL, NULL, 6
FROM products p JOIN attributes a ON a.slug = 'refresh-rate'
WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, av.id, NULL, NULL, NULL, NULL, 7
FROM products p JOIN attributes a ON a.slug = 'color'
JOIN attribute_values av ON av.attribute_id = a.id AND av.value_slug = 'den'
WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, NULL, 24, NULL, NULL, 8
FROM products p JOIN attributes a ON a.slug = 'warranty'
WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, 'Apple M2', NULL, NULL, NULL, 1
FROM products p JOIN attributes a ON a.slug = 'cpu'
WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '8GB Unified Memory', NULL, NULL, NULL, 2
FROM products p JOIN attributes a ON a.slug = 'ram'
WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '256GB SSD', NULL, NULL, NULL, 3
FROM products p JOIN attributes a ON a.slug = 'storage'
WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, NULL, 13.6, NULL, NULL, 4
FROM products p JOIN attributes a ON a.slug = 'screen-size'
WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, av.id, NULL, NULL, NULL, NULL, 5
FROM products p JOIN attributes a ON a.slug = 'color'
JOIN attribute_values av ON av.attribute_id = a.id AND av.value_slug = 'bac'
WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, NULL, 12, NULL, NULL, 6
FROM products p JOIN attributes a ON a.slug = 'warranty'
WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, 'NVIDIA GeForce RTX 4050 6GB', NULL, NULL, NULL, 2
FROM products p JOIN attributes a ON a.slug = 'gpu'
WHERE p.slug = 'acer-nitro-v-15-anv15-51';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, 'NVIDIA GeForce RTX 4060 8GB', NULL, NULL, NULL, 2
FROM products p JOIN attributes a ON a.slug = 'gpu'
WHERE p.slug = 'asus-rog-strix-g10dk';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, 'NVIDIA GeForce RTX 4070 12GB', NULL, NULL, NULL, 2
FROM products p JOIN attributes a ON a.slug = 'gpu'
WHERE p.slug = 'msi-mag-infinite-s3-13tc';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '20 Cores / 28 Threads', NULL, NULL, NULL, 1
FROM products p JOIN attributes a ON a.slug = 'cpu'
WHERE p.slug = 'intel-core-i7-14700k';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '1000GB NVMe SSD', NULL, NULL, NULL, 1
FROM products p JOIN attributes a ON a.slug = 'storage'
WHERE p.slug = 'samsung-990-pro-1tb';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, '16GB DDR5 5600', NULL, NULL, NULL, 1
FROM products p JOIN attributes a ON a.slug = 'ram'
WHERE p.slug = 'kingston-fury-beast-16gb-ddr5-5600';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, NULL, 8000, NULL, NULL, 1
FROM products p JOIN attributes a ON a.slug = 'dpi'
WHERE p.slug = 'logitech-g102-lightsync';

INSERT IGNORE INTO product_attribute_values (product_id, attribute_id, attribute_value_id, value_text, value_number, value_boolean, value_json, sort_order)
SELECT p.id, a.id, NULL, 'Bluetooth / USB-C', NULL, NULL, NULL, 2
FROM products p JOIN attributes a ON a.slug = 'connectivity'
WHERE p.slug = 'keychron-k2-v2';

-- Inventories
INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 25, 0, 5 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'lenovo-ideapad-slim-5-14irh8';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 12, 0, 3 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'asus-tuf-gaming-f15-fx507zu';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 8, 0, 2 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'apple-macbook-air-m2-136';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 15, 0, 3 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'acer-nitro-v-15-anv15-51';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 6, 0, 2 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'asus-rog-strix-g10dk';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 4, 0, 1 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'msi-mag-infinite-s3-13tc';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 30, 0, 10 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'intel-core-i7-14700k';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 22, 0, 5 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'samsung-990-pro-1tb';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 40, 0, 8 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'kingston-fury-beast-16gb-ddr5-5600';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 100, 0, 20 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'logitech-g102-lightsync';

INSERT IGNORE INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, w.id, 50, 0, 10 FROM products p JOIN warehouses w ON w.code = 'WH-MAIN' WHERE p.slug = 'keychron-k2-v2';

-- Carts
INSERT IGNORE INTO carts (user_id, status)
SELECT u.id, 'active' FROM users u WHERE u.email = 'minh.nguyen@example.com';

INSERT IGNORE INTO cart_items (cart_id, product_id, quantity, unit_price)
SELECT c.id, p.id, 1, COALESCE(p.sale_price, p.base_price)
FROM carts c
JOIN users u ON u.id = c.user_id
JOIN products p ON p.slug = 'apple-macbook-air-m2-136'
WHERE u.email = 'minh.nguyen@example.com';

INSERT IGNORE INTO cart_items (cart_id, product_id, quantity, unit_price)
SELECT c.id, p.id, 1, COALESCE(p.sale_price, p.base_price)
FROM carts c
JOIN users u ON u.id = c.user_id
JOIN products p ON p.slug = 'samsung-990-pro-1tb'
WHERE u.email = 'minh.nguyen@example.com';

-- Orders
INSERT IGNORE INTO orders (
  user_id, address_id, order_code, coupon_id, subtotal_amount, discount_amount, shipping_fee,
  total_amount, payment_method, payment_status, order_status, note, placed_at
)
SELECT u.id, a.id, 'ORD-20260101-0001', NULL, 30189000.00, 0.00, 0.00,
       30189000.00, 'vnpay', 'paid', 'delivered', 'Giao trong giờ hành chính', CURRENT_TIMESTAMP
FROM users u
JOIN user_addresses a ON a.user_id = u.id AND a.is_default = 1
WHERE u.email = 'minh.nguyen@example.com';

INSERT IGNORE INTO order_items (
  order_id, product_id, product_name_snapshot, sku_snapshot, price_snapshot, quantity, subtotal
)
SELECT o.id, p.id, p.name, p.sku, COALESCE(p.sale_price, p.base_price), 1, COALESCE(p.sale_price, p.base_price)
FROM orders o
JOIN products p ON p.slug = 'acer-nitro-v-15-anv15-51'
WHERE o.order_code = 'ORD-20260101-0001';

INSERT IGNORE INTO order_items (
  order_id, product_id, product_name_snapshot, sku_snapshot, price_snapshot, quantity, subtotal
)
SELECT o.id, p.id, p.name, p.sku, COALESCE(p.sale_price, p.base_price), 1, COALESCE(p.sale_price, p.base_price)
FROM orders o
JOIN products p ON p.slug = 'logitech-g102-lightsync'
WHERE o.order_code = 'ORD-20260101-0001';

INSERT IGNORE INTO order_status_history (order_id, status, note, changed_by)
SELECT o.id, 'pending', 'Đơn hàng được tạo', NULL
FROM orders o WHERE o.order_code = 'ORD-20260101-0001';

INSERT IGNORE INTO order_status_history (order_id, status, note, changed_by)
SELECT o.id, 'confirmed', 'Đơn hàng đã được xác nhận', u.id
FROM orders o
JOIN users u ON u.email = 'admin@computerstore.vn'
WHERE o.order_code = 'ORD-20260101-0001';

INSERT IGNORE INTO order_status_history (order_id, status, note, changed_by)
SELECT o.id, 'shipping', 'Đơn hàng đang giao', u.id
FROM orders o
JOIN users u ON u.email = 'admin@computerstore.vn'
WHERE o.order_code = 'ORD-20260101-0001';

INSERT IGNORE INTO order_status_history (order_id, status, note, changed_by)
SELECT o.id, 'delivered', 'Đơn hàng đã giao thành công', u.id
FROM orders o
JOIN users u ON u.email = 'admin@computerstore.vn'
WHERE o.order_code = 'ORD-20260101-0001';

INSERT IGNORE INTO payments (
  order_id, transaction_code, provider, provider_reference, amount, currency,
  payment_status, paid_at, payment_data
)
SELECT o.id, 'PAY-20260101-0001', 'vnpay', 'VNPAY-20260101-0001', o.total_amount, 'VND',
       'paid', CURRENT_TIMESTAMP, JSON_OBJECT('bank', 'VCB', 'method', 'QR', 'note', 'Thanh toán thành công')
FROM orders o
WHERE o.order_code = 'ORD-20260101-0001';

-- Reviews
INSERT IGNORE INTO reviews (
  product_id, user_id, rating, title, content, is_verified_purchase, is_approved
)
SELECT p.id, u.id, 5, 'Máy chạy mượt', 'Laptop gaming ổn định, màn hình đẹp, hiệu năng đúng kỳ vọng.', 1, 1
FROM products p
JOIN users u ON u.email = 'minh.nguyen@example.com'
WHERE p.slug = 'acer-nitro-v-15-anv15-51';

INSERT IGNORE INTO reviews (
  product_id, user_id, rating, title, content, is_verified_purchase, is_approved
)
SELECT p.id, u.id, 4, 'Chuột nhỏ gọn, nhạy', 'Chuột nhẹ, cầm thoải mái, phù hợp học tập và chơi game nhẹ.', 1, 1
FROM products p
JOIN users u ON u.email = 'minh.nguyen@example.com'
WHERE p.slug = 'logitech-g102-lightsync';

INSERT IGNORE INTO reviews (
  product_id, user_id, rating, title, content, is_verified_purchase, is_approved
)
SELECT p.id, u.id, 5, 'Màn hình rất đẹp', 'Màu sắc tốt, sắc nét, phù hợp làm việc thiết kế.', 1, 1
FROM products p
JOIN users u ON u.email = 'minh.nguyen@example.com'
WHERE p.slug = 'dell-ultrasharp-u2723qe';

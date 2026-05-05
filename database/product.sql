-- Computer Store product database schema
-- Compatible with MySQL 8+ / MariaDB 10.4+
-- Run this file directly to create the product-related tables and sample data.

CREATE DATABASE IF NOT EXISTS computer_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE computer_store;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS product_specs;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS brands;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE brands (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brands_name (name),
  UNIQUE KEY uq_brands_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  brand_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  thumbnail_url VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sale_price DECIMAL(12,2) DEFAULT NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_brand_id (brand_id),
  KEY idx_products_category_id (category_id),
  KEY idx_products_status (status),
  CONSTRAINT fk_products_brand_id
    FOREIGN KEY (brand_id) REFERENCES brands (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_products_category_id
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_product_images_product_id (product_id),
  KEY idx_product_images_sort_order (sort_order),
  CONSTRAINT fk_product_images_product_id
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_specs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  spec_key VARCHAR(120) NOT NULL,
  spec_value VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_product_specs_product_id (product_id),
  KEY idx_product_specs_spec_key (spec_key),
  CONSTRAINT fk_product_specs_product_id
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO brands (id, name, slug) VALUES
  (1, 'Lenovo', 'lenovo'),
  (2, 'ASUS', 'asus'),
  (3, 'Dell', 'dell'),
  (4, 'Apple', 'apple'),
  (5, 'MSI', 'msi'),
  (6, 'Kingston', 'kingston'),
  (7, 'Logitech', 'logitech'),
  (8, 'AVerMedia', 'avermedia'),
  (9, 'Computer Store Build', 'computer-store-build');

INSERT INTO categories (id, name, slug) VALUES
  (1, 'Laptop văn phòng', 'laptop-van-phong'),
  (2, 'Laptop gaming', 'laptop-gaming'),
  (3, 'MacBook', 'macbook'),
  (4, 'Màn hình', 'man-hinh'),
  (5, 'CPU / GPU', 'cpu-gpu'),
  (6, 'RAM / SSD', 'ram-ssd'),
  (7, 'Bàn phím / Chuột', 'ban-phim-chuot'),
  (8, 'Camera', 'camera'),
  (9, 'PC build sẵn', 'pc-build-san');

INSERT INTO products (
  id,
  sku,
  name,
  slug,
  brand_id,
  category_id,
  thumbnail_url,
  description,
  price,
  sale_price,
  stock_quantity,
  status
) VALUES
  (
    1,
    'LEN-IDEAPAD-SLIM-5-16',
    'Lenovo IdeaPad Slim 5 16',
    'lenovo-ideapad-slim-5-16',
    1,
    1,
    '/src/assets/products/lenovo-ideapad-slim-5-main.svg',
    'Laptop mỏng nhẹ, phù hợp học tập, làm việc văn phòng và giải trí hằng ngày.',
    22990000.00,
    20990000.00,
    18,
    'active'
  ),
  (
    2,
    'ASU-VIVOBOOK-14-X1404',
    'ASUS Vivobook 14 X1404',
    'asus-vivobook-14-x1404',
    2,
    1,
    'https://placehold.co/600x400?text=ASUS+Vivobook+14',
    'Thiết kế gọn nhẹ, màn hình 14 inch và hiệu năng ổn định cho người dùng phổ thông.',
    15990000.00,
    14990000.00,
    25,
    'active'
  ),
  (
    3,
    'DEL-INSPIRON-15-3530',
    'Dell Inspiron 15 3530',
    'dell-inspiron-15-3530',
    3,
    1,
    'https://placehold.co/600x400?text=Dell+Inspiron+15',
    'Dòng laptop cân bằng giữa hiệu năng, độ bền và tính thực dụng cho công việc văn phòng.',
    17990000.00,
    NULL,
    12,
    'active'
  ),
  (
    4,
    'MSI-THIN-15-B13UCX',
    'MSI Thin 15 B13UCX',
    'msi-thin-15-b13ucx',
    5,
    2,
    'https://placehold.co/600x400?text=MSI+Thin+15',
    'Laptop gaming mỏng nhẹ với CPU thế hệ mới, tối ưu cho chơi game và sáng tạo nội dung.',
    24990000.00,
    23990000.00,
    8,
    'active'
  ),
  (
    5,
    'APL-MACBOOK-AIR-M3',
    'MacBook Air M3 13',
    'macbook-air-m3-13',
    4,
    3,
    'https://placehold.co/600x400?text=MacBook+Air+M3',
    'MacBook Air chip M3, hiệu năng cao, thời lượng pin tốt và thiết kế siêu mỏng nhẹ.',
    29990000.00,
    NULL,
    6,
    'active'
  ),
  (
    6,
    'MSI-RTX-4060-VENTUS-2X',
    'MSI GeForce RTX 4060 Ventus 2X',
    'msi-geforce-rtx-4060-ventus-2x',
    5,
    5,
    'https://placehold.co/600x400?text=MSI+RTX+4060',
    'Card đồ họa rời hiệu năng cao, phù hợp chơi game AAA, dựng video và thiết kế 3D.',
    8990000.00,
    8490000.00,
    14,
    'active'
  ),
  (
    7,
    'KIN-DDR5-16GB-SSD-1TB',
    'Kingston Fury Beast 16GB DDR5 + NVMe 1TB',
    'kingston-fury-beast-16gb-ddr5-nvme-1tb',
    6,
    6,
    'https://placehold.co/600x400?text=Kingston+RAM+SSD',
    'Bộ combo RAM và SSD dành cho nâng cấp máy tính, tăng tốc độ xử lý và lưu trữ.',
    3890000.00,
    3590000.00,
    30,
    'active'
  ),
  (
    8,
    'LOG-MK295-WIRELESS',
    'Logitech MK295 Wireless Combo',
    'logitech-mk295-wireless-combo',
    7,
    7,
    'https://placehold.co/600x400?text=Logitech+MK295',
    'Bộ bàn phím và chuột không dây êm ái, phù hợp làm việc văn phòng và học tập.',
    890000.00,
    790000.00,
    45,
    'active'
  ),
  (
    9,
    'AVM-PW315-WEBCAM',
    'AVerMedia PW315 Webcam',
    'avermedia-pw315-webcam',
    8,
    8,
    'https://placehold.co/600x400?text=AVerMedia+Webcam',
    'Camera webcam độ phân giải Full HD, hỗ trợ học online, họp trực tuyến và livestream.',
    2190000.00,
    1990000.00,
    22,
    'active'
  ),
  (
    10,
    'DEL-U2723QE-27',
    'Dell UltraSharp U2723QE 27',
    'dell-ultrasharp-u2723qe-27',
    3,
    4,
    'https://placehold.co/600x400?text=Dell+UltraSharp+U2723QE',
    'Màn hình 4K 27 inch phục vụ đồ họa, chỉnh sửa nội dung và công việc chuyên nghiệp.',
    12990000.00,
    11990000.00,
    11,
    'active'
  ),
  (
    11,
    'ASU-VG249Q1A-24',
    'ASUS VG249Q1A 24',
    'asus-vg249q1a-24',
    2,
    4,
    'https://placehold.co/600x400?text=ASUS+VG249Q1A',
    'Màn hình gaming 24 inch 165Hz, phản hồi nhanh cho chơi game và giải trí.',
    4490000.00,
    3990000.00,
    20,
    'active'
  ),
  (
    12,
    'CS-PC-R5-RTX4060',
    'PC Ryzen 5 / RTX 4060',
    'pc-ryzen-5-rtx-4060',
    9,
    9,
    'https://placehold.co/600x400?text=PC+Ryzen+5+RTX+4060',
    'Bộ PC build sẵn phù hợp gaming 1080p, làm việc đa nhiệm và streaming cơ bản.',
    28990000.00,
    26990000.00,
    10,
    'active'
  ),
  (
    13,
    'CS-PC-I5-RTX4060',
    'PC Intel i5 / RTX 4060',
    'pc-intel-i5-rtx-4060',
    9,
    9,
    'https://placehold.co/600x400?text=PC+Intel+i5+RTX+4060',
    'Cấu hình cân bằng giữa chi phí và hiệu năng cho nhu cầu giải trí, học tập và làm việc.',
    29990000.00,
    27990000.00,
    8,
    'active'
  ),
  (
    14,
    'CS-PC-R7-RTX4070',
    'PC Ryzen 7 / RTX 4070',
    'pc-ryzen-7-rtx-4070',
    9,
    9,
    'https://placehold.co/600x400?text=PC+Ryzen+7+RTX+4070',
    'Bộ PC mạnh mẽ cho dựng video, thiết kế 3D và chơi game nặng ở độ phân giải cao.',
    41990000.00,
    39990000.00,
    6,
    'active'
  ),
  (
    15,
    'CS-PC-I7-RTX4070',
    'PC Intel i7 / RTX 4070',
    'pc-intel-i7-rtx-4070',
    9,
    9,
    'https://placehold.co/600x400?text=PC+Intel+i7+RTX+4070',
    'Cấu hình cao cấp cho người dùng cần hiệu năng ổn định, render nhanh và gaming mượt.',
    45990000.00,
    NULL,
    5,
    'active'
  );

INSERT INTO product_images (product_id, image_url, sort_order) VALUES
  (1, '/src/assets/products/lenovo-ideapad-slim-5-main.svg', 1),
  (1, '/src/assets/products/lenovo-ideapad-slim-5-open.svg', 2),
  (1, '/src/assets/products/lenovo-ideapad-slim-5-side.svg', 3),
  (2, 'https://placehold.co/600x400?text=ASUS+Vivobook+14+Front', 1),
  (2, 'https://placehold.co/600x400?text=ASUS+Vivobook+14+Back', 2),
  (3, 'https://placehold.co/600x400?text=Dell+Inspiron+15+Front', 1),
  (4, 'https://placehold.co/600x400?text=MSI+Thin+15+Front', 1),
  (5, 'https://placehold.co/600x400?text=MacBook+Air+M3+Front', 1),
  (6, 'https://placehold.co/600x400?text=MSI+RTX+4060+Front', 1),
  (6, 'https://placehold.co/600x400?text=MSI+RTX+4060+Back', 2),
  (7, 'https://placehold.co/600x400?text=Kingston+RAM+SSD+Front', 1),
  (8, 'https://placehold.co/600x400?text=Logitech+MK295+Front', 1),
  (8, 'https://placehold.co/600x400?text=Logitech+MK295+Mouse', 2),
  (9, 'https://placehold.co/600x400?text=AVerMedia+PW315+Front', 1),
  (10, 'https://placehold.co/600x400?text=Dell+UltraSharp+U2723QE+Front', 1),
  (10, 'https://placehold.co/600x400?text=Dell+UltraSharp+U2723QE+Side', 2),
  (11, 'https://placehold.co/600x400?text=ASUS+VG249Q1A+Front', 1),
  (11, 'https://placehold.co/600x400?text=ASUS+VG249Q1A+Back', 2),
  (12, 'https://placehold.co/600x400?text=PC+Ryzen+5+RTX+4060+Front', 1),
  (12, 'https://placehold.co/600x400?text=PC+Ryzen+5+RTX+4060+Inside', 2),
  (13, 'https://placehold.co/600x400?text=PC+Intel+i5+RTX+4060+Front', 1),
  (13, 'https://placehold.co/600x400?text=PC+Intel+i5+RTX+4060+Inside', 2),
  (14, 'https://placehold.co/600x400?text=PC+Ryzen+7+RTX+4070+Front', 1),
  (15, 'https://placehold.co/600x400?text=PC+Intel+i7+RTX+4070+Front', 1);

INSERT INTO product_specs (product_id, spec_key, spec_value) VALUES
  (1, 'CPU', 'Intel Core Ultra 5'),
  (1, 'RAM', '16GB'),
  (1, 'Storage', '512GB SSD'),
  (1, 'Display', '16 inch WUXGA'),
  (2, 'CPU', 'Intel Core i5'),
  (2, 'RAM', '16GB'),
  (2, 'Storage', '512GB SSD'),
  (2, 'Display', '14 inch FHD'),
  (3, 'CPU', 'Intel Core i5'),
  (3, 'RAM', '8GB'),
  (3, 'Storage', '512GB SSD'),
  (3, 'Display', '15.6 inch FHD'),
  (4, 'CPU', 'Intel Core i7'),
  (4, 'GPU', 'NVIDIA GeForce RTX 3050'),
  (4, 'RAM', '16GB'),
  (4, 'Storage', '512GB SSD'),
  (5, 'CPU', 'Apple M3'),
  (5, 'RAM', '8GB'),
  (5, 'Storage', '256GB SSD'),
  (5, 'Display', '13.6 inch Liquid Retina'),
  (6, 'GPU', 'NVIDIA GeForce RTX 4060'),
  (6, 'VRAM', '8GB GDDR6'),
  (6, 'Interface', 'PCIe 4.0'),
  (6, 'Cooling', 'Dual Fan'),
  (7, 'RAM', '16GB DDR5'),
  (7, 'SSD', '1TB NVMe'),
  (7, 'Speed', '5600MHz'),
  (7, 'Use', 'Nâng cấp máy tính'),
  (8, 'Keyboard', 'Wireless Silent Keyboard'),
  (8, 'Mouse', 'Wireless Optical Mouse'),
  (8, 'Connection', '2.4GHz USB Receiver'),
  (8, 'Battery', '24 months keyboard / 18 months mouse'),
  (9, 'Resolution', '1080p Full HD'),
  (9, 'Sensor', '2 MP'),
  (9, 'Microphone', 'Dual microphone'),
  (9, 'Connection', 'USB 2.0'),
  (10, 'Size', '27 inch'),
  (10, 'Resolution', '4K UHD'),
  (10, 'Panel', 'IPS'),
  (10, 'Connection', 'USB-C'),
  (11, 'Size', '24 inch'),
  (11, 'RefreshRate', '165Hz'),
  (11, 'Panel', 'IPS'),
  (11, 'ResponseTime', '1ms'),
  (12, 'CPU', 'AMD Ryzen 5'),
  (12, 'GPU', 'NVIDIA GeForce RTX 4060'),
  (12, 'RAM', '16GB DDR4'),
  (12, 'Storage', '1TB NVMe SSD'),
  (12, 'PSU', '650W 80+ Bronze'),
  (12, 'Case', 'Mid Tower RGB'),
  (13, 'CPU', 'Intel Core i5'),
  (13, 'GPU', 'NVIDIA GeForce RTX 4060'),
  (13, 'RAM', '16GB DDR5'),
  (13, 'Storage', '1TB NVMe SSD'),
  (13, 'PSU', '650W 80+ Bronze'),
  (13, 'Case', 'Mid Tower Gaming'),
  (14, 'CPU', 'AMD Ryzen 7'),
  (14, 'GPU', 'NVIDIA GeForce RTX 4070'),
  (14, 'RAM', '32GB DDR5'),
  (14, 'Storage', '1TB NVMe SSD'),
  (14, 'PSU', '750W 80+ Gold'),
  (14, 'Case', 'Mid Tower Glass'),
  (15, 'CPU', 'Intel Core i7'),
  (15, 'GPU', 'NVIDIA GeForce RTX 4070'),
  (15, 'RAM', '32GB DDR5'),
  (15, 'Storage', '2TB NVMe SSD'),
  (15, 'PSU', '750W 80+ Gold'),
  (15, 'Case', 'Premium Airflow');

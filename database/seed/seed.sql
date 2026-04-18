-- seed data for TechVision Electronics

INSERT INTO roles (name, description) VALUES
  ('admin', 'Admin user with full access'),
  ('client', 'Standard buyer');

INSERT INTO users (name, email, hashed_password, role_id, phone, address, is_active)
VALUES
  ('Admin User', 'admin@techvision.com', '$2a$10$ZAQMC..FYX7b1.5l0OL1Bu5F1W2oK9SO1CjO1qexZPBHN56b0n.P6', 1, '+911234567890', 'Head Office', true),
  ('Test User', 'user@techvision.com', '$2a$10$ZAQMC..FYX7b1.5l0OL1Bu5F1W2oK9SO1CjO1qexZPBHN56b0n.P6', 2, '+919876543210', 'Customer Address', true);

INSERT INTO products (name, price, category, image_url, description, stock)
VALUES
  ('4MP IP CCTV Camera', 3999.00, 'Cameras', 'https://images.unsplash.com/photo-1542362567-b07e54358753', 'Weatherproof IP camera with night vision', 120),
  ('16-port NVR', 7999.00, 'NVR', 'https://images.unsplash.com/photo-1551836022-2b48a|2', '16 channel network video recorder', 40),
  ('Gaming Laptop i7', 52999.00, 'Laptops', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', 'High-end performance for gaming', 20),
  ('27-inch IPS Monitor', 11999.00, 'Monitors', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', '1920x1080 FHD display', 60),
  ('Mechanical Keyboard', 3299.00, 'Accessories', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', 'RGB backlit mechanical keyboard', 180),
  ('Wireless Mouse', 1399.00, 'Accessories', 'https://images.unsplash.com/photo-1571066811716-1a8744d79863', 'Ergonomic wireless mouse', 220),
  ('1TB SSD', 7299.00, 'Storage', 'https://images.unsplash.com/photo-1591375271052-7bd6d1b3db65', 'SATA 3 1TB SSD', 90);

INSERT INTO orders (user_id, total_price, status, address)
VALUES
  (2, 7198.00, 'pending', '123, Customer St, City');

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES
  (1, 1, 2, 3599.00);

INSERT INTO payments (order_id, payment_provider_id, payment_method, status, amount)
VALUES
  (1, 'PAYORD_1001', 'razorpay', 'pending', 7198.00);

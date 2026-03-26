-- Vertex Supermarket: Sample seed data inserts
-- Run AFTER tables are created.
-- File: backend/sql/insert_all_tables.sql

SET FOREIGN_KEY_CHECKS = 0;

-- Optional cleanup order (safe for re-run)
DELETE FROM held_bill_items;
DELETE FROM held_bills;
DELETE FROM inventory_movements;
DELETE FROM sale_payments;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM inventory;
DELETE FROM products;
DELETE FROM brands;
DELETE FROM categories;
DELETE FROM supplier_payments;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM suppliers;
DELETE FROM customers;
DELETE FROM role_permissions;
DELETE FROM permissions;
DELETE FROM users;
DELETE FROM roles;

SET FOREIGN_KEY_CHECKS = 1;

-- 1) Roles
INSERT INTO roles (id, name, description, status)
VALUES
  (1, 'Super Admin', 'Full access to all modules', 'active'),
  (2, 'Manager', 'Store manager', 'active'),
  (3, 'Cashier', 'POS cashier', 'active');

-- 2) Users
-- Passwords:
-- admin@vertex.local   -> Admin@123
-- manager@vertex.local -> Manager@123
-- cashier@vertex.local -> Cashier@123
INSERT INTO users (id, full_name, email, phone, password_hash, role_id, status)
VALUES
  (1, 'Super Admin', 'admin@vertex.local', '9999999001', '$2a$10$UdwdjMjXuaS.2gUIY68UUeZq06xRdpjVf1B5PBSX0BsPQFyYtoGIO', 1, 'active'),
  (2, 'Store Manager', 'manager@vertex.local', '9999999002', '$2a$10$N2N0LtvPU6a.pmwU.45Qjuuc2BV2.imb8SAg3fUm8kehwZ2GmW7Qu', 2, 'active'),
  (3, 'Main Cashier', 'cashier@vertex.local', '9999999003', '$2a$10$sCzy.In01zTVb0WR8qXGROUMKgJPpuMf/9Ny0Uz9T.PIZBdFNrrei', 3, 'active');

-- 3) Permissions (core set; app can auto-fill remaining via permission catalog)
INSERT INTO permissions (id, module_name, permission_key, permission_label)
VALUES
  (1, 'Dashboard', 'dashboard.view', 'Dashboard Access'),
  (2, 'POS Billing', 'pos.view', 'POS Access'),
  (3, 'POS Billing', 'pos.add', 'Create Sale'),
  (4, 'POS Billing', 'pos.print', 'Print Invoice'),
  (5, 'POS Billing', 'pos.hold', 'Hold Bill'),
  (6, 'POS Billing', 'pos.resume', 'Resume Held Bill'),
  (7, 'Products', 'products.view', 'View Products'),
  (8, 'Customers', 'customers.view', 'View Customers'),
  (9, 'Customers', 'customers.add', 'Add Customers'),
  (10, 'Customers', 'customers.edit', 'Edit Customers'),
  (11, 'Customers', 'customers.delete', 'Delete Customers'),
  (12, 'Suppliers', 'suppliers.view', 'View Suppliers'),
  (13, 'Suppliers', 'suppliers.add', 'Add Suppliers'),
  (14, 'Suppliers', 'suppliers.edit', 'Edit Suppliers'),
  (15, 'Suppliers', 'suppliers.delete', 'Delete Suppliers'),
  (16, 'Sales Reports', 'reports.sales', 'View Sales Reports');

-- 4) Role permissions (Manager and Cashier)
INSERT INTO role_permissions (role_id, permission_id, is_allowed)
VALUES
  (2, 1, 1), (2, 2, 1), (2, 3, 1), (2, 4, 1), (2, 5, 1), (2, 6, 1),
  (2, 7, 1), (2, 8, 1), (2, 9, 1), (2, 10, 1), (2, 11, 1),
  (2, 12, 1), (2, 13, 1), (2, 14, 1), (2, 15, 1), (2, 16, 1),
  (3, 2, 1), (3, 3, 1), (3, 4, 1), (3, 5, 1), (3, 6, 1),
  (3, 7, 1), (3, 8, 1), (3, 16, 1);

-- 5) Categories
INSERT INTO categories (id, name, description, status)
VALUES
  (1, 'Groceries', 'Daily essentials', 'active'),
  (2, 'Beverages', 'Soft drinks and juices', 'active'),
  (3, 'Snacks', 'Packaged snacks', 'active');

-- 6) Brands
INSERT INTO brands (id, name, description, status)
VALUES
  (1, 'Vertex Select', 'In-house brand', 'active'),
  (2, 'FreshFarm', 'Farm essentials', 'active'),
  (3, 'CoolSip', 'Beverage brand', 'active');

-- 7) Products
INSERT INTO products (
  id, category_id, brand_id, name, sku, barcode, unit,
  purchase_price, selling_price, mrp, gst_percent, reorder_level,
  track_batch, track_expiry, status, image
)
VALUES
  (1, 1, 2, 'Basmati Rice 1kg', 'SKU-RICE-001', '890100100001', 'pcs', 78.00, 90.00, 95.00, 5.00, 10, 0, 0, 'active', NULL),
  (2, 1, 1, 'Sunflower Oil 1L', 'SKU-OIL-001', '890100100002', 'pcs', 152.00, 175.00, 180.00, 5.00, 8, 0, 0, 'active', NULL),
  (3, 2, 3, 'Orange Juice 1L', 'SKU-JUICE-001', '890100100003', 'pcs', 88.00, 110.00, 120.00, 12.00, 6, 0, 0, 'active', NULL),
  (4, 3, 1, 'Salted Chips 100g', 'SKU-CHIP-001', '890100100004', 'pcs', 16.00, 20.00, 22.00, 12.00, 12, 0, 0, 'active', NULL);

-- 8) Inventory
INSERT INTO inventory (id, product_id, current_stock, damaged_stock, reserved_stock)
VALUES
  (1, 1, 75.00, 0.00, 0.00),
  (2, 2, 50.00, 0.00, 0.00),
  (3, 3, 40.00, 0.00, 0.00),
  (4, 4, 120.00, 0.00, 0.00);

-- 9) Customers
INSERT INTO customers (id, customer_name, phone, email, address, loyalty_points, status)
VALUES
  (1, 'Walk-in', NULL, NULL, NULL, 0, 'active'),
  (2, 'Ramesh Kumar', '9876500001', 'ramesh@example.com', 'Andheri West, Mumbai', 15, 'active'),
  (3, 'Priya Sharma', '9876500002', 'priya@example.com', 'BTM Layout, Bengaluru', 8, 'active');

-- 10) Suppliers
INSERT INTO suppliers (
  id, supplier_name, contact_person, phone, email, gst_no,
  address, city, state, pincode, status
)
VALUES
  (1, 'Green Valley Distributors', 'Anil Mehta', '9899000001', 'greenvalley@example.com', '27ABCDE1234F1Z5', 'Warehouse Rd 12', 'Mumbai', 'Maharashtra', '400001', 'active'),
  (2, 'Fresh Agro Traders', 'Neha Jain', '9899000002', 'freshagro@example.com', '29ABCDE1234F1Z6', 'Market Yard', 'Bengaluru', 'Karnataka', '560001', 'active');

-- 11) Sample purchase orders (to show supplier ledger totals)
INSERT INTO purchase_orders (
  id, po_number, supplier_id, order_date, status,
  subtotal, tax_amount, discount_amount, total_amount,
  payment_status, notes, created_by
)
VALUES
  (1, 'PO-2026-001', 1, '2026-01-05', 'received', 10000.00, 500.00, 0.00, 10500.00, 'paid', 'Initial stock', 2),
  (2, 'PO-2026-002', 2, '2026-01-10', 'received', 6500.00, 325.00, 0.00, 6825.00, 'partial', 'Monthly restock', 2);

INSERT INTO supplier_payments (
  id, supplier_id, purchase_order_id, payment_method, amount, reference_no, notes, created_by
)
VALUES
  (1, 1, 1, 'bank', 10500.00, 'UTR10500', 'Full payment', 2),
  (2, 2, 2, 'upi', 3000.00, 'UPI3000', 'Advance payment', 2);

-- 12) Sales
INSERT INTO sales (
  id, invoice_no, customer_id, cashier_id,
  subtotal, discount_amount, tax_amount, total_amount,
  payment_status, bill_status, notes, sale_date
)
VALUES
  (1, 'INV-2026-001', 2, 3, 270.00, 10.00, 19.80, 279.80, 'paid', 'completed', 'Sample POS sale', '2026-01-12 10:30:00'),
  (2, 'INV-2026-002', 1, 3, 110.00, 0.00, 13.20, 123.20, 'paid', 'completed', 'Walk-in billing', '2026-01-12 11:15:00');

-- 13) Sale items
INSERT INTO sale_items (
  id, sale_id, product_id, batch_id, quantity,
  unit_price, discount_amount, gst_percent, line_total
)
VALUES
  (1, 1, 1, NULL, 2.00, 90.00, 10.00, 5.00, 178.50),
  (2, 1, 2, NULL, 1.00, 175.00, 0.00, 5.00, 183.75),
  (3, 2, 3, NULL, 1.00, 110.00, 0.00, 12.00, 123.20);

-- 14) Sale payments
INSERT INTO sale_payments (id, sale_id, payment_method, amount, reference_no)
VALUES
  (1, 1, 'cash', 279.80, NULL),
  (2, 2, 'upi', 123.20, 'UPI-INV-2026-002');

-- 15) Inventory movements (sale impact)
INSERT INTO inventory_movements (
  id, product_id, movement_type, quantity, balance_after,
  notes, reference_type, reference_id, batch_id, created_by, created_at
)
VALUES
  (1, 1, 'sale', -2.00, 73.00, 'Sold through invoice INV-2026-001', 'sale', 1, NULL, 3, '2026-01-12 10:30:10'),
  (2, 2, 'sale', -1.00, 49.00, 'Sold through invoice INV-2026-001', 'sale', 1, NULL, 3, '2026-01-12 10:30:12'),
  (3, 3, 'sale', -1.00, 39.00, 'Sold through invoice INV-2026-002', 'sale', 2, NULL, 3, '2026-01-12 11:15:11');

-- Keep inventory synced with movements above
UPDATE inventory SET current_stock = 73.00 WHERE product_id = 1;
UPDATE inventory SET current_stock = 49.00 WHERE product_id = 2;
UPDATE inventory SET current_stock = 39.00 WHERE product_id = 3;

-- 16) Held bills
INSERT INTO held_bills (
  id, hold_code, customer_id, cashier_id,
  subtotal, discount_amount, tax_amount, total_amount, notes,
  created_at, updated_at
)
VALUES
  (1, 'HOLD-2026-001', 3, 3, 40.00, 0.00, 4.80, 44.80, 'Customer asked to wait', '2026-01-12 12:00:00', '2026-01-12 12:00:00');

INSERT INTO held_bill_items (
  id, held_bill_id, product_id, batch_id, quantity,
  unit_price, discount_amount, gst_percent, line_total
)
VALUES
  (1, 1, 4, NULL, 2.00, 20.00, 0.00, 12.00, 44.80);

-- Reset auto increments to avoid conflicts for future inserts
ALTER TABLE roles AUTO_INCREMENT = 10;
ALTER TABLE users AUTO_INCREMENT = 10;
ALTER TABLE permissions AUTO_INCREMENT = 100;
ALTER TABLE categories AUTO_INCREMENT = 10;
ALTER TABLE brands AUTO_INCREMENT = 10;
ALTER TABLE products AUTO_INCREMENT = 100;
ALTER TABLE inventory AUTO_INCREMENT = 100;
ALTER TABLE customers AUTO_INCREMENT = 100;
ALTER TABLE suppliers AUTO_INCREMENT = 100;
ALTER TABLE purchase_orders AUTO_INCREMENT = 100;
ALTER TABLE supplier_payments AUTO_INCREMENT = 100;
ALTER TABLE sales AUTO_INCREMENT = 1000;
ALTER TABLE sale_items AUTO_INCREMENT = 1000;
ALTER TABLE sale_payments AUTO_INCREMENT = 1000;
ALTER TABLE inventory_movements AUTO_INCREMENT = 1000;
ALTER TABLE held_bills AUTO_INCREMENT = 1000;
ALTER TABLE held_bill_items AUTO_INCREMENT = 1000;

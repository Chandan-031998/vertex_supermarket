-- Vertex Supermarket: PostgreSQL/Supabase schema
-- Safe for fresh setup (drops existing tables/types first)

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS stock_adjustments CASCADE;
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS sale_returns CASCADE;
DROP TABLE IF EXISTS held_bill_items CASCADE;
DROP TABLE IF EXISTS held_bills CASCADE;
DROP TABLE IF EXISTS sale_payments CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS product_batches CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP TYPE IF EXISTS status_enum CASCADE;
DROP TYPE IF EXISTS theme_mode_enum CASCADE;
DROP TYPE IF EXISTS purchase_status_enum CASCADE;
DROP TYPE IF EXISTS purchase_payment_status_enum CASCADE;
DROP TYPE IF EXISTS sales_payment_status_enum CASCADE;
DROP TYPE IF EXISTS bill_status_enum CASCADE;
DROP TYPE IF EXISTS loyalty_transaction_type_enum CASCADE;

CREATE TYPE status_enum AS ENUM ('active', 'inactive');
CREATE TYPE theme_mode_enum AS ENUM ('light', 'dark');
CREATE TYPE purchase_status_enum AS ENUM ('pending', 'approved', 'received', 'cancelled');
CREATE TYPE purchase_payment_status_enum AS ENUM ('unpaid', 'partial', 'paid');
CREATE TYPE sales_payment_status_enum AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE bill_status_enum AS ENUM ('completed', 'cancelled', 'returned');
CREATE TYPE loyalty_transaction_type_enum AS ENUM ('earned', 'redeemed', 'adjusted');

CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  status status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT NOT NULL REFERENCES roles(id),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  profile_image VARCHAR(255),
  notification_preferences TEXT,
  status status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id BIGSERIAL PRIMARY KEY,
  module_name VARCHAR(100) NOT NULL,
  permission_key VARCHAR(120) NOT NULL UNIQUE,
  permission_label VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_module ON permissions(module_name);

CREATE TABLE role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

CREATE TABLE app_settings (
  id BIGSERIAL PRIMARY KEY,
  app_name VARCHAR(150) NOT NULL,
  app_heading VARCHAR(150) NOT NULL,
  app_tagline VARCHAR(255),
  company_name VARCHAR(200),
  footer_text VARCHAR(255),
  login_title VARCHAR(150),
  login_subtitle VARCHAR(255),
  logo_path VARCHAR(255),
  favicon_path VARCHAR(255),
  login_bg_path VARCHAR(255),
  primary_color VARCHAR(20),
  sidebar_color VARCHAR(20),
  navbar_color VARCHAR(20),
  button_color VARCHAR(20),
  card_accent_color VARCHAR(20),
  theme_mode theme_mode_enum NOT NULL DEFAULT 'light',
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
  show_logo_text BOOLEAN NOT NULL DEFAULT TRUE,
  compact_mode BOOLEAN NOT NULL DEFAULT FALSE,
  table_density VARCHAR(20) NOT NULL DEFAULT 'comfortable',
  border_radius VARCHAR(20) NOT NULL DEFAULT 'xl',
  updated_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_app_settings_updated_by ON app_settings(updated_by);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description VARCHAR(255),
  status status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE brands (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description VARCHAR(255),
  status status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  brand_id BIGINT REFERENCES brands(id) ON DELETE SET NULL,
  name VARCHAR(180) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  barcode VARCHAR(80) UNIQUE,
  unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  mrp NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
  track_batch BOOLEAN NOT NULL DEFAULT FALSE,
  track_expiry BOOLEAN NOT NULL DEFAULT FALSE,
  status status_enum NOT NULL DEFAULT 'active',
  image VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_name ON products(name);

CREATE TABLE inventory (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  current_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  damaged_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  reserved_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_batches (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_no VARCHAR(80) NOT NULL,
  expiry_date DATE,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_batches_product ON product_batches(product_id);
CREATE INDEX idx_product_batches_expiry ON product_batches(expiry_date);

CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  address TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  status status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(customer_name);
CREATE INDEX idx_customers_phone ON customers(phone);

CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  supplier_name VARCHAR(180) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(30),
  email VARCHAR(150),
  gst_no VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  status status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_name ON suppliers(supplier_name);

CREATE TABLE purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  po_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  ordered_by BIGINT NOT NULL REFERENCES users(id),
  order_date DATE NOT NULL,
  expected_date DATE,
  status purchase_status_enum NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status purchase_payment_status_enum NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_ordered_by ON purchase_orders(ordered_by);

CREATE TABLE purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  gst_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL,
  received_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  batch_no VARCHAR(80),
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id);

CREATE TABLE goods_receipts (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  received_by BIGINT NOT NULL REFERENCES users(id),
  grn_number VARCHAR(50) NOT NULL UNIQUE,
  received_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_goods_receipts_po ON goods_receipts(purchase_order_id);

CREATE TABLE supplier_payments (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  payment_method VARCHAR(30) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference_no VARCHAR(120),
  notes TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_po ON supplier_payments(purchase_order_id);

CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  invoice_no VARCHAR(40) NOT NULL UNIQUE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id BIGINT NOT NULL REFERENCES users(id),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status sales_payment_status_enum NOT NULL DEFAULT 'paid',
  bill_status bill_status_enum NOT NULL DEFAULT 'completed',
  notes TEXT,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_date ON sales(sale_date);

CREATE TABLE sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  batch_id BIGINT REFERENCES product_batches(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

CREATE TABLE sale_payments (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  payment_method VARCHAR(30) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference_no VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);

CREATE TABLE held_bills (
  id BIGSERIAL PRIMARY KEY,
  hold_code VARCHAR(40) NOT NULL UNIQUE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id BIGINT NOT NULL REFERENCES users(id),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_held_bills_customer ON held_bills(customer_id);

CREATE TABLE held_bill_items (
  id BIGSERIAL PRIMARY KEY,
  held_bill_id BIGINT NOT NULL REFERENCES held_bills(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  batch_id BIGINT REFERENCES product_batches(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_held_bill_items_bill ON held_bill_items(held_bill_id);

CREATE TABLE sale_returns (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  return_no VARCHAR(40) NOT NULL UNIQUE,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  processed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_returns_sale ON sale_returns(sale_id);

CREATE TABLE return_items (
  id BIGSERIAL PRIMARY KEY,
  sale_return_id BIGINT NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
  sale_item_id BIGINT NOT NULL REFERENCES sale_items(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity NUMERIC(12,2) NOT NULL,
  refund_amount NUMERIC(12,2) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_return_items_return ON return_items(sale_return_id);

CREATE TABLE stock_adjustments (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  adjustment_type VARCHAR(50) NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id);

CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  movement_type VARCHAR(50) NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2),
  notes VARCHAR(255),
  reference_type VARCHAR(50),
  reference_id BIGINT,
  batch_id BIGINT REFERENCES product_batches(id) ON DELETE SET NULL,
  batch_no VARCHAR(80),
  expiry_date DATE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_ref ON inventory_movements(reference_type, reference_id);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at);

CREATE TABLE loyalty_transactions (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL,
  transaction_type loyalty_transaction_type_enum NOT NULL,
  points INTEGER NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_customer ON loyalty_transactions(customer_id);

CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  title VARCHAR(180) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  notes TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);

CREATE TABLE shifts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12,2),
  notes VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(80) NOT NULL,
  record_id BIGINT,
  description VARCHAR(255),
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Auto-update trigger for tables with updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_role_permissions_updated_at BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_batches_updated_at BEFORE UPDATE ON product_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_held_bills_updated_at BEFORE UPDATE ON held_bills FOR EACH ROW EXECUTE FUNCTION set_updated_at();

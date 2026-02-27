-- Script Cài đặt Cơ sở dữ liệu Supabase cho ứng dụng Tài Chính

create extension if not exists "uuid-ossp";

-- 1. Bảng Chi nhánh (Branches)
create table branches (
  id text primary key,
  name text not null,
  code text unique not null,
  is_headquarter boolean default false,
  created_at timestamp with time zone default now()
);

-- 2. Bảng Người dùng (Users)
create table users (
  id text primary key,
  username text unique not null,
  display_name text not null,
  password text not null,
  email text,
  avatar_url text,
  role text not null,
  allowed_pages text[],
  permissions text[],
  branch_id text references branches(id),
  title text,
  created_at timestamp with time zone default now()
);

-- 3. Bảng Danh mục (Categories)
create table categories (
  id text primary key,
  name text not null,
  section text not null,
  sort_order integer not null,
  is_rate_based boolean default false,
  default_rate double precision,
  is_hidden boolean default false,
  created_at timestamp with time zone default now()
);

-- 4. Bảng Tài khoản Thanh toán (Payment Accounts)
create table payment_accounts (
  id text primary key,
  name text not null,
  type text not null,
  initial_balance double precision default 0,
  branch_id text references branches(id),
  bank_name text,
  account_number text,
  account_holder text,
  created_at timestamp with time zone default now()
);

-- 5. Bảng Kế hoạch Tháng (Monthly Plans)
create table monthly_plans (
  id text primary key,
  branch_id text not null references branches(id),
  year integer not null,
  month integer not null,
  kpi_revenue double precision default 0,
  tax_rate double precision default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 6. Bảng Chi tiết Kế hoạch (Category Plans)
create table category_plans (
  id text primary key,
  plan_id text not null references monthly_plans(id) on delete cascade,
  category_id text not null references categories(id),
  rate double precision,
  fixed_amount double precision,
  planned_amount double precision default 0,
  alert_threshold double precision default 0.8,
  disabled boolean default false
);

-- 7. Bảng Giao dịch (Transactions)
create table transactions (
  id text primary key,
  branch_id text not null references branches(id),
  date text not null,
  type text not null,
  category_id text references categories(id),
  amount double precision not null,
  payment_account_id text not null references payment_accounts(id),
  to_payment_account_id text references payment_accounts(id),
  paid_by_branch_id text references branches(id),
  note text,
  is_debt boolean default false,
  status text default 'open',
  created_by text not null references users(id),
  created_at timestamp with time zone default now(),
  updated_by text references users(id),
  updated_at timestamp with time zone default now()
);

-- 8. Bảng Nhật ký hoạt động (Activity Logs)
create table activity_logs (
  id text primary key,
  user_id text not null references users(id),
  type text not null, -- create, update, delete
  entity_type text not null, -- transaction, plan, etc.
  entity_id text not null,
  details text,
  created_at timestamp with time zone default now()
);

-- Tắt bảo mật RLS để sử dụng nội bộ (Internal use).
-- Nên bật lại nếu công khai lên internet ở cấp độ cao hơn.
alter table branches disable row level security;
alter table users disable row level security;
alter table categories disable row level security;
alter table payment_accounts disable row level security;
alter table monthly_plans disable row level security;
alter table category_plans disable row level security;
alter table transactions disable row level security;
alter table activity_logs disable row level security;

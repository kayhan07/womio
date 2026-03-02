-- WOMIO core schema (MySQL 8.0+)
-- cPanel/phpMyAdmin icin bu dosyayi import edin.

set names utf8mb4;
set foreign_key_checks = 0;

create table if not exists app_users (
  id bigint unsigned not null auto_increment,
  email varchar(190) not null,
  username varchar(120) not null,
  password_hash varchar(255) null,
  birth_date date null,
  locale varchar(10) not null default 'tr',
  status enum('active', 'blocked', 'deleted') not null default 'active',
  blocked_until datetime null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  unique key uq_app_users_email (email)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists roles (
  id bigint unsigned not null auto_increment,
  code varchar(60) not null,
  title varchar(120) not null,
  created_at timestamp not null default current_timestamp,
  primary key (id),
  unique key uq_roles_code (code)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists user_roles (
  user_id bigint unsigned not null,
  role_id bigint unsigned not null,
  assigned_at timestamp not null default current_timestamp,
  primary key (user_id, role_id),
  key idx_user_roles_role_id (role_id),
  constraint fk_user_roles_user foreign key (user_id) references app_users(id) on delete cascade,
  constraint fk_user_roles_role foreign key (role_id) references roles(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists modules (
  id bigint unsigned not null auto_increment,
  `key` varchar(80) not null,
  title varchar(140) not null,
  is_active tinyint(1) not null default 1,
  sort_order int not null default 100,
  min_app_version varchar(40) null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  unique key uq_modules_key (`key`)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists module_settings (
  id bigint unsigned not null auto_increment,
  module_id bigint unsigned not null,
  setting_key varchar(120) not null,
  setting_value json not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  unique key uq_module_settings_mod_key (module_id, setting_key),
  constraint fk_module_settings_module foreign key (module_id) references modules(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists feature_flags (
  id bigint unsigned not null auto_increment,
  flag_key varchar(120) not null,
  description varchar(255) not null default '',
  is_enabled tinyint(1) not null default 0,
  payload json not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  unique key uq_feature_flags_key (flag_key)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists shopping_products (
  id bigint unsigned not null auto_increment,
  external_ref varchar(190) null,
  name varchar(255) not null,
  brand varchar(120) null,
  category varchar(120) null,
  image_url text null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  key idx_shopping_products_external_ref (external_ref)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists shopping_prices (
  id bigint unsigned not null auto_increment,
  product_id bigint unsigned not null,
  store_name varchar(160) not null,
  price decimal(12,2) not null,
  old_price decimal(12,2) null,
  currency varchar(8) not null default 'TRY',
  product_url text null,
  delivery_note varchar(190) null,
  source varchar(60) not null default 'provider',
  fetched_at timestamp not null default current_timestamp,
  primary key (id),
  key idx_shopping_prices_product_id (product_id),
  key idx_shopping_prices_fetched_at (fetched_at),
  constraint fk_shopping_prices_product foreign key (product_id) references shopping_products(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists admin_audit_logs (
  id bigint unsigned not null auto_increment,
  actor_user_id bigint unsigned null,
  action varchar(100) not null,
  entity_type varchar(80) not null,
  entity_id varchar(120) not null,
  meta json not null,
  created_at timestamp not null default current_timestamp,
  primary key (id),
  key idx_admin_audit_logs_created_at (created_at),
  constraint fk_admin_audit_actor foreign key (actor_user_id) references app_users(id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

insert into roles (code, title) values
  ('super_admin', 'Super Admin'),
  ('admin', 'Admin'),
  ('moderator', 'Moderator'),
  ('member', 'Member')
on duplicate key update title = values(title);

insert into modules (`key`, title, is_active, sort_order) values
  ('health', 'Saglik', 1, 10),
  ('shopping', 'Akilli Alisveris', 1, 20),
  ('services', 'Hizmet ve Is', 1, 30),
  ('astrology', 'Astroloji', 1, 40)
on duplicate key update
  title = values(title),
  is_active = values(is_active),
  sort_order = values(sort_order);

insert into feature_flags (flag_key, description, is_enabled, payload) values
  ('download_page_enabled', 'Web download page visibility', 1, json_object()),
  ('shopping_live_provider_enabled', 'Real provider integration for shopping search', 0, json_object())
on duplicate key update
  description = values(description),
  is_enabled = values(is_enabled),
  payload = values(payload);

set foreign_key_checks = 1;

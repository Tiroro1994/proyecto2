-- ========================================================
-- Esquema Normalizado de Base de Datos para XAMPP MySQL
-- Sistema: InvBulto POS & ERP Mayorista
-- Optimizado: Sin redundancia de tablas ni columnas duplicadas
-- ========================================================

CREATE DATABASE IF NOT EXISTS `invbulto_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `invbulto_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabla de Usuarios del Sistema (Identidad y Seguridad)
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(64) NOT NULL,
  `name` varchar(150) NOT NULL,
  `username` varchar(60) NOT NULL UNIQUE,
  `email` varchar(150) DEFAULT NULL,
  `password` varchar(255) NOT NULL DEFAULT 'admin',
  `role` enum('admin','gerente','cajero','almacen') NOT NULL DEFAULT 'cajero',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Configuración de la Tienda y Parámetros Monetarios
-- Consolida la identidad fiscal del negocio y la tasa de cambio vigente sin tablas duplicadas
CREATE TABLE IF NOT EXISTS `store_settings` (
  `id` int(11) NOT NULL,
  `company_name` varchar(150) NOT NULL,
  `company_doc` varchar(50) NOT NULL,
  `company_phone` varchar(50) DEFAULT NULL,
  `company_email` varchar(100) DEFAULT NULL,
  `company_address` text DEFAULT NULL,
  `tax_rate_percent` decimal(5,2) NOT NULL DEFAULT 16.00,
  `currency_symbol` varchar(10) NOT NULL DEFAULT 'Bs.',
  `currency_name` varchar(50) NOT NULL DEFAULT 'Bolívares',
  `exchange_rate` decimal(10,4) NOT NULL DEFAULT 45.2000,
  `exchange_mode` enum('auto','manual') NOT NULL DEFAULT 'manual',
  `rate_last_updated` datetime DEFAULT NULL,
  `invoice_prefix` varchar(20) NOT NULL DEFAULT 'FACT-',
  `next_invoice_number` int(11) NOT NULL DEFAULT 1,
  `receipt_footer_message` text DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Productos (Control Mayorista por Bulto y Detal por Unidad)
CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(64) NOT NULL,
  `name` varchar(200) NOT NULL,
  `sku` varchar(50) NOT NULL UNIQUE,
  `barcode` varchar(100) DEFAULT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'General',
  `description` text DEFAULT NULL,
  `units_per_package` int(11) NOT NULL DEFAULT 12,
  `package_label` varchar(50) NOT NULL DEFAULT 'Bulto',
  `total_units_in_stock` int(11) NOT NULL DEFAULT 0,
  `min_stock_units` int(11) NOT NULL DEFAULT 24,
  `cost_unit_usd` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `cost_package_usd` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `price_unit_usd` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `price_package_usd` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_sku` (`sku`),
  KEY `idx_product_barcode` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Clientes (Directorio comercial normalizado sin contadores desincronizables)
CREATE TABLE IF NOT EXISTS `clients` (
  `id` varchar(64) NOT NULL,
  `name` varchar(150) NOT NULL,
  `doc_id` varchar(50) NOT NULL UNIQUE,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_client_doc` (`doc_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Facturas de Venta (Cabecera)
CREATE TABLE IF NOT EXISTS `sales` (
  `id` varchar(64) NOT NULL,
  `invoice_number` varchar(50) NOT NULL UNIQUE,
  `date` datetime NOT NULL,
  `client_id` varchar(64) DEFAULT NULL,
  `client_name` varchar(150) NOT NULL,
  `client_doc` varchar(50) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `user_name` varchar(150) NOT NULL,
  `user_role` varchar(30) NOT NULL DEFAULT 'cajero',
  `subtotal_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_percent` decimal(5,2) NOT NULL DEFAULT 16.00,
  `tax_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `exchange_rate` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `total_local` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) NOT NULL,
  `amount_paid_usd` decimal(10,2) DEFAULT NULL,
  `amount_paid_local` decimal(12,2) DEFAULT NULL,
  `change_usd` decimal(10,2) DEFAULT NULL,
  `reference_notes` text DEFAULT NULL,
  `status` enum('completada','anulada') NOT NULL DEFAULT 'completada',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_date` (`date`),
  KEY `idx_sales_client` (`client_id`),
  KEY `idx_sales_user` (`user_id`),
  CONSTRAINT `fk_sales_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla de Ítems de Venta (Detalle normalizado con integridad referencial)
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sale_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `unit_type` enum('unit','package') NOT NULL DEFAULT 'unit',
  `quantity` int(11) NOT NULL DEFAULT 1,
  `units_per_package` int(11) NOT NULL DEFAULT 1,
  `equivalent_units` int(11) NOT NULL DEFAULT 1,
  `unit_price_usd` decimal(10,4) NOT NULL,
  `subtotal_usd` decimal(10,2) NOT NULL,
  `unit_cost_usd` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `total_cost_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `profit_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_sale_items_sale` (`sale_id`),
  KEY `idx_sale_items_product` (`product_id`),
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla de Facturas de Compras de Mercancía (Cabecera)
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` varchar(64) NOT NULL,
  `invoice_number` varchar(60) NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `supplier_doc` varchar(50) NOT NULL,
  `supplier_phone` varchar(50) DEFAULT NULL,
  `supplier_address` text DEFAULT NULL,
  `date` datetime NOT NULL,
  `subtotal_usd` decimal(10,2) NOT NULL,
  `tax_usd` decimal(10,2) NOT NULL,
  `tax_percent` decimal(5,2) NOT NULL DEFAULT 16.00,
  `total_usd` decimal(10,2) NOT NULL,
  `exchange_rate` decimal(10,4) NOT NULL,
  `total_local` decimal(12,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `notes` text DEFAULT NULL,
  `registered_by` varchar(150) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchases_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabla de Ítems de Compra (Detalle con integridad referencial)
CREATE TABLE IF NOT EXISTS `purchase_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `packages_count` int(11) NOT NULL DEFAULT 0,
  `units_per_package` int(11) NOT NULL DEFAULT 1,
  `loose_units` int(11) NOT NULL DEFAULT 0,
  `total_units_received` int(11) NOT NULL DEFAULT 0,
  `cost_package_usd` decimal(10,4) NOT NULL,
  `calculated_cost_unit_usd` decimal(10,4) NOT NULL,
  `new_price_unit_usd` decimal(10,4) DEFAULT NULL,
  `new_price_package_usd` decimal(10,4) DEFAULT NULL,
  `tax_percent` decimal(5,2) NOT NULL DEFAULT 16.00,
  `subtotal_usd` decimal(10,2) NOT NULL,
  `tax_usd` decimal(10,2) NOT NULL,
  `total_usd` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_purchase_items_purchase` (`purchase_id`),
  KEY `idx_purchase_items_product` (`product_id`),
  CONSTRAINT `fk_purchase_items_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabla de Gastos Operativos (Día, Razón y Forma de Pago)
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` varchar(64) NOT NULL,
  `date` date NOT NULL,
  `description` text NOT NULL,
  `category` varchar(50) NOT NULL,
  `amount_usd` decimal(10,2) NOT NULL,
  `amount_local` decimal(12,2) NOT NULL,
  `exchange_rate` decimal(10,4) NOT NULL,
  `payment_method` varchar(60) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `registered_by` varchar(150) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_date` (`date`),
  KEY `idx_expenses_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabla de Movimientos de Inventario (Kardex y Trazabilidad)
CREATE TABLE IF NOT EXISTS `inventory_movements` (
  `id` varchar(64) NOT NULL,
  `date` datetime NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `type` enum('recepcion_bulto','recepcion_unidad','venta','venta_bulto','venta_unidad','ajuste_positivo','ajuste_negativo','merma') NOT NULL,
  `quantity_packages` int(11) NOT NULL DEFAULT 0,
  `quantity_units` int(11) NOT NULL DEFAULT 0,
  `total_units_delta` int(11) NOT NULL,
  `previous_units` int(11) NOT NULL,
  `new_units` int(11) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `reference_id` varchar(64) DEFAULT NULL,
  `registered_by` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_movements_product` (`product_id`),
  KEY `idx_movements_date` (`date`),
  CONSTRAINT `fk_movements_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabla de Historial de Variación de Tasa de Cambio (Sin campos redundantes de moneda)
CREATE TABLE IF NOT EXISTS `exchange_rate_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `rate` decimal(10,4) NOT NULL,
  `source` varchar(100) NOT NULL DEFAULT 'Manual',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rate_history_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================
-- REGISTROS INICIALES OBLIGATORIOS (SIN DATOS FALSOS)
-- ========================================================

-- Usuario estándar administrador inicial (admin / admin)
INSERT INTO `users` (`id`, `name`, `username`, `email`, `password`, `role`, `active`) VALUES
('usr-admin', 'Administrador del Sistema', 'admin', 'admin@sistema.com', 'admin', 'admin', 1)
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`), `active` = 1;

-- Configuración inicial limpia y única de la tienda
INSERT INTO `store_settings` (`id`, `company_name`, `company_doc`, `company_phone`, `company_email`, `company_address`, `tax_rate_percent`, `currency_symbol`, `currency_name`, `exchange_rate`, `exchange_mode`, `rate_last_updated`, `invoice_prefix`, `next_invoice_number`, `receipt_footer_message`) VALUES
(1, 'Mi Empresa C.A.', 'J-00000000-0', '', 'contacto@empresa.com', '', 16.00, 'Bs.', 'Bolívares', 45.2000, 'manual', NOW(), 'FACT-', 1, '¡Gracias por su compra!')
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);

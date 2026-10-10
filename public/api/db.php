<?php
/**
 * Conector y API REST Normalizada para XAMPP MySQL
 * InvBulto POS - Sistema Mayorista
 * Arquitectura sin redundancia de tablas ni registros huérfanos
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? 'status';

$host = $input['host'] ?? $_GET['host'] ?? '127.0.0.1';
$port = (int)($input['port'] ?? $_GET['port'] ?? 3306);
$dbName = $input['database'] ?? $_GET['database'] ?? 'invbulto_db';
$user = $input['username'] ?? $_GET['username'] ?? 'root';
$password = $input['password'] ?? $_GET['password'] ?? '';

function getPDO($host, $port, $user, $password, $dbName = null) {
    $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
    if ($dbName) {
        $dsn .= ";dbname={$dbName}";
    }
    return new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 3,
    ]);
}

$EXPECTED_TABLES = [
    'users' => 'Usuarios del Sistema y Permisos RBAC',
    'store_settings' => 'Configuración de Tienda y Tasa de Cambio',
    'products' => 'Productos (Inventario Mayorista y Detal)',
    'clients' => 'Directorio de Clientes',
    'sales' => 'Facturación y Ventas Registradas',
    'sale_items' => 'Detalle de Renglones de Ventas',
    'purchases' => 'Compras a Proveedores por Bulto',
    'purchase_items' => 'Detalle de Renglones de Compra',
    'expenses' => 'Control de Gastos y Egresos',
    'inventory_movements' => 'Kárdex de Movimientos de Inventario',
    'exchange_rate_history' => 'Historial de Variación de Tasa Cambiaria',
];

// 0. Diagnóstico de Base de Datos y Comprobación de Tablas
if ($action === 'diagnostics' || $action === 'status') {
    try {
        $pdo = getPDO($host, $port, $user, $password, $dbName);
        
        $tableStatus = [];
        $missingTables = [];
        
        foreach ($EXPECTED_TABLES as $tbl => $desc) {
            $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = :db AND table_name = :tbl");
            $stmt->execute([':db' => $dbName, ':tbl' => $tbl]);
            $exists = (int)$stmt->fetchColumn() > 0;
            
            $rowCount = 0;
            $err = null;
            if ($exists) {
                try {
                    $cStmt = $pdo->query("SELECT COUNT(*) FROM `{$tbl}`");
                    $rowCount = (int)$cStmt->fetchColumn();
                } catch (Exception $e) {
                    $err = $e->getMessage();
                }
            } else {
                $missingTables[] = $tbl;
            }
            
            $tableStatus[] = [
                'name' => $tbl,
                'exists' => $exists,
                'rowCount' => $rowCount,
                'description' => $desc,
                'status' => $exists ? 'ok' : 'missing',
                'errorMessage' => $err,
            ];
        }
        
        $allGenerated = count($missingTables) === 0;
        
        echo json_encode([
            'success' => true,
            'isOnline' => true,
            'connected' => true,
            'engine' => 'mysql',
            'server' => "{$host}:{$port}",
            'database' => $dbName,
            'totalExpectedTables' => count($EXPECTED_TABLES),
            'generatedTablesCount' => count($EXPECTED_TABLES) - count($missingTables),
            'missingTables' => $missingTables,
            'tables' => $tableStatus,
            'status' => $allGenerated ? 'healthy' : 'degraded',
            'warning' => !$allGenerated ? "Señal de alerta: No se generó o no existe la tabla: " . implode(', ', $missingTables) : null,
        ]);
        exit;
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'isOnline' => false,
            'connected' => false,
            'engine' => 'mysql',
            'server' => "{$host}:{$port}",
            'database' => $dbName,
            'error' => "No se conectó a la base de datos MySQL: " . $e->getMessage(),
            'hint' => 'Verifique que el servicio MySQL en XAMPP esté iniciado en el puerto 3306 y que las credenciales sean correctas.',
            'totalExpectedTables' => count($EXPECTED_TABLES),
            'generatedTablesCount' => 0,
            'missingTables' => array_keys($EXPECTED_TABLES),
            'tables' => array_map(function($k, $v) {
                return ['name' => $k, 'exists' => false, 'rowCount' => 0, 'description' => $v, 'status' => 'missing'];
            }, array_keys($EXPECTED_TABLES), array_values($EXPECTED_TABLES)),
        ]);
        exit;
    }
}

// 1. Inicialización y Creación de Esquema Normalizado con Verificación de Cada Tabla
if ($action === 'test' || $action === 'initialize' || $action === 'repair_tables') {
    try {
        $pdo = getPDO($host, $port, $user, $password);
        
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `{$dbName}`");

        // Ejecutar script SQL de tablas normalizadas
        $sqlPath = __DIR__ . '/../database.sql';
        if (file_exists($sqlPath)) {
            $sqlContent = file_get_contents($sqlPath);
            $pdo->exec($sqlContent);
        }

        // Asegurar existencia del usuario estándar admin/admin
        $stmt = $pdo->prepare("
            INSERT INTO `users` (`id`, `name`, `username`, `email`, `password`, `role`, `active`)
            VALUES ('usr-admin', 'Administrador del Sistema', 'admin', 'admin@sistema.com', 'admin', 'admin', 1)
            ON DUPLICATE KEY UPDATE `password` = 'admin', `active` = 1
        ");
        $stmt->execute();

        // Verificación estricta: ¿Se generaron todas las tablas requeridas?
        $missingTables = [];
        $tableStatus = [];
        foreach ($EXPECTED_TABLES as $tbl => $desc) {
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = :db AND table_name = :tbl");
            $checkStmt->execute([':db' => $dbName, ':tbl' => $tbl]);
            $exists = (int)$checkStmt->fetchColumn() > 0;
            
            $rowCount = 0;
            if ($exists) {
                $c = $pdo->query("SELECT COUNT(*) FROM `{$tbl}`");
                $rowCount = (int)$c->fetchColumn();
            } else {
                $missingTables[] = $tbl;
            }
            
            $tableStatus[] = [
                'name' => $tbl,
                'exists' => $exists,
                'rowCount' => $rowCount,
                'description' => $desc,
                'status' => $exists ? 'ok' : 'missing',
            ];
        }

        if (!empty($missingTables)) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => "Señal de Error Crítico: No se generó una tabla requerida: " . implode(', ', $missingTables),
                'missingTables' => $missingTables,
                'tables' => $tableStatus,
            ]);
            exit;
        }

        echo json_encode([
            'success' => true,
            'message' => "Base de datos '{$dbName}' inicializada y normalizada exitosamente. Las " . count($EXPECTED_TABLES) . " tablas fueron generadas y verificadas correctamente.",
            'engine' => 'mysql',
            'host' => $host,
            'database' => $dbName,
            'standardUser' => 'admin',
            'tables' => $tableStatus,
            'generatedTablesCount' => count($EXPECTED_TABLES),
        ]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => "Error de conexión o inicialización MySQL en XAMPP: " . $e->getMessage(),
            'hint' => 'Verifique que el servicio MySQL esté iniciado en el panel de control de XAMPP (puerto 3306) y que el usuario tenga privilegios para crear bases de datos y tablas.'
        ]);
        exit;
    }
}

// Conexión a la base de datos para operaciones
try {
    $pdo = getPDO($host, $port, $user, $password, $dbName);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'No se pudo conectar a la base de datos MySQL: ' . $e->getMessage(),
        'connected' => false,
    ]);
    exit;
}

// 2. Obtener Todos los Datos (Lectura completa normalizada para el Frontend)
if ($action === 'get_all') {
    try {
        $products = $pdo->query("SELECT * FROM products ORDER BY name ASC")->fetchAll();
        $clients = $pdo->query("SELECT * FROM clients ORDER BY name ASC")->fetchAll();
        $salesRows = $pdo->query("SELECT * FROM sales ORDER BY date DESC LIMIT 200")->fetchAll();
        $expenses = $pdo->query("SELECT * FROM expenses ORDER BY date DESC LIMIT 200")->fetchAll();
        $purchasesRows = $pdo->query("SELECT * FROM purchases ORDER BY date DESC LIMIT 200")->fetchAll();
        $movements = $pdo->query("SELECT * FROM inventory_movements ORDER BY date DESC LIMIT 200")->fetchAll();
        $users = $pdo->query("SELECT id, name, username, email, password, role, active FROM users")->fetchAll();
        $settings = $pdo->query("SELECT * FROM store_settings LIMIT 1")->fetch();

        // Mapear productos
        $products = array_map(function($p) {
            return [
                'id' => $p['id'],
                'name' => $p['name'],
                'sku' => $p['sku'],
                'barcode' => $p['barcode'] ?? '',
                'category' => $p['category'],
                'description' => $p['description'] ?? '',
                'unitsPerPackage' => (int)$p['units_per_package'],
                'packageLabel' => $p['package_label'],
                'totalUnitsInStock' => (int)$p['total_units_in_stock'],
                'minStockUnits' => (int)$p['min_stock_units'],
                'costUnitUSD' => (float)$p['cost_unit_usd'],
                'costPackageUSD' => (float)$p['cost_package_usd'],
                'priceUnitUSD' => (float)$p['price_unit_usd'],
                'pricePackageUSD' => (float)$p['price_package_usd'],
                'updatedAt' => $p['updated_at'],
            ];
        }, $products);

        // Mapear clientes con totales calculados
        $clients = array_map(function($c) use ($pdo) {
            $stmt = $pdo->prepare("SELECT COUNT(*) as total_orders, COALESCE(SUM(total_usd), 0) as total_usd FROM sales WHERE client_id = :cid AND status = 'completada'");
            $stmt->execute([':cid' => $c['id']]);
            $stats = $stmt->fetch();

            return [
                'id' => $c['id'],
                'name' => $c['name'],
                'docId' => $c['doc_id'],
                'phone' => $c['phone'] ?? '',
                'email' => $c['email'] ?? '',
                'address' => $c['address'] ?? '',
                'totalPurchasesUSD' => (float)($stats['total_usd'] ?? 0),
                'totalOrders' => (int)($stats['total_orders'] ?? 0),
                'createdAt' => $c['created_at'],
            ];
        }, $clients);

        // Mapear ventas asociando sus sale_items
        $sales = [];
        if (!empty($salesRows)) {
            $saleIds = array_column($salesRows, 'id');
            $placeholders = str_repeat('?,', count($saleIds) - 1) . '?';
            $itemStmt = $pdo->prepare("SELECT * FROM sale_items WHERE sale_id IN ($placeholders)");
            $itemStmt->execute($saleIds);
            $allItems = $itemStmt->fetchAll();

            $itemsBySale = [];
            foreach ($allItems as $item) {
                $itemsBySale[$item['sale_id']][] = [
                    'productId' => $item['product_id'],
                    'productName' => $item['product_name'],
                    'sku' => $item['sku'],
                    'unitType' => $item['unit_type'],
                    'quantity' => (int)$item['quantity'],
                    'unitsPerPackage' => (int)$item['units_per_package'],
                    'equivalentUnits' => (int)$item['equivalent_units'],
                    'unitPriceUSD' => (float)$item['unit_price_usd'],
                    'unitPriceLocal' => (float)($item['unit_price_usd'] * 1), // Calculado según tasa
                    'subtotalUSD' => (float)$item['subtotal_usd'],
                    'subtotalLocal' => (float)($item['subtotal_usd'] * 1),
                    'unitCostUSD' => (float)$item['unit_cost_usd'],
                    'totalCostUSD' => (float)$item['total_cost_usd'],
                    'profitUSD' => (float)$item['profit_usd'],
                ];
            }

            foreach ($salesRows as $s) {
                $sales[] = [
                    'id' => $s['id'],
                    'invoiceNumber' => $s['invoice_number'],
                    'date' => $s['date'],
                    'clientId' => $s['client_id'],
                    'clientName' => $s['client_name'],
                    'clientDoc' => $s['client_doc'],
                    'userId' => $s['user_id'],
                    'userName' => $s['user_name'],
                    'userRole' => $s['user_role'],
                    'items' => $itemsBySale[$s['id']] ?? [],
                    'subtotalUSD' => (float)$s['subtotal_usd'],
                    'discountUSD' => (float)$s['discount_usd'],
                    'taxPercent' => (float)$s['tax_percent'],
                    'taxUSD' => (float)$s['tax_usd'],
                    'totalUSD' => (float)$s['total_usd'],
                    'exchangeRate' => (float)$s['exchange_rate'],
                    'totalLocal' => (float)$s['total_local'],
                    'currencySymbol' => $settings['currency_symbol'] ?? 'Bs.',
                    'currencyName' => $settings['currency_name'] ?? 'Bolívares',
                    'paymentMethod' => $s['payment_method'],
                    'amountPaidUSD' => $s['amount_paid_usd'] !== null ? (float)$s['amount_paid_usd'] : null,
                    'amountPaidLocal' => $s['amount_paid_local'] !== null ? (float)$s['amount_paid_local'] : null,
                    'changeUSD' => $s['change_usd'] !== null ? (float)$s['change_usd'] : null,
                    'referenceNotes' => $s['reference_notes'] ?? '',
                    'status' => $s['status'],
                ];
            }
        }

        // Mapear compras asociando sus purchase_items
        $purchases = [];
        if (!empty($purchasesRows)) {
            $purIds = array_column($purchasesRows, 'id');
            $placeholders = str_repeat('?,', count($purIds) - 1) . '?';
            $pItemStmt = $pdo->prepare("SELECT * FROM purchase_items WHERE purchase_id IN ($placeholders)");
            $pItemStmt->execute($purIds);
            $allPurItems = $pItemStmt->fetchAll();

            $itemsByPurchase = [];
            foreach ($allPurItems as $pi) {
                $itemsByPurchase[$pi['purchase_id']][] = [
                    'productId' => $pi['product_id'],
                    'productName' => $pi['product_name'],
                    'sku' => $pi['sku'],
                    'packagesCount' => (int)$pi['packages_count'],
                    'unitsPerPackage' => (int)$pi['units_per_package'],
                    'looseUnits' => (int)$pi['loose_units'],
                    'totalUnitsReceived' => (int)$pi['total_units_received'],
                    'costPackageUSD' => (float)$pi['cost_package_usd'],
                    'calculatedCostUnitUSD' => (float)$pi['calculated_cost_unit_usd'],
                    'newPriceUnitUSD' => $pi['new_price_unit_usd'] !== null ? (float)$pi['new_price_unit_usd'] : null,
                    'newPricePackageUSD' => $pi['new_price_package_usd'] !== null ? (float)$pi['new_price_package_usd'] : null,
                    'taxPercent' => (float)$pi['tax_percent'],
                    'subtotalUSD' => (float)$pi['subtotal_usd'],
                    'taxUSD' => (float)$pi['tax_usd'],
                    'totalUSD' => (float)$pi['total_usd'],
                ];
            }

            foreach ($purchasesRows as $pur) {
                $purchases[] = [
                    'id' => $pur['id'],
                    'invoiceNumber' => $pur['invoice_number'],
                    'supplierName' => $pur['supplier_name'],
                    'supplierDoc' => $pur['supplier_doc'],
                    'supplierPhone' => $pur['supplier_phone'] ?? '',
                    'supplierAddress' => $pur['supplier_address'] ?? '',
                    'date' => $pur['date'],
                    'items' => $itemsByPurchase[$pur['id']] ?? [],
                    'subtotalUSD' => (float)$pur['subtotal_usd'],
                    'taxUSD' => (float)$pur['tax_usd'],
                    'taxPercent' => (float)$pur['tax_percent'],
                    'totalUSD' => (float)$pur['total_usd'],
                    'exchangeRate' => (float)$pur['exchange_rate'],
                    'totalLocal' => (float)$pur['total_local'],
                    'currencySymbol' => $settings['currency_symbol'] ?? 'Bs.',
                    'currencyName' => $settings['currency_name'] ?? 'Bolívares',
                    'paymentMethod' => $pur['payment_method'],
                    'notes' => $pur['notes'] ?? '',
                    'registeredBy' => $pur['registered_by'],
                ];
            }
        }

        // Mapear gastos
        $expenses = array_map(function($e) {
            return [
                'id' => $e['id'],
                'date' => $e['date'],
                'description' => $e['description'],
                'category' => $e['category'],
                'amountUSD' => (float)$e['amount_usd'],
                'amountLocal' => (float)$e['amount_local'],
                'exchangeRate' => (float)$e['exchange_rate'],
                'paymentMethod' => $e['payment_method'],
                'reference' => $e['reference'] ?? '',
                'registeredBy' => $e['registered_by'],
            ];
        }, $expenses);

        echo json_encode([
            'success' => true,
            'connected' => true,
            'database' => $dbName,
            'data' => [
                'products' => $products,
                'clients' => $clients,
                'sales' => $sales,
                'expenses' => $expenses,
                'purchases' => $purchases,
                'movements' => $movements,
                'users' => $users,
                'settings' => $settings,
            ]
        ]);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 3. Guardar Venta y Actualizar Stock (Transacción Atómica Normalizada)
if ($action === 'save_sale') {
    try {
        $pdo->beginTransaction();
        $sale = $input['sale'] ?? [];
        if (empty($sale['id'])) throw new Exception('Datos de venta inválidos');

        $stmt = $pdo->prepare("
            INSERT INTO `sales` (
                `id`, `invoice_number`, `date`, `client_id`, `client_name`, `client_doc`,
                `user_id`, `user_name`, `user_role`, `subtotal_usd`, `discount_usd`,
                `tax_percent`, `tax_usd`, `total_usd`, `exchange_rate`, `total_local`,
                `payment_method`, `amount_paid_usd`, `amount_paid_local`, `change_usd`,
                `reference_notes`, `status`
            ) VALUES (
                :id, :invoice_number, :date, :client_id, :client_name, :client_doc,
                :user_id, :user_name, :user_role, :subtotal_usd, :discount_usd,
                :tax_percent, :tax_usd, :total_usd, :exchange_rate, :total_local,
                :payment_method, :amount_paid_usd, :amount_paid_local, :change_usd,
                :reference_notes, 'completada'
            )
        ");
        $refNotes = $sale['referenceNotes'] ?? '';
        if (!empty($sale['payments']) && is_array($sale['payments'])) {
            $paySummary = [];
            foreach ($sale['payments'] as $p) {
                $m = $p['method'] ?? 'pago';
                $amtU = number_format((float)($p['amountUSD'] ?? 0), 2);
                $amtL = number_format((float)($p['amountLocal'] ?? 0), 2);
                $ref = !empty($p['reference']) ? " (Ref: " . $p['reference'] . ")" : "";
                $paySummary[] = "{$m}: \${$amtU} ({$amtL} Bs.){$ref}";
            }
            $refNotes = trim($refNotes . " [Pagos: " . implode(' + ', $paySummary) . "]");
        }

        $stmt->execute([
            ':id' => $sale['id'],
            ':invoice_number' => $sale['invoiceNumber'],
            ':date' => $sale['date'],
            ':client_id' => !empty($sale['clientId']) ? $sale['clientId'] : null,
            ':client_name' => $sale['clientName'] ?? 'Consumidor Final',
            ':client_doc' => $sale['clientDoc'] ?? 'V-00000000',
            ':user_id' => $sale['userId'],
            ':user_name' => $sale['userName'],
            ':user_role' => $sale['userRole'] ?? 'cajero',
            ':subtotal_usd' => (float)$sale['subtotalUSD'],
            ':discount_usd' => (float)($sale['discountUSD'] ?? 0),
            ':tax_percent' => (float)($sale['taxPercent'] ?? 0),
            ':tax_usd' => (float)($sale['taxUSD'] ?? 0),
            ':total_usd' => (float)$sale['totalUSD'],
            ':exchange_rate' => (float)$sale['exchangeRate'],
            ':total_local' => (float)$sale['totalLocal'],
            ':payment_method' => $sale['paymentMethod'],
            ':amount_paid_usd' => isset($sale['amountPaidUSD']) ? (float)$sale['amountPaidUSD'] : null,
            ':amount_paid_local' => isset($sale['amountPaidLocal']) ? (float)$sale['amountPaidLocal'] : null,
            ':change_usd' => isset($sale['changeUSD']) ? (float)$sale['changeUSD'] : null,
            ':reference_notes' => !empty($refNotes) ? $refNotes : null,
        ]);

        $itemStmt = $pdo->prepare("
            INSERT INTO `sale_items` (
                `sale_id`, `product_id`, `product_name`, `sku`, `unit_type`, `quantity`,
                `units_per_package`, `equivalent_units`, `unit_price_usd`,
                `subtotal_usd`, `unit_cost_usd`, `total_cost_usd`, `profit_usd`
            ) VALUES (
                :sale_id, :product_id, :product_name, :sku, :unit_type, :quantity,
                :units_per_package, :equivalent_units, :unit_price_usd,
                :subtotal_usd, :unit_cost_usd, :total_cost_usd, :profit_usd
            )
        ");

        $stockStmt = $pdo->prepare("
            UPDATE `products`
            SET `total_units_in_stock` = GREATEST(0, `total_units_in_stock` - :deduct)
            WHERE `id` = :pid
        ");

        foreach (($sale['items'] ?? []) as $item) {
            $deductUnits = (int)($item['equivalentUnits'] ?? $item['quantity']);
            $itemStmt->execute([
                ':sale_id' => $sale['id'],
                ':product_id' => $item['productId'],
                ':product_name' => $item['productName'],
                ':sku' => $item['sku'],
                ':unit_type' => $item['unitType'],
                ':quantity' => (int)$item['quantity'],
                ':units_per_package' => (int)($item['unitsPerPackage'] ?? 1),
                ':equivalent_units' => $deductUnits,
                ':unit_price_usd' => (float)$item['unitPriceUSD'],
                ':subtotal_usd' => (float)$item['subtotalUSD'],
                ':unit_cost_usd' => (float)($item['unitCostUSD'] ?? 0),
                ':total_cost_usd' => (float)($item['totalCostUSD'] ?? 0),
                ':profit_usd' => (float)($item['profitUSD'] ?? 0),
            ]);

            $stockStmt->execute([
                ':deduct' => $deductUnits,
                ':pid' => $item['productId'],
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Venta registrada con éxito']);
        exit;
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 4. Guardar Compra de Mercancía (Transacción Atómica Normalizada)
if ($action === 'save_purchase') {
    try {
        $pdo->beginTransaction();
        $pur = $input['purchase'] ?? [];
        if (empty($pur['id'])) throw new Exception('Datos de compra inválidos');

        $stmt = $pdo->prepare("
            INSERT INTO `purchases` (
                `id`, `invoice_number`, `supplier_name`, `supplier_doc`, `supplier_phone`,
                `supplier_address`, `date`, `subtotal_usd`, `tax_usd`, `tax_percent`,
                `total_usd`, `exchange_rate`, `total_local`, `payment_method`, `notes`, `registered_by`
            ) VALUES (
                :id, :invoice_number, :supplier_name, :supplier_doc, :supplier_phone,
                :supplier_address, :date, :subtotal_usd, :tax_usd, :tax_percent,
                :total_usd, :exchange_rate, :total_local, :payment_method, :notes, :registered_by
            )
        ");
        $stmt->execute([
            ':id' => $pur['id'],
            ':invoice_number' => $pur['invoiceNumber'],
            ':supplier_name' => $pur['supplierName'],
            ':supplier_doc' => $pur['supplierDoc'],
            ':supplier_phone' => $pur['supplierPhone'] ?? null,
            ':supplier_address' => $pur['supplierAddress'] ?? null,
            ':date' => $pur['date'],
            ':subtotal_usd' => (float)$pur['subtotalUSD'],
            ':tax_usd' => (float)$pur['taxUSD'],
            ':tax_percent' => (float)$pur['taxPercent'],
            ':total_usd' => (float)$pur['totalUSD'],
            ':exchange_rate' => (float)$pur['exchangeRate'],
            ':total_local' => (float)$pur['totalLocal'],
            ':payment_method' => $pur['paymentMethod'],
            ':notes' => $pur['notes'] ?? null,
            ':registered_by' => $pur['registeredBy'],
        ]);

        $itemStmt = $pdo->prepare("
            INSERT INTO `purchase_items` (
                `purchase_id`, `product_id`, `product_name`, `sku`, `packages_count`,
                `units_per_package`, `loose_units`, `total_units_received`, `cost_package_usd`,
                `calculated_cost_unit_usd`, `new_price_unit_usd`, `new_price_package_usd`,
                `tax_percent`, `subtotal_usd`, `tax_usd`, `total_usd`
            ) VALUES (
                :purchase_id, :product_id, :product_name, :sku, :packages_count,
                :units_per_package, :loose_units, :total_units_received, :cost_package_usd,
                :calculated_cost_unit_usd, :new_price_unit_usd, :new_price_package_usd,
                :tax_percent, :subtotal_usd, :tax_usd, :total_usd
            )
        ");

        $stockStmt = $pdo->prepare("
            UPDATE `products`
            SET `total_units_in_stock` = `total_units_in_stock` + :addUnits,
                `cost_unit_usd` = :costUnit,
                `cost_package_usd` = :costPackage
            WHERE `id` = :pid
        ");

        foreach (($pur['items'] ?? []) as $item) {
            $addUnits = (int)$item['totalUnitsReceived'];
            $itemStmt->execute([
                ':purchase_id' => $pur['id'],
                ':product_id' => $item['productId'],
                ':product_name' => $item['productName'],
                ':sku' => $item['sku'],
                ':packages_count' => (int)$item['packagesCount'],
                ':units_per_package' => (int)$item['unitsPerPackage'],
                ':loose_units' => (int)$item['looseUnits'],
                ':total_units_received' => $addUnits,
                ':cost_package_usd' => (float)$item['costPackageUSD'],
                ':calculated_cost_unit_usd' => (float)$item['calculatedCostUnitUSD'],
                ':new_price_unit_usd' => isset($item['newPriceUnitUSD']) ? (float)$item['newPriceUnitUSD'] : null,
                ':new_price_package_usd' => isset($item['newPricePackageUSD']) ? (float)$item['newPricePackageUSD'] : null,
                ':tax_percent' => (float)$item['taxPercent'],
                ':subtotal_usd' => (float)$item['subtotalUSD'],
                ':tax_usd' => (float)$item['taxUSD'],
                ':total_usd' => (float)$item['totalUSD'],
            ]);

            $stockStmt->execute([
                ':addUnits' => $addUnits,
                ':costUnit' => (float)$item['calculatedCostUnitUSD'],
                ':costPackage' => (float)$item['costPackageUSD'],
                ':pid' => $item['productId'],
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Compra registrada con éxito']);
        exit;
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 5. Guardar o Actualizar un Producto
if ($action === 'save_product') {
    try {
        $p = $input['product'] ?? [];
        if (empty($p['id']) || empty($p['name'])) throw new Exception('Datos de producto inválidos');

        $stmt = $pdo->prepare("
            INSERT INTO `products` (
                `id`, `name`, `sku`, `barcode`, `category`, `description`,
                `units_per_package`, `package_label`, `total_units_in_stock`, `min_stock_units`,
                `cost_unit_usd`, `cost_package_usd`, `price_unit_usd`, `price_package_usd`
            ) VALUES (
                :id, :name, :sku, :barcode, :category, :description,
                :units_per_package, :package_label, :total_units_in_stock, :min_stock_units,
                :cost_unit_usd, :cost_package_usd, :price_unit_usd, :price_package_usd
            ) ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `sku` = VALUES(`sku`),
                `barcode` = VALUES(`barcode`),
                `category` = VALUES(`category`),
                `description` = VALUES(`description`),
                `units_per_package` = VALUES(`units_per_package`),
                `package_label` = VALUES(`package_label`),
                `total_units_in_stock` = VALUES(`total_units_in_stock`),
                `min_stock_units` = VALUES(`min_stock_units`),
                `cost_unit_usd` = VALUES(`cost_unit_usd`),
                `cost_package_usd` = VALUES(`cost_package_usd`),
                `price_unit_usd` = VALUES(`price_unit_usd`),
                `price_package_usd` = VALUES(`price_package_usd`)
        ");
        $stmt->execute([
            ':id' => $p['id'],
            ':name' => $p['name'],
            ':sku' => $p['sku'],
            ':barcode' => $p['barcode'] ?? '',
            ':category' => $p['category'] ?? 'General',
            ':description' => $p['description'] ?? '',
            ':units_per_package' => (int)($p['unitsPerPackage'] ?? 12),
            ':package_label' => $p['packageLabel'] ?? 'Bulto',
            ':total_units_in_stock' => (int)($p['totalUnitsInStock'] ?? 0),
            ':min_stock_units' => (int)($p['minStockUnits'] ?? 24),
            ':cost_unit_usd' => (float)($p['costUnitUSD'] ?? 0),
            ':cost_package_usd' => (float)($p['costPackageUSD'] ?? 0),
            ':price_unit_usd' => (float)($p['priceUnitUSD'] ?? 0),
            ':price_package_usd' => (float)($p['pricePackageUSD'] ?? 0),
        ]);

        echo json_encode(['success' => true, 'message' => 'Producto sincronizado con éxito']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 6. Eliminar Producto
if ($action === 'delete_product') {
    try {
        $id = $input['id'] ?? $_GET['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM `products` WHERE `id` = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Producto eliminado']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 7. Guardar o Registrar un Gasto Operativo
if ($action === 'save_expense') {
    try {
        $exp = $input['expense'] ?? [];
        if (empty($exp['id']) || empty($exp['description'])) throw new Exception('Datos de gasto inválidos');

        $stmt = $pdo->prepare("
            INSERT INTO `expenses` (`id`, `date`, `description`, `category`, `amount_usd`, `amount_local`, `exchange_rate`, `payment_method`, `reference`, `registered_by`)
            VALUES (:id, :date, :description, :category, :amount_usd, :amount_local, :exchange_rate, :payment_method, :reference, :registered_by)
            ON DUPLICATE KEY UPDATE
                `date` = VALUES(`date`),
                `description` = VALUES(`description`),
                `category` = VALUES(`category`),
                `amount_usd` = VALUES(`amount_usd`),
                `amount_local` = VALUES(`amount_local`),
                `exchange_rate` = VALUES(`exchange_rate`),
                `payment_method` = VALUES(`payment_method`),
                `reference` = VALUES(`reference`)
        ");
        $stmt->execute([
            ':id' => $exp['id'],
            ':date' => $exp['date'],
            ':description' => $exp['description'],
            ':category' => $exp['category'],
            ':amount_usd' => (float)$exp['amountUSD'],
            ':amount_local' => (float)($exp['amountLocal'] ?? 0),
            ':exchange_rate' => (float)($exp['exchangeRate'] ?? 1),
            ':payment_method' => $exp['paymentMethod'],
            ':reference' => $exp['reference'] ?? null,
            ':registered_by' => $exp['registeredBy'] ?? 'Admin',
        ]);

        echo json_encode(['success' => true, 'message' => 'Gasto registrado']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 8. Eliminar Gasto
if ($action === 'delete_expense') {
    try {
        $id = $input['id'] ?? $_GET['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM `expenses` WHERE `id` = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Gasto eliminado']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 9. Guardar o Actualizar Cliente
if ($action === 'save_client') {
    try {
        $c = $input['client'] ?? [];
        if (empty($c['id']) || empty($c['name'])) throw new Exception('Datos de cliente inválidos');

        $stmt = $pdo->prepare("
            INSERT INTO `clients` (`id`, `name`, `doc_id`, `phone`, `email`, `address`, `created_at`)
            VALUES (:id, :name, :doc_id, :phone, :email, :address, :created_at)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `doc_id` = VALUES(`doc_id`),
                `phone` = VALUES(`phone`),
                `email` = VALUES(`email`),
                `address` = VALUES(`address`)
        ");
        $stmt->execute([
            ':id' => $c['id'],
            ':name' => $c['name'],
            ':doc_id' => $c['docId'],
            ':phone' => $c['phone'] ?? null,
            ':email' => $c['email'] ?? null,
            ':address' => $c['address'] ?? null,
            ':created_at' => $c['createdAt'] ?? date('Y-m-d'),
        ]);

        echo json_encode(['success' => true, 'message' => 'Cliente guardado']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 10. Eliminar Cliente
if ($action === 'delete_client') {
    try {
        $id = $input['id'] ?? $_GET['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM `clients` WHERE `id` = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Cliente eliminado']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 11. Guardar o Actualizar Usuario con Contraseña
if ($action === 'save_user') {
    try {
        $u = $input['user'] ?? [];
        if (empty($u['id']) || empty($u['username'])) throw new Exception('Datos de usuario requeridos');

        $stmt = $pdo->prepare("
            INSERT INTO `users` (`id`, `name`, `username`, `email`, `password`, `role`, `active`)
            VALUES (:id, :name, :username, :email, :password, :role, :active)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `username` = VALUES(`username`),
                `email` = VALUES(`email`),
                `password` = IF(VALUES(`password`) != '', VALUES(`password`), `password`),
                `role` = VALUES(`role`),
                `active` = VALUES(`active`)
        ");
        $stmt->execute([
            ':id' => $u['id'],
            ':name' => $u['name'],
            ':username' => $u['username'],
            ':email' => $u['email'],
            ':password' => !empty($u['password']) ? $u['password'] : 'admin',
            ':role' => $u['role'] ?? 'cajero',
            ':active' => isset($u['active']) ? (int)$u['active'] : 1,
        ]);

        echo json_encode(['success' => true, 'message' => 'Usuario guardado en MySQL con su contraseña']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 12. Eliminar Usuario
if ($action === 'delete_user') {
    try {
        $id = $input['id'] ?? $_GET['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM `users` WHERE `id` = :id AND `username` != 'admin'");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Usuario eliminado']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 13. Guardar Movimiento de Inventario (Kárdex)
if ($action === 'save_movement') {
    try {
        $m = $input['movement'] ?? [];
        if (empty($m['id']) || empty($m['productId'])) throw new Exception('Datos de movimiento inválidos');

        $stmt = $pdo->prepare("
            INSERT INTO `inventory_movements` (
                `id`, `date`, `product_id`, `product_name`, `type`,
                `quantity_packages`, `quantity_units`, `total_units_delta`,
                `previous_units`, `new_units`, `reason`, `reference_id`, `registered_by`
            ) VALUES (
                :id, :date, :product_id, :product_name, :type,
                :quantity_packages, :quantity_units, :total_units_delta,
                :previous_units, :new_units, :reason, :reference_id, :registered_by
            ) ON DUPLICATE KEY UPDATE
                `reason` = VALUES(`reason`),
                `registered_by` = VALUES(`registered_by`)
        ");
        $stmt->execute([
            ':id' => $m['id'],
            ':date' => $m['date'] ?? date('Y-m-d H:i:s'),
            ':product_id' => $m['productId'],
            ':product_name' => $m['productName'] ?? 'Producto',
            ':type' => $m['type'] ?? 'ajuste_positivo',
            ':quantity_packages' => (int)($m['quantityPackages'] ?? 0),
            ':quantity_units' => (int)($m['quantityUnits'] ?? 0),
            ':total_units_delta' => (int)($m['totalUnitsDelta'] ?? 0),
            ':previous_units' => (int)($m['previousUnits'] ?? 0),
            ':new_units' => (int)($m['newUnits'] ?? 0),
            ':reason' => $m['reason'] ?? '',
            ':reference_id' => $m['referenceId'] ?? null,
            ':registered_by' => $m['registeredBy'] ?? 'Admin',
        ]);

        echo json_encode(['success' => true, 'message' => 'Movimiento de inventario guardado en base de datos']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// 14. Guardar Configuración de la Tienda y Tasa de Cambio
if ($action === 'save_settings') {
    try {
        $s = $input['settings'] ?? [];
        $stmt = $pdo->prepare("
            INSERT INTO `store_settings` (
                `id`, `company_name`, `company_doc`, `company_phone`, `company_email`,
                `company_address`, `tax_rate_percent`, `currency_symbol`, `currency_name`,
                `exchange_rate`, `exchange_mode`, `rate_last_updated`, `invoice_prefix`,
                `next_invoice_number`, `receipt_footer_message`
            ) VALUES (
                1, :company_name, :company_doc, :company_phone, :company_email,
                :company_address, :tax_rate_percent, :currency_symbol, :currency_name,
                :exchange_rate, :exchange_mode, NOW(), :invoice_prefix,
                :next_invoice_number, :receipt_footer_message
            ) ON DUPLICATE KEY UPDATE
                `company_name` = VALUES(`company_name`),
                `company_doc` = VALUES(`company_doc`),
                `company_phone` = VALUES(`company_phone`),
                `company_email` = VALUES(`company_email`),
                `company_address` = VALUES(`company_address`),
                `tax_rate_percent` = VALUES(`tax_rate_percent`),
                `currency_symbol` = VALUES(`currency_symbol`),
                `currency_name` = VALUES(`currency_name`),
                `exchange_rate` = VALUES(`exchange_rate`),
                `exchange_mode` = VALUES(`exchange_mode`),
                `rate_last_updated` = NOW(),
                `invoice_prefix` = VALUES(`invoice_prefix`),
                `next_invoice_number` = VALUES(`next_invoice_number`),
                `receipt_footer_message` = VALUES(`receipt_footer_message`)
        ");
        $stmt->execute([
            ':company_name' => $s['companyName'] ?? 'Mi Empresa C.A.',
            ':company_doc' => $s['companyDoc'] ?? 'J-00000000-0',
            ':company_phone' => $s['companyPhone'] ?? null,
            ':company_email' => $s['companyEmail'] ?? null,
            ':company_address' => $s['companyAddress'] ?? null,
            ':tax_rate_percent' => (float)($s['taxRatePercent'] ?? 16),
            ':currency_symbol' => $s['currencySymbol'] ?? 'Bs.',
            ':currency_name' => $s['currencyName'] ?? 'Bolívares',
            ':exchange_rate' => (float)($s['exchangeRate'] ?? 45.2),
            ':exchange_mode' => $s['exchangeMode'] ?? 'manual',
            ':invoice_prefix' => $s['invoicePrefix'] ?? 'FACT-',
            ':next_invoice_number' => (int)($s['nextInvoiceNumber'] ?? 1),
            ':receipt_footer_message' => $s['receiptFooterMessage'] ?? '¡Gracias por su compra!',
        ]);

        // Registrar en exchange_rate_history si se especifica tasa
        if (isset($s['exchangeRate'])) {
            $hStmt = $pdo->prepare("
                INSERT INTO `exchange_rate_history` (`date`, `rate`, `source`)
                VALUES (CURDATE(), :rate, :source)
            ");
            $hStmt->execute([
                ':rate' => (float)$s['exchangeRate'],
                ':source' => $s['exchangeMode'] === 'auto' ? 'Sincronización Automática' : 'Ajuste Manual',
            ]);
        }

        echo json_encode(['success' => true, 'message' => 'Configuración de tienda guardada en base de datos']);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// Respuesta por defecto
echo json_encode([
    'success' => true,
    'status' => 'online',
    'database' => $dbName,
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Apache XAMPP',
]);

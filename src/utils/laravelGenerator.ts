export interface ArchitectureFile {
  filename: string;
  category: 'migration' | 'model' | 'controller' | 'sql' | 'routes';
  description: string;
  code: string;
}

export const getLaravelArchitectureFiles = (): ArchitectureFile[] => {
  return [
    {
      filename: '2026_01_01_000001_create_products_table.php',
      category: 'migration',
      description: 'Migración para productos con soporte dual bulto/unidad, costos y precios',
      code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 64)->unique()->index();
            $table->string('barcode', 128)->nullable()->index();
            $table->string('name', 255);
            $table->string('category', 100)->index();
            $table->text('description')->nullable();
            
            // Configuración de bulto y unidad
            $table->unsignedInteger('units_per_package')->default(12)
                ->comment('Cantidad de unidades individuales por bulto/caja/fardo');
            $table->string('package_label', 50)->default('Bulto')
                ->comment('Etiqueta: Bulto, Caja, Fardo, Pack, Saco');
                
            // Inventario (Almacenado como total de unidades para consistencia transaccional)
            $table->integer('total_units_in_stock')->default(0)->index();
            $table->unsignedInteger('min_stock_units')->default(10)
                ->comment('Alerta de stock bajo en unidades totales');
                
            // Costos y Precios en Divisa Base (USD)
            $table->decimal('cost_unit_usd', 12, 4)->default(0.0000);
            $table->decimal('cost_package_usd', 12, 4)->default(0.0000);
            $table->decimal('price_unit_usd', 12, 4)->default(0.0000);
            $table->decimal('price_package_usd', 12, 4)->default(0.0000);
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};`
    },
    {
      filename: '2026_01_01_000002_create_exchange_rates_table.php',
      category: 'migration',
      description: 'Control de tasas de cambio diarias automáticas y manuales',
      code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->string('currency_code', 10)->default('VES')->index();
            $table->string('currency_name', 50)->default('Bolívares');
            $table->string('currency_symbol', 10)->default('Bs.');
            $table->decimal('rate', 14, 4)->comment('Tasa de cambio respecto a 1 USD');
            $table->enum('source_type', ['auto_api', 'manual'])->default('auto_api');
            $table->string('api_provider', 100)->nullable();
            $table->date('rate_date')->index();
            $table->boolean('is_current')->default(true)->index();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};`
    },
    {
      filename: '2026_01_01_000003_create_sales_and_items_tables.php',
      category: 'migration',
      description: 'Facturación POS con correlativos, soporte bulto/unidad y cálculo en dos monedas',
      code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 50)->unique()->index();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('client_name', 200);
            $table->string('client_doc', 50)->nullable();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            
            // Totales e Impuestos
            $table->decimal('subtotal_usd', 12, 2);
            $table->decimal('discount_usd', 12, 2)->default(0.00);
            $table->decimal('tax_percent', 5, 2)->default(16.00);
            $table->decimal('tax_usd', 12, 2)->default(0.00);
            $table->decimal('total_usd', 12, 2);
            
            // Conversión al momento de venta
            $table->decimal('exchange_rate_applied', 14, 4);
            $table->string('currency_symbol', 10)->default('Bs.');
            $table->decimal('total_local_currency', 16, 2);
            
            // Pago
            $table->string('payment_method', 50); // efectivo_usd, efectivo_local, pago_movil, tarjeta, mixto
            $table->decimal('paid_amount_usd', 12, 2)->nullable();
            $table->decimal('change_usd', 12, 2)->nullable();
            $table->string('status', 30)->default('completed'); // completed, cancelled
            $table->text('notes')->nullable();
            $table->timestamp('sale_date')->useCurrent()->index();
            $table->timestamps();
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            
            $table->string('product_sku', 64);
            $table->string('product_name', 255);
            $table->enum('unit_type', ['unit', 'package'])->comment('Vendido por unidad o por bulto completo');
            $table->unsignedInteger('quantity')->comment('Cantidad de bultos o unidades');
            $table->unsignedInteger('units_per_package');
            $table->unsignedInteger('equivalent_units_deducted')->comment('Total de unidades descontadas del inventario');
            
            $table->decimal('unit_price_usd', 12, 4);
            $table->decimal('subtotal_usd', 12, 2);
            $table->decimal('subtotal_local', 16, 2);
            $table->decimal('unit_cost_usd', 12, 4);
            $table->decimal('total_cost_usd', 12, 2);
            $table->decimal('profit_usd', 12, 2)->comment('Utilidad bruta generada en esta línea');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};`
    },
    {
      filename: '2026_01_01_000004_create_expenses_and_movements_tables.php',
      category: 'migration',
      description: 'Control de gastos operativos y kardex de movimientos de inventario',
      code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->date('expense_date')->index();
            $table->string('category', 60)->index(); // alquiler, nomina, fletes, servicios, etc.
            $table->string('description', 255);
            $table->decimal('amount_usd', 12, 2);
            $table->decimal('amount_local', 16, 2);
            $table->decimal('exchange_rate', 14, 4);
            $table->string('payment_method', 50);
            $table->string('reference_number', 100)->nullable();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->enum('type', ['recepcion_bulto', 'recepcion_unidad', 'venta', 'ajuste_positivo', 'ajuste_negativo', 'merma']);
            $table->integer('packages_quantity')->default(0);
            $table->integer('units_quantity')->default(0);
            $table->integer('total_units_delta');
            $table->integer('previous_stock_units');
            $table->integer('new_stock_units');
            $table->string('reason', 255)->nullable();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('expenses');
    }
};`
    },
    {
      filename: 'app/Models/Product.php',
      category: 'model',
      description: 'Modelo Eloquent con cálculo de bultos/unidades y relaciones',
      code: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\SoftDeletes;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'sku', 'barcode', 'name', 'category', 'description',
        'units_per_package', 'package_label',
        'total_units_in_stock', 'min_stock_units',
        'cost_unit_usd', 'cost_package_usd',
        'price_unit_usd', 'price_package_usd',
        'is_active',
    ];

    protected $casts = [
        'units_per_package' => 'integer',
        'total_units_in_stock' => 'integer',
        'min_stock_units' => 'integer',
        'cost_unit_usd' => 'decimal:4',
        'cost_package_usd' => 'decimal:4',
        'price_unit_usd' => 'decimal:4',
        'price_package_usd' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    /**
     * Bultos completos disponibles en stock
     */
    public function getPackagesCountAttribute(): int
    {
        if ($this->units_per_package <= 0) return 0;
        return intdiv($this->total_units_in_stock, $this->units_per_package);
    }

    /**
     * Unidades sueltas restantes que no completan un bulto
     */
    public function getLooseUnitsAttribute(): int
    {
        if ($this->units_per_package <= 0) return 0;
        return $this->total_units_in_stock % $this->units_per_package;
    }

    /**
     * Indicador si requiere reposición por stock bajo
     */
    public function getIsLowStockAttribute(): bool
    {
        return $this->total_units_in_stock <= $this->min_stock_units;
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    /**
     * Scope para productos con alerta de stock bajo
     */
    public function scopeLowStock($query)
    {
        return $query->whereColumn('total_units_in_stock', '<=', 'min_stock_units');
    }
}`
    },
    {
      filename: 'app/Models/Sale.php',
      category: 'model',
      description: 'Modelo Eloquent para Facturación y Ventas',
      code: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;

class Sale extends Model
{
    protected $fillable = [
        'invoice_number', 'client_id', 'client_name', 'client_doc',
        'user_id', 'subtotal_usd', 'discount_usd', 'tax_percent',
        'tax_usd', 'total_usd', 'exchange_rate_applied', 'currency_symbol',
        'total_local_currency', 'payment_method', 'paid_amount_usd',
        'change_usd', 'status', 'notes', 'sale_date'
    ];

    protected $casts = [
        'subtotal_usd' => 'decimal:2',
        'total_usd' => 'decimal:2',
        'total_local_currency' => 'decimal:2',
        'exchange_rate_applied' => 'decimal:4',
        'sale_date' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}`
    },
    {
      filename: 'app/Http/Controllers/PosController.php',
      category: 'controller',
      description: 'Controlador transaccional para procesar venta y descontar stock por bulto/unidad',
      code: `<?php

namespace App\\Http\\Controllers;

use App\\Models\\Product;
use App\\Models\\Sale;
use App\\Models\\SaleItem;
use App\\Models\\InventoryMovement;
use App\\Models\\ExchangeRate;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Validation\\ValidationException;

class PosController extends Controller
{
    public function checkout(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'required|string|max:200',
            'client_doc' => 'nullable|string|max:50',
            'payment_method' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.unit_type' => 'required|in:unit,package',
            'items.*.quantity' => 'required|integer|min:1',
            'paid_amount_usd' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $currentRate = ExchangeRate::where('is_current', true)->value('rate') ?? 45.50;
            
            $subtotalUSD = 0;
            $itemsToCreate = [];
            
            // Generar correlativo único
            $lastInvoice = Sale::latest('id')->first();
            $nextNumber = $lastInvoice ? intval(substr($lastInvoice->invoice_number, 5)) + 1 : 1001;
            $invoiceNumber = 'FACT-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

            foreach ($validated['items'] as $itemData) {
                // Lock row for inventory integrity
                $product = Product::lockForUpdate()->find($itemData['product_id']);
                $quantity = $itemData['quantity'];
                $isPackage = $itemData['unit_type'] === 'package';
                
                // Calcular unidades equivalentes a descontar
                $unitsToDeduct = $isPackage ? ($quantity * $product->units_per_package) : $quantity;

                if ($product->total_units_in_stock < $unitsToDeduct) {
                    throw ValidationException::withMessages([
                        'items' => "Stock insuficiente para {$product->name}. Disponible: {$product->total_units_in_stock} unidades."
                    ]);
                }

                $unitPrice = $isPackage ? $product->price_package_usd : $product->price_unit_usd;
                $lineSubtotalUSD = $unitPrice * $quantity;
                $unitCost = $isPackage ? $product->cost_package_usd : $product->cost_unit_usd;
                $lineTotalCost = $unitCost * $quantity;
                $lineProfit = $lineSubtotalUSD - $lineTotalCost;

                $subtotalUSD += $lineSubtotalUSD;

                // Descontar inventario
                $prevStock = $product->total_units_in_stock;
                $product->decrement('total_units_in_stock', $unitsToDeduct);

                // Registrar auditoría de movimiento kardex
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'type' => 'venta',
                    'packages_quantity' => $isPackage ? $quantity : 0,
                    'units_quantity' => $isPackage ? 0 : $quantity,
                    'total_units_delta' => -$unitsToDeduct,
                    'previous_stock_units' => $prevStock,
                    'new_stock_units' => $product->total_units_in_stock,
                    'reason' => "Venta {$invoiceNumber}",
                    'user_id' => $request->user()?->id ?? 1,
                ]);

                $itemsToCreate[] = [
                    'product_id' => $product->id,
                    'product_sku' => $product->sku,
                    'product_name' => $product->name,
                    'unit_type' => $itemData['unit_type'],
                    'quantity' => $quantity,
                    'units_per_package' => $product->units_per_package,
                    'equivalent_units_deducted' => $unitsToDeduct,
                    'unit_price_usd' => $unitPrice,
                    'subtotal_usd' => $lineSubtotalUSD,
                    'subtotal_local' => $lineSubtotalUSD * $currentRate,
                    'unit_cost_usd' => $unitCost,
                    'total_cost_usd' => $lineTotalCost,
                    'profit_usd' => $lineProfit,
                ];
            }

            $taxRate = 0.16;
            $taxUSD = round($subtotalUSD * $taxRate, 2);
            $totalUSD = $subtotalUSD + $taxUSD;
            $totalLocal = round($totalUSD * $currentRate, 2);

            $sale = Sale::create([
                'invoice_number' => $invoiceNumber,
                'client_id' => $validated['client_id'] ?? null,
                'client_name' => $validated['client_name'],
                'client_doc' => $validated['client_doc'] ?? null,
                'user_id' => $request->user()?->id ?? 1,
                'subtotal_usd' => $subtotalUSD,
                'tax_percent' => 16.00,
                'tax_usd' => $taxUSD,
                'total_usd' => $totalUSD,
                'exchange_rate_applied' => $currentRate,
                'currency_symbol' => 'Bs.',
                'total_local_currency' => $totalLocal,
                'payment_method' => $validated['payment_method'],
                'paid_amount_usd' => $validated['paid_amount_usd'] ?? $totalUSD,
                'change_usd' => max(0, ($validated['paid_amount_usd'] ?? $totalUSD) - $totalUSD),
                'status' => 'completed',
                'sale_date' => now(),
            ]);

            $sale->items()->createMany($itemsToCreate);

            return response()->json([
                'success' => true,
                'sale' => $sale->load('items'),
                'message' => "Factura {$invoiceNumber} emitida con éxito"
            ], 201);
        });
    }
}`
    },
    {
      filename: 'database/schema.sql',
      category: 'sql',
      description: 'Script DDL completo para MySQL / MariaDB listo para phpMyAdmin / HeidiSQL',
      code: `-- ========================================================
-- InvBulto POS & ERP - Base de Datos MySQL / MariaDB
-- Generado para Arquitectura Laravel & PHP
-- ========================================================

CREATE DATABASE IF NOT EXISTS \`invbulto_erp\` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE \`invbulto_erp\`;

-- 1. Tabla de Usuarios y Roles
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(191) NOT NULL,
  \`username\` VARCHAR(100) NOT NULL UNIQUE,
  \`email\` VARCHAR(191) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('admin', 'gerente', 'cajero', 'almacen') NOT NULL DEFAULT 'cajero',
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`remember_token\` VARCHAR(100) NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabla de Clientes
CREATE TABLE IF NOT EXISTS \`clients\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(200) NOT NULL,
  \`doc_id\` VARCHAR(50) NOT NULL,
  \`phone\` VARCHAR(50) NULL,
  \`email\` VARCHAR(191) NULL,
  \`address\` TEXT NULL,
  \`credit_limit_usd\` DECIMAL(12,2) DEFAULT 0.00,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_clients_doc\` (\`doc_id\`)
) ENGINE=InnoDB;

-- 3. Tabla de Productos (Unidades y Bultos)
CREATE TABLE IF NOT EXISTS \`products\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`sku\` VARCHAR(64) NOT NULL UNIQUE,
  \`barcode\` VARCHAR(128) NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`description\` TEXT NULL,
  \`units_per_package\` INT UNSIGNED NOT NULL DEFAULT 12,
  \`package_label\` VARCHAR(50) NOT NULL DEFAULT 'Bulto',
  \`total_units_in_stock\` INT NOT NULL DEFAULT 0,
  \`min_stock_units\` INT UNSIGNED NOT NULL DEFAULT 20,
  \`cost_unit_usd\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  \`cost_package_usd\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  \`price_unit_usd\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  \`price_package_usd\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_prod_category\` (\`category\`),
  INDEX \`idx_prod_stock\` (\`total_units_in_stock\`),
  INDEX \`idx_prod_barcode\` (\`barcode\`)
) ENGINE=InnoDB;

-- 4. Tabla de Historial de Tasas de Cambio
CREATE TABLE IF NOT EXISTS \`exchange_rates\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`currency_code\` VARCHAR(10) NOT NULL DEFAULT 'VES',
  \`currency_symbol\` VARCHAR(10) NOT NULL DEFAULT 'Bs.',
  \`rate\` DECIMAL(14,4) NOT NULL,
  \`source_type\` ENUM('auto_api', 'manual') NOT NULL DEFAULT 'auto_api',
  \`rate_date\` DATE NOT NULL,
  \`is_current\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_rate_current\` (\`is_current\`)
) ENGINE=InnoDB;

-- 5. Tabla de Ventas (Facturas)
CREATE TABLE IF NOT EXISTS \`sales\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`invoice_number\` VARCHAR(50) NOT NULL UNIQUE,
  \`client_id\` BIGINT UNSIGNED NULL,
  \`client_name\` VARCHAR(200) NOT NULL,
  \`client_doc\` VARCHAR(50) NULL,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`subtotal_usd\` DECIMAL(12,2) NOT NULL,
  \`discount_usd\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  \`tax_percent\` DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  \`tax_usd\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  \`total_usd\` DECIMAL(12,2) NOT NULL,
  \`exchange_rate_applied\` DECIMAL(14,4) NOT NULL,
  \`currency_symbol\` VARCHAR(10) NOT NULL DEFAULT 'Bs.',
  \`total_local_currency\` DECIMAL(16,2) NOT NULL,
  \`payment_method\` VARCHAR(50) NOT NULL,
  \`paid_amount_usd\` DECIMAL(12,2) NULL,
  \`change_usd\` DECIMAL(12,2) NULL,
  \`status\` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  \`sale_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE SET NULL,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`),
  INDEX \`idx_sales_date\` (\`sale_date\`)
) ENGINE=InnoDB;

-- 6. Tabla de Detalles de Venta (Renglones)
CREATE TABLE IF NOT EXISTS \`sale_items\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`sale_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`product_sku\` VARCHAR(64) NOT NULL,
  \`product_name\` VARCHAR(255) NOT NULL,
  \`unit_type\` ENUM('unit', 'package') NOT NULL,
  \`quantity\` INT UNSIGNED NOT NULL,
  \`units_per_package\` INT UNSIGNED NOT NULL,
  \`equivalent_units_deducted\` INT UNSIGNED NOT NULL,
  \`unit_price_usd\` DECIMAL(12,4) NOT NULL,
  \`subtotal_usd\` DECIMAL(12,2) NOT NULL,
  \`subtotal_local\` DECIMAL(16,2) NOT NULL,
  \`unit_cost_usd\` DECIMAL(12,4) NOT NULL,
  \`total_cost_usd\` DECIMAL(12,2) NOT NULL,
  \`profit_usd\` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`),
  INDEX \`idx_item_product\` (\`product_id\`)
) ENGINE=InnoDB;

-- 7. Tabla de Gastos Operativos
CREATE TABLE IF NOT EXISTS \`expenses\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`expense_date\` DATE NOT NULL,
  \`category\` VARCHAR(60) NOT NULL,
  \`description\` VARCHAR(255) NOT NULL,
  \`amount_usd\` DECIMAL(12,2) NOT NULL,
  \`amount_local\` DECIMAL(16,2) NOT NULL,
  \`exchange_rate\` DECIMAL(14,4) NOT NULL,
  \`payment_method\` VARCHAR(50) NOT NULL,
  \`reference_number\` VARCHAR(100) NULL,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`),
  INDEX \`idx_expense_date\` (\`expense_date\`),
  INDEX \`idx_expense_category\` (\`category\`)
) ENGINE=InnoDB;

-- 8. Tabla de Movimientos de Inventario (Kardex)
CREATE TABLE IF NOT EXISTS \`inventory_movements\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`type\` ENUM('recepcion_bulto', 'recepcion_unidad', 'venta', 'ajuste_positivo', 'ajuste_negativo', 'merma') NOT NULL,
  \`packages_quantity\` INT NOT NULL DEFAULT 0,
  \`units_quantity\` INT NOT NULL DEFAULT 0,
  \`total_units_delta\` INT NOT NULL,
  \`previous_stock_units\` INT NOT NULL,
  \`new_stock_units\` INT NOT NULL,
  \`reason\` VARCHAR(255) NULL,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`),
  INDEX \`idx_movements_prod\` (\`product_id\`)
) ENGINE=InnoDB;

-- 9. Tabla de Facturas de Compra (Proveedores)
CREATE TABLE IF NOT EXISTS \`purchases\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`invoice_number\` VARCHAR(60) NOT NULL UNIQUE,
  \`supplier_name\` VARCHAR(200) NOT NULL,
  \`supplier_doc\` VARCHAR(50) NOT NULL,
  \`supplier_phone\` VARCHAR(50) NULL,
  \`supplier_address\` TEXT NULL,
  \`subtotal_usd\` DECIMAL(12,2) NOT NULL,
  \`tax_percent\` DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  \`tax_usd\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  \`total_usd\` DECIMAL(12,2) NOT NULL,
  \`exchange_rate_applied\` DECIMAL(14,4) NOT NULL,
  \`currency_symbol\` VARCHAR(10) NOT NULL DEFAULT 'Bs.',
  \`total_local_currency\` DECIMAL(16,2) NOT NULL,
  \`payment_method\` VARCHAR(50) NOT NULL,
  \`notes\` TEXT NULL,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`purchase_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`),
  INDEX \`idx_purchases_supplier\` (\`supplier_name\`),
  INDEX \`idx_purchases_date\` (\`purchase_date\`)
) ENGINE=InnoDB;

-- 10. Tabla de Detalles de Factura de Compra
CREATE TABLE IF NOT EXISTS \`purchase_items\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`purchase_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`product_sku\` VARCHAR(64) NOT NULL,
  \`product_name\` VARCHAR(255) NOT NULL,
  \`packages_count\` INT UNSIGNED NOT NULL,
  \`units_per_package\` INT UNSIGNED NOT NULL,
  \`loose_units\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`total_units_received\` INT UNSIGNED NOT NULL,
  \`cost_package_usd\` DECIMAL(12,4) NOT NULL,
  \`calculated_cost_unit_usd\` DECIMAL(12,4) NOT NULL,
  \`tax_percent\` DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  \`subtotal_usd\` DECIMAL(12,2) NOT NULL,
  \`tax_usd\` DECIMAL(12,2) NOT NULL,
  \`total_usd\` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (\`purchase_id\`) REFERENCES \`purchases\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`),
  INDEX \`idx_pur_item_prod\` (\`product_id\`)
) ENGINE=InnoDB;`
    }
  ];
};

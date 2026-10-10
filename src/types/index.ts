export type UserRole = 'admin' | 'gerente' | 'cajero' | 'almacen';

export interface UserPermission {
  canAccessPos: boolean;
  canManageInventory: boolean;
  canManagePurchases: boolean;
  canManageClients: boolean;
  canManageFinances: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canChangeSettings: boolean;
  canViewLaravelArchitecture: boolean;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  packagesCount: number; // Cantidad de bultos comprados
  unitsPerPackage: number; // Unidades por bulto (ej: 20 un)
  looseUnits: number; // Unidades adicionales sueltas
  totalUnitsReceived: number; // Total unidades ingresadas al stock
  costPackageUSD: number; // Precio de compra por bulto
  calculatedCostUnitUSD: number; // Calculado automáticamente: costPackageUSD / unitsPerPackage
  newPriceUnitUSD?: number; // Precio de venta unitario actualizado
  newPricePackageUSD?: number; // Precio de venta por bulto actualizado
  taxPercent: number; // % IVA de compra
  subtotalUSD: number;
  taxUSD: number;
  totalUSD: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string; // N° de factura del proveedor
  supplierName: string;
  supplierDoc: string; // RIF, NIT, RFC
  supplierPhone?: string;
  supplierAddress?: string;
  date: string; // Fecha de emisión
  items: PurchaseItem[];
  subtotalUSD: number;
  taxUSD: number;
  taxPercent: number;
  totalUSD: number;
  exchangeRate: number; // Tasa aplicada
  totalLocal: number;
  currencySymbol: string;
  currencyName: string;
  paymentMethod: string;
  notes?: string;
  registeredBy: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  active: boolean;
  avatar?: string;
}

export interface DatabaseConfig {
  engine: 'mysql' | 'postgresql' | 'sqlite' | 'mariadb';
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  connectedAt?: string;
  tablesCount?: number;
  status: 'connected' | 'disconnected' | 'error';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  description?: string;
  // Bulto & Unidad configuration
  unitsPerPackage: number; // e.g. 12 or 24 units per bulto/caja
  packageLabel: string; // e.g. "Bulto", "Caja", "Fardo", "Pack"
  totalUnitsInStock: number; // Single source of truth for stock
  minStockUnits: number; // Threshold for low stock warning
  costUnitUSD: number; // Unit purchase cost
  costPackageUSD: number; // Bulk purchase cost (usually costUnitUSD * unitsPerPackage)
  priceUnitUSD: number; // Selling price per unit
  pricePackageUSD: number; // Selling price per bulk package (with wholesale incentive)
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  docId: string; // Cédula, RIF, NIT, DNI
  phone: string;
  email: string;
  address: string;
  totalPurchasesUSD: number;
  totalOrders: number;
  createdAt: string;
}

export type PaymentMethod = 
  | 'efectivo_usd'
  | 'efectivo_local'
  | 'pago_movil'
  | 'tarjeta'
  | 'transferencia'
  | 'mixto';

export interface CartItem {
  product: Product;
  unitType: 'unit' | 'package'; // Whether sold by individual unit or whole package
  quantity: number; // Amount of units or packages
  customPriceUSD?: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  unitType: 'unit' | 'package';
  quantity: number; // Number of units or packages purchased
  unitsPerPackage: number;
  equivalentUnits: number; // Total units deducted from stock
  unitPriceUSD: number;
  unitPriceLocal: number;
  subtotalUSD: number;
  subtotalLocal: number;
  unitCostUSD: number;
  totalCostUSD: number;
  profitUSD: number;
}

export interface PaymentBreakdown {
  id: string;
  method: PaymentMethod;
  amountUSD: number;
  amountLocal: number;
  currency: 'USD' | 'LOCAL';
  amountInput?: number;
  reference?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string; // e.g. "FACT-00101"
  date: string; // ISO string
  clientId?: string;
  clientName: string;
  clientDoc: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  items: SaleItem[];
  subtotalUSD: number;
  discountUSD: number;
  taxPercent: number;
  taxUSD: number;
  totalUSD: number;
  exchangeRate: number; // Applied conversion rate
  totalLocal: number;
  currencySymbol: string;
  currencyName: string;
  paymentMethod: PaymentMethod;
  payments?: PaymentBreakdown[];
  amountPaidUSD?: number;
  amountPaidLocal?: number;
  changeUSD?: number;
  changeLocal?: number;
  referenceNotes?: string;
  status: 'completada' | 'anulada';
}

export type ExpenseCategory = 
  | 'alquiler'
  | 'servicios'
  | 'nomina'
  | 'fletes'
  | 'mantenimiento'
  | 'suministros'
  | 'impuestos'
  | 'otros';

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amountUSD: number;
  amountLocal: number;
  exchangeRate: number;
  paymentMethod: string;
  reference?: string;
  registeredBy: string;
}

export interface InventoryMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: 'recepcion_bulto' | 'recepcion_unidad' | 'venta' | 'ajuste_positivo' | 'ajuste_negativo' | 'merma';
  quantityPackages: number;
  quantityUnits: number;
  totalUnitsDelta: number;
  previousUnits: number;
  newUnits: number;
  reason: string;
  registeredBy: string;
}

export interface ExchangeRateConfig {
  rate: number; // e.g. 45.20 Bs or local currency per 1 USD
  currencyName: string; // e.g. "Bolívares"
  currencySymbol: string; // e.g. "Bs."
  lastUpdated: string;
  mode: 'auto' | 'manual';
  history: {
    date: string;
    rate: number;
    source: string;
  }[];
}

export interface StoreSettings {
  companyName: string;
  companyDoc: string; // RIF / NIT / Cédula
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  taxRatePercent: number; // e.g. 16%
  currencySymbol: string;
  currencyName: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  receiptFooterMessage: string;
}

export type LogoIconType = 'Package' | 'Layers' | 'Store' | 'Boxes' | 'ShoppingBag' | 'Building2' | 'Barcode' | 'Truck';

export interface BrandingConfig {
  brandName: string;
  brandTagline: string;
  logoType: 'icon' | 'image';
  logoUrl?: string; // Base64 or uploaded image URL
  logoIcon: LogoIconType;
  barTheme: 'slate' | 'emerald' | 'indigo' | 'zinc' | 'navy' | 'wine' | 'teal' | 'custom';
  barBgColor: string; // Hex color for navbar and header
  barTextColor: string; // Hex color for text
  sidebarTheme: 'dark' | 'light' | 'match_bar';
  accentColor: 'emerald' | 'indigo' | 'blue' | 'purple' | 'amber' | 'rose';
  isSidebarCollapsed: boolean;
}

// ==========================================
// SEÑALES DE ERRORES Y DIAGNÓSTICO DEL SISTEMA
// ==========================================

export type SystemErrorType =
  | 'table_generation_error'    // No se generó una tabla en la base de datos
  | 'unfilled_field_error'      // No se rellenó un campo obligatorio
  | 'database_connection_error' // No se conectó a la base de datos
  | 'database_sync_error'       // Error en sincronización o persistencia
  | 'system_validation_error';  // Error general de validación

export interface SystemAlert {
  id: string;
  type: SystemErrorType;
  title: string;
  message: string;
  detail?: string;
  fieldName?: string;
  tableName?: string;
  timestamp: string;
  severity: 'error' | 'warning' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

export interface TableHealthStatus {
  name: string;
  exists: boolean;
  rowCount: number;
  description: string;
  status: 'ok' | 'missing' | 'error';
  errorMessage?: string;
}

export interface DatabaseDiagnostics {
  isConnected: boolean;
  engine: string;
  server: string;
  databaseName: string;
  totalExpectedTables: number;
  generatedTablesCount: number;
  missingTables: string[];
  tables: TableHealthStatus[];
  lastDiagnosticTime: string;
  status: 'healthy' | 'degraded' | 'error';
  connectionError?: string;
}

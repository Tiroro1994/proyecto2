import { Product, Client, User, Expense, Sale, StoreSettings, ExchangeRateConfig, BrandingConfig, PurchaseInvoice } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    name: 'Administrador del Sistema',
    username: 'admin',
    email: 'admin@sistema.com',
    password: 'admin',
    role: 'admin',
    active: true,
  }
];

export const INITIAL_BRANDING: BrandingConfig = {
  brandName: 'InvBulto POS',
  brandTagline: 'Control de Inventario & ERP Mayorista',
  logoType: 'icon',
  logoIcon: 'Boxes',
  barTheme: 'slate',
  barBgColor: '#0f172a',
  barTextColor: '#ffffff',
  sidebarTheme: 'match_bar',
  accentColor: 'emerald',
  isSidebarCollapsed: false,
};

export const INITIAL_SETTINGS: StoreSettings = {
  companyName: 'Mi Empresa C.A.',
  companyDoc: 'J-00000000-0',
  companyPhone: '',
  companyEmail: 'contacto@empresa.com',
  companyAddress: '',
  taxRatePercent: 16,
  currencySymbol: 'Bs.',
  currencyName: 'Bolívares',
  invoicePrefix: 'FACT-',
  nextInvoiceNumber: 1,
  receiptFooterMessage: '¡Gracias por su compra!',
};

export const INITIAL_EXCHANGE_RATE: ExchangeRateConfig = {
  rate: 45.20,
  currencyName: 'Bolívares',
  currencySymbol: 'Bs.',
  lastUpdated: new Date().toISOString(),
  mode: 'manual',
  history: [],
};

// Inventario limpio sin datos de prueba
export const INITIAL_PRODUCTS: Product[] = [];

// Directorio de clientes limpio
export const INITIAL_CLIENTS: Client[] = [];

// Gastos operativos limpios
export const INITIAL_EXPENSES: Expense[] = [];

// Ventas y facturación limpia
export const INITIAL_SALES: Sale[] = [];

// Compras de proveedores limpias
export const INITIAL_PURCHASES: PurchaseInvoice[] = [];

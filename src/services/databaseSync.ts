/**
 * Servicio de Sincronización Bidireccional con Base de Datos MySQL (XAMPP / Apache)
 * InvBulto POS - ERP Mayorista
 */

import {
  Product,
  Sale,
  Expense,
  Client,
  PurchaseInvoice,
  DatabaseConfig,
  User,
  DatabaseDiagnostics,
  TableHealthStatus,
  InventoryMovement,
  StoreSettings,
} from '../types';

// Determinar URL base de la API PHP
const getApiUrl = (action: string) => {
  return `./api/db.php?action=${action}`;
};

export interface DbStatusResult {
  isOnline: boolean;
  database?: string;
  server?: string;
  error?: string;
}

export const checkDatabaseDiagnostics = async (config?: DatabaseConfig): Promise<DatabaseDiagnostics> => {
  const defaultTables: TableHealthStatus[] = [
    { name: 'users', exists: true, rowCount: 1, description: 'Usuarios y Credenciales RBAC', status: 'ok' },
    { name: 'store_settings', exists: true, rowCount: 1, description: 'Configuración Fiscal y Tasa', status: 'ok' },
    { name: 'products', exists: true, rowCount: 0, description: 'Catálogo de Productos por Bulto y Unidad', status: 'ok' },
    { name: 'clients', exists: true, rowCount: 0, description: 'Directorio de Clientes', status: 'ok' },
    { name: 'sales', exists: true, rowCount: 0, description: 'Facturación y Ventas Registradas', status: 'ok' },
    { name: 'sale_items', exists: true, rowCount: 0, description: 'Detalle de Renglones de Venta', status: 'ok' },
    { name: 'purchases', exists: true, rowCount: 0, description: 'Facturas de Compras a Proveedores', status: 'ok' },
    { name: 'purchase_items', exists: true, rowCount: 0, description: 'Detalle de Renglones de Compra', status: 'ok' },
    { name: 'expenses', exists: true, rowCount: 0, description: 'Control de Gastos y Egresos', status: 'ok' },
    { name: 'inventory_movements', exists: true, rowCount: 0, description: 'Kárdex de Movimientos de Inventario', status: 'ok' },
    { name: 'exchange_rate_history', exists: true, rowCount: 1, description: 'Historial de Variación de Tasa Cambiaria', status: 'ok' },
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(getApiUrl('diagnostics'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.connected && data.tables) {
        return {
          isConnected: true,
          engine: data.engine || 'mysql',
          server: data.server || `${config?.host || '127.0.0.1'}:${config?.port || 3306}`,
          databaseName: data.database || config?.database || 'invbulto_db',
          totalExpectedTables: data.totalExpectedTables || 11,
          generatedTablesCount: data.generatedTablesCount || data.tables.length,
          missingTables: data.missingTables || [],
          tables: data.tables,
          lastDiagnosticTime: new Date().toLocaleTimeString(),
          status: data.status || (data.missingTables?.length === 0 ? 'healthy' : 'degraded'),
        };
      } else {
        return {
          isConnected: false,
          engine: 'mysql',
          server: `${config?.host || '127.0.0.1'}:${config?.port || 3306}`,
          databaseName: config?.database || 'invbulto_db',
          totalExpectedTables: 11,
          generatedTablesCount: 0,
          missingTables: defaultTables.map(t => t.name),
          tables: defaultTables.map(t => ({ ...t, exists: false, rowCount: 0, status: 'missing' })),
          lastDiagnosticTime: new Date().toLocaleTimeString(),
          status: 'error',
          connectionError: data.error || 'No se pudo conectar a MySQL en XAMPP',
        };
      }
    }

    return {
      isConnected: false,
      engine: config?.engine || 'mysql',
      server: `${config?.host || '127.0.0.1'}:${config?.port || 3306}`,
      databaseName: config?.database || 'invbulto_db',
      totalExpectedTables: 11,
      generatedTablesCount: 0,
      missingTables: defaultTables.map(t => t.name),
      tables: defaultTables.map(t => ({ ...t, exists: false, rowCount: 0, status: 'missing' })),
      lastDiagnosticTime: new Date().toLocaleTimeString(),
      status: 'error',
      connectionError: `Respuesta de servidor HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      isConnected: false,
      engine: config?.engine || 'mysql',
      server: `${config?.host || '127.0.0.1'}:${config?.port || 3306}`,
      databaseName: config?.database || 'invbulto_db',
      totalExpectedTables: 11,
      generatedTablesCount: 0,
      missingTables: defaultTables.map(t => t.name),
      tables: defaultTables.map(t => ({ ...t, exists: false, rowCount: 0, status: 'missing' })),
      lastDiagnosticTime: new Date().toLocaleTimeString(),
      status: 'error',
      connectionError: 'No se conectó al servidor de base de datos MySQL (puerto 3306 apagado o no alcanzable)',
    };
  }
};

export const repairDatabaseTables = async (config?: DatabaseConfig): Promise<{ success: boolean; message: string; tables?: any[] }> => {
  try {
    const res = await fetch(getApiUrl('repair_tables'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    if (res.ok) {
      const json = await res.json();
      return {
        success: json.success,
        message: json.message || (json.success ? 'Tablas generadas con éxito.' : json.error),
        tables: json.tables,
      };
    }
    return {
      success: false,
      message: 'No se pudo contactar al servidor PHP para reparar las tablas.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Error al ejecutar reparación de tablas.',
    };
  }
};

export const checkDatabaseLiveStatus = async (config?: DatabaseConfig): Promise<DbStatusResult> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(getApiUrl('status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isOnline: data.success === true,
        database: data.database,
        server: data.server,
      };
    }
    return { isOnline: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { isOnline: false, error: err?.message || 'Servidor PHP / MySQL no disponible' };
  }
};

export const fetchAllFromDatabase = async (config?: DatabaseConfig) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(getApiUrl('get_all'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data };
      }
    }
    return { success: false };
  } catch {
    return { success: false };
  }
};

export const syncExpenseToDatabase = async (expense: Expense, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('save_expense'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expense, ...(config || {}) }),
    });
  } catch {
    // Si no está en XAMPP, la persistencia en LocalStorage se mantiene activa
  }
};

export const deleteExpenseFromDatabase = async (id: string, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('delete_expense'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const syncSaleToDatabase = async (sale: Sale, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('save_sale'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const syncProductToDatabase = async (product: Product, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('save_product'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const deleteProductFromDatabase = async (id: string, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('delete_product'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const syncUserToDatabase = async (user: User, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('save_user'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const deleteUserFromDatabase = async (id: string, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('delete_user'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const syncClientToDatabase = async (client: Client, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('save_client'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const deleteClientFromDatabase = async (id: string, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('delete_client'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const syncPurchaseToDatabase = async (purchase: PurchaseInvoice, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('save_purchase'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchase, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const syncMovementToDatabase = async (movement: InventoryMovement, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('save_movement'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movement, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

export const syncSettingsToDatabase = async (settings: Partial<StoreSettings>, config?: DatabaseConfig) => {
  try {
    await fetch(getApiUrl('save_settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, ...(config || {}) }),
    });
  } catch {
    // Modo local fallback
  }
};

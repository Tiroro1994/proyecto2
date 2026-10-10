import { Sale, Product, Expense, StoreSettings, PurchaseInvoice } from '../types';

export const exportSalesToExcel = (sales: Sale[], settings: StoreSettings) => {
  const headers = [
    'N° Factura',
    'Fecha',
    'Hora',
    'Cliente',
    'Doc. Identidad',
    'Cajero',
    'Método de Pago',
    'Tasa de Cambio',
    'Subtotal USD',
    'Impuesto USD',
    'Total USD',
    `Total (${settings.currencySymbol})`,
    'Estado'
  ];

  const rows = sales.map(s => {
    const d = new Date(s.date);
    return [
      s.invoiceNumber,
      d.toLocaleDateString('es-ES'),
      d.toLocaleTimeString('es-ES'),
      `"${s.clientName.replace(/"/g, '""')}"`,
      `"${s.clientDoc}"`,
      `"${s.userName}"`,
      `"${s.paymentMethod}"`,
      s.exchangeRate.toFixed(2),
      s.subtotalUSD.toFixed(2),
      s.taxUSD.toFixed(2),
      s.totalUSD.toFixed(2),
      s.totalLocal.toFixed(2),
      s.status
    ];
  });

  const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  downloadBlob(csvContent, `Ventas_${settings.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
};

export const exportInventoryToCSV = (
  products: Product[],
  exchangeRate: number,
  settings: StoreSettings,
  filterDescription?: string
) => {
  const headers = [
    'Código SKU',
    'Código de Barras',
    'Nombre del Producto',
    'Categoría',
    'Tipo Presentación',
    'Unidades por Bulto',
    'Existencias por Bulto (Bultos Completos)',
    'Existencias por Unidad (Unidades Sueltas)',
    'Existencias Totales (Unidades)',
    'Precio por Unidad (USD)',
    `Precio por Unidad (${settings.currencySymbol})`,
    'Precio por Bulto (USD)',
    `Precio por Bulto (${settings.currencySymbol})`,
    'Costo por Unidad (USD)',
    'Costo por Bulto (USD)',
    'Stock Mínimo Alerta (Unidades)',
    'Estado de Stock',
    'Valorización Total Costo (USD)',
    'Valorización Total Venta (USD)',
    `Valorización Total Venta (${settings.currencySymbol})`
  ];

  let totalPackagesAll = 0;
  let totalLooseAll = 0;
  let totalUnitsAll = 0;
  let sumCostValUSD = 0;
  let sumSaleValUSD = 0;

  const rows = products.map(p => {
    const packages = Math.floor(p.totalUnitsInStock / p.unitsPerPackage);
    const loose = p.totalUnitsInStock % p.unitsPerPackage;
    totalPackagesAll += packages;
    totalLooseAll += loose;
    totalUnitsAll += p.totalUnitsInStock;

    const totalCostVal = p.totalUnitsInStock * p.costUnitUSD;
    const totalSaleVal = p.totalUnitsInStock * p.priceUnitUSD;
    sumCostValUSD += totalCostVal;
    sumSaleValUSD += totalSaleVal;

    let statusLabel = 'Stock Óptimo';
    if (p.totalUnitsInStock <= 0) {
      statusLabel = 'Agotado (0 existencias)';
    } else if (p.totalUnitsInStock <= p.minStockUnits) {
      statusLabel = 'Stock Bajo (Reposición Requerida)';
    }

    return [
      `"${p.sku}"`,
      `"${p.barcode || ''}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.packageLabel}"`,
      p.unitsPerPackage,
      packages,
      loose,
      p.totalUnitsInStock,
      p.priceUnitUSD.toFixed(2),
      (p.priceUnitUSD * exchangeRate).toFixed(2),
      p.pricePackageUSD.toFixed(2),
      (p.pricePackageUSD * exchangeRate).toFixed(2),
      p.costUnitUSD.toFixed(2),
      p.costPackageUSD.toFixed(2),
      p.minStockUnits,
      `"${statusLabel}"`,
      totalCostVal.toFixed(2),
      totalSaleVal.toFixed(2),
      (totalSaleVal * exchangeRate).toFixed(2)
    ];
  });

  // Summary Row at the end
  const summaryRow = [
    '"--- TOTALES GENERALES ---"',
    '""',
    `"Total Productos: ${products.length}"`,
    '""',
    '""',
    '""',
    totalPackagesAll,
    totalLooseAll,
    totalUnitsAll,
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    sumCostValUSD.toFixed(2),
    sumSaleValUSD.toFixed(2),
    (sumSaleValUSD * exchangeRate).toFixed(2)
  ];

  const metaHeader = [
    `"REPORTE DE INVENTARIO - ${settings.companyName.replace(/"/g, '""')}"`,
    `"Fecha de Generación: ${new Date().toLocaleString('es-ES')}"`,
    `"Tasa de Cambio Oficial: 1 USD = ${exchangeRate.toFixed(2)} ${settings.currencySymbol}"`,
    filterDescription ? `"Filtro Aplicado: ${filterDescription.replace(/"/g, '""')}"` : '""',
    '""'
  ].filter(Boolean).join('\r\n');

  const csvContent = metaHeader + '\r\n' + [headers.join(';'), ...rows.map(r => r.join(';')), summaryRow.join(';')].join('\r\n');
  const fileDate = new Date().toISOString().slice(0, 10);
  downloadBlob(csvContent, `Inventario_Bultos_Unidades_${fileDate}.csv`);
};

// Backward-compatible alias
export const exportInventoryToExcel = exportInventoryToCSV;

export const exportFinancesToExcel = (sales: Sale[], expenses: Expense[], settings: StoreSettings) => {
  const grossSalesUSD = sales.reduce((acc, s) => acc + s.subtotalUSD, 0);
  const cogsUSD = sales.reduce((acc, s) => acc + s.items.reduce((sum, item) => sum + (item.totalCostUSD || 0), 0), 0);
  const grossProfitUSD = grossSalesUSD - cogsUSD;
  const totalExpensesUSD = expenses.reduce((acc, e) => acc + e.amountUSD, 0);
  const netProfitUSD = grossProfitUSD - totalExpensesUSD;

  const summaryRows = [
    'RESUMEN FINANCIERO;MONTO USD;OBSERVACIONES',
    `Ventas Brutas;$${grossSalesUSD.toFixed(2)};Total ingresos por facturas`,
    `Costo de Mercancía (COGS);-$${cogsUSD.toFixed(2)};Costo de adquisición de productos vendidos`,
    `Utilidad Bruta;$${grossProfitUSD.toFixed(2)};Margen antes de gastos operativos`,
    `Gastos Operativos;-$${totalExpensesUSD.toFixed(2)};Alquiler, nómina, fletes, etc.`,
    `Beneficio Neto Limpio;$${netProfitUSD.toFixed(2)};${netProfitUSD >= 0 ? 'Ganancia neta' : 'Pérdida'}`,
    '',
    'REGISTRO DE GASTOS OPERATIVOS',
    'ID;Fecha;Categoría;Descripción;Método de Pago;Monto USD;Monto Local;Registrado Por'
  ];

  const expenseRows = expenses.map(e => [
    e.id,
    e.date,
    `"${e.category.toUpperCase()}"`,
    `"${e.description.replace(/"/g, '""')}"`,
    `"${e.paymentMethod}"`,
    e.amountUSD.toFixed(2),
    e.amountLocal.toFixed(2),
    `"${e.registeredBy}"`
  ].join(';'));

  const fullContent = [...summaryRows, ...expenseRows].join('\r\n');
  downloadBlob(fullContent, `Gastos_y_Beneficios_${new Date().toISOString().slice(0, 10)}.csv`);
};

export const exportPurchasesToExcel = (purchases: PurchaseInvoice[], settings: StoreSettings) => {
  const headers = [
    'N° Factura Proveedor',
    'Fecha',
    'Proveedor',
    'RIF/NIT',
    'Renglones Comprados',
    'Método de Pago',
    'Tasa de Cambio',
    'Subtotal USD',
    'IVA Compra USD',
    'Total USD',
    `Total (${settings.currencySymbol})`,
    'Registrado Por'
  ];

  const rows = purchases.map(p => {
    const d = new Date(p.date);
    return [
      `"${p.invoiceNumber}"`,
      d.toLocaleDateString('es-ES'),
      `"${p.supplierName.replace(/"/g, '""')}"`,
      `"${p.supplierDoc}"`,
      p.items.length,
      `"${p.paymentMethod}"`,
      p.exchangeRate.toFixed(2),
      p.subtotalUSD.toFixed(2),
      p.taxUSD.toFixed(2),
      p.totalUSD.toFixed(2),
      p.totalLocal.toFixed(2),
      `"${p.registeredBy}"`
    ];
  });

  const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  downloadBlob(csvContent, `Facturas_Compras_${new Date().toISOString().slice(0, 10)}.csv`);
};

function downloadBlob(content: string, filename: string) {
  // UTF-8 BOM to ensure Excel opens special characters correctly
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

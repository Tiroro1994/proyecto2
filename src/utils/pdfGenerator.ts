import { jsPDF } from 'jspdf';
import { Sale, Product, Expense, StoreSettings, PurchaseInvoice } from '../types';

export const generateInvoicePDF = (sale: Sale, settings: StoreSettings) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Background bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`RIF/NIT: ${settings.companyDoc} · Tel: ${settings.companyPhone} · ${settings.companyEmail}`, 14, 19);

  y = 36;
  doc.setTextColor(15, 23, 42);

  // Invoice Title and Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FACTURA COMERCIAL / COMPROBANTE', 14, y);

  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(sale.invoiceNumber, pageWidth - 14, y, { align: 'right' });

  y += 7;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);

  y += 6;
  // Metadata Section (2 columns)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('DATOS DEL CLIENTE:', 14, y);
  doc.text('DATOS DE LA EMISIÓN:', pageWidth / 2 + 10, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text(`Nombre / Razón: ${sale.clientName}`, 14, y);
  doc.text(`Fecha y Hora: ${new Date(sale.date).toLocaleString('es-ES')}`, pageWidth / 2 + 10, y);

  y += 4.5;
  doc.text(`Doc. Identidad: ${sale.clientDoc || 'Consumidor Final'}`, 14, y);
  doc.text(`Cajero / Usuario: ${sale.userName}`, pageWidth / 2 + 10, y);

  y += 4.5;
  doc.text(`Método de Pago: ${formatPaymentMethod(sale.paymentMethod)}`, 14, y);
  doc.text(`Tasa Oficial de Cambio: 1 USD = ${sale.exchangeRate.toFixed(2)} ${sale.currencySymbol}`, pageWidth / 2 + 10, y);

  y += 8;
  // Table Header
  const tableX = 14;
  const colWidths = [18, 65, 24, 25, 25, 25]; // SKU, Descripción, Tipo/Cant, P.Unit USD, Total USD, Total Local
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(tableX, y, pageWidth - 28, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  let currentX = tableX + 2;
  doc.text('CÓDIGO', currentX, y + 5.5);
  currentX += colWidths[0];
  doc.text('DESCRIPCIÓN', currentX, y + 5.5);
  currentX += colWidths[1];
  doc.text('PRESENTACIÓN', currentX, y + 5.5);
  currentX += colWidths[2];
  doc.text('P.UNIT ($)', currentX, y + 5.5);
  currentX += colWidths[3];
  doc.text('TOTAL ($)', currentX, y + 5.5);
  currentX += colWidths[4];
  doc.text(`TOTAL (${sale.currencySymbol})`, currentX, y + 5.5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  // Table Rows
  sale.items.forEach((item, index) => {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y - 3, pageWidth - 28, 6.5, 'F');
    }

    const typeLabel = item.unitType === 'package' 
      ? `${item.quantity} Bulto(s) [x${item.unitsPerPackage}]` 
      : `${item.quantity} Unidad(es)`;

    let rowX = tableX + 2;
    doc.text(item.sku.substring(0, 10), rowX, y + 1.5);
    rowX += colWidths[0];
    doc.text(item.productName.substring(0, 36), rowX, y + 1.5);
    rowX += colWidths[1];
    doc.text(typeLabel, rowX, y + 1.5);
    rowX += colWidths[2];
    doc.text(`$${item.unitPriceUSD.toFixed(2)}`, rowX, y + 1.5);
    rowX += colWidths[3];
    doc.text(`$${item.subtotalUSD.toFixed(2)}`, rowX, y + 1.5);
    rowX += colWidths[4];
    doc.text(`${item.subtotalLocal.toFixed(2)}`, rowX, y + 1.5);

    y += 6.5;
  });

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(tableX, y, pageWidth - 14, y);

  // Totals Box
  y += 5;
  const totalsBoxX = pageWidth - 90;

  // Payments Box on the left of Totals Box
  if (sale.payments && sale.payments.length > 0) {
    const payBoxWidth = totalsBoxX - tableX - 6;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(tableX, y, payBoxWidth, 38, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(tableX, y, payBoxWidth, 38, 2, 2, 'D');

    let pY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`DESGLOSE DE PAGO (${sale.payments.length > 1 ? 'PAGO MIXTO' : 'FORMA DE PAGO'}):`, tableX + 3, pY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    sale.payments.slice(0, 4).forEach((p) => {
      pY += 4.5;
      const refText = p.reference ? ` (Ref: ${p.reference})` : '';
      const methodLabel = p.method === 'efectivo_usd' ? 'Efectivo Divisas' :
                          p.method === 'pago_movil' ? 'Pago Móvil' :
                          p.method === 'tarjeta' ? 'Punto de Venta' :
                          p.method === 'efectivo_local' ? 'Efectivo Local' :
                          p.method === 'transferencia' ? 'Transferencia' : p.method;
      doc.text(`• ${methodLabel}: $${p.amountUSD.toFixed(2)} (${p.amountLocal.toFixed(2)} ${sale.currencySymbol})${refText}`, tableX + 3, pY);
    });

    if (sale.changeUSD && sale.changeUSD > 0) {
      pY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`• Vuelto: $${sale.changeUSD.toFixed(2)} USD (${(sale.changeLocal || sale.changeUSD * sale.exchangeRate).toFixed(2)} ${sale.currencySymbol})`, tableX + 3, pY);
    }
  }

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsBoxX, y, 76, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsBoxX, y, 76, 38, 2, 2, 'D');

  let totalY = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', totalsBoxX + 4, totalY);
  doc.text(`$${sale.subtotalUSD.toFixed(2)} USD`, totalsBoxX + 72, totalY, { align: 'right' });

  totalY += 5;
  doc.text(`Impuesto IVA (${sale.taxPercent}%):`, totalsBoxX + 4, totalY);
  doc.text(`$${sale.taxUSD.toFixed(2)} USD`, totalsBoxX + 72, totalY, { align: 'right' });

  if (sale.discountUSD > 0) {
    totalY += 5;
    doc.text('Descuento Especial:', totalsBoxX + 4, totalY);
    doc.text(`-$${sale.discountUSD.toFixed(2)} USD`, totalsBoxX + 72, totalY, { align: 'right' });
  }

  totalY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsBoxX + 4, totalY - 2, totalsBoxX + 72, totalY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL A PAGAR (USD):', totalsBoxX + 4, totalY + 2);
  doc.text(`$${sale.totalUSD.toFixed(2)}`, totalsBoxX + 72, totalY + 2, { align: 'right' });

  totalY += 6;
  doc.setFontSize(10.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`TOTAL EN ${sale.currencySymbol}:`, totalsBoxX + 4, totalY + 2);
  doc.text(`${sale.totalLocal.toFixed(2)} ${sale.currencySymbol}`, totalsBoxX + 72, totalY + 2, { align: 'right' });

  // Footer notes & QR placeholder / legal
  y = Math.max(y + 44, 255);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.receiptFooterMessage, 14, y);
  y += 4;
  doc.text(`Documento generado electrónicamente por Sistema InvBulto POS · Tasa BCV aplicada: ${sale.exchangeRate} ${sale.currencySymbol}/USD`, 14, y);

  doc.save(`Factura_${sale.invoiceNumber}.pdf`);
};

export const generateSalesReportPDF = (sales: Sale[], dateRangeLabel: string, settings: StoreSettings) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${settings.companyName.toUpperCase()} — REPORTE DETALLADO DE VENTAS`, 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Período: ${dateRangeLabel} · Generado el: ${new Date().toLocaleString('es-ES')}`, 14, 17);

  y = 30;
  const totalUSD = sales.reduce((acc, s) => acc + s.totalUSD, 0);
  const totalLocal = sales.reduce((acc, s) => acc + s.totalLocal, 0);
  const totalTax = sales.reduce((acc, s) => acc + s.taxUSD, 0);

  // Summary row
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 12, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Total Facturas: ${sales.length}`, 18, y + 7.5);
  doc.text(`Total Ventas USD: $${totalUSD.toFixed(2)}`, 70, y + 7.5);
  doc.text(`Total Ventas Moneda Local: ${totalLocal.toFixed(2)} ${settings.currencySymbol}`, 140, y + 7.5);
  doc.text(`Impuesto Recaudado: $${totalTax.toFixed(2)} USD`, 225, y + 7.5);

  y += 18;
  // Columns
  doc.setFillColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 7.5, 'F');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  doc.text('FACTURA', 16, y + 5);
  doc.text('FECHA', 40, y + 5);
  doc.text('CLIENTE', 75, y + 5);
  doc.text('CAJERO', 130, y + 5);
  doc.text('MÉTODO PAGO', 165, y + 5);
  doc.text('TASA CAMBIO', 205, y + 5);
  doc.text('TOTAL USD', 235, y + 5);
  doc.text(`TOTAL ${settings.currencySymbol}`, 262, y + 5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  sales.forEach((s, idx) => {
    if (y > 185) {
      doc.addPage();
      y = 20;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3, pageWidth - 28, 6, 'F');
    }
    doc.text(s.invoiceNumber, 16, y + 1);
    doc.text(new Date(s.date).toLocaleDateString('es-ES'), 40, y + 1);
    doc.text(s.clientName.substring(0, 26), 75, y + 1);
    doc.text(s.userName, 130, y + 1);
    doc.text(formatPaymentMethod(s.paymentMethod), 165, y + 1);
    doc.text(`${s.exchangeRate.toFixed(2)}`, 205, y + 1);
    doc.text(`$${s.totalUSD.toFixed(2)}`, 235, y + 1);
    doc.text(`${s.totalLocal.toFixed(2)}`, 262, y + 1);
    y += 6;
  });

  doc.save(`Reporte_Ventas_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generateInventoryReportPDF = (
  products: Product[],
  exchangeRate: number,
  settings: StoreSettings,
  filterDescription?: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let pageNumber = 1;

  const printDocumentHeader = () => {
    // Top dark banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${settings.companyName.toUpperCase()} — INVENTARIO ACTUAL DE EXISTENCIAS`, 12, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const filterTxt = filterDescription ? ` · Filtro: ${filterDescription}` : '';
    doc.text(
      `RIF/NIT: ${settings.companyDoc || 'S/N'} · Tasa Oficial: 1 USD = ${exchangeRate.toFixed(2)} ${settings.currencySymbol} · Generado: ${new Date().toLocaleString('es-ES')}${filterTxt} · Pág. ${pageNumber}`,
      12,
      17
    );
  };

  const drawTableHeader = (startY: number) => {
    doc.setFillColor(226, 232, 240); // slate-200
    doc.rect(12, startY, pageWidth - 24, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text('CÓDIGO/SKU', 14, startY + 5);
    doc.text('PRODUCTO', 36, startY + 5);
    doc.text('UN/BTO', 83, startY + 5);
    doc.text('EXIST. BULTOS', 98, startY + 5);
    doc.text('EXIST. UNIDADES', 122, startY + 5);
    doc.text('P. UNID ($)', 148, startY + 5);
    doc.text(`P. UNID (${settings.currencySymbol})`, 170, startY + 5);
    doc.text('P. BULTO ($)', 193, startY + 5);
    doc.text(`P. BULTO (${settings.currencySymbol})`, 215, startY + 5);
    doc.text('TOTAL VTA ($)', 238, startY + 5);
    doc.text('ESTADO', 262, startY + 5);
  };

  printDocumentHeader();

  // Metrics summary banner
  let y = 26;
  const totalCostValuation = products.reduce((acc, p) => acc + (p.totalUnitsInStock * p.costUnitUSD), 0);
  const totalSaleValuation = products.reduce((acc, p) => acc + (p.totalUnitsInStock * p.priceUnitUSD), 0);
  const totalPackages = products.reduce((acc, p) => acc + Math.floor(p.totalUnitsInStock / p.unitsPerPackage), 0);
  const totalUnits = products.reduce((acc, p) => acc + p.totalUnitsInStock, 0);
  const lowStockCount = products.filter(p => p.totalUnitsInStock <= p.minStockUnits).length;

  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, pageWidth - 24, 11, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Total Productos: ${products.length}`, 15, y + 7);
  doc.text(`Exist. Bultos: ${totalPackages}`, 60, y + 7);
  doc.text(`Exist. Unidades: ${totalUnits}`, 102, y + 7);
  doc.text(`Valor Costo: $${totalCostValuation.toFixed(2)}`, 144, y + 7);
  doc.text(`Valor Venta: $${totalSaleValuation.toFixed(2)} (${(totalSaleValuation * exchangeRate).toFixed(2)} ${settings.currencySymbol})`, 190, y + 7);
  doc.text(`Alertas: ${lowStockCount}`, 262, y + 7);

  y += 15;
  drawTableHeader(y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  products.forEach((p, idx) => {
    if (y > 185) {
      doc.addPage();
      pageNumber++;
      printDocumentHeader();
      y = 26;
      drawTableHeader(y);
      y += 10;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y - 3, pageWidth - 24, 6, 'F');
    }

    const packages = Math.floor(p.totalUnitsInStock / p.unitsPerPackage);
    const looseUnits = p.totalUnitsInStock % p.unitsPerPackage;
    const isLow = p.totalUnitsInStock <= p.minStockUnits && p.totalUnitsInStock > 0;
    const isOutOfStock = p.totalUnitsInStock <= 0;
    const totalSaleItemUSD = p.totalUnitsInStock * p.priceUnitUSD;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    // SKU
    doc.text(p.sku.substring(0, 11), 14, y + 1);
    // Product Name
    doc.text(p.name.substring(0, 26), 36, y + 1);
    // Units per package
    doc.text(`${p.unitsPerPackage}`, 87, y + 1);
    // Existencias Bultos
    doc.setFont('helvetica', 'bold');
    doc.text(`${packages} ${p.packageLabel.substring(0, 4)}.`, 98, y + 1);
    // Existencias Unidades
    doc.setFont('helvetica', 'normal');
    doc.text(`${looseUnits} u. (${p.totalUnitsInStock} tot)`, 122, y + 1);

    // Precio por Unidad USD
    doc.text(`$${p.priceUnitUSD.toFixed(2)}`, 148, y + 1);
    // Precio por Unidad Local
    doc.text(`${(p.priceUnitUSD * exchangeRate).toFixed(2)}`, 170, y + 1);
    // Precio por Bulto USD
    doc.text(`$${p.pricePackageUSD.toFixed(2)}`, 193, y + 1);
    // Precio por Bulto Local
    doc.text(`${(p.pricePackageUSD * exchangeRate).toFixed(2)}`, 215, y + 1);
    // Total Venta USD
    doc.text(`$${totalSaleItemUSD.toFixed(2)}`, 238, y + 1);

    // Status
    if (isOutOfStock) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text('AGOTADO', 262, y + 1);
    } else if (isLow) {
      doc.setTextColor(217, 119, 6);
      doc.setFont('helvetica', 'bold');
      doc.text('STOCK BAJO', 262, y + 1);
    } else {
      doc.setTextColor(22, 163, 74);
      doc.text('Óptimo', 262, y + 1);
    }

    y += 6;
  });

  // Summary footer on last page if space permits
  if (y > 185) {
    doc.addPage();
    pageNumber++;
    printDocumentHeader();
    y = 26;
  }
  y += 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(12, y, pageWidth - 12, y);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, pageWidth - 24, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTALES:', 14, y + 5);
  doc.text(`${totalPackages} Bultos`, 98, y + 5);
  doc.text(`${totalUnits} Unidades`, 122, y + 5);
  doc.text(`$${totalSaleValuation.toFixed(2)} USD`, 238, y + 5);
  doc.text(`(${(totalSaleValuation * exchangeRate).toFixed(2)} ${settings.currencySymbol})`, 260, y + 5);

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`Inventario_Bultos_Unidades_${fileDate}.pdf`);
};

export const generateFinancesReportPDF = (
  sales: Sale[],
  expenses: Expense[],
  settings: StoreSettings
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${settings.companyName.toUpperCase()}`, 14, 11);
  doc.setFontSize(9);
  doc.text('ESTADO DE RESULTADOS — GASTOS Y BENEFICIOS OPERATIVOS', 14, 17);

  y = 35;
  const grossSalesUSD = sales.reduce((acc, s) => acc + s.subtotalUSD, 0);
  const cogsUSD = sales.reduce((acc, s) => {
    return acc + s.items.reduce((sum, item) => sum + (item.totalCostUSD || 0), 0);
  }, 0);
  const grossProfitUSD = grossSalesUSD - cogsUSD;
  const totalExpensesUSD = expenses.reduce((acc, e) => acc + e.amountUSD, 0);
  const netProfitUSD = grossProfitUSD - totalExpensesUSD;
  const netMarginPercent = grossSalesUSD > 0 ? (netProfitUSD / grossSalesUSD) * 100 : 0;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RESUMEN FINANCIERO CONSOLIDADO (USD)', 14, y);

  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 48, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 48, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let finY = y + 7;

  doc.text('(+) Ventas Netas Totales (Ingresos Brutos):', 20, finY);
  doc.text(`$${grossSalesUSD.toFixed(2)} USD`, pageWidth - 20, finY, { align: 'right' });

  finY += 7;
  doc.text('(-) Costo de Mercancía Vendida (COGS):', 20, finY);
  doc.text(`-$${cogsUSD.toFixed(2)} USD`, pageWidth - 20, finY, { align: 'right' });

  finY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('(=) Utilidad Bruta:', 20, finY);
  doc.text(`$${grossProfitUSD.toFixed(2)} USD`, pageWidth - 20, finY, { align: 'right' });

  finY += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('(-) Gastos Operativos y Administrativos:', 20, finY);
  doc.text(`-$${totalExpensesUSD.toFixed(2)} USD`, pageWidth - 20, finY, { align: 'right' });

  finY += 8;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, finY - 2, pageWidth - 20, finY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const profitColor = netProfitUSD >= 0 ? [16, 185, 129] : [220, 38, 38];
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.text('(=) BENEFICIO NETO (UTILIDAD LIMPIA):', 20, finY + 2);
  doc.text(`$${netProfitUSD.toFixed(2)} USD (${netMarginPercent.toFixed(1)}%)`, pageWidth - 20, finY + 2, { align: 'right' });

  y += 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('DETALLE DE GASTOS REGISTRADOS', 14, y);

  y += 6;
  doc.setFillColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 7.5, 'F');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('FECHA', 16, y + 5);
  doc.text('CATEGORÍA', 42, y + 5);
  doc.text('DESCRIPCIÓN', 80, y + 5);
  doc.text('MÉTODO', 145, y + 5);
  doc.text('MONTO USD', pageWidth - 20, y + 5, { align: 'right' });

  y += 9.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  expenses.forEach((e, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3, pageWidth - 28, 6, 'F');
    }
    doc.text(e.date, 16, y + 1);
    doc.text(e.category.toUpperCase(), 42, y + 1);
    doc.text(e.description.substring(0, 34), 80, y + 1);
    doc.text(e.paymentMethod, 145, y + 1);
    doc.text(`$${e.amountUSD.toFixed(2)}`, pageWidth - 20, y + 1, { align: 'right' });
    y += 6;
  });

  doc.save(`Estado_Resultados_Gastos_Beneficios_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generatePurchaseInvoicePDF = (purchase: PurchaseInvoice, settings: StoreSettings) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Background bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${settings.companyName.toUpperCase()} — COMPROBANTE DE COMPRA`, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Recepción de Mercancía a Almacén · RIF: ${settings.companyDoc} · ${settings.companyPhone}`, 14, 19);

  y = 35;
  doc.setTextColor(15, 23, 42);

  // Invoice / Supplier Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FACTURA DE COMPRA DE PROVEEDOR', 14, y);

  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(purchase.invoiceNumber, pageWidth - 14, y, { align: 'right' });

  y += 7;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);

  y += 6;
  // Metadata 2 cols
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('DATOS DEL PROVEEDOR:', 14, y);
  doc.text('DETALLES DE LA RECEPCIÓN:', pageWidth / 2 + 10, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text(`Razón Social: ${purchase.supplierName}`, 14, y);
  doc.text(`Fecha Emisión: ${new Date(purchase.date).toLocaleDateString('es-ES')}`, pageWidth / 2 + 10, y);

  y += 4.5;
  doc.text(`RIF / Identificación: ${purchase.supplierDoc}`, 14, y);
  doc.text(`Recibido por: ${purchase.registeredBy}`, pageWidth / 2 + 10, y);

  y += 4.5;
  doc.text(`Forma de Pago: ${purchase.paymentMethod}`, 14, y);
  doc.text(`Tasa Oficial de Cambio: 1 USD = ${purchase.exchangeRate.toFixed(2)} ${purchase.currencySymbol}`, pageWidth / 2 + 10, y);

  y += 8;
  // Table Header
  const tableX = 14;
  const colWidths = [18, 55, 30, 26, 26, 27]; // SKU, Producto, Bultos/Unidades, Costo Bulto, Costo Unitario, Subtotal
  doc.setFillColor(241, 245, 249);
  doc.rect(tableX, y, pageWidth - 28, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  let curX = tableX + 2;
  doc.text('CÓDIGO', curX, y + 5.5);
  curX += colWidths[0];
  doc.text('DESCRIPCIÓN', curX, y + 5.5);
  curX += colWidths[1];
  doc.text('BULTOS / UNIDADES', curX, y + 5.5);
  curX += colWidths[2];
  doc.text('COSTO BULTO ($)', curX, y + 5.5);
  curX += colWidths[3];
  doc.text('COSTO UNIT. ($)', curX, y + 5.5);
  curX += colWidths[4];
  doc.text('SUBTOTAL ($)', curX, y + 5.5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  // Rows
  purchase.items.forEach((item, idx) => {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y - 3, pageWidth - 28, 6.5, 'F');
    }

    const bultosStr = `${item.packagesCount} bultos (x${item.unitsPerPackage}) = ${item.totalUnitsReceived} un.`;

    let rX = tableX + 2;
    doc.text(item.sku.substring(0, 10), rX, y + 1.5);
    rX += colWidths[0];
    doc.text(item.productName.substring(0, 32), rX, y + 1.5);
    rX += colWidths[1];
    doc.text(bultosStr, rX, y + 1.5);
    rX += colWidths[2];
    doc.text(`$${item.costPackageUSD.toFixed(2)}`, rX, y + 1.5);
    rX += colWidths[3];
    doc.setFont('helvetica', 'bold');
    doc.text(`$${item.calculatedCostUnitUSD.toFixed(3)}/u`, rX, y + 1.5);
    doc.setFont('helvetica', 'normal');
    rX += colWidths[4];
    doc.text(`$${item.subtotalUSD.toFixed(2)}`, rX, y + 1.5);

    y += 6.5;
  });

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(tableX, y, pageWidth - 14, y);

  // Totals Box
  y += 5;
  const totalsBoxX = pageWidth - 95;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsBoxX, y, 81, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsBoxX, y, 81, 38, 2, 2, 'D');

  let totY = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal Base:', totalsBoxX + 4, totY);
  doc.text(`$${purchase.subtotalUSD.toFixed(2)} USD`, totalsBoxX + 77, totY, { align: 'right' });

  totY += 5;
  doc.text(`IVA Crédito Fiscal (${purchase.taxPercent}%):`, totalsBoxX + 4, totY);
  doc.text(`$${purchase.taxUSD.toFixed(2)} USD`, totalsBoxX + 77, totY, { align: 'right' });

  totY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsBoxX + 4, totY - 2, totalsBoxX + 77, totY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL FACTURA (USD):', totalsBoxX + 4, totY + 2);
  doc.text(`$${purchase.totalUSD.toFixed(2)}`, totalsBoxX + 77, totY + 2, { align: 'right' });

  totY += 6;
  doc.setFontSize(10.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`TOTAL EN ${purchase.currencySymbol}:`, totalsBoxX + 4, totY + 2);
  doc.text(`${purchase.totalLocal.toFixed(2)} ${purchase.currencySymbol}`, totalsBoxX + 77, totY + 2, { align: 'right' });

  // Notes & Footer
  y = Math.max(y + 44, 255);
  if (purchase.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Notas de Recepción: ${purchase.notes}`, 14, y - 6);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Comprobante de Entrada de Mercancía a Inventario · Sistema InvBulto POS · Tasa aplicada: ${purchase.exchangeRate} ${purchase.currencySymbol}/USD`, 14, y);

  doc.save(`Factura_Compra_${purchase.invoiceNumber}.pdf`);
};

function formatPaymentMethod(m: string): string {
  switch (m) {
    case 'efectivo_usd': return 'Efectivo Divisas ($)';
    case 'efectivo_local': return 'Efectivo Moneda Local';
    case 'pago_movil': return 'Pago Móvil';
    case 'tarjeta': return 'Punto de Venta / Tarjeta';
    case 'transferencia': return 'Transferencia Bancaria';
    case 'mixto': return 'Pago Mixto / Combinado';
    default: return m;
  }
}

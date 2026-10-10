import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  FileText,
  Download,
  Users,
  Calendar,
  BarChart3,
  Layers,
  ArrowRightLeft,
  Percent,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { generateSalesReportPDF, generateFinancesReportPDF, generateInvoicePDF } from '../../utils/pdfGenerator';
import { exportSalesToExcel, exportFinancesToExcel } from '../../utils/excelGenerator';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenLowStock: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenLowStock,
}) => {
  const {
    sales,
    products,
    expenses,
    clients,
    exchangeRate,
    settings,
    lowStockProducts,
    hasPermission,
  } = useApp();

  // Chart view states
  const [chartCurrency, setChartCurrency] = useState<'USD' | 'LOCAL'>('USD');
  const [chartRange, setChartRange] = useState<'7' | '14' | '30'>('7');
  const [chartMode, setChartMode] = useState<'comparison' | 'profit'>('comparison');

  // Financial Calculations & Inventory Valuation memoized to prevent redundant calculations
  const {
    totalSalesUSD,
    totalSalesLocal,
    grossSalesUSD,
    cogsUSD,
    grossProfitUSD,
    totalExpensesUSD,
    netProfitUSD,
    netMarginPercent,
    inventoryCostUSD,
    inventoryRetailUSD,
    totalPackagesInStock,
    totalUnitsInStock,
  } = useMemo(() => {
    const sUSD = sales.reduce((acc, s) => acc + s.totalUSD, 0);
    const sLocal = sUSD * exchangeRate.rate;
    const gSales = sales.reduce((acc, s) => acc + s.subtotalUSD, 0);
    const cogs = sales.reduce((acc, s) => {
      return acc + s.items.reduce((sum, item) => sum + (item.totalCostUSD || 0), 0);
    }, 0);
    const gProfit = gSales - cogs;
    const eUSD = expenses.reduce((acc, e) => acc + e.amountUSD, 0);
    const nProfit = gProfit - eUSD;
    const nMargin = gSales > 0 ? (nProfit / gSales) * 100 : 0;

    const invCost = products.reduce((acc, p) => acc + (p.totalUnitsInStock * p.costUnitUSD), 0);
    const invRetail = products.reduce((acc, p) => acc + (p.totalUnitsInStock * p.priceUnitUSD), 0);
    const pkgsInStock = products.reduce((acc, p) => acc + Math.floor(p.totalUnitsInStock / p.unitsPerPackage), 0);
    const unitsInStock = products.reduce((acc, p) => acc + p.totalUnitsInStock, 0);

    return {
      totalSalesUSD: sUSD,
      totalSalesLocal: sLocal,
      grossSalesUSD: gSales,
      cogsUSD: cogs,
      grossProfitUSD: gProfit,
      totalExpensesUSD: eUSD,
      netProfitUSD: nProfit,
      netMarginPercent: nMargin,
      inventoryCostUSD: invCost,
      inventoryRetailUSD: invRetail,
      totalPackagesInStock: pkgsInStock,
      totalUnitsInStock: unitsInStock,
    };
  }, [sales, expenses, products, exchangeRate.rate]);

  // Top products calculation memoized
  const topProducts = useMemo(() => {
    const productSalesMap = new Map<string, { name: string; sku: string; units: number; packages: number; totalUSD: number }>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSalesMap.get(item.productId) || {
          name: item.productName,
          sku: item.sku,
          units: 0,
          packages: 0,
          totalUSD: 0,
        };
        if (item.unitType === 'package') {
          existing.packages += item.quantity;
        } else {
          existing.units += item.quantity;
        }
        existing.totalUSD += item.subtotalUSD;
        productSalesMap.set(item.productId, existing);
      });
    });

    return Array.from(productSalesMap.values())
      .sort((a, b) => b.totalUSD - a.totalUSD)
      .slice(0, 5);
  }, [sales]);

  // --- RECHARTS DAILY SALES VS EXPENSES & PROFITABILITY DATA ---
  const chartData = useMemo(() => {
    const daysCount = parseInt(chartRange, 10);
    const result: Array<{
      dateKey: string;
      dateLabel: string;
      ventas: number;
      gastos: number;
      rentabilidad: number;
      ventasRaw: number;
      gastosRaw: number;
      rentabilidadRaw: number;
      ventasLocal: number;
      gastosLocal: number;
      rentabilidadLocal: number;
      isPositive: boolean;
      marginPercent: number;
    }> = [];

    // Map sales by date YYYY-MM-DD
    const salesByDay = new Map<string, number>();
    sales.forEach(s => {
      const d = s.date.slice(0, 10);
      salesByDay.set(d, (salesByDay.get(d) || 0) + s.totalUSD);
    });

    // Map expenses by date YYYY-MM-DD
    const expensesByDay = new Map<string, number>();
    expenses.forEach(e => {
      const d = e.date.slice(0, 10);
      expensesByDay.set(d, (expensesByDay.get(d) || 0) + e.amountUSD);
    });

    // Reference anchor date: latest date found or today
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const isoKey = targetDate.toISOString().slice(0, 10);

      // Short day name and day of month: e.g. "Lun 28" or "28 Sep"
      const dayName = targetDate.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayNum = targetDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      const formattedLabel = `${dayNum}`;

      const daySalesUSD = salesByDay.get(isoKey) || 0;
      const dayExpensesUSD = expensesByDay.get(isoKey) || 0;
      const dayProfitUSD = daySalesUSD - dayExpensesUSD;

      const rate = exchangeRate.rate;
      const daySalesLocal = daySalesUSD * rate;
      const dayExpensesLocal = dayExpensesUSD * rate;
      const dayProfitLocal = dayProfitUSD * rate;

      const isUSD = chartCurrency === 'USD';
      const margin = daySalesUSD > 0 ? (dayProfitUSD / daySalesUSD) * 100 : dayExpensesUSD > 0 ? -100 : 0;

      result.push({
        dateKey: isoKey,
        dateLabel: formattedLabel,
        ventas: isUSD ? parseFloat(daySalesUSD.toFixed(2)) : parseFloat(daySalesLocal.toFixed(2)),
        gastos: isUSD ? parseFloat(dayExpensesUSD.toFixed(2)) : parseFloat(dayExpensesLocal.toFixed(2)),
        rentabilidad: isUSD ? parseFloat(dayProfitUSD.toFixed(2)) : parseFloat(dayProfitLocal.toFixed(2)),
        ventasRaw: daySalesUSD,
        gastosRaw: dayExpensesUSD,
        rentabilidadRaw: dayProfitUSD,
        ventasLocal: daySalesLocal,
        gastosLocal: dayExpensesLocal,
        rentabilidadLocal: dayProfitLocal,
        isPositive: dayProfitUSD >= 0,
        marginPercent: parseFloat(margin.toFixed(1)),
      });
    }

    return result;
  }, [sales, expenses, chartRange, chartCurrency, exchangeRate.rate]);

  // Summary figures for the filtered chart period
  const periodSummary = useMemo(() => {
    const totalVentasUSD = chartData.reduce((sum, d) => sum + d.ventasRaw, 0);
    const totalGastosUSD = chartData.reduce((sum, d) => sum + d.gastosRaw, 0);
    const totalRentabilidadUSD = totalVentasUSD - totalGastosUSD;
    const profitableDays = chartData.filter(d => d.ventasRaw > 0 && d.rentabilidadRaw >= 0).length;
    const activeDays = chartData.filter(d => d.ventasRaw > 0 || d.gastosRaw > 0).length;
    const avgDailySalesUSD = chartData.length > 0 ? totalVentasUSD / chartData.length : 0;
    const margin = totalVentasUSD > 0 ? (totalRentabilidadUSD / totalVentasUSD) * 100 : 0;

    return {
      totalVentasUSD,
      totalGastosUSD,
      totalRentabilidadUSD,
      profitableDays,
      activeDays,
      totalDays: chartData.length,
      avgDailySalesUSD,
      margin,
    };
  }, [chartData]);

  // Custom Recharts Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isUSD = chartCurrency === 'USD';
      const curSymbol = isUSD ? '$' : '';
      const curSuffix = isUSD ? 'USD' : settings.currencySymbol;

      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-xl border border-slate-800 text-xs min-w-[200px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-slate-300">
            <span>Fecha: {data.dateKey} ({data.dateLabel})</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                data.isPositive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
              }`}
            >
              {data.isPositive ? 'Superávit' : 'Déficit'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Ventas del Día:</span>
              </span>
              <span className="font-mono font-bold">
                {curSymbol}{data.ventas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {curSuffix}
              </span>
            </div>

            <div className="flex items-center justify-between text-rose-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Gastos Registrados:</span>
              </span>
              <span className="font-mono font-bold">
                {curSymbol}{data.gastos.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {curSuffix}
              </span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
              <span className="text-slate-300 font-semibold">Rentabilidad Neta:</span>
              <span
                className={`font-mono font-bold ${
                  data.isPositive ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {data.rentabilidad >= 0 ? '+' : ''}
                {curSymbol}{data.rentabilidad.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {curSuffix}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Margen Operativo:</span>
              <span className="font-mono font-semibold">
                {data.marginPercent > 0 ? `+${data.marginPercent}%` : `${data.marginPercent}%`}
              </span>
            </div>

            {/* Cross Currency Preview */}
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
              <span>{isUSD ? 'En Bs.:' : 'En USD:'}</span>
              <span className="font-mono text-slate-300">
                {isUSD
                  ? `${data.rentabilidadLocal.toFixed(2)} ${settings.currencySymbol}`
                  : `$${data.rentabilidadRaw.toFixed(2)} USD`}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Date & Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Panel de Control y Métricas</span>
            <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
              En Vivo
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo en tiempo real de ventas, inventario por bulto/unidad, gastos y gráficos de rentabilidad diaria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('canAccessPos') && (
            <button
              onClick={() => onNavigate('pos')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Abrir Punto de Venta</span>
            </button>
          )}

          <div className="inline-flex rounded-md border border-slate-200 bg-white shadow-xs p-0.5">
            <button
              onClick={() => exportSalesToExcel(sales, settings)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded flex items-center gap-1.5 cursor-pointer"
              title="Exportar todas las ventas a Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => generateSalesReportPDF(sales, 'Mes en curso', settings)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded flex items-center gap-1.5 cursor-pointer"
              title="Descargar reporte de ventas en PDF"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-md text-amber-800 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Atención: Hay {lowStockProducts.length} producto(s) por debajo del stock mínimo
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Revise las sugerencias de compra por bulto para reponer antes de que se agoten en caja.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenLowStock}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer shadow-2xs transition-colors"
          >
            Ver Productos Afectados ({lowStockProducts.length})
          </button>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas Totales */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Ventas Totales</span>
            <span className="font-mono-numbers text-[11px] text-slate-400">
              {sales.length} facturas
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono-numbers">
              ${totalSalesUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
            </div>
            <div className="text-xs font-mono-numbers text-emerald-600 font-medium mt-0.5">
              {totalSalesLocal.toFixed(2)} {settings.currencySymbol}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tasa de cambio:</span>
            <span className="font-mono-numbers font-semibold text-slate-700">
              1$ = {exchangeRate.rate.toFixed(2)} {settings.currencySymbol}
            </span>
          </div>
        </div>

        {/* KPI 2: Ganancia Neta */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Ganancia Neta (Utilidad)</span>
            <span className={`text-[11px] font-bold font-mono-numbers ${netProfitUSD >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netMarginPercent.toFixed(1)}% margen
            </span>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold tracking-tight font-mono-numbers ${netProfitUSD >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ${netProfitUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
            </div>
            <div className="text-xs font-mono-numbers text-slate-600 font-medium mt-0.5">
              {(netProfitUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Margen Bruto: ${grossProfitUSD.toFixed(2)}</span>
            <button
              onClick={() => onNavigate('finances')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
            >
              Ver P&L →
            </button>
          </div>
        </div>

        {/* KPI 3: Gastos Operativos */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gastos Registrados</span>
            <span className="font-mono-numbers text-[11px] text-slate-400">
              {expenses.length} registros
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono-numbers">
              ${totalExpensesUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
            </div>
            <div className="text-xs font-mono-numbers text-slate-600 font-medium mt-0.5">
              {(totalExpensesUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Costo Mercancía: ${cogsUSD.toFixed(2)}</span>
            <button
              onClick={() => onNavigate('finances')}
              className="text-slate-700 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Detalle →
            </button>
          </div>
        </div>

        {/* KPI 4: Inventario en Bultos y Unidades */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Existencias Totales</span>
            <span className="font-mono-numbers text-[11px] text-slate-400">
              {products.length} productos
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono-numbers">
              {totalPackagesInStock} <span className="text-xs font-semibold text-slate-500">Bultos</span>
              <span className="text-slate-300 mx-1.5 font-light">/</span>
              <span className="text-base font-normal text-slate-600">{totalUnitsInStock} un.</span>
            </div>
            <div className="text-xs font-mono-numbers text-slate-500 mt-0.5">
              Valorizado a Venta: ${inventoryRetailUSD.toFixed(2)} USD
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>A costo: ${inventoryCostUSD.toFixed(2)}</span>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-slate-700 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Almacén →
            </button>
          </div>
        </div>
      </div>

      {/* --- FEATURED RECHARTS SECTION: GRÁFICO DE BARRAS DE VENTAS DIARIAS VS GASTOS & RENTABILIDAD --- */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
        {/* Chart Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Flujo Diario: Ventas vs Gastos & Rentabilidad</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    Recharts
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparativa de ingresos por ventas frente a los gastos operativos diarios para evaluar la rentabilidad neta.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Toolbar for Recharts */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Currency toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartCurrency('USD')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartCurrency === 'USD'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setChartCurrency('LOCAL')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartCurrency === 'LOCAL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {settings.currencySymbol} ({settings.currencyName})
              </button>
            </div>

            {/* Time range selector */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartRange('7')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartRange === '7'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Días
              </button>
              <button
                type="button"
                onClick={() => setChartRange('14')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartRange === '14'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                14 Días
              </button>
              <button
                type="button"
                onClick={() => setChartRange('30')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartRange === '30'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Días
              </button>
            </div>

            {/* Chart Mode (Comparison vs Net Profit bars) */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMode('comparison')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartMode === 'comparison'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ventas vs Gastos
              </button>
              <button
                type="button"
                onClick={() => setChartMode('profit')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartMode === 'profit'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rentabilidad Neta
              </button>
            </div>
          </div>
        </div>

        {/* Quick KPI stats strip for the selected period */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block">Ventas en {chartRange} Días:</span>
            <span className="font-mono-numbers font-bold text-slate-900 text-sm">
              ${periodSummary.totalVentasUSD.toFixed(2)} USD
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block">Gastos en {chartRange} Días:</span>
            <span className="font-mono-numbers font-bold text-rose-600 text-sm">
              ${periodSummary.totalGastosUSD.toFixed(2)} USD
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block">Rentabilidad Neta Período:</span>
            <span
              className={`font-mono-numbers font-bold text-sm ${
                periodSummary.totalRentabilidadUSD >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {periodSummary.totalRentabilidadUSD >= 0 ? '+' : ''}${periodSummary.totalRentabilidadUSD.toFixed(2)} USD
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block">Días Rentables:</span>
            <span className="font-mono-numbers font-bold text-slate-800 text-sm">
              {periodSummary.profitableDays} de {periodSummary.totalDays} días ({periodSummary.margin.toFixed(1)}% margen)
            </span>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="w-full h-80 pt-2 select-none">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'comparison' ? (
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={val =>
                    chartCurrency === 'USD' ? `$${val}` : `${val} ${settings.currencySymbol}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                  formatter={value => (
                    <span className="text-xs font-semibold text-slate-700 mr-4">
                      {value}
                    </span>
                  )}
                />
                <Bar
                  dataKey="ventas"
                  name="Ventas Facturadas"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="gastos"
                  name="Gastos Registrados"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={val =>
                    chartCurrency === 'USD' ? `$${val}` : `${val} ${settings.currencySymbol}`
                  }
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                  formatter={() => (
                    <span className="text-xs font-semibold text-slate-700">
                      Rentabilidad Neta Diaria (Verde: Ganancia / Rojo: Déficit)
                    </span>
                  )}
                />
                <Bar
                  dataKey="rentabilidad"
                  name="Rentabilidad Neta"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.rentabilidad >= 0 ? '#10b981' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Insight footer */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Promedio de venta diaria en el período:{' '}
              <strong className="text-slate-900 font-mono">
                ${periodSummary.avgDailySalesUSD.toFixed(2)} USD
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Venta &gt; Gasto (Ganancia)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Gasto &gt; Venta (Déficit)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Financial Breakdown & Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Visual Structure of P&L (Gastos vs Beneficios) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Relación de Ingresos, Costos y Beneficio Operativo
              </h2>
              <p className="text-xs text-slate-500">
                Estructura en tiempo real del flujo económico del negocio
              </p>
            </div>
            <button
              onClick={() => generateFinancesReportPDF(sales, expenses, settings)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Descargar Estado P&L</span>
            </button>
          </div>

          {/* Clean Segmented Progress Bars for P&L */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">1. Ventas Brutas Totales</span>
                <span className="font-mono-numbers font-bold text-slate-900">
                  ${grossSalesUSD.toFixed(2)} USD (100%)
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-800 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">2. Costo de Productos Vendidos (COGS)</span>
                <span className="font-mono-numbers font-medium text-slate-600">
                  ${cogsUSD.toFixed(2)} USD ({grossSalesUSD > 0 ? ((cogsUSD / grossSalesUSD) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, grossSalesUSD > 0 ? (cogsUSD / grossSalesUSD) * 100 : 0)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">3. Gastos Operativos (Alquiler, fletes, nómina)</span>
                <span className="font-mono-numbers font-medium text-slate-600">
                  ${totalExpensesUSD.toFixed(2)} USD ({grossSalesUSD > 0 ? ((totalExpensesUSD / grossSalesUSD) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, grossSalesUSD > 0 ? (totalExpensesUSD / grossSalesUSD) * 100 : 0)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-bold text-emerald-800">4. Beneficio Neto Limpio (Ganancia)</span>
                <span className="font-mono-numbers font-bold text-emerald-600">
                  ${netProfitUSD.toFixed(2)} USD ({netMarginPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, netMarginPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick summary notes */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Margen Bruto:</span>
              <strong className="font-mono-numbers text-slate-900">${grossProfitUSD.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Tasa de Impuesto:</span>
              <strong className="font-mono-numbers text-slate-900">{settings.taxRatePercent}% IVA</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Clientes Activos:</span>
              <strong className="font-mono-numbers text-slate-900">{clients.length} registrados</strong>
            </div>
          </div>
        </div>

        {/* Right (1 col): Top Selling Products (Bultos y Unidades) */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Productos Más Vendidos
              </h2>
              <button
                onClick={() => onNavigate('sales')}
                className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
              >
                Historial →
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Aún no hay ventas registradas
                </p>
              ) : (
                topProducts.map((p, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 truncate max-w-[160px]">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono-numbers">
                        {p.packages > 0 ? `${p.packages} bultos` : ''} 
                        {p.packages > 0 && p.units > 0 ? ' + ' : ''}
                        {p.units > 0 ? `${p.units} un.` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 font-mono-numbers">
                        ${p.totalUSD.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-mono-numbers">
                        {(p.totalUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('inventory')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md transition-colors text-center cursor-pointer"
            >
              Consultar Inventario Completo
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Últimas Facturas Emitidas
            </h2>
            <p className="text-xs text-slate-500">
              Comprobantes fiscales y comerciales con opción de descarga PDF inmediata
            </p>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
          >
            Ver todas las facturas →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">N° Factura</th>
                <th className="py-2.5 px-3">Fecha y Hora</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Renglones</th>
                <th className="py-2.5 px-3 text-right">Total USD</th>
                <th className="py-2.5 px-3 text-right">Total {settings.currencySymbol}</th>
                <th className="py-2.5 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {sales.slice(0, 5).map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono-numbers font-semibold text-slate-900">
                    {sale.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {new Date(sale.date).toLocaleString('es-ES', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-medium">
                    {sale.clientName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {sale.items.length} producto(s)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-slate-900">
                    ${sale.totalUSD.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-numbers text-emerald-700 font-semibold">
                    {sale.totalLocal.toFixed(2)} {sale.currencySymbol}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => generateInvoicePDF(sale, settings)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                      title="Descargar Factura PDF"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Printer,
  Eye,
  Search,
  Filter,
  Download,
  Calendar,
  Truck,
  DollarSign,
  Package,
  Layers,
  Building2,
  ArrowUpDown,
  RotateCcw,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react';
import { PurchaseInvoice } from '../../types';
import { generatePurchaseInvoicePDF } from '../../utils/pdfGenerator';
import { exportPurchasesToExcel } from '../../utils/excelGenerator';
import { PurchaseInvoiceModal } from './PurchaseInvoiceModal';

interface PurchaseHistoryViewProps {
  onNavigate?: (tab: string) => void;
  onNewPurchase?: () => void;
}

export const PurchaseHistoryView: React.FC<PurchaseHistoryViewProps> = ({
  onNavigate,
  onNewPurchase,
}) => {
  const { purchases, settings, exchangeRate } = useApp();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>('date_desc');

  // Modal inspection
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

  // Download feedback indicator
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  // Extract unique suppliers from existing purchases
  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    purchases.forEach(p => {
      if (p.supplierName) {
        map.set(p.supplierName.trim(), p.supplierDoc ? `${p.supplierName.trim()} (${p.supplierDoc})` : p.supplierName.trim());
      }
    });
    return Array.from(map.entries()).map(([name, label]) => ({ name, label }));
  }, [purchases]);

  // Apply date preset changes
  const handleDatePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === '30days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'last_month') {
      const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDayPrevMonth.toISOString().slice(0, 10));
      setEndDate(lastDayPrevMonth.toISOString().slice(0, 10));
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSupplier('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
  };

  // Filter and sort logic
  const filteredPurchases = useMemo(() => {
    return purchases
      .filter(p => {
        // Search term filter (Invoice #, Supplier Name, Supplier Doc, or Product Names)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchesInvoice = p.invoiceNumber.toLowerCase().includes(term);
          const matchesSupplier = p.supplierName.toLowerCase().includes(term);
          const matchesDoc = (p.supplierDoc || '').toLowerCase().includes(term);
          const matchesProduct = p.items.some(
            item =>
              item.productName.toLowerCase().includes(term) ||
              item.sku.toLowerCase().includes(term)
          );

          if (!matchesInvoice && !matchesSupplier && !matchesDoc && !matchesProduct) {
            return false;
          }
        }

        // Supplier filter
        if (selectedSupplier !== 'all') {
          if (p.supplierName.trim().toLowerCase() !== selectedSupplier.trim().toLowerCase()) {
            return false;
          }
        }

        // Date range filter
        const purchaseDateStr = p.date.slice(0, 10);
        if (startDate && purchaseDateStr < startDate) {
          return false;
        }
        if (endDate && purchaseDateStr > endDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'total_desc') {
          return b.totalUSD - a.totalUSD;
        }
        if (sortBy === 'total_asc') {
          return a.totalUSD - b.totalUSD;
        }
        return 0;
      });
  }, [purchases, searchTerm, selectedSupplier, startDate, endDate, sortBy]);

  // Aggregate statistics for filtered list
  const summaryMetrics = useMemo(() => {
    const totalUSD = filteredPurchases.reduce((acc, p) => acc + p.totalUSD, 0);
    const subtotalUSD = filteredPurchases.reduce((acc, p) => acc + p.subtotalUSD, 0);
    const taxUSD = filteredPurchases.reduce((acc, p) => acc + p.taxUSD, 0);
    const totalLocal = filteredPurchases.reduce((acc, p) => acc + p.totalLocal, 0);
    const totalBultos = filteredPurchases.reduce(
      (acc, p) => acc + p.items.reduce((sum, item) => sum + item.packagesCount, 0),
      0
    );
    const totalUnits = filteredPurchases.reduce(
      (acc, p) => acc + p.items.reduce((sum, item) => sum + item.totalUnitsReceived, 0),
      0
    );

    return {
      count: filteredPurchases.length,
      totalUSD,
      subtotalUSD,
      taxUSD,
      totalLocal,
      totalBultos,
      totalUnits,
      avgUSD: filteredPurchases.length > 0 ? totalUSD / filteredPurchases.length : 0,
    };
  }, [filteredPurchases]);

  // Handle PDF reprint
  const handleReprintPDF = (purchase: PurchaseInvoice) => {
    setReprintingId(purchase.id);
    try {
      generatePurchaseInvoicePDF(purchase, settings);
    } finally {
      setTimeout(() => {
        setReprintingId(null);
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Historial de Facturas de Compras</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-mono">
                  {filteredPurchases.length} de {purchases.length}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulte, filtre por fecha y proveedor, y reimprima los comprobantes PDF de compras a proveedores.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNewPurchase && (
            <button
              onClick={onNewPurchase}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nueva Compra</span>
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('inventory')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Inventario</span>
            </button>
          )}

          <button
            onClick={() => exportPurchasesToExcel(filteredPurchases, settings)}
            disabled={filteredPurchases.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-100 disabled:text-slate-400 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Exportar facturas filtradas a Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invertido */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Compras Filtradas</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              ${summaryMetrics.totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-500 ml-1">USD</span>
            </div>
            <div className="text-xs font-mono text-emerald-700 font-semibold mt-0.5">
              {summaryMetrics.totalLocal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {settings.currencySymbol}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Subtotal: ${summaryMetrics.subtotalUSD.toFixed(2)}</span>
            <span>IVA: ${summaryMetrics.taxUSD.toFixed(2)}</span>
          </div>
        </div>

        {/* Facturas Procesadas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Comprobantes / Facturas</span>
            <FileText className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              {summaryMetrics.count}
              <span className="text-xs font-normal text-slate-500 ml-1">facturas</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Promedio: <span className="font-mono font-semibold">${summaryMetrics.avgUSD.toFixed(2)} USD</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Proveedores en catálogo: <strong className="text-slate-800">{uniqueSuppliers.length}</strong>
          </div>
        </div>

        {/* Bultos Recibidos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Bultos Recibidos</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              {summaryMetrics.totalBultos}
              <span className="text-xs font-normal text-slate-500 ml-1">bultos</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Equivalente a <span className="font-mono font-bold text-slate-900">{summaryMetrics.totalUnits}</span> unidades
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Ingreso directo a inventario mayorista
          </div>
        </div>

        {/* Tasa y Moneda */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tasa del Sistema</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              1$ = {exchangeRate.rate.toFixed(2)}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              {settings.currencyName} ({settings.currencySymbol})
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Conversión bimonetaria instantánea
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        {/* Row 1: Search + Supplier Dropdown + Sort */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Free text search */}
          <div className="md:col-span-5 relative">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Buscar por Factura, Proveedor o Producto:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="N° factura (ej. FACT-001), RIF o proveedor..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Supplier dropdown */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Filtrar por Proveedor:</span>
            </label>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todos los Proveedores ({uniqueSuppliers.length})</option>
              {uniqueSuppliers.map(s => (
                <option key={s.name} value={s.name}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Ordenar por:</span>
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="date_desc">Fecha: Más recientes primero</option>
              <option value="date_asc">Fecha: Más antiguas primero</option>
              <option value="total_desc">Monto: Mayor a menor ($)</option>
              <option value="total_asc">Monto: Menor a mayor ($)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Filters & Preset Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Período:</span>
            </span>

            {[
              { id: 'all', label: 'Todo' },
              { id: 'today', label: 'Hoy' },
              { id: '7days', label: 'Últimos 7 días' },
              { id: '30days', label: 'Últimos 30 días' },
              { id: 'this_month', label: 'Este Mes' },
              { id: 'last_month', label: 'Mes Pasado' },
              { id: 'custom', label: 'Personalizado' },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleDatePresetChange(preset.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date range pickers (always visible or enabled for custom) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {(searchTerm || selectedSupplier !== 'all' || startDate || endDate || datePreset !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table header bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              Facturas de Compra Registradas ({filteredPurchases.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Haga clic en <strong className="text-slate-700">Reimprimir PDF</strong> para descargar el documento fiscal.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">N° Factura</th>
                <th className="py-3 px-4">Fecha Emisión</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Mercancía Recibida</th>
                <th className="py-3 px-4">Forma de Pago</th>
                <th className="py-3 px-4 text-right">Total Factura (USD)</th>
                <th className="py-3 px-4 text-right">Total ({settings.currencySymbol})</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">No se encontraron facturas de compras</p>
                      <p className="text-xs text-slate-400">
                        Pruebe ajustando los filtros de fecha o proveedor, o registre una nueva compra en el sistema.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(purchase => {
                  const bultosTotal = purchase.items.reduce((acc, item) => acc + item.packagesCount, 0);
                  const unidadesTotal = purchase.items.reduce((acc, item) => acc + item.totalUnitsReceived, 0);
                  const isReprinting = reprintingId === purchase.id;

                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-100 text-slate-900 rounded border border-slate-200">
                            {purchase.invoiceNumber}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        <div className="font-medium text-xs text-slate-800">
                          {new Date(purchase.date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(purchase.date).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {purchase.supplierName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          RIF: {purchase.supplierDoc || 'Sin RIF'}
                          {purchase.supplierPhone ? ` · ${purchase.supplierPhone}` : ''}
                        </div>
                      </td>

                      {/* Items & Packages */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-slate-800">
                          {purchase.items.length} producto(s)
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {bultosTotal} bultos · {unidadesTotal} unidades
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                          {purchase.paymentMethod}
                        </span>
                      </td>

                      {/* Total USD */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          ${purchase.totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          IVA: ${purchase.taxUSD.toFixed(2)} ({purchase.taxPercent}%)
                        </div>
                      </td>

                      {/* Total Local Currency */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-xs text-emerald-700">
                          {purchase.totalLocal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                          <span className="text-[10px] font-normal">{purchase.currencySymbol}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Tasa: {purchase.exchangeRate.toFixed(2)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Reprint PDF button */}
                          <button
                            type="button"
                            onClick={() => handleReprintPDF(purchase)}
                            disabled={isReprinting}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-2xs"
                            title="Reimprimir o descargar Factura de Compra en PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{isReprinting ? 'Generando...' : 'Reimprimir PDF'}</span>
                          </button>

                          {/* View details modal button */}
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(purchase)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                            title="Ver detalles de la factura"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <PurchaseInvoiceModal
          purchase={selectedInvoice}
          settings={settings}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

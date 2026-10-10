import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Download,
  FileText,
  Eye,
  Calendar,
  CreditCard,
  User,
  Filter,
} from 'lucide-react';
import { Sale } from '../../types';
import { generateInvoicePDF, generateSalesReportPDF } from '../../utils/pdfGenerator';
import { exportSalesToExcel } from '../../utils/excelGenerator';
import { InvoiceModal } from '../pos/InvoiceModal';

export const SalesView: React.FC = () => {
  const { sales, settings, exchangeRate } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedSaleToView, setSelectedSaleToView] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchesSearch =
        s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPayment =
        selectedPaymentMethod === 'all' || s.paymentMethod === selectedPaymentMethod;
      return matchesSearch && matchesPayment;
    });
  }, [sales, searchTerm, selectedPaymentMethod]);

  const { totalFilteredUSD, totalFilteredLocal } = useMemo(() => {
    let usd = 0;
    let local = 0;
    for (const s of filteredSales) {
      usd += s.totalUSD;
      local += s.totalLocal;
    }
    return { totalFilteredUSD: usd, totalFilteredLocal: local };
  }, [filteredSales]);

  const formatPaymentLabel = (m: string) => {
    switch (m) {
      case 'efectivo_usd': return 'Efectivo Divisas ($)';
      case 'efectivo_local': return 'Efectivo Moneda Local';
      case 'pago_movil': return 'Pago Móvil';
      case 'tarjeta': return 'Tarjeta / Punto de Venta';
      case 'transferencia': return 'Transferencia Bancaria';
      case 'mixto': return 'Pago Mixto';
      default: return m;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Registro y Facturación de Ventas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Historial de facturas comerciales emitidas, consulta de comprobantes fiscales y exportación en PDF/Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSalesToExcel(filteredSales, settings)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => generateSalesReportPDF(filteredSales, 'Reporte de Ventas', settings)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generar Reporte PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and summary banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por N° factura, nombre del cliente o cajero..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">Método de Pago:</label>
            <select
              value={selectedPaymentMethod}
              onChange={e => setSelectedPaymentMethod(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none"
            >
              <option value="all">Todos los Métodos</option>
              <option value="efectivo_usd">Efectivo Divisas ($)</option>
              <option value="efectivo_local">Efectivo Moneda Local</option>
              <option value="pago_movil">Pago Móvil</option>
              <option value="tarjeta">Tarjeta / POS</option>
              <option value="transferencia">Transferencia</option>
              <option value="mixto">Pago Mixto</option>
            </select>
          </div>
        </div>

        {/* Stats summary bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
          <div>
            Total Facturas Listadas: <strong className="font-mono-numbers text-slate-900">{filteredSales.length}</strong>
          </div>
          <div className="flex items-center gap-4">
            <div>
              Monto Total USD: <strong className="font-mono-numbers text-slate-900">${totalFilteredUSD.toFixed(2)}</strong>
            </div>
            <div>
              Monto en {settings.currencySymbol}: <strong className="font-mono-numbers text-emerald-700">{totalFilteredLocal.toFixed(2)} {settings.currencySymbol}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">N° Factura</th>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Cajero</th>
                <th className="py-3 px-3">Método de Pago</th>
                <th className="py-3 px-3 text-right">Tasa Aplicada</th>
                <th className="py-3 px-3 text-right">Total USD</th>
                <th className="py-3 px-3 text-right">Total {settings.currencySymbol}</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No se encontraron facturas con los filtros indicados.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono-numbers font-bold text-slate-900">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      <div>{new Date(sale.date).toLocaleDateString('es-ES')}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(sale.date).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium">
                      <div className="text-slate-900">{sale.clientName}</div>
                      <div className="text-[10px] text-slate-400">{sale.clientDoc || 'Consumidor Final'}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{sale.userName}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        sale.payments && sale.payments.length > 1
                          ? 'bg-purple-100 text-purple-800 font-bold'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {sale.payments && sale.payments.length > 1
                          ? `Pago Mixto (${sale.payments.length})`
                          : formatPaymentLabel(sale.paymentMethod)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-500">
                      {sale.exchangeRate.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900 text-sm">
                      ${sale.totalUSD.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers font-semibold text-emerald-700">
                      {sale.totalLocal.toFixed(2)} {sale.currencySymbol}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSaleToView(sale)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Visualizar comprobante"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => generateInvoicePDF(sale, settings)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                          title="Descargar Factura PDF"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Viewer Modal */}
      {selectedSaleToView && (
        <InvoiceModal
          sale={selectedSaleToView}
          settings={settings}
          onClose={() => setSelectedSaleToView(null)}
          onNewSale={() => setSelectedSaleToView(null)}
        />
      )}
    </div>
  );
};

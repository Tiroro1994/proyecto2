import React from 'react';
import { PurchaseInvoice, StoreSettings } from '../../types';
import { generatePurchaseInvoicePDF } from '../../utils/pdfGenerator';
import { Printer, Download, CheckCircle, ArrowLeft, Receipt, Truck } from 'lucide-react';

interface PurchaseInvoiceModalProps {
  purchase: PurchaseInvoice | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({
  purchase,
  settings,
  onClose,
}) => {
  if (!purchase) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generatePurchaseInvoicePDF(purchase, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold text-sm block">Factura de Compra de Proveedor</span>
              <span className="text-[11px] text-slate-300 font-mono-numbers">
                N° {purchase.invoiceNumber}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="p-6 overflow-y-auto max-h-[62vh] bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            className="bg-white shadow-sm border border-slate-200 p-6 w-full text-xs font-sans"
          >
            {/* Header */}
            <div className="border-b border-dashed border-slate-300 pb-3 mb-3 flex items-start justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-tight">
                  {settings.companyName}
                </h2>
                <p className="text-[11px] text-slate-500">Comprobante de Recepción de Mercancía</p>
                <p className="text-[11px] text-slate-500">RIF: {settings.companyDoc} · Tel: {settings.companyPhone}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-700 text-xs font-mono-numbers block">
                  FACTURA: {purchase.invoiceNumber}
                </span>
                <p className="text-[10px] text-slate-400">
                  Fecha: {new Date(purchase.date).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>

            {/* Supplier & Receipt Info */}
            <div className="mb-4 pb-3 border-b border-dashed border-slate-300 grid grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="font-bold text-slate-700 block text-[10px] uppercase">Proveedor:</span>
                <p className="font-semibold text-slate-900">{purchase.supplierName}</p>
                <p className="text-[11px] font-mono-numbers text-slate-500">RIF/Doc: {purchase.supplierDoc}</p>
                {purchase.supplierPhone && (
                  <p className="text-[11px] text-slate-500">Tel: {purchase.supplierPhone}</p>
                )}
              </div>
              <div>
                <span className="font-bold text-slate-700 block text-[10px] uppercase">Recepción y Pago:</span>
                <p className="text-[11px] text-slate-800">Recibido por: <strong>{purchase.registeredBy}</strong></p>
                <p className="text-[11px] text-slate-800">Forma de Pago: {purchase.paymentMethod}</p>
                <p className="text-[11px] font-mono-numbers text-slate-800">
                  Tasa: 1 USD = {purchase.exchangeRate.toFixed(2)} {purchase.currencySymbol}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left mb-4">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600 bg-slate-50">
                  <th className="py-1.5 px-2">Código</th>
                  <th className="py-1.5 px-2">Producto</th>
                  <th className="py-1.5 px-2">Bultos/Unidades</th>
                  <th className="py-1.5 px-2 text-right">Costo Bulto</th>
                  <th className="py-1.5 px-2 text-right">Costo Unit. Calc.</th>
                  <th className="py-1.5 px-2 text-right">Subtotal ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchase.items.map((item, idx) => (
                  <tr key={idx} className="py-1.5">
                    <td className="py-2 px-2 font-mono-numbers text-slate-500">{item.sku}</td>
                    <td className="py-2 px-2 font-medium text-slate-900">{item.productName}</td>
                    <td className="py-2 px-2">
                      <span className="font-mono-numbers font-bold text-slate-900">{item.packagesCount} bultos</span>{' '}
                      <span className="text-[10px] text-slate-500">(x{item.unitsPerPackage} = {item.totalUnitsReceived} un.)</span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono-numbers text-slate-700">
                      ${item.costPackageUSD.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-numbers font-bold text-emerald-700">
                      ${item.calculatedCostUnitUSD.toFixed(3)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-numbers font-bold text-slate-900">
                      ${item.subtotalUSD.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Box */}
            <div className="border-t border-dashed border-slate-300 pt-3 flex justify-end">
              <div className="w-64 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal Base:</span>
                  <span className="font-mono-numbers font-medium">${purchase.subtotalUSD.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA Crédito Fiscal ({purchase.taxPercent}%):</span>
                  <span className="font-mono-numbers font-medium">${purchase.taxUSD.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-300 font-bold text-sm text-slate-900">
                  <span>TOTAL COMPRA USD:</span>
                  <span className="font-mono-numbers">${purchase.totalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 text-sm">
                  <span>TOTAL {purchase.currencySymbol}:</span>
                  <span className="font-mono-numbers">
                    {purchase.totalLocal.toFixed(2)} {purchase.currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            {purchase.notes && (
              <div className="mt-4 p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600">
                <strong>Notas de Entrega:</strong> {purchase.notes}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md bg-white hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Factura</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

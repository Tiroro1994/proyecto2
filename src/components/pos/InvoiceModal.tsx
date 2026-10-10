import React, { useState } from 'react';
import { Sale, StoreSettings } from '../../types';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { Printer, Download, CheckCircle, ArrowLeft, Receipt, FileText } from 'lucide-react';

interface InvoiceModalProps {
  sale: Sale | null;
  settings: StoreSettings;
  onClose: () => void;
  onNewSale: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  settings,
  onClose,
  onNewSale,
}) => {
  const [formatMode, setFormatMode] = useState<'ticket' | 'formal'>('formal');

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateInvoicePDF(sale, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold text-sm block">Venta Procesada Exitosamente</span>
              <span className="text-[11px] text-slate-300 font-mono-numbers">{sale.invoiceNumber}</span>
            </div>
          </div>

          {/* Toggle ticket / formal format */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFormatMode('formal')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                formatMode === 'formal' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Factura A4</span>
            </button>
            <button
              onClick={() => setFormatMode('ticket')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                formatMode === 'ticket' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Ticket 80mm</span>
            </button>
          </div>
        </div>

        {/* Invoice Printable Viewport */}
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            className={`bg-white shadow-sm border border-slate-200 p-6 ${
              formatMode === 'ticket' ? 'w-80 text-xs font-mono' : 'w-full text-xs font-sans'
            }`}
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
              <h2 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">
                {settings.companyName}
              </h2>
              <p className="text-[11px] text-slate-500">RIF/NIT: {settings.companyDoc}</p>
              <p className="text-[11px] text-slate-500">{settings.companyAddress}</p>
              <p className="text-[11px] text-slate-500">Tel: {settings.companyPhone}</p>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900 text-xs">FACTURA N°: {sale.invoiceNumber}</span>
                <p className="text-[10px] text-slate-400">
                  {new Date(sale.date).toLocaleString('es-ES')}
                </p>
              </div>
            </div>

            {/* Client info */}
            <div className="mb-3 pb-3 border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold text-slate-900">{sale.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Documento:</span>
                <span className="font-medium text-slate-800">{sale.clientDoc || 'Consumidor Final'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cajero:</span>
                <span className="text-slate-700">{sale.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tasa de Cambio:</span>
                <span className="font-mono-numbers font-medium text-slate-900">
                  1 USD = {sale.exchangeRate.toFixed(2)} {sale.currencySymbol}
                </span>
              </div>
            </div>

            {/* Items table */}
            <table className="w-full text-left mb-3">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600">
                  <th className="py-1">Cant/Tipo</th>
                  <th className="py-1">Descripción</th>
                  <th className="py-1 text-right">P.U ($)</th>
                  <th className="py-1 text-right">Total ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1.5 align-top">
                      <span className="font-mono-numbers font-bold text-slate-900">
                        {item.quantity}
                      </span>{' '}
                      <span className="text-[10px] text-slate-500 uppercase">
                        {item.unitType === 'package' ? `Bulto(x${item.unitsPerPackage})` : 'Unid'}
                      </span>
                    </td>
                    <td className="py-1.5 align-top pr-2">
                      <div className="font-medium text-slate-900">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono-numbers">{item.sku}</div>
                    </td>
                    <td className="py-1.5 align-top text-right font-mono-numbers text-slate-600">
                      ${item.unitPriceUSD.toFixed(2)}
                    </td>
                    <td className="py-1.5 align-top text-right font-mono-numbers font-bold text-slate-900">
                      ${item.subtotalUSD.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-dashed border-slate-300 pt-3 space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal USD:</span>
                <span className="font-mono-numbers">${sale.subtotalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Impuesto IVA ({sale.taxPercent}%):</span>
                <span className="font-mono-numbers">${sale.taxUSD.toFixed(2)}</span>
              </div>
              {sale.discountUSD > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento:</span>
                  <span className="font-mono-numbers">-${sale.discountUSD.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-300 font-bold text-sm text-slate-900">
                <span>TOTAL USD:</span>
                <span className="font-mono-numbers">${sale.totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700 text-sm">
                <span>TOTAL {sale.currencySymbol}:</span>
                <span className="font-mono-numbers">
                  {sale.totalLocal.toFixed(2)} {sale.currencySymbol}
                </span>
              </div>

              {/* Desglose de Formas de Pago */}
              {sale.payments && sale.payments.length > 0 ? (
                <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    {sale.payments.length > 1 ? 'Desglose de Pago Mixto:' : 'Forma de Pago:'}
                  </div>
                  {sale.payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                      <span>
                        • {p.method === 'efectivo_usd' ? 'Efectivo Divisas ($)' :
                           p.method === 'pago_movil' ? 'Pago Móvil' :
                           p.method === 'tarjeta' ? 'Punto de Venta' :
                           p.method === 'efectivo_local' ? 'Efectivo Moneda Local' :
                           p.method === 'transferencia' ? 'Transferencia' : p.method}
                        {p.reference ? ` [Ref: ${p.reference}]` : ''}:
                      </span>
                      <span className="font-mono-numbers font-medium text-slate-900">
                        ${p.amountUSD.toFixed(2)} USD
                        {p.currency === 'LOCAL' || p.amountLocal > 0 ? (
                          <span className="text-[10px] text-slate-500 ml-1">
                            ({p.amountLocal.toFixed(2)} {sale.currencySymbol})
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[11px] text-slate-600 pt-1 border-t border-dashed border-slate-200 font-semibold">
                    <span>Total Pagado:</span>
                    <span className="font-mono-numbers">${(sale.amountPaidUSD || sale.totalUSD).toFixed(2)} USD</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Método de Pago:</span>
                  <span className="font-medium text-slate-800">
                    {sale.paymentMethod === 'efectivo_usd' ? 'Efectivo Divisas ($)' :
                     sale.paymentMethod === 'pago_movil' ? 'Pago Móvil' :
                     sale.paymentMethod === 'tarjeta' ? 'Punto de Venta / Tarjeta' :
                     sale.paymentMethod === 'efectivo_local' ? 'Efectivo Moneda Local' :
                     sale.paymentMethod === 'transferencia' ? 'Transferencia' : 'Pago Mixto'}
                  </span>
                </div>
              )}

              {sale.changeUSD !== undefined && sale.changeUSD > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-700 font-bold pt-1 border-t border-slate-200">
                  <span>Vuelto / Cambio:</span>
                  <span className="font-mono-numbers">
                    ${sale.changeUSD.toFixed(2)} USD
                    <span className="text-[10px] font-normal text-emerald-600 block text-right">
                      ≈ {(sale.changeLocal || sale.changeUSD * sale.exchangeRate).toFixed(2)} {sale.currencySymbol}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-4 pt-3 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
              <p>{settings.receiptFooterMessage}</p>
              <p className="mt-1">Sistema InvBulto POS · Facturación Dual</p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => {
              onClose();
              onNewSale();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Nueva Venta</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Factura PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

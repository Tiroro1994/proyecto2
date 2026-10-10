import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  Plus,
  Search,
  Download,
  FileText,
  Printer,
  Eye,
  Trash2,
  Package,
  Layers,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { PurchaseInvoice, PurchaseItem, Product } from '../../types';
import { generatePurchaseInvoicePDF } from '../../utils/pdfGenerator';
import { exportPurchasesToExcel } from '../../utils/excelGenerator';
import { PurchaseInvoiceModal } from './PurchaseInvoiceModal';
import { PurchaseHistoryView } from './PurchaseHistoryView';
import { FormFieldError, getInputErrorClass } from '../common/FormFieldError';

interface PurchaseFormRow {
  productId: string;
  packagesCount: number;
  unitsPerPackage: number;
  looseUnits: number;
  costPackageUSD: number;
  taxPercent: number;
  newPriceUnitUSD: number;
  newPricePackageUSD: number;
}

interface PurchasesViewProps {
  onNavigate?: (tab: string) => void;
  initialTab?: 'register' | 'history';
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  onNavigate,
  initialTab = 'register',
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'history'>(initialTab);
  const {
    products,
    purchases,
    processPurchase,
    exchangeRate,
    settings,
    hasPermission,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchaseToView, setSelectedPurchaseToView] = useState<PurchaseInvoice | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for adding purchase invoice
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierDoc, setSupplierDoc] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Transferencia USD');
  const [globalTaxPercent, setGlobalTaxPercent] = useState(16);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { triggerErrorSignal } = useApp();

  // Dynamic Item Rows
  const [rows, setRows] = useState<PurchaseFormRow[]>(() => {
    const defaultProd = products[0];
    if (!defaultProd) return [];
    return [
      {
        productId: defaultProd.id,
        packagesCount: 1,
        unitsPerPackage: defaultProd.unitsPerPackage || 12,
        looseUnits: 0,
        costPackageUSD: defaultProd.costPackageUSD || 10.0,
        taxPercent: 16,
        newPriceUnitUSD: defaultProd.priceUnitUSD || 1.0,
        newPricePackageUSD: defaultProd.pricePackageUSD || 12.0,
      },
    ];
  });

  const openNewPurchaseModal = () => {
    setInvoiceNumber(`COMP-${Date.now().toString().slice(-4)}`);
    setSupplierName('');
    setSupplierDoc('');
    setSupplierPhone('');
    setSupplierAddress('');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Transferencia USD');
    setGlobalTaxPercent(settings.taxRatePercent || 16);
    setPurchaseNotes('');
    setFormError(null);
    setFieldErrors({});

    const firstProd = products[0];
    if (firstProd) {
      setRows([
        {
          productId: firstProd.id,
          packagesCount: 1,
          unitsPerPackage: firstProd.unitsPerPackage || 12,
          looseUnits: 0,
          costPackageUSD: firstProd.costPackageUSD || 10.0,
          taxPercent: settings.taxRatePercent || 16,
          newPriceUnitUSD: firstProd.priceUnitUSD || 1.0,
          newPricePackageUSD: firstProd.pricePackageUSD || 12.0,
        },
      ]);
    } else {
      setRows([]);
    }
    setIsAddModalOpen(true);
  };

  const filteredPurchases = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return purchases;
    return purchases.filter(p => {
      return (
        p.invoiceNumber.toLowerCase().includes(term) ||
        p.supplierName.toLowerCase().includes(term) ||
        p.supplierDoc.toLowerCase().includes(term)
      );
    });
  }, [purchases, searchTerm]);

  // Financial KPIs memoized for optimal performance
  const { totalPurchasesUSD, totalPurchasesLocal, totalTaxCreditUSD } = useMemo(() => {
    const usd = purchases.reduce((acc, p) => acc + (p.totalUSD || 0), 0);
    const tax = purchases.reduce((acc, p) => acc + (p.taxUSD || 0), 0);
    return {
      totalPurchasesUSD: usd,
      totalPurchasesLocal: usd * exchangeRate.rate,
      totalTaxCreditUSD: tax,
    };
  }, [purchases, exchangeRate.rate]);

  // Row update handlers
  const handleProductChange = (rowIndex: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    setRows(prev => {
      const next = [...prev];
      next[rowIndex] = {
        ...next[rowIndex],
        productId: prod.id,
        unitsPerPackage: prod.unitsPerPackage,
        costPackageUSD: prod.costPackageUSD,
        newPriceUnitUSD: prod.priceUnitUSD,
        newPricePackageUSD: prod.pricePackageUSD,
      };
      return next;
    });
  };

  const handleRowChange = (rowIndex: number, field: keyof PurchaseFormRow, value: any) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
  };

  const handleAddRow = () => {
    const defaultProd = products[0];
    setRows(prev => [
      ...prev,
      {
        productId: defaultProd?.id || '',
        packagesCount: 1,
        unitsPerPackage: defaultProd?.unitsPerPackage || 12,
        looseUnits: 0,
        costPackageUSD: defaultProd?.costPackageUSD || 10,
        taxPercent: globalTaxPercent,
        newPriceUnitUSD: defaultProd?.priceUnitUSD || 1.5,
        newPricePackageUSD: defaultProd?.pricePackageUSD || 15,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, idx) => idx !== index));
  };

  // Live calculation of current modal purchase totals
  const modalSubtotalUSD = rows.reduce((acc, row) => {
    const unitCost = row.unitsPerPackage > 0 ? row.costPackageUSD / row.unitsPerPackage : row.costPackageUSD;
    return acc + (row.packagesCount * row.costPackageUSD) + (row.looseUnits * unitCost);
  }, 0);

  const modalTaxUSD = (modalSubtotalUSD * globalTaxPercent) / 100;
  const modalTotalUSD = modalSubtotalUSD + modalTaxUSD;
  const modalTotalLocal = modalTotalUSD * exchangeRate.rate;

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors: Record<string, string> = {};

    const cleanInvoiceNumber = invoiceNumber.trim();
    const cleanSupplierName = supplierName.trim();
    const cleanSupplierDoc = supplierDoc.trim();

    if (!cleanInvoiceNumber) {
      errors.invoiceNumber = '⚠️ Este campo no se rellenó (N° de factura obligatorio)';
    }

    if (!cleanSupplierName) {
      errors.supplierName = '⚠️ Este campo no se rellenó (Nombre de proveedor obligatorio)';
    }

    if (!cleanSupplierDoc) {
      errors.supplierDoc = '⚠️ Este campo no se rellenó (RIF / Doc obligatorio)';
    }

    if (rows.length === 0) {
      errors.items = '⚠️ Debe incluir al menos un producto en la compra';
    } else if (rows.some(r => Number(r.packagesCount) <= 0 && Number(r.looseUnits) <= 0)) {
      errors.items = '⚠️ Debe ingresar al menos 1 bulto o 1 unidad en cada renglón de compra';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      setFormError('⚠️ Señal de Error: Hay campos obligatorios sin rellenar en la factura de compra.');
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error: Campo sin rellenar en Compras',
        message: `No se rellenó un campo obligatorio (${firstField}) al registrar factura de compra.`,
        fieldName: firstField,
        severity: 'warning',
      });
      return;
    }

    setFieldErrors({});

    const itemsPayload = rows.map(r => {
      const prod = products.find(p => p.id === r.productId);
      return {
        productId: r.productId,
        productName: prod?.name || 'Producto',
        sku: prod?.sku || 'SKU',
        packagesCount: Number(r.packagesCount) || 0,
        unitsPerPackage: Number(r.unitsPerPackage) || 1,
        looseUnits: Number(r.looseUnits) || 0,
        costPackageUSD: Number(r.costPackageUSD) || 0,
        newPriceUnitUSD: Number(r.newPriceUnitUSD) || 0,
        newPricePackageUSD: Number(r.newPricePackageUSD) || 0,
        taxPercent: Number(r.taxPercent) || 0,
      };
    });

    const res = processPurchase({
      invoiceNumber: cleanInvoiceNumber,
      supplierName: cleanSupplierName,
      supplierDoc: cleanSupplierDoc,
      supplierPhone: supplierPhone.trim(),
      supplierAddress: supplierAddress.trim(),
      date: invoiceDate,
      paymentMethod,
      taxPercent: globalTaxPercent,
      notes: purchaseNotes,
      items: itemsPayload,
    });

    if (res.success && res.purchase) {
      setIsAddModalOpen(false);
      setSelectedPurchaseToView(res.purchase);
      // Reset form
      setInvoiceNumber('');
      setSupplierName('');
      setSupplierDoc('');
      setSupplierPhone('');
      setPurchaseNotes('');
    } else {
      setFormError(res.error || 'Ocurrió un error al procesar la factura de compra.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>Compras de Productos y Facturas de Proveedores</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre recepción de mercancía por bulto, calcule el costo unitario automático, controle el IVA de compra y actualice el inventario.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('canManagePurchases') && (
            <button
              onClick={openNewPurchaseModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Factura de Compra</span>
            </button>
          )}

          <button
            onClick={() => exportPurchasesToExcel(purchases, settings)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            title="Exportar compras a Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('register')}
          className={`py-2 px-4 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'register'
              ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar / Entrada de Mercancía</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-2 px-4 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Historial de Facturas de Compras ({purchases.length})</span>
        </button>
      </div>

      {activeTab === 'history' ? (
        <PurchaseHistoryView
          onNavigate={onNavigate}
          onNewPurchase={() => {
            setActiveTab('register');
            openNewPurchaseModal();
          }}
        />
      ) : (
        <>
          {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">Total Compras Acumuladas</span>
          <div className="mt-1 text-2xl font-bold font-mono-numbers text-slate-900">
            ${totalPurchasesUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
          </div>
          <p className="text-[11px] font-mono-numbers text-emerald-700 mt-0.5 font-semibold">
            {totalPurchasesLocal.toFixed(2)} {settings.currencySymbol}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">IVA Crédito Fiscal Pagado</span>
          <div className="mt-1 text-2xl font-bold font-mono-numbers text-slate-800">
            ${totalTaxCreditUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Deducible en declaraciones fiscales
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">Facturas de Compra</span>
          <div className="mt-1 text-2xl font-bold font-mono-numbers text-slate-900">
            {purchases.length} <span className="text-xs font-normal text-slate-500">recibidas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Con auditoría de recepción a almacén
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">Tasa de Conversión Vigente</span>
          <div className="mt-1 text-2xl font-bold font-mono-numbers text-slate-900">
            {exchangeRate.rate.toFixed(2)} <span className="text-xs font-normal text-slate-500">{settings.currencySymbol}/USD</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Precios sincronizados al día
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por N° factura de proveedor, nombre del proveedor o RIF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Purchases List Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">N° Factura Prov.</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Proveedor / Razón</th>
                <th className="py-3 px-3">Renglones</th>
                <th className="py-3 px-3">Forma de Pago</th>
                <th className="py-3 px-3 text-right">Subtotal ($)</th>
                <th className="py-3 px-3 text-right">IVA Compra</th>
                <th className="py-3 px-3 text-right">Total USD</th>
                <th className="py-3 px-3 text-right">Total {settings.currencySymbol}</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    No hay facturas de compra registradas.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono-numbers font-bold text-slate-900">
                      {purchase.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono-numbers">
                      {new Date(purchase.date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-3 px-3 font-medium">
                      <div className="text-slate-900 font-semibold">{purchase.supplierName}</div>
                      <div className="text-[10px] text-slate-400 font-mono-numbers">{purchase.supplierDoc}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {purchase.items.length} producto(s)
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 font-medium">
                        {purchase.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-600">
                      ${purchase.subtotalUSD.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-600">
                      ${purchase.taxUSD.toFixed(2)} ({purchase.taxPercent}%)
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900 text-sm">
                      ${purchase.totalUSD.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers font-semibold text-emerald-700">
                      {purchase.totalLocal.toFixed(2)} {purchase.currencySymbol}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedPurchaseToView(purchase)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Ver e Imprimir Comprobante"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => generatePurchaseInvoicePDF(purchase, settings)}
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
      </>
      )}

      {/* Modal: Registrar Factura de Compra */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto flex flex-col overflow-hidden max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Registrar Factura de Compra de Mercancía</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPurchase} className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Supplier and Invoice Metadata */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Datos del Proveedor y Factura
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      N° Factura Proveedor *
                    </label>
                    <input
                      type="text"
                      placeholder="FAC-00892"
                      value={invoiceNumber}
                      onChange={e => {
                        setInvoiceNumber(e.target.value);
                        if (fieldErrors.invoiceNumber) setFieldErrors({ ...fieldErrors, invoiceNumber: '' });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded font-mono-numbers font-bold text-slate-900 focus:outline-none transition-all ${getInputErrorClass(
                        !!fieldErrors.invoiceNumber,
                        'bg-white border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                      )}`}
                    />
                    <FormFieldError error={fieldErrors.invoiceNumber} />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nombre o Razón Social Proveedor *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Molinos del Valle C.A."
                      value={supplierName}
                      onChange={e => {
                        setSupplierName(e.target.value);
                        if (fieldErrors.supplierName) setFieldErrors({ ...fieldErrors, supplierName: '' });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded text-slate-900 focus:outline-none transition-all ${getInputErrorClass(
                        !!fieldErrors.supplierName,
                        'bg-white border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                      )}`}
                    />
                    <FormFieldError error={fieldErrors.supplierName} />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      RIF / NIT / Doc Proveedor *
                    </label>
                    <input
                      type="text"
                      placeholder="J-40981234-5"
                      value={supplierDoc}
                      onChange={e => {
                        setSupplierDoc(e.target.value);
                        if (fieldErrors.supplierDoc) setFieldErrors({ ...fieldErrors, supplierDoc: '' });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded font-mono-numbers text-slate-900 focus:outline-none transition-all ${getInputErrorClass(
                        !!fieldErrors.supplierDoc,
                        'bg-white border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                      )}`}
                    />
                    <FormFieldError error={fieldErrors.supplierDoc} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fecha Emisión *</label>
                    <input
                      type="date"
                      required
                      value={invoiceDate}
                      onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono-numbers text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Método de Pago</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Transferencia USD">Transferencia USD</option>
                      <option value="Efectivo USD">Efectivo USD ($)</option>
                      <option value="Transferencia Local">Transferencia Local</option>
                      <option value="Pago Móvil">Pago Móvil</option>
                      <option value="Crédito 15 días">Crédito Comercial (15 días)</option>
                      <option value="Crédito 30 días">Crédito Comercial (30 días)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">IVA Compra Global (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={globalTaxPercent}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setGlobalTaxPercent(val);
                        setRows(rows.map(r => ({ ...r, taxPercent: val })));
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono-numbers text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Teléfono Proveedor</label>
                    <input
                      type="text"
                      placeholder="+58 414 0000000"
                      value={supplierPhone}
                      onChange={e => setSupplierPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Renglones de Productos Comprados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Renglones de Mercancía Recibida (Bultos y Unidades)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Producto</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {rows.map((row, idx) => {
                    const unitCostCalculated = row.unitsPerPackage > 0
                      ? (row.costPackageUSD / row.unitsPerPackage)
                      : row.costPackageUSD;
                    const totalUnitsInRow = (row.packagesCount * row.unitsPerPackage) + (row.looseUnits || 0);
                    const lineSubtotal = (row.packagesCount * row.costPackageUSD) + (row.looseUnits * unitCostCalculated);

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 text-[11px]">
                            Renglón #{idx + 1}
                          </span>
                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                              title="Eliminar este renglón"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Product selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Producto del Catálogo:
                            </label>
                            <select
                              value={row.productId}
                              onChange={e => handleProductChange(idx, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}) - {p.unitsPerPackage} un/{p.packageLabel}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Cantidad Bultos */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Cant. Bultos:
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={row.packagesCount}
                              onChange={e => handleRowChange(idx, 'packagesCount', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono-numbers text-slate-900 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          {/* Unidades por bulto */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Unid./Bulto:
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={row.unitsPerPackage}
                              onChange={e => handleRowChange(idx, 'unitsPerPackage', parseInt(e.target.value) || 1)}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono-numbers text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          {/* Precio de compra por bulto */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Precio Compra Bulto ($):
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={row.costPackageUSD}
                              onChange={e => handleRowChange(idx, 'costPackageUSD', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono-numbers font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Calculated Unit Price and Selling Price update */}
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/70 rounded-md grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                          {/* Automatic Unit Price display */}
                          <div>
                            <span className="text-[10px] font-bold uppercase text-emerald-900 block">
                              Costo Unitario Calculado:
                            </span>
                            <span className="font-mono-numbers font-extrabold text-sm text-emerald-700">
                              ${unitCostCalculated.toFixed(3)} <span className="text-[10px] font-normal text-emerald-600">/ unidad</span>
                            </span>
                            <span className="text-[9px] text-emerald-600 block">
                              (${row.costPackageUSD} ÷ {row.unitsPerPackage} un.)
                            </span>
                          </div>

                          {/* Units to receive */}
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-600 block">
                              Total Unidades a Ingresar:
                            </span>
                            <span className="font-mono-numbers font-bold text-slate-800 text-xs">
                              {totalUnitsInRow} unidades
                            </span>
                          </div>

                          {/* Update selling unit price */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block">
                              Nuevo P. Venta Unitario ($):
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.newPriceUnitUSD}
                              onChange={e => handleRowChange(idx, 'newPriceUnitUSD', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono-numbers text-xs text-slate-900 focus:outline-none"
                            />
                          </div>

                          {/* Subtotal of row */}
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-600 block">
                              Subtotal Renglón:
                            </span>
                            <span className="font-mono-numbers font-extrabold text-slate-900 text-sm">
                              ${lineSubtotal.toFixed(2)} USD
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Purchase Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notas de Recepción o N° de Guía de Transporte
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Mercancía verificada y contada en galpón. Bultos en perfecto estado."
                  value={purchaseNotes}
                  onChange={e => setPurchaseNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Totals Summary strip */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-slate-600">
                    Subtotal Base Imponible: <strong className="font-mono-numbers text-slate-900">${modalSubtotalUSD.toFixed(2)} USD</strong>
                  </div>
                  <div className="text-slate-600">
                    IVA Crédito Fiscal ({globalTaxPercent}%): <strong className="font-mono-numbers text-slate-900">${modalTaxUSD.toFixed(2)} USD</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    TOTAL FACTURA COMPRA:
                  </span>
                  <div className="font-mono-numbers font-extrabold text-xl text-slate-900">
                    ${modalTotalUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
                  </div>
                  <div className="font-mono-numbers text-xs font-bold text-emerald-700">
                    {modalTotalLocal.toFixed(2)} {settings.currencySymbol}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Al confirmar, las unidades se sumarán al stock de cada producto y sus costos se actualizarán.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded cursor-pointer shadow-xs"
                  >
                    Guardar e Ingresar a Inventario
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer and Printable Modal */}
      {selectedPurchaseToView && (
        <PurchaseInvoiceModal
          purchase={selectedPurchaseToView}
          settings={settings}
          onClose={() => setSelectedPurchaseToView(null)}
        />
      )}
    </div>
  );
};

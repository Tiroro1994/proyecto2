import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRightLeft,
  UserCheck,
  CreditCard,
  DollarSign,
  AlertCircle,
  Package,
  Layers,
  Check,
  X,
  PlusCircle,
} from 'lucide-react';
import { Product, PaymentMethod, Client, PaymentBreakdown } from '../../types';
import { InvoiceModal } from './InvoiceModal';
import { FormFieldError, getInputErrorClass } from '../common/FormFieldError';

export interface PosPaymentRow {
  id: string;
  method: PaymentMethod;
  currency: 'USD' | 'LOCAL';
  amount: string;
  reference: string;
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'efectivo_usd', label: 'Efectivo Divisas ($)', icon: '💵' },
  { value: 'pago_movil', label: 'Pago Móvil', icon: '📱' },
  { value: 'tarjeta', label: 'Punto de Venta / Tarjeta', icon: '💳' },
  { value: 'efectivo_local', label: 'Efectivo Moneda Local', icon: '🏦' },
  { value: 'transferencia', label: 'Transferencia Bancaria', icon: '🔄' },
];

export const PosView: React.FC = () => {
  const {
    products,
    clients,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    processCheckout,
    exchangeRate,
    settings,
    lastInvoiceCreated,
    addClient,
    triggerErrorSignal,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('consumidor_final');
  const [discountUSD, setDiscountUSD] = useState<string>('0');
  const [referenceNotes, setReferenceNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', docId: '', phone: '', address: '' });
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [newClientFieldErrors, setNewClientFieldErrors] = useState<Record<string, string>>({});

  // Multi-Payment state: array of payments received
  const [paymentRows, setPaymentRows] = useState<PosPaymentRow[]>([
    {
      id: 'pay-1',
      method: 'efectivo_usd',
      currency: 'USD',
      amount: '',
      reference: '',
    },
  ]);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Selected client with clean fallback
  const selectedClient = useMemo(() => {
    if (selectedClientId === 'consumidor_final' || !selectedClientId) {
      return {
        id: 'consumidor_final',
        name: 'Consumidor Final',
        docId: 'V-00000000',
        phone: '',
        email: '',
        address: '',
      };
    }
    return clients.find(c => c.id === selectedClientId) || {
      id: 'consumidor_final',
      name: 'Consumidor Final',
      docId: 'V-00000000',
      phone: '',
      email: '',
      address: '',
    };
  }, [clients, selectedClientId]);

  // Cart totals
  const subtotalUSD = cart.reduce((acc, item) => {
    const isPkg = item.unitType === 'package';
    const price = isPkg ? item.product.pricePackageUSD : item.product.priceUnitUSD;
    return acc + price * item.quantity;
  }, 0);

  const discountVal = parseFloat(discountUSD) || 0;
  const taxableUSD = Math.max(0, subtotalUSD - discountVal);
  const taxUSD = (taxableUSD * settings.taxRatePercent) / 100;
  const totalUSD = taxableUSD + taxUSD;
  const totalLocal = totalUSD * exchangeRate.rate;

  // Multi-Payment Breakdown & Real-Time Balance Calculations
  const paymentBreakdown = useMemo(() => {
    return paymentRows.map(row => {
      const val = parseFloat(row.amount) || 0;
      const isUSD = row.currency === 'USD';
      const amountUSD = isUSD ? val : (exchangeRate.rate > 0 ? val / exchangeRate.rate : 0);
      const amountLocal = isUSD ? val * exchangeRate.rate : val;
      return {
        ...row,
        val,
        amountUSD,
        amountLocal,
      };
    });
  }, [paymentRows, exchangeRate.rate]);

  const totalPaidUSD = useMemo(() => {
    return paymentBreakdown.reduce((acc, p) => acc + p.amountUSD, 0);
  }, [paymentBreakdown]);

  const totalPaidLocal = totalPaidUSD * exchangeRate.rate;
  const remainingUSD = Math.max(0, totalUSD - totalPaidUSD);
  const remainingLocal = remainingUSD * exchangeRate.rate;

  const changeUSD = totalPaidUSD > totalUSD + 0.005 ? totalPaidUSD - totalUSD : 0;
  const changeLocal = changeUSD * exchangeRate.rate;
  const isFullyPaid = totalPaidUSD >= totalUSD - 0.005 && totalUSD > 0;

  // Add another payment row with crucesita (+) to complete balance
  const handleAddPaymentRow = () => {
    const nextRemainingUSD = Math.max(0, totalUSD - totalPaidUSD);
    const existingMethods = paymentRows.map(p => p.method);
    let nextMethod: PaymentMethod = 'pago_movil';
    if (!existingMethods.includes('pago_movil')) {
      nextMethod = 'pago_movil';
    } else if (!existingMethods.includes('tarjeta')) {
      nextMethod = 'tarjeta';
    } else if (!existingMethods.includes('efectivo_local')) {
      nextMethod = 'efectivo_local';
    } else if (!existingMethods.includes('efectivo_usd')) {
      nextMethod = 'efectivo_usd';
    } else {
      nextMethod = 'transferencia';
    }

    const defaultCurrency: 'USD' | 'LOCAL' = (nextMethod === 'pago_movil' || nextMethod === 'efectivo_local' || nextMethod === 'tarjeta') ? 'LOCAL' : 'USD';
    const defaultAmount = nextRemainingUSD > 0.001
      ? (defaultCurrency === 'LOCAL' ? (nextRemainingUSD * exchangeRate.rate).toFixed(2) : nextRemainingUSD.toFixed(2))
      : '';

    setPaymentRows(prev => [
      ...prev,
      {
        id: `pay-${Date.now()}-${prev.length + 1}`,
        method: nextMethod,
        currency: defaultCurrency,
        amount: defaultAmount,
        reference: '',
      },
    ]);
  };

  const handleRemovePaymentRow = (id: string) => {
    if (paymentRows.length <= 1) return;
    setPaymentRows(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePaymentRow = (id: string, updates: Partial<PosPaymentRow>) => {
    setPaymentRows(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        // If currency changed, convert the numerical amount between USD and Local
        if (updates.currency && updates.currency !== p.currency) {
          const currentVal = parseFloat(p.amount) || 0;
          if (currentVal > 0) {
            if (updates.currency === 'LOCAL') {
              updated.amount = (currentVal * exchangeRate.rate).toFixed(2);
            } else {
              updated.amount = (currentVal / exchangeRate.rate).toFixed(2);
            }
          }
        }
        return updated;
      })
    );
  };

  const handleFillExactOnRow = (id: string) => {
    const row = paymentRows.find(p => p.id === id);
    if (!row) return;
    const otherRowsUSD = paymentBreakdown
      .filter(p => p.id !== id)
      .reduce((acc, p) => acc + p.amountUSD, 0);
    const neededUSD = Math.max(0, totalUSD - otherRowsUSD);
    const formattedAmt = row.currency === 'LOCAL'
      ? (neededUSD * exchangeRate.rate).toFixed(2)
      : neededUSD.toFixed(2);
    handleUpdatePaymentRow(id, { amount: formattedAmt });
  };

  const handleCheckout = () => {
    setCheckoutError(null);
    if (cart.length === 0) {
      const err = 'El carrito está vacío. Agregue productos antes de cobrar.';
      setCheckoutError(err);
      triggerErrorSignal({
        type: 'system_validation_error',
        title: 'Señal de Error: Carrito Vacío',
        message: err,
        severity: 'warning',
      });
      return;
    }

    // Verify if total paid covers the total invoice
    if (totalPaidUSD < totalUSD - 0.01) {
      const missingUSD = totalUSD - totalPaidUSD;
      const missingLocal = missingUSD * exchangeRate.rate;
      const err = `Monto incompleto: El total pagado ($${totalPaidUSD.toFixed(2)}) no cubre el total de la factura ($${totalUSD.toFixed(2)}). Falta por cancelar $${missingUSD.toFixed(2)} USD (≈ ${missingLocal.toFixed(2)} ${settings.currencySymbol}). Añada otro pago con la crucesita (+) para completar.`;
      setCheckoutError(err);
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error: Pago Incompleto',
        message: `Faltan $${missingUSD.toFixed(2)} USD para completar el total de la venta.`,
        severity: 'warning',
      });
      return;
    }

    // Format payments breakdown array
    const formattedPayments: PaymentBreakdown[] = paymentBreakdown
      .filter(p => p.val > 0)
      .map(p => ({
        id: p.id,
        method: p.method,
        amountUSD: Number(p.amountUSD.toFixed(2)),
        amountLocal: Number(p.amountLocal.toFixed(2)),
        currency: p.currency,
        amountInput: p.val,
        reference: p.reference.trim() || undefined,
      }));

    const primaryMethod: PaymentMethod = formattedPayments.length > 1
      ? 'mixto'
      : (formattedPayments[0]?.method || 'efectivo_usd');

    const res = processCheckout({
      clientId: selectedClient?.id,
      clientName: selectedClient?.name || 'Consumidor Final',
      clientDoc: selectedClient?.docId || 'V-00000000',
      paymentMethod: primaryMethod,
      paidAmountUSD: totalPaidUSD,
      paidAmountLocal: totalPaidLocal,
      discountUSD: discountVal,
      referenceNotes,
      payments: formattedPayments,
    });

    if (res.success) {
      setIsInvoiceOpen(true);
      setDiscountUSD('0');
      setReferenceNotes('');
      setPaymentRows([
        {
          id: `pay-${Date.now()}`,
          method: 'efectivo_usd',
          currency: 'USD',
          amount: '',
          reference: '',
        },
      ]);
    } else {
      setCheckoutError(res.error || 'Ocurrió un error al procesar el cobro');
      triggerErrorSignal({
        type: 'system_validation_error',
        title: 'Señal de Error en Cobro',
        message: res.error || 'Error al procesar la venta.',
        severity: 'error',
      });
    }
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    setNewClientError(null);
    const errors: Record<string, string> = {};

    const cleanName = newClientData.name.trim();
    const cleanDoc = newClientData.docId.trim();

    if (!cleanName) {
      errors.name = '⚠️ Este campo no se rellenó (Nombre completo o razón social obligatorio)';
    }

    if (!cleanDoc) {
      errors.docId = '⚠️ Este campo no se rellenó (Cédula / RIF / Doc obligatorio)';
    }

    if (Object.keys(errors).length > 0) {
      setNewClientFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      setNewClientError('⚠️ Señal de Error: Faltan campos obligatorios por rellenar.');
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error: Campo sin rellenar en Cliente',
        message: `No se rellenó el campo "${firstField === 'name' ? 'Nombre del Cliente' : 'Cédula / RIF'}" en el registro rápido.`,
        fieldName: firstField,
        severity: 'warning',
      });
      return;
    }

    setNewClientFieldErrors({});
    addClient({
      name: cleanName,
      docId: cleanDoc,
      phone: newClientData.phone.trim(),
      email: '',
      address: newClientData.address.trim(),
    });
    setShowNewClientModal(false);
    setNewClientData({ name: '', docId: '', phone: '', address: '' });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, código SKU o escanear código de barras..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'Todos los Productos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Products Catalog (Left) and Ticket/Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Products Grid (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Mostrando {filteredProducts.length} producto(s) en catálogo</span>
            <span className="font-mono-numbers">
              Tasa: 1 USD = {exchangeRate.rate.toFixed(2)} {settings.currencySymbol}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
            {filteredProducts.map(product => {
              const packagesCount = Math.floor(product.totalUnitsInStock / product.unitsPerPackage);
              const looseUnits = product.totalUnitsInStock % product.unitsPerPackage;
              const isLow = product.totalUnitsInStock <= product.minStockUnits;
              const isOutOfStock = product.totalUnitsInStock <= 0;

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-lg border p-4 flex flex-col justify-between transition-all hover:border-slate-300 ${
                    isLow ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                      {isLow && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                          Bajo Stock
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono-numbers">
                      <span>{product.sku}</span>
                      <span>·</span>
                      <span>{product.category}</span>
                    </div>

                    {/* Stock Breakdown */}
                    <div className="mt-2.5 p-2 bg-slate-50 rounded border border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[11px]">Existencia:</span>
                        <span className="font-mono-numbers font-semibold text-slate-900">
                          {packagesCount} {product.packageLabel}(s) + {looseUnits} un.
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
                        <span>Total: {product.totalUnitsInStock} unidades</span>
                        <span>(x{product.unitsPerPackage} por {product.packageLabel})</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Pricing & Add Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    {/* Bulk Package Price Row */}
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 font-medium block">
                          Precio por {product.packageLabel}:
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono-numbers font-bold text-slate-900 text-sm">
                            ${product.pricePackageUSD.toFixed(2)}
                          </span>
                          <span className="font-mono-numbers text-[11px] text-emerald-600 font-medium">
                            ({(product.pricePackageUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol})
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(product, 'package')}
                        disabled={isOutOfStock || product.totalUnitsInStock < product.unitsPerPackage}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          isOutOfStock || product.totalUnitsInStock < product.unitsPerPackage
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                        title={`Vender 1 ${product.packageLabel} completo`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>+ {product.packageLabel}</span>
                      </button>
                    </div>

                    {/* Single Unit Price Row */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/70">
                      <div>
                        <span className="text-[11px] text-slate-500 font-medium block">
                          Precio por Unidad:
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono-numbers font-semibold text-slate-800">
                            ${product.priceUnitUSD.toFixed(2)}
                          </span>
                          <span className="font-mono-numbers text-[10px] text-slate-500">
                            ({(product.priceUnitUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol})
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(product, 'unit')}
                        disabled={isOutOfStock}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title="Vender 1 unidad individual"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Unidad</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart & Billing Section (5 cols on desktop) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between max-h-[calc(100vh-170px)]">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-sm">
                Orden de Venta ({cart.length} renglones)
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar</span>
              </button>
            )}
          </div>

          {/* Client Selection */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                Cliente Asociado a Factura:
              </label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="consumidor_final">Consumidor Final (V-00000000)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.docId})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNewClientModal(true)}
              className="mt-4 px-2 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs text-slate-700 font-medium shrink-0 cursor-pointer"
              title="Registrar nuevo cliente"
            >
              + Cliente
            </button>
          </div>

          {/* Cart Items List */}
          <div className="p-4 overflow-y-auto flex-1 space-y-2.5 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">El carrito está vacío</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Seleccione productos por bulto o por unidad en el catálogo
                </p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const isPkg = item.unitType === 'package';
                const unitPrice = isPkg ? item.product.pricePackageUSD : item.product.priceUnitUSD;
                const lineTotalUSD = unitPrice * item.quantity;
                const lineTotalLocal = lineTotalUSD * exchangeRate.rate;

                return (
                  <div key={`${item.product.id}-${item.unitType}`} className="pt-2.5 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono-numbers">
                          SKU: {item.product.sku}
                        </p>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id, item.unitType)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      {/* Unit / Bulk selector switch */}
                      <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                        <button
                          onClick={() => {
                            removeFromCart(item.product.id, item.unitType);
                            addToCart(item.product, 'unit', item.quantity);
                          }}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            !isPkg ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-500'
                          }`}
                        >
                          Unidad
                        </button>
                        <button
                          onClick={() => {
                            removeFromCart(item.product.id, item.unitType);
                            addToCart(item.product, 'package', item.quantity);
                          }}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            isPkg ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-500'
                          }`}
                        >
                          {item.product.packageLabel} (x{item.product.unitsPerPackage})
                        </button>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.unitType, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-mono-numbers font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.unitType, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Subtotal in USD & Local */}
                      <div className="text-right">
                        <p className="font-mono-numbers font-bold text-xs text-slate-900">
                          ${lineTotalUSD.toFixed(2)}
                        </p>
                        <p className="font-mono-numbers text-[10px] text-emerald-600 font-medium">
                          {lineTotalLocal.toFixed(2)} {settings.currencySymbol}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer: Totals, Multi-Payment & Action */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            {/* Discount and Notes inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                  Descuento ($ USD):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={discountUSD}
                  onChange={e => setDiscountUSD(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono-numbers text-xs text-slate-900 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                  Nota / Observación:
                </label>
                <input
                  type="text"
                  value={referenceNotes}
                  onChange={e => setReferenceNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none"
                  placeholder="Opcional..."
                />
              </div>
            </div>

            {/* SECCIÓN DE PAGOS MÚLTIPLES / DESGLOSE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-700 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pagos Recibidos {paymentRows.length > 1 ? `(${paymentRows.length} métodos)` : ''}:</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono-numbers">
                  Tasa: 1$ = {exchangeRate.rate.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>

              {/* Lista de filas de pago dinámicas */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {paymentRows.map((row, index) => {
                  const rowBreakdown = paymentBreakdown.find(p => p.id === row.id);
                  const requiresRef = row.method === 'pago_movil' || row.method === 'tarjeta' || row.method === 'transferencia';

                  return (
                    <div
                      key={row.id}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5 animate-in fade-in duration-100"
                    >
                      {/* Cabecera de la fila */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                            {index + 1}
                          </span>
                          <span>Pago #{index + 1}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Botón rápido para calcular monto restante exacto en esta fila */}
                          <button
                            type="button"
                            onClick={() => handleFillExactOnRow(row.id)}
                            title="Calcular monto exacto restante en esta fila"
                            className="px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                          >
                            Saldo Exacto
                          </button>

                          {/* Botón eliminar fila si hay más de 1 */}
                          {paymentRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePaymentRow(row.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Eliminar este pago"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Selector de Método y Selector de Moneda */}
                      <div className="grid grid-cols-5 gap-1.5">
                        <div className="col-span-3">
                          <select
                            value={row.method}
                            onChange={e => handleUpdatePaymentRow(row.id, { method: e.target.value as PaymentMethod })}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 text-[11px] font-medium focus:outline-none"
                          >
                            {PAYMENT_METHOD_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.icon} {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Moneda (USD / Local) */}
                        <div className="col-span-2 flex rounded border border-slate-300 overflow-hidden text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => handleUpdatePaymentRow(row.id, { currency: 'USD' })}
                            className={`flex-1 py-1 transition-colors cursor-pointer text-center ${
                              row.currency === 'USD'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            $ USD
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdatePaymentRow(row.id, { currency: 'LOCAL' })}
                            className={`flex-1 py-1 transition-colors cursor-pointer text-center ${
                              row.currency === 'LOCAL'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {settings.currencySymbol}
                          </button>
                        </div>
                      </div>

                      {/* Input de Monto y Referencia */}
                      <div className={`grid ${requiresRef ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5`}>
                        <div>
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-slate-400 font-mono text-[10px]">
                              {row.currency === 'USD' ? '$' : settings.currencySymbol}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={row.amount}
                              onChange={e => handleUpdatePaymentRow(row.id, { amount: e.target.value })}
                              className="w-full pl-6 pr-2 py-1 bg-white border border-slate-300 rounded font-mono-numbers text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          {/* Equivalencia en la otra moneda */}
                          {rowBreakdown && rowBreakdown.val > 0 && (
                            <div className="text-[10px] text-slate-500 font-mono-numbers pt-0.5 pl-0.5">
                              {row.currency === 'USD' ? (
                                <span>≈ {rowBreakdown.amountLocal.toFixed(2)} {settings.currencySymbol}</span>
                              ) : (
                                <span>≈ ${rowBreakdown.amountUSD.toFixed(2)} USD</span>
                              )}
                            </div>
                          )}
                        </div>

                        {requiresRef && (
                          <div>
                            <input
                              type="text"
                              placeholder="N° Comprobante / Ref"
                              value={row.reference}
                              onChange={e => handleUpdatePaymentRow(row.id, { reference: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BOTÓN CON CRUCESITA (+): AÑADIR OTRO PAGO PARA COMPLETAR */}
              <button
                type="button"
                onClick={handleAddPaymentRow}
                className="w-full py-2 px-3 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>
                  Añadir otro pago para completar
                  {remainingUSD > 0.005 ? ` ($${remainingUSD.toFixed(2)} restante)` : ''}
                </span>
              </button>
            </div>

            {/* Resumen de Pago: Total Pagado, Restante o Vuelto */}
            <div className={`p-2.5 rounded-lg border text-xs space-y-1 transition-colors ${
              isFullyPaid
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : totalPaidUSD > 0
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <div className="flex justify-between items-center font-bold">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Total Recibido:</span>
                </span>
                <span className="font-mono-numbers text-sm">
                  ${totalPaidUSD.toFixed(2)} USD
                  <span className="text-[10px] font-normal text-slate-600 block text-right">
                    ≈ {totalPaidLocal.toFixed(2)} {settings.currencySymbol}
                  </span>
                </span>
              </div>

              {/* Alerta de saldo pendiente si aún falta pagar */}
              {remainingUSD > 0.005 ? (
                <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between text-amber-800">
                  <span className="font-semibold flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Falta por completar:</span>
                  </span>
                  <span className="font-mono-numbers font-bold text-amber-900">
                    ${remainingUSD.toFixed(2)} USD ({remainingLocal.toFixed(2)} {settings.currencySymbol})
                  </span>
                </div>
              ) : null}

              {/* Vuelto / Cambio a entregar si pagó de más */}
              {changeUSD > 0.005 ? (
                <div className="pt-1.5 border-t border-emerald-200 flex items-center justify-between text-emerald-900">
                  <span className="font-bold flex items-center gap-1 text-[11px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Vuelto / Cambio a entregar:</span>
                  </span>
                  <span className="font-mono-numbers font-extrabold text-emerald-700 text-sm">
                    ${changeUSD.toFixed(2)} USD
                    <span className="text-[10px] font-normal text-emerald-600 block text-right">
                      ≈ {changeLocal.toFixed(2)} {settings.currencySymbol}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>

            {/* Totals Summary */}
            <div className="space-y-1 text-xs pt-1 border-t border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono-numbers font-medium">${subtotalUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA ({settings.taxRatePercent}%):</span>
                <span className="font-mono-numbers font-medium">${taxUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono-numbers text-base text-emerald-700">${totalUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>TOTAL EN {settings.currencyName.toUpperCase()}:</span>
                <span className="font-mono-numbers text-emerald-700">
                  {totalLocal.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
            </div>

            {/* Error banner */}
            {checkoutError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Process Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                cart.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : !isFullyPaid
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {!isFullyPaid && totalPaidUSD > 0
                  ? `Completar Pago ($${remainingUSD.toFixed(2)} faltante)`
                  : 'Cobrar e Imprimir Factura PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal for preview and print */}
      <InvoiceModal
        sale={lastInvoiceCreated}
        settings={settings}
        onClose={() => setIsInvoiceOpen(false)}
        onNewSale={() => {
          setIsInvoiceOpen(false);
          clearCart();
        }}
      />

      {/* Quick Add Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Cliente</h3>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {newClientError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{newClientError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre Completo o Razón Social *
                </label>
                <input
                  type="text"
                  value={newClientData.name}
                  onChange={e => {
                    setNewClientData({ ...newClientData, name: e.target.value });
                    if (newClientFieldErrors.name) setNewClientFieldErrors({ ...newClientFieldErrors, name: '' });
                  }}
                  placeholder="Ej: Comercial La Granja C.A."
                  className={`w-full px-3 py-2 rounded focus:outline-none transition-all ${getInputErrorClass(
                    !!newClientFieldErrors.name,
                    'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                  )}`}
                />
                <FormFieldError error={newClientFieldErrors.name} />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cédula / RIF / NIT / Doc *
                </label>
                <input
                  type="text"
                  value={newClientData.docId}
                  onChange={e => {
                    setNewClientData({ ...newClientData, docId: e.target.value });
                    if (newClientFieldErrors.docId) setNewClientFieldErrors({ ...newClientFieldErrors, docId: '' });
                  }}
                  placeholder="Ej: J-40891234-1"
                  className={`w-full px-3 py-2 rounded focus:outline-none transition-all ${getInputErrorClass(
                    !!newClientFieldErrors.docId,
                    'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                  )}`}
                />
                <FormFieldError error={newClientFieldErrors.docId} />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={newClientData.phone}
                  onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })}
                  placeholder="+58 414 1234567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dirección Fiscal</label>
                <input
                  type="text"
                  value={newClientData.address}
                  onChange={e => setNewClientData({ ...newClientData, address: e.target.value })}
                  placeholder="Av. Principal, Edif. 2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded cursor-pointer"
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

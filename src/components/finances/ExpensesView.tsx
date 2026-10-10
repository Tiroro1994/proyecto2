import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  Plus,
  Calendar,
  Building2,
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  ArrowRightLeft,
  Wallet,
  Landmark,
  CreditCard,
  RotateCcw,
  Tag,
  Clock,
  Banknote,
  Receipt,
  User,
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { exportFinancesToExcel } from '../../utils/excelGenerator';
import { generateFinancesReportPDF } from '../../utils/pdfGenerator';
import { FormFieldError, getInputErrorClass } from '../common/FormFieldError';

interface ExpensesViewProps {
  onNavigate?: (tab: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onNavigate }) => {
  const {
    expenses,
    addExpense,
    deleteExpense,
    updateExpense,
    settings,
    exchangeRate,
    currentUser,
    sales,
    hasPermission,
    triggerErrorSignal,
  } = useApp();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formReason, setFormReason] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'Efectivo Divisas ($)' | 'Transferencia Bancaria' | 'Efectivo Moneda Local' | 'Pago Móvil'>('Efectivo Divisas ($)');
  const [formAmountUSD, setFormAmountUSD] = useState('');
  const [formCurrencyInput, setFormCurrencyInput] = useState<'USD' | 'LOCAL'>('USD');
  const [formAmountLocal, setFormAmountLocal] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('servicios');
  const [formReference, setFormReference] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Deletion confirmation
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Common quick reason suggestions for wholesale businesses
  const QUICK_REASONS = [
    'Pago de Flete / Traslado de Mercancía',
    'Alquiler de Galpón / Depósito',
    'Nómina y Salarios del Personal',
    'Servicio Eléctrico / Agua / Internet',
    'Mantenimiento de Montacargas / Vehículo',
    'Compra de Bolsas, Cintas y Embalaje',
    'Alimentación / Refrigerio de Trabajadores',
    'Impuestos Municipales / Aseo Urbano',
  ];

  // Open modal for new expense
  const handleOpenNewModal = () => {
    setEditingExpenseId(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormReason('');
    setFormPaymentMethod('Efectivo Divisas ($)');
    setFormAmountUSD('');
    setFormAmountLocal('');
    setFormCategory('servicios');
    setFormReference('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing existing expense
  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setFormDate(expense.date);
    setFormReason(expense.description);
    
    // Normalize payment method to standard options
    if (expense.paymentMethod.toLowerCase().includes('divisa') || expense.paymentMethod.toLowerCase().includes('efectivo usd')) {
      setFormPaymentMethod('Efectivo Divisas ($)');
    } else if (expense.paymentMethod.toLowerCase().includes('transf')) {
      setFormPaymentMethod('Transferencia Bancaria');
    } else if (expense.paymentMethod.toLowerCase().includes('pago m')) {
      setFormPaymentMethod('Pago Móvil');
    } else {
      setFormPaymentMethod('Efectivo Moneda Local');
    }

    setFormAmountUSD(expense.amountUSD.toString());
    setFormAmountLocal(expense.amountLocal.toFixed(2));
    setFormCategory(expense.category);
    setFormReference(expense.reference || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Synchronize amount when user types in USD or Local
  const handleAmountUSDChange = (valStr: string) => {
    setFormAmountUSD(valStr);
    const val = parseFloat(valStr);
    if (!isNaN(val) && val >= 0) {
      setFormAmountLocal((val * exchangeRate.rate).toFixed(2));
    } else {
      setFormAmountLocal('');
    }
  };

  const handleAmountLocalChange = (valStr: string) => {
    setFormAmountLocal(valStr);
    const val = parseFloat(valStr);
    if (!isNaN(val) && val >= 0 && exchangeRate.rate > 0) {
      setFormAmountUSD((val / exchangeRate.rate).toFixed(2));
    } else {
      setFormAmountUSD('');
    }
  };

  // Date preset handler
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
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const str = yesterday.toISOString().slice(0, 10);
      setStartDate(str);
      setEndDate(str);
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
    setFilterPaymentMethod('all');
    setFilterCategory('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
  };

  // Save expense (Create or Update)
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors: Record<string, string> = {};

    const cleanReason = formReason.trim();
    const amount = parseFloat(formAmountUSD);

    if (!cleanReason) {
      errors.reason = '⚠️ Este campo no se rellenó (Razón o concepto del gasto es obligatorio)';
    }

    if (isNaN(amount) || amount <= 0) {
      errors.amount = '⚠️ Debe indicar un monto válido mayor a 0';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      setFormError('⚠️ Señal de Error: Hay campos obligatorios sin rellenar en el registro de gastos.');
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error: Campo sin rellenar en Gastos',
        message: `No se rellenó un campo obligatorio (${firstField === 'reason' ? 'Razón del Gasto' : 'Monto'}) en el registro de gastos.`,
        fieldName: firstField,
        severity: 'warning',
      });
      return;
    }

    setFieldErrors({});

    if (editingExpenseId) {
      // Update
      updateExpense(editingExpenseId, {
        date: formDate,
        description: cleanReason,
        paymentMethod: formPaymentMethod,
        amountUSD: amount,
        category: formCategory,
        reference: formReference.trim() || undefined,
      });
    } else {
      // Create
      addExpense({
        date: formDate,
        description: cleanReason,
        paymentMethod: formPaymentMethod,
        amountUSD: amount,
        category: formCategory,
        reference: formReference.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  // Category labels helper
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'alquiler': return 'Alquiler';
      case 'servicios': return 'Servicios Básicos';
      case 'nomina': return 'Nómina y Salarios';
      case 'fletes': return 'Fletes y Envíos';
      case 'mantenimiento': return 'Mantenimiento';
      case 'suministros': return 'Suministros';
      case 'impuestos': return 'Impuestos';
      default: return 'Otros Gastos';
    }
  };

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(exp => {
        // Reason search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchReason = exp.description.toLowerCase().includes(term);
          const matchRef = (exp.reference || '').toLowerCase().includes(term);
          const matchUser = (exp.registeredBy || '').toLowerCase().includes(term);
          if (!matchReason && !matchRef && !matchUser) return false;
        }

        // Payment method filter (Efectivo Divisas vs Transferencia vs All)
        if (filterPaymentMethod !== 'all') {
          const methodLower = exp.paymentMethod.toLowerCase();
          if (filterPaymentMethod === 'efectivo_divisas') {
            if (!methodLower.includes('divisa') && !methodLower.includes('efectivo usd')) return false;
          } else if (filterPaymentMethod === 'transferencia') {
            if (!methodLower.includes('transf')) return false;
          } else if (filterPaymentMethod === 'otros') {
            if (methodLower.includes('divisa') || methodLower.includes('efectivo usd') || methodLower.includes('transf')) return false;
          }
        }

        // Category filter
        if (filterCategory !== 'all' && exp.category !== filterCategory) {
          return false;
        }

        // Date filter
        const expDate = exp.date.slice(0, 10);
        if (startDate && expDate < startDate) return false;
        if (endDate && expDate > endDate) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'amount_desc') {
          return b.amountUSD - a.amountUSD;
        }
        if (sortBy === 'amount_asc') {
          return a.amountUSD - b.amountUSD;
        }
        return 0;
      });
  }, [expenses, searchTerm, filterPaymentMethod, filterCategory, startDate, endDate, sortBy]);

  // Aggregate statistics for the filtered expenses
  const metrics = useMemo(() => {
    const totalUSD = filteredExpenses.reduce((sum, e) => sum + e.amountUSD, 0);
    const totalLocal = filteredExpenses.reduce((sum, e) => sum + e.amountLocal, 0);

    // Filter by Efectivo Divisas
    const cashDivisasExpenses = filteredExpenses.filter(e => {
      const m = e.paymentMethod.toLowerCase();
      return m.includes('divisa') || m.includes('efectivo usd');
    });
    const totalCashDivisasUSD = cashDivisasExpenses.reduce((sum, e) => sum + e.amountUSD, 0);

    // Filter by Transferencia
    const transferExpenses = filteredExpenses.filter(e => e.paymentMethod.toLowerCase().includes('transf'));
    const totalTransferUSD = transferExpenses.reduce((sum, e) => sum + e.amountUSD, 0);

    // Other methods
    const otherExpenses = filteredExpenses.filter(e => {
      const m = e.paymentMethod.toLowerCase();
      return !m.includes('divisa') && !m.includes('efectivo usd') && !m.includes('transf');
    });
    const totalOtherUSD = otherExpenses.reduce((sum, e) => sum + e.amountUSD, 0);

    // Unique days
    const uniqueDays = new Set(filteredExpenses.map(e => e.date.slice(0, 10))).size;
    const avgDailyUSD = uniqueDays > 0 ? totalUSD / uniqueDays : totalUSD;

    return {
      count: filteredExpenses.length,
      totalUSD,
      totalLocal,
      totalCashDivisasUSD,
      countCashDivisas: cashDivisasExpenses.length,
      totalTransferUSD,
      countTransfer: transferExpenses.length,
      totalOtherUSD,
      countOther: otherExpenses.length,
      uniqueDays,
      avgDailyUSD,
    };
  }, [filteredExpenses]);

  // Format date display (e.g. "Lun, 05 Oct 2026")
  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const isToday = (dateStr: string) => {
    return dateStr.slice(0, 10) === new Date().toISOString().slice(0, 10);
  };

  return (
    <div className="space-y-6">
      {/* Header and Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Control de Gastos Operativos</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-mono">
                  {filteredExpenses.length} registros
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro detallado con <strong>Día</strong>, <strong>Razón</strong> y <strong>Forma de Pago</strong> (Efectivo Divisas $ o Transferencia).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('canManageFinances') && (
            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nuevo Gasto</span>
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('finances')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Estado P&L</span>
            </button>
          )}

          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => exportFinancesToExcel(sales, filteredExpenses, settings)}
              disabled={filteredExpenses.length === 0}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Exportar a Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => generateFinancesReportPDF(sales, filteredExpenses, settings)}
              disabled={filteredExpenses.length === 0}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Descargar Reporte PDF"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Totals and Breakdown by Payment Method (Efectivo Divisas vs Transferencia) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Gastos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Gastos Registrados</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              ${metrics.totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-500 ml-1">USD</span>
            </div>
            <div className="text-xs font-mono text-slate-600 font-medium mt-0.5">
              {metrics.totalLocal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {settings.currencySymbol}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>{metrics.count} transacciones</span>
            <span>Tasa: {exchangeRate.rate.toFixed(2)}</span>
          </div>
        </div>

        {/* KPI 2: Pagado en Efectivo Divisas ($) */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Efectivo Divisas ($)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
              {metrics.countCashDivisas} pagos
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
              ${metrics.totalCashDivisasUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-emerald-600 ml-1">USD</span>
            </div>
            <div className="text-xs font-mono text-emerald-600 font-medium mt-0.5">
              {(metrics.totalCashDivisasUSD * exchangeRate.rate).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {settings.currencySymbol}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 text-[11px] text-emerald-700 flex justify-between">
            <span>Salida de caja en billetes ($)</span>
            <span>{metrics.totalUSD > 0 ? ((metrics.totalCashDivisasUSD / metrics.totalUSD) * 100).toFixed(0) : 0}% del total</span>
          </div>
        </div>

        {/* KPI 3: Pagado por Transferencia */}
        <div className="bg-white p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-900 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <span>Transferencia Bancaria</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold">
              {metrics.countTransfer} pagos
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-700">
              ${metrics.totalTransferUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-indigo-600 ml-1">USD</span>
            </div>
            <div className="text-xs font-mono text-indigo-600 font-medium mt-0.5">
              {(metrics.totalTransferUSD * exchangeRate.rate).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {settings.currencySymbol}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-indigo-100 text-[11px] text-indigo-700 flex justify-between">
            <span>Salida de cuentas bancarias</span>
            <span>{metrics.totalUSD > 0 ? ((metrics.totalTransferUSD / metrics.totalUSD) * 100).toFixed(0) : 0}% del total</span>
          </div>
        </div>

        {/* KPI 4: Promedio de Gasto Diario */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Promedio Diario</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              ${metrics.avgDailyUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-500 ml-1">USD/día</span>
            </div>
            <div className="text-xs font-mono text-slate-500 mt-0.5">
              {(metrics.avgDailyUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}/día
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Días con movimientos: {metrics.uniqueDays}</span>
            <span className="text-emerald-700 font-semibold">Gasto controlado</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        {/* Row 1: Search by Reason, Filter by Payment Method, Sort */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Reason Search */}
          <div className="md:col-span-5 relative">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Buscar por Razón / Concepto del Gasto:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Ej: Flete, Alquiler, Nómina, Ref #..."
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

          {/* Payment Method Filter */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-slate-500" />
              <span>Filtrar Cómo se Pagó:</span>
            </label>
            <select
              value={filterPaymentMethod}
              onChange={e => setFilterPaymentMethod(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todas las Formas de Pago</option>
              <option value="efectivo_divisas">💵 Efectivo Divisas ($)</option>
              <option value="transferencia">🏦 Transferencia Bancaria</option>
              <option value="otros">Otros Métodos (Bs. / Pago Móvil)</option>
            </select>
          </div>

          {/* Sort */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Ordenar por:</span>
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="date_desc">Día: Más recientes primero</option>
              <option value="date_asc">Día: Más antiguos primero</option>
              <option value="amount_desc">Monto: Mayor a menor ($)</option>
              <option value="amount_asc">Monto: Menor a mayor ($)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Filters & Preset Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Día / Período:</span>
            </span>

            {[
              { id: 'all', label: 'Todo' },
              { id: 'today', label: 'Hoy' },
              { id: 'yesterday', label: 'Ayer' },
              { id: '7days', label: 'Últimos 7 días' },
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

          {/* Date range pickers */}
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

            {(searchTerm || filterPaymentMethod !== 'all' || filterCategory !== 'all' || startDate || endDate || datePreset !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                title="Limpiar filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table header bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              Listado de Gastos Registrados ({filteredExpenses.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Clasificados por <strong>Día</strong>, <strong>Razón</strong> y <strong>Forma de Pago</strong>.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Día / Fecha</th>
                <th className="py-3 px-4">Razón / Concepto del Gasto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Cómo se Pagó</th>
                <th className="py-3 px-4 text-right">Monto (USD $)</th>
                <th className="py-3 px-4 text-right">Monto ({settings.currencySymbol})</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">No se encontraron gastos</p>
                      <p className="text-xs text-slate-400">
                        Pruebe cambiando los filtros de fecha o forma de pago, o haga clic en "Registrar Nuevo Gasto".
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => {
                  const isEfectivoDivisas =
                    expense.paymentMethod.toLowerCase().includes('divisa') ||
                    expense.paymentMethod.toLowerCase().includes('efectivo usd');
                  const isTransferencia = expense.paymentMethod.toLowerCase().includes('transf');
                  const today = isToday(expense.date);

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Día / Fecha */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 text-xs">
                            {formatDateDisplay(expense.date)}
                          </span>
                          {today && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              Hoy
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {expense.date}
                        </div>
                      </td>

                      {/* Razón / Concepto del Gasto */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs max-w-md">
                          {expense.description}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Registrado por: {expense.registeredBy}</span>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>

                      {/* Cómo se Pagó (Efectivo Divisas vs Transferencia) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isEfectivoDivisas ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Efectivo Divisas ($)</span>
                          </div>
                        ) : isTransferencia ? (
                          <div className="inline-flex flex-col">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold shadow-2xs">
                              <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Transferencia Bancaria</span>
                            </div>
                            {expense.reference && (
                              <span className="text-[10px] font-mono text-indigo-600 font-medium mt-0.5 pl-1">
                                Ref: {expense.reference}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            <Wallet className="w-3.5 h-3.5 text-slate-500" />
                            <span>{expense.paymentMethod}</span>
                          </div>
                        )}
                      </td>

                      {/* Monto USD */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-xs text-rose-600">
                          -${expense.amountUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">USD</span>
                        </div>
                      </td>

                      {/* Monto Moneda Local */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-xs text-slate-700">
                          -{expense.amountLocal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                          <span className="text-[10px] font-normal">{settings.currencySymbol}</span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasPermission('canManageFinances') && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(expense)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                title="Editar Gasto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpenseToDelete(expense)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Eliminar Gasto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* Modal: Registrar o Editar Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full my-auto flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    {editingExpenseId ? 'Editar Gasto Operativo' : 'Registrar Nuevo Gasto'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Defina el Día, la Razón y la Forma de Pago (Efectivo Divisas o Transferencia)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitExpense} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. EL DÍA / FECHA */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800">
                    1. Día / Fecha del Gasto *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormDate(new Date().toISOString().slice(0, 10))}
                      className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Hoy
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setFormDate(yesterday.toISOString().slice(0, 10));
                      }}
                      className="text-[10px] text-slate-600 hover:underline cursor-pointer"
                    >
                      Ayer
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. LA RAZÓN / CONCEPTO */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  2. Razón / Concepto del Gasto *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Flete de 40 bultos de harina, Alquiler galpón, etc."
                  value={formReason}
                  onChange={e => {
                    setFormReason(e.target.value);
                    if (fieldErrors.reason) setFieldErrors({ ...fieldErrors, reason: '' });
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-900 focus:outline-none transition-all ${getInputErrorClass(
                    !!fieldErrors.reason,
                    'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-emerald-500'
                  )}`}
                />
                <FormFieldError error={fieldErrors.reason} />

                {/* Quick suggestions pills */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 block mb-1">
                    Sugerencias rápidas:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_REASONS.slice(0, 4).map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFormReason(r);
                          if (fieldErrors.reason) setFieldErrors({ ...fieldErrors, reason: '' });
                        }}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors cursor-pointer truncate max-w-[200px]"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. CÓMO SE PAGÓ (EFECTIVO DIVISAS O TRANSFERENCIA) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  3. ¿Cómo se Pagó? (Forma de Pago) *
                </label>

                {/* Big Two Featured Options */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Option A: Efectivo Divisas */}
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('Efectivo Divisas ($)')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formPaymentMethod === 'Efectivo Divisas ($)'
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Banknote className="w-5 h-5 text-emerald-600" />
                      {formPaymentMethod === 'Efectivo Divisas ($)' && (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="font-extrabold text-slate-900 block text-xs">
                        Efectivo Divisas ($)
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Billetes en dólares estadounidenses
                      </span>
                    </div>
                  </button>

                  {/* Option B: Transferencia Bancaria */}
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('Transferencia Bancaria')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formPaymentMethod === 'Transferencia Bancaria'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Landmark className="w-5 h-5 text-indigo-600" />
                      {formPaymentMethod === 'Transferencia Bancaria' && (
                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="font-extrabold text-slate-900 block text-xs">
                        Transferencia
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Transferencia bancaria / depósito
                      </span>
                    </div>
                  </button>
                </div>

                {/* Optional other payment methods button */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-500">Otras formas:</span>
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('Efectivo Moneda Local')}
                    className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                      formPaymentMethod === 'Efectivo Moneda Local'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Efectivo Bs.
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('Pago Móvil')}
                    className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                      formPaymentMethod === 'Pago Móvil'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Pago Móvil
                  </button>
                </div>
              </div>

              {/* Reference number if Transfer or Pago Móvil */}
              {(formPaymentMethod === 'Transferencia Bancaria' || formPaymentMethod === 'Pago Móvil') && (
                <div className="space-y-1 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                  <label className="block text-[11px] font-bold text-indigo-900">
                    N° de Referencia / Comprobante Bancario (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 0928172 o últimos 4 dígitos"
                    value={formReference}
                    onChange={e => setFormReference(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* 4. MONTO Y DIVISA */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Monto en Dólares ($ USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formAmountUSD}
                      onChange={e => {
                        handleAmountUSDChange(e.target.value);
                        if (fieldErrors.amount) setFieldErrors({ ...fieldErrors, amount: '' });
                      }}
                      className={`w-full pl-7 pr-3 py-2 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none transition-all ${getInputErrorClass(
                        !!fieldErrors.amount,
                        'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-emerald-500'
                      )}`}
                    />
                  </div>
                  <FormFieldError error={fieldErrors.amount} />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Equivalente en {settings.currencySymbol} ({settings.currencyName})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="0.00"
                      value={formAmountLocal}
                      onChange={e => handleAmountLocalChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                    Tasa: 1$ = {exchangeRate.rate.toFixed(2)} {settings.currencySymbol}
                  </span>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Categoría Contable:
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none"
                >
                  <option value="fletes">Fletes y Traslados</option>
                  <option value="alquiler">Alquiler de Galpón / Depósito</option>
                  <option value="servicios">Servicios Básicos (Luz, Agua, Internet)</option>
                  <option value="nomina">Nómina y Sueldos</option>
                  <option value="mantenimiento">Mantenimiento y Reparaciones</option>
                  <option value="suministros">Suministros y Embalaje</option>
                  <option value="impuestos">Impuestos y Tasas Municipales</option>
                  <option value="otros">Otros Gastos Operativos</option>
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingExpenseId ? 'Guardar Cambios' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">¿Eliminar este Gasto?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Está a punto de eliminar el gasto <strong>"{expenseToDelete.description}"</strong> por un monto de{' '}
              <strong>${expenseToDelete.amountUSD.toFixed(2)} USD</strong> pagado el día <strong>{expenseToDelete.date}</strong> mediante{' '}
              <strong>{expenseToDelete.paymentMethod}</strong>.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer"
              >
                Sí, Eliminar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  Plus,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  Layers,
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { generateFinancesReportPDF } from '../../utils/pdfGenerator';
import { exportFinancesToExcel } from '../../utils/excelGenerator';
import { ExpensesView } from './ExpensesView';

interface FinancesViewProps {
  onNavigate?: (tab: string) => void;
  initialTab?: 'expenses' | 'pnl';
}

export const FinancesView: React.FC<FinancesViewProps> = ({
  onNavigate,
  initialTab = 'expenses',
}) => {
  const { sales, expenses, addExpense, settings, exchangeRate, hasPermission } = useApp();
  const [activeTab, setActiveTab] = useState<'expenses' | 'pnl'>(initialTab);

  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'servicios' as ExpenseCategory,
    amountUSD: '',
    paymentMethod: 'Efectivo USD',
    reference: '',
    date: new Date().toISOString().slice(0, 10),
  });

  // Financial metrics
  const grossSalesUSD = sales.reduce((acc, s) => acc + s.subtotalUSD, 0);
  const cogsUSD = sales.reduce((acc, s) => {
    return acc + s.items.reduce((sum, item) => sum + (item.totalCostUSD || 0), 0);
  }, 0);
  const grossProfitUSD = grossSalesUSD - cogsUSD;
  const totalExpensesUSD = expenses.reduce((acc, e) => acc + e.amountUSD, 0);
  const netProfitUSD = grossProfitUSD - totalExpensesUSD;
  const netMarginPercent = grossSalesUSD > 0 ? (netProfitUSD / grossSalesUSD) * 100 : 0;

  // Breakdown by category
  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amountUSD;
    return acc;
  }, {} as Record<string, number>);

  const filteredExpenses = expenses.filter(
    e => selectedCategoryFilter === 'all' || e.category === selectedCategoryFilter
  );

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amountUSD);
    if (isNaN(amount) || amount <= 0 || !expenseForm.description) return;

    addExpense({
      description: expenseForm.description,
      category: expenseForm.category,
      amountUSD: amount,
      paymentMethod: expenseForm.paymentMethod,
      reference: expenseForm.reference,
      date: expenseForm.date,
    });

    setIsAddExpenseModalOpen(false);
    setExpenseForm({
      description: '',
      category: 'servicios',
      amountUSD: '',
      paymentMethod: 'Efectivo USD',
      reference: '',
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'alquiler': return 'Alquiler';
      case 'servicios': return 'Servicios Básicos';
      case 'nomina': return 'Nómina y Salarios';
      case 'fletes': return 'Fletes y Envíos';
      case 'mantenimiento': return 'Mantenimiento';
      case 'suministros': return 'Suministros y Papelería';
      case 'impuestos': return 'Impuestos y Tasas';
      default: return 'Otros Gastos';
    }
  };

  return (
    <div className="space-y-6">
      {/* Subnavigation Tabs: Control de Gastos vs Estado P&L */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`py-2 px-4 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span>Control de Gastos (Día, Razón y Forma de Pago)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pnl')}
          className={`py-2 px-4 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'pnl'
              ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
          <span>Estado de Resultados P&L (Balance & Rentabilidad)</span>
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <ExpensesView onNavigate={onNavigate} />
      ) : (
        <>
          {/* Header and Fast Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Relación de Gastos y Beneficios (Estado P&L)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Análisis de rentabilidad neta, costos de adquisición de mercancía y balance operativo en divisas y moneda local.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasPermission('canManageFinances') && (
                <button
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Gasto Operativo</span>
                </button>
              )}

              <div className="inline-flex rounded-md border border-slate-200 bg-white shadow-xs p-0.5">
                <button
                  onClick={() => exportFinancesToExcel(sales, expenses, settings)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded flex items-center gap-1.5 cursor-pointer"
                  title="Descargar libro de gastos y balance en Excel"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => generateFinancesReportPDF(sales, expenses, settings)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded flex items-center gap-1.5 cursor-pointer"
                  title="Descargar informe formal P&L en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

      {/* Main Financial Statement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Step 1: Ingresos Brutos */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">1. Ventas Brutas Totales</span>
          <div className="mt-2 text-xl font-bold font-mono-numbers text-slate-900">
            ${grossSalesUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
          </div>
          <p className="text-[11px] font-mono-numbers text-slate-500 mt-0.5">
            {(grossSalesUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
          </p>
        </div>

        {/* Step 2: Costo de Mercancía */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">2. Costo Mercancía (COGS)</span>
          <div className="mt-2 text-xl font-bold font-mono-numbers text-amber-700">
            -${cogsUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Costo de adquisición de stock vendido
          </p>
        </div>

        {/* Step 3: Gastos Operativos */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">3. Gastos Operativos</span>
          <div className="mt-2 text-xl font-bold font-mono-numbers text-red-600">
            -${totalExpensesUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
          </div>
          <p className="text-[11px] font-mono-numbers text-slate-500 mt-0.5">
            {(totalExpensesUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
          </p>
        </div>

        {/* Step 4: Beneficio Neto */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-900 block">4. Beneficio Neto (Utilidad Limpia)</span>
          <div className={`mt-2 text-2xl font-bold font-mono-numbers ${netProfitUSD >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            ${netProfitUSD.toFixed(2)} <span className="text-xs font-normal text-slate-500">USD</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 mt-0.5">
            <span>{(netProfitUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}</span>
            <span>{netMarginPercent.toFixed(1)}% margen</span>
          </div>
        </div>
      </div>

      {/* Expenses Breakdown by Category & Register Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Category summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Desglose de Gastos por Categoría
          </h2>

          <div className="space-y-2.5 pt-1">
            {Object.keys(expenseByCategory).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No hay gastos registrados</p>
            ) : (
              Object.entries(expenseByCategory).map(([cat, amount]) => {
                const percent = totalExpensesUSD > 0 ? (amount / totalExpensesUSD) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{getCategoryLabel(cat)}</span>
                      <span className="font-mono-numbers font-bold text-slate-900">
                        ${amount.toFixed(2)} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-700 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Table of Expenses */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Historial de Gastos Operativos ({filteredExpenses.length})
              </h2>
              <p className="text-xs text-slate-500">
                Alquiler, fletes, nómina, servicios y suministros
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Filtrar:</label>
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-medium focus:outline-none"
              >
                <option value="all">Todas las Categorías</option>
                <option value="alquiler">Alquiler</option>
                <option value="servicios">Servicios</option>
                <option value="nomina">Nómina</option>
                <option value="fletes">Fletes</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="suministros">Suministros</option>
                <option value="otros">Otros</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3">Método / Ref</th>
                  <th className="py-2.5 px-3 text-right">Monto USD</th>
                  <th className="py-2.5 px-3 text-right">Monto {settings.currencySymbol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay gastos que coincidan con el filtro.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono-numbers text-slate-500">
                        {expense.date}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {getCategoryLabel(expense.category)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <div>{expense.description}</div>
                        <div className="text-[10px] text-slate-400">Por: {expense.registeredBy}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{expense.paymentMethod}</div>
                        {expense.reference && (
                          <div className="text-[10px] font-mono-numbers text-slate-400">
                            {expense.reference}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-slate-900">
                        ${expense.amountUSD.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-numbers text-slate-600">
                        {expense.amountLocal.toFixed(2)} {settings.currencySymbol}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Gasto Operativo</h3>
              <button
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción del Gasto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de alquiler Galpón mes actual"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría *</label>
                  <select
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none"
                  >
                    <option value="alquiler">Alquiler</option>
                    <option value="servicios">Servicios Básicos</option>
                    <option value="nomina">Nómina / Sueldos</option>
                    <option value="fletes">Fletes y Traslados</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="suministros">Suministros y Papelería</option>
                    <option value="impuestos">Impuestos / Tasas</option>
                    <option value="otros">Otros Gastos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono-numbers focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monto en Divisas ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={expenseForm.amountUSD}
                    onChange={e => setExpenseForm({ ...expenseForm, amountUSD: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono-numbers font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {parseFloat(expenseForm.amountUSD) > 0 && (
                    <span className="text-[10px] text-emerald-700 font-mono-numbers mt-0.5 block">
                      ≈ {(parseFloat(expenseForm.amountUSD) * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Método de Pago</label>
                  <input
                    type="text"
                    placeholder="Efectivo USD / Transferencia"
                    value={expenseForm.paymentMethod}
                    onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">N° Comprobante / Referencia</label>
                <input
                  type="text"
                  placeholder="Ej: REC-9821 / TR-0041"
                  value={expenseForm.reference}
                  onChange={e => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded cursor-pointer"
                >
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

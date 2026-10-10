import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Save, RotateCcw, Building } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetToSampleData } = useApp();

  const [formData, setFormData] = useState({
    companyName: settings.companyName,
    companyDoc: settings.companyDoc,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    companyAddress: settings.companyAddress,
    taxRatePercent: settings.taxRatePercent,
    currencySymbol: settings.currencySymbol,
    currencyName: settings.currencyName,
    invoicePrefix: settings.invoicePrefix,
    receiptFooterMessage: settings.receiptFooterMessage,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...formData,
      taxRatePercent: Number(formData.taxRatePercent),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetData = () => {
    if (window.confirm('¿Está seguro de restablecer los datos de demostración iniciales? Esto repondrá productos, ventas y gastos predeterminados.')) {
      resetToSampleData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Configuración de la Empresa y Facturación</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nombre o Razón Social de la Empresa *</label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">RIF / NIT / Identificación Fiscal *</label>
              <input
                type="text"
                required
                value={formData.companyDoc}
                onChange={e => setFormData({ ...formData, companyDoc: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={formData.companyPhone}
                onChange={e => setFormData({ ...formData, companyPhone: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={e => setFormData({ ...formData, companyEmail: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dirección Física</label>
            <input
              type="text"
              value={formData.companyAddress}
              onChange={e => setFormData({ ...formData, companyAddress: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Impuesto IVA (%)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.taxRatePercent}
                onChange={e => setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono-numbers focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Símbolo Local</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre Moneda</label>
              <input
                type="text"
                value={formData.currencyName}
                onChange={e => setFormData({ ...formData, currencyName: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mensaje al Pie de Facturas / Tickets</label>
            <textarea
              rows={2}
              value={formData.receiptFooterMessage}
              onChange={e => setFormData({ ...formData, receiptFooterMessage: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetData}
              className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Datos Demo</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded cursor-pointer"
              >
                {savedSuccess ? '¡Guardado!' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

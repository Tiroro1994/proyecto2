import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  AlertCircle,
  Database,
  Table,
  CheckCircle2,
  X,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { SystemAlert } from '../../types';

export const SystemAlertsContainer: React.FC = () => {
  const {
    systemAlerts,
    dismissAlert,
    setIsDiagnosticsModalOpen,
    repairOrGenerateTables,
  } = useApp();

  if (systemAlerts.length === 0) return null;

  const renderIcon = (alert: SystemAlert) => {
    switch (alert.type) {
      case 'database_connection_error':
        return <Database className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
      case 'table_generation_error':
        return <Table className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'unfilled_field_error':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
      case 'database_sync_error':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />;
    }
  };

  const getAlertStyle = (alert: SystemAlert) => {
    switch (alert.type) {
      case 'database_connection_error':
        return 'border-rose-300 bg-rose-50 text-rose-950 shadow-md';
      case 'table_generation_error':
        return 'border-amber-300 bg-amber-50 text-amber-950 shadow-md';
      case 'unfilled_field_error':
        return 'border-rose-300 bg-rose-50 text-rose-950 shadow-md';
      default:
        return 'border-slate-300 bg-white text-slate-900 shadow-md';
    }
  };

  return (
    <aside
      aria-label="Notificaciones y señales de error del sistema"
      className="fixed top-18 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {systemAlerts.slice(0, 3).map(alert => (
        <div
          key={alert.id}
          className={`pointer-events-auto p-3 rounded-lg border flex items-start gap-2.5 transition-all animate-in slide-in-from-top-2 duration-200 ${getAlertStyle(
            alert
          )}`}
        >
          {renderIcon(alert)}
          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-bold tracking-tight text-[11px] truncate">
                {alert.title}
              </span>
              <span className="text-[10px] opacity-60 shrink-0">{alert.timestamp}</span>
            </div>
            <p className="text-[11px] leading-snug line-clamp-2">{alert.message}</p>
            {alert.fieldName && (
              <span className="mt-1 inline-block px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 text-[10px] font-semibold font-mono">
                Campo: {alert.fieldName}
              </span>
            )}
            {alert.tableName && (
              <span className="mt-1 inline-block px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-semibold font-mono">
                Tabla: {alert.tableName}
              </span>
            )}

            {/* Quick action button */}
            <div className="mt-2 flex items-center gap-2">
              {alert.type === 'database_connection_error' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDiagnosticsModalOpen(true);
                    dismissAlert(alert.id);
                  }}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] transition-colors cursor-pointer"
                >
                  Diagnosticar Conexión
                </button>
              )}
              {alert.type === 'table_generation_error' && (
                <button
                  type="button"
                  onClick={() => {
                    repairOrGenerateTables();
                    dismissAlert(alert.id);
                  }}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px] transition-colors cursor-pointer"
                >
                  Regenerar Tablas
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismissAlert(alert.id)}
            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer shrink-0"
            title="Cerrar señal de error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </aside>
  );
};

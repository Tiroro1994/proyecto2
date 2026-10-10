import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Table,
  Wrench,
  X,
  AlertCircle,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export const DatabaseDiagnosticsModal: React.FC = () => {
  const {
    isDiagnosticsModalOpen,
    setIsDiagnosticsModalOpen,
    databaseConfig,
    databaseDiagnostics,
    runDatabaseDiagnostics,
    repairOrGenerateTables,
    systemAlerts,
    dismissAlert,
    clearAllAlerts,
  } = useApp();

  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!isDiagnosticsModalOpen) return null;

  const handleRefreshDiagnostics = async () => {
    setIsRunningCheck(true);
    setActionFeedback(null);
    try {
      const res = await runDatabaseDiagnostics();
      if (res.isConnected && res.missingTables.length === 0) {
        setActionFeedback(`✓ Diagnóstico completado: Todas las ${res.totalExpectedTables} tablas están generadas y la conexión responde.`);
      } else if (!res.isConnected) {
        setActionFeedback('⚠️ Diagnóstico completado: No se conectó al servidor MySQL. Verifique el puerto 3306.');
      } else {
        setActionFeedback(`⚠️ Diagnóstico completado: Faltan ${res.missingTables.length} tablas por generar.`);
      }
    } finally {
      setIsRunningCheck(false);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleRepairTables = async () => {
    setIsRepairing(true);
    setActionFeedback(null);
    try {
      const res = await repairOrGenerateTables();
      setActionFeedback(res.message);
    } finally {
      setIsRepairing(false);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const isConnected = databaseDiagnostics.isConnected;
  const missingCount = databaseDiagnostics.missingTables.length;
  const isHealthy = isConnected && missingCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isHealthy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Diagnóstico y Señales del Sistema</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isHealthy
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isHealthy ? 'Esquema Óptimo' : !isConnected ? 'Desconectado de MySQL' : 'Tablas Faltantes'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Verificación de conectividad a bases de datos, generación de tablas e integridad de campos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDiagnosticsModalOpen(false)}
            className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action feedback bar */}
        {actionFeedback && (
          <div className="px-4 py-2 bg-slate-800 text-emerald-300 text-xs font-semibold flex items-center justify-between border-b border-slate-700 animate-in fade-in">
            <span>{actionFeedback}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs">
          {/* Critical signals banner if issues detected */}
          {!isConnected && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-lg text-rose-950 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-rose-900">
                  Señal de Error: No se conectó a la Base de Datos MySQL
                </h4>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  El sistema no pudo establecer conexión directa con el servidor de base de datos en{' '}
                  <span className="font-mono font-semibold">{databaseConfig.host}:{databaseConfig.port}</span>.
                </p>
                <div className="mt-2 text-[11px] bg-white/80 p-2 rounded border border-rose-200 text-rose-900">
                  <div className="font-semibold text-rose-950 mb-0.5">Diagnóstico y Solución:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px] text-rose-800">
                    <li>Abra el Panel de Control de <strong>XAMPP</strong> y verifique que el módulo <strong>MySQL</strong> esté en verde (Puerto 3306).</li>
                    <li>Compruebe que el usuario (por defecto: <code>root</code>) y contraseña coincidan con su instalación local.</li>
                    <li>Mientras tanto, todos los registros se resguardan de forma segura en <strong>almacenamiento local del navegador</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {isConnected && missingCount > 0 && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-lg text-amber-950 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-amber-900">
                  Señal de Error Crítico: No se generó una tabla en la Base de Datos
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Faltan <strong>{missingCount}</strong> tablas normalizadas por generar en la base de datos{' '}
                  <span className="font-mono font-semibold">{databaseConfig.database}</span>:{' '}
                  <span className="font-mono font-semibold text-rose-700">
                    {databaseDiagnostics.missingTables.join(', ')}
                  </span>.
                </p>
                <button
                  onClick={handleRepairTables}
                  disabled={isRepairing}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs transition-colors cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{isRepairing ? 'Generando Tablas...' : 'Generar y Reparar Tablas Ahora'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Metrics summary grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <Server className="w-3 h-3 text-slate-400" />
                <span>Servidor</span>
              </div>
              <div className="mt-1 font-bold text-slate-900 font-mono truncate">
                {databaseConfig.host}:{databaseConfig.port}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">{databaseConfig.engine}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <Database className="w-3 h-3 text-slate-400" />
                <span>Base de Datos</span>
              </div>
              <div className="mt-1 font-bold text-slate-900 font-mono truncate">
                {databaseConfig.database}
              </div>
              <div className="text-[10px] text-slate-500">Esquema Normalizado</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <Table className="w-3 h-3 text-slate-400" />
                <span>Tablas Generadas</span>
              </div>
              <div className="mt-1 font-bold text-slate-900 font-mono">
                <span className={missingCount === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {databaseDiagnostics.generatedTablesCount}
                </span>{' '}
                / {databaseDiagnostics.totalExpectedTables}
              </div>
              <div className="text-[10px] text-slate-500">
                {missingCount === 0 ? '100% creadas' : `Faltan ${missingCount}`}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <Radio className="w-3 h-3 text-slate-400" />
                <span>Estado Enlace</span>
              </div>
              <div className="mt-1 font-bold">
                {isConnected ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    En Línea
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Sin Conexión
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500">
                {databaseDiagnostics.lastDiagnosticTime || 'Reciente'}
              </div>
            </div>
          </div>

          {/* Tables Integrity Inspection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-slate-700" />
                <span>Auditoría de Tablas en la Base de Datos ({databaseDiagnostics.totalExpectedTables} Normalizadas)</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                Verificación individual por tabla
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
              {databaseDiagnostics.tables.map((table, idx) => {
                const isTableMissing = !table.exists || table.status === 'missing';

                return (
                  <div
                    key={table.name}
                    className={`p-2.5 flex items-center justify-between text-xs transition-colors ${
                      isTableMissing ? 'bg-rose-50/70' : idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isTableMissing ? (
                        <div className="p-1 rounded bg-rose-100 text-rose-700 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-emerald-100 text-emerald-700 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{table.name}</span>
                          {isTableMissing && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white">
                              NO SE GENERÓ LA TABLA
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{table.description}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isTableMissing ? (
                        <span className="text-[11px] font-bold text-rose-600">No existe en MySQL</span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-700">
                          <strong>{table.rowCount}</strong> registros
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active System Error Signals List */}
          {systemAlerts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Historial de Señales de Error Recientes ({systemAlerts.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={clearAllAlerts}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Limpiar historial
                </button>
              </div>

              <div className="space-y-2">
                {systemAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{alert.title}</span>
                        <span className="text-[10px] text-slate-400">{alert.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-700">{alert.message}</p>
                      {alert.detail && (
                        <p className="text-[10px] text-slate-500 italic">{alert.detail}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissAlert(alert.id)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500">
            Última verificación: <span className="font-mono">{databaseDiagnostics.lastDiagnosticTime || 'Ahora'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshDiagnostics}
              disabled={isRunningCheck}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCheck ? 'animate-spin' : ''}`} />
              <span>{isRunningCheck ? 'Ejecutando...' : 'Reejecutar Diagnóstico'}</span>
            </button>

            <button
              type="button"
              onClick={handleRepairTables}
              disabled={isRepairing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Wrench className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
              <span>{isRepairing ? 'Regenerando...' : 'Regenerar / Reparar Tablas'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDiagnosticsModalOpen(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

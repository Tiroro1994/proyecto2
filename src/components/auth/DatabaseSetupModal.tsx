import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Database,
  CheckCircle,
  AlertCircle,
  Server,
  Key,
  Layers,
  ArrowRight,
  ShieldAlert,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { DatabaseConfig } from '../../types';
import { FormFieldError } from '../common/FormFieldError';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    databaseConfig,
    connectAndInitializeDatabase,
    isDatabaseConnected,
    triggerErrorSignal,
    runDatabaseDiagnostics,
  } = useApp();

  const [engine, setEngine] = useState<'mysql' | 'postgresql' | 'sqlite' | 'mariadb'>('mysql');
  const [host, setHost] = useState(databaseConfig.host || '127.0.0.1');
  const [port, setPort] = useState(databaseConfig.port?.toString() || '3306');
  const [dbName, setDbName] = useState(databaseConfig.database || 'invbulto_db');
  const [dbUser, setDbUser] = useState(databaseConfig.username || 'root');
  const [dbPassword, setDbPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleEngineChange = (newEngine: 'mysql' | 'postgresql' | 'sqlite' | 'mariadb') => {
    setEngine(newEngine);
    setFieldErrors({});
    if (newEngine === 'mysql' || newEngine === 'mariadb') {
      setPort('3306');
    } else if (newEngine === 'postgresql') {
      setPort('5432');
    } else if (newEngine === 'sqlite') {
      setPort('');
      setHost('local_storage');
    }
  };

  const handleLoadXamppDefaults = () => {
    setEngine('mysql');
    setHost('127.0.0.1');
    setPort('3306');
    setDbName('invbulto_db');
    setDbUser('root');
    setDbPassword('');
    setFieldErrors({});
  };

  const handleConnectAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultMessage(null);
    const errors: Record<string, string> = {};

    if (engine !== 'sqlite') {
      if (!host.trim()) {
        errors.host = '⚠️ Este campo no se rellenó (Servidor / Host es obligatorio)';
      }
      if (!port.trim()) {
        errors.port = '⚠️ Este campo no se rellenó (Puerto es obligatorio)';
      }
      if (!dbName.trim()) {
        errors.dbName = '⚠️ Este campo no se rellenó (Nombre de BD es obligatorio)';
      }
      if (!dbUser.trim()) {
        errors.dbUser = '⚠️ Este campo no se rellenó (Usuario de BD es obligatorio)';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error: Campo sin rellenar en Configuración BD',
        message: `No se rellenó el campo requerido "${firstField}" para la conexión a la base de datos.`,
        fieldName: firstField,
        severity: 'warning',
      });
      return;
    }

    setFieldErrors({});
    setIsProcessing(true);

    const config: DatabaseConfig = {
      engine,
      host: engine === 'sqlite' ? 'local_storage' : host.trim(),
      port: engine === 'sqlite' ? 0 : parseInt(port) || 3306,
      database: dbName.trim() || 'invbulto_db',
      username: dbUser.trim() || 'root',
      password: dbPassword,
      status: 'connected',
    };

    // Try testing actual XAMPP PHP backend if running in Apache
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const apiRes = await fetch('./api/db.php?action=initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (apiRes && apiRes.ok) {
        const json = await apiRes.json();
        if (json.success) {
          connectAndInitializeDatabase(config);
          await runDatabaseDiagnostics();
          setResultMessage({
            type: 'success',
            text: `¡Conexión XAMPP exitosa! ${json.message}`,
          });
          setTimeout(() => {
            setIsProcessing(false);
            if (onSuccess) onSuccess();
            onClose();
          }, 1000);
          return;
        } else {
          // If server responded with error in table creation or connection
          if (json.missingTables && json.missingTables.length > 0) {
            triggerErrorSignal({
              type: 'table_generation_error',
              title: 'Señal de Error: No se generó una tabla',
              message: `No se pudieron generar las tablas: ${json.missingTables.join(', ')}.`,
              detail: json.error || 'Error de permisos o sintaxis SQL al crear tablas.',
              severity: 'error',
            });
          } else {
            triggerErrorSignal({
              type: 'database_connection_error',
              title: 'Señal de Error: No se conectó a la Base de Datos',
              message: json.error || 'No se pudo conectar a MySQL con las credenciales indicadas.',
              severity: 'error',
            });
          }
        }
      } else if (apiRes && !apiRes.ok) {
        triggerErrorSignal({
          type: 'database_connection_error',
          title: 'Señal de Error: Servidor PHP / MySQL no disponible',
          message: `Código de respuesta HTTP ${apiRes.status}. Verifique que el servicio Apache/PHP esté activo en XAMPP.`,
          severity: 'error',
        });
      }
    } catch {
      // Fallback to client-side initialization
    }

    // Client-side initialization fallback
    setTimeout(() => {
      try {
        const res = connectAndInitializeDatabase(config);
        runDatabaseDiagnostics();
        setResultMessage({
          type: 'success',
          text: res.message,
        });

        setTimeout(() => {
          setIsProcessing(false);
          if (onSuccess) onSuccess();
          onClose();
        }, 1000);
      } catch (err: any) {
        setIsProcessing(false);
        setResultMessage({
          type: 'error',
          text: err?.message || 'Error al conectar e inicializar la base de datos.',
        });
        triggerErrorSignal({
          type: 'database_connection_error',
          title: 'Señal de Error: Fallo en inicialización',
          message: err?.message || 'No se pudo inicializar la base de datos.',
          severity: 'error',
        });
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full my-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Configuración y Creación de Base de Datos</h3>
              <p className="text-[11px] text-slate-400">
                Conecte o inicialice la base de datos para habilitar el sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConnectAndCreate} className="p-5 space-y-4 text-xs">
          {/* Important Requirement Notice */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Creación Automática de Usuario Estándar</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Al conectar o crear la base de datos, el sistema ejecutará las migraciones e inicializará el usuario estándar con usuario: <strong>admin</strong> y contraseña: <strong>admin</strong>.
            </p>
          </div>

          {resultMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                resultMessage.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              {resultMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{resultMessage.text}</span>
            </div>
          )}

          {/* 1. Database Engine */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800">
                1. Motor de Base de Datos
              </label>
              <button
                type="button"
                onClick={handleLoadXamppDefaults}
                className="text-[10px] text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Cargar MySQL XAMPP (127.0.0.1, puerto 3306, user root, sin clave)"
              >
                <span>⚡ Cargar Configuración XAMPP</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'mysql', label: 'MySQL', icon: '🐬' },
                { id: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
                { id: 'mariadb', label: 'MariaDB', icon: '🦭' },
                { id: 'sqlite', label: 'SQLite Local', icon: '📁' },
              ].map(eng => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => handleEngineChange(eng.id as any)}
                  className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    engine === eng.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-base block mb-0.5">{eng.icon}</span>
                  <span className="text-xs">{eng.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Connection Parameters */}
          {engine !== 'sqlite' ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Servidor / Host *
                  </label>
                  <input
                    type="text"
                    placeholder="127.0.0.1 o localhost"
                    value={host}
                    onChange={e => {
                      setHost(e.target.value);
                      if (fieldErrors.host) setFieldErrors(prev => ({ ...prev, host: '' }));
                    }}
                    className={`w-full px-2.5 py-1.5 rounded text-slate-900 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all ${
                      fieldErrors.host
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-200'
                        : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                  <FormFieldError error={fieldErrors.host} />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Puerto *
                  </label>
                  <input
                    type="number"
                    placeholder={engine === 'postgresql' ? '5432' : '3306'}
                    value={port}
                    onChange={e => {
                      setPort(e.target.value);
                      if (fieldErrors.port) setFieldErrors(prev => ({ ...prev, port: '' }));
                    }}
                    className={`w-full px-2.5 py-1.5 rounded text-slate-900 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all ${
                      fieldErrors.port
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-200'
                        : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                  <FormFieldError error={fieldErrors.port} />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre de la Base de Datos *
                </label>
                <input
                  type="text"
                  placeholder="invbulto_pos_db"
                  value={dbName}
                  onChange={e => {
                    setDbName(e.target.value);
                    if (fieldErrors.dbName) setFieldErrors(prev => ({ ...prev, dbName: '' }));
                  }}
                  className={`w-full px-2.5 py-1.5 rounded text-slate-900 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all ${
                    fieldErrors.dbName
                      ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-200'
                      : 'bg-slate-50 border border-slate-300'
                  }`}
                />
                <FormFieldError error={fieldErrors.dbName} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Usuario BD *
                  </label>
                  <input
                    type="text"
                    placeholder="root o postgres"
                    value={dbUser}
                    onChange={e => {
                      setDbUser(e.target.value);
                      if (fieldErrors.dbUser) setFieldErrors(prev => ({ ...prev, dbUser: '' }));
                    }}
                    className={`w-full px-2.5 py-1.5 rounded text-slate-900 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all ${
                      fieldErrors.dbUser
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-200'
                        : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                  <FormFieldError error={fieldErrors.dbUser} />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Contraseña BD
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={dbPassword}
                    onChange={e => setDbPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs">
              <span className="font-bold text-slate-800 block mb-1">Base de Datos SQLite Embebida</span>
              Los datos se almacenarán localmente con persistencia inmediata y esquema relacional completo.
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {isDatabaseConnected ? '🟢 Base de datos actual activa' : '🔴 Sin base de datos configurada'}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <span>Conectando e Inicializando...</span>
                ) : (
                  <>
                    <HardDrive className="w-4 h-4" />
                    <span>Conectar y Crear Base de Datos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

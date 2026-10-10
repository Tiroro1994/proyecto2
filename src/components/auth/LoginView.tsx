import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  User,
  Database,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Boxes,
  Package,
  Layers,
  Sparkles,
  Server,
  Settings,
} from 'lucide-react';
import { DatabaseSetupModal } from './DatabaseSetupModal';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const {
    login,
    isDatabaseConnected,
    databaseConfig,
    branding,
    settings,
  } = useApp();

  const [username, setUsername] = useState(isDatabaseConnected ? 'admin' : '');
  const [password, setPassword] = useState(isDatabaseConnected ? 'admin' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!isDatabaseConnected) {
      setError(
        'El sistema no encuentra una base de datos conectada. Por favor use el botón en la esquina superior derecha para configurar y crear la base de datos.'
      );
      return;
    }

    if (!username.trim()) {
      setError('Por favor ingrese su nombre de usuario.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const res = login(username, password);
      setIsSubmitting(false);

      if (!res.success) {
        setError(res.error || 'Error al iniciar sesión.');
      } else {
        if (onLoginSuccess) onLoginSuccess();
      }
    }, 350);
  };

  const handleFillAdmin = () => {
    setUsername('admin');
    setPassword('admin');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center relative overflow-hidden px-4 sm:px-6 lg:px-8 select-none">
      {/* Background visual accents */}
      <div className="absolute inset-0 bg-radial from-slate-800 via-slate-900 to-slate-950 pointer-events-none opacity-80" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* --- CORNER DATABASE CONFIGURATION BUTTON ---
          Requirement: "si la pagina no encuentra base de datos en una esquina se pone la configuracion para poner las bases de datos si se conecta a una base de datos esta opcion desaparece" */}
      {!isDatabaseConnected && (
        <div className="absolute top-4 right-4 z-40 animate-bounce duration-1000">
          <button
            type="button"
            onClick={() => setIsDbModalOpen(true)}
            className="group flex items-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xl border-2 border-amber-300 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Configurar y conectar Base de Datos"
          >
            <div className="relative">
              <Database className="w-4 h-4 text-slate-950" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping" />
            </div>
            <div className="text-left">
              <span className="block leading-none font-extrabold text-[11px]">
                Configurar Base de Datos
              </span>
              <span className="block text-[9px] text-amber-950 font-medium">
                Sin BD conectada · Clic aquí
              </span>
            </div>
            <Settings className="w-3.5 h-3.5 text-amber-950 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      )}

      {/* Main Login Card */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20 mb-3">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {branding.brandName}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {settings.companyName || 'Control de Inventario por Bulto y Punto de Venta'}
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-8 rounded-2xl shadow-2xl border border-slate-200">
          {/* Status Indicator Bar */}
          <div className="mb-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Inicio de Sesión
            </span>

            {/* Database status indicator */}
            <div className="flex items-center gap-1.5">
              {isDatabaseConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>BD Conectada ({databaseConfig.engine.toUpperCase()})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                  <span>Sin Base de Datos</span>
                </span>
              )}
            </div>
          </div>

          {/* Database Alert Banner when not connected */}
          {!isDatabaseConnected && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Base de Datos Requerida</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-tight">
                El sistema no encuentra una base de datos. Haga clic en el botón de la esquina superior o en el siguiente botón para configurarla y crear el usuario estándar:
              </p>
              <button
                type="button"
                onClick={() => setIsDbModalOpen(true)}
                className="w-full mt-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Crear e Inicializar Base de Datos Ahora</span>
              </button>
            </div>
          )}

          {/* Success notice when created */}
          {successNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Usuario o Correo Electrónico *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Contraseña *
                </label>
                {isDatabaseConnected && (
                  <button
                    type="button"
                    onClick={handleFillAdmin}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                  >
                    Usar clave estándar (admin)
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="admin"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-400 mt-2"
            >
              {isSubmitting ? (
                <span>Verificando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Standard credentials hint box */}
          <div className="mt-5 pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Credenciales Estándar del Sistema:</span>
              </span>
              <button
                type="button"
                onClick={handleFillAdmin}
                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold hover:bg-emerald-100 transition-colors cursor-pointer text-[10px]"
              >
                Autocompletar
              </button>
            </div>
            <div className="font-mono text-slate-700 text-[10px] pt-0.5">
              Usuario: <strong className="text-slate-900">admin</strong> · Contraseña: <strong className="text-slate-900">admin</strong>
            </div>
          </div>
        </div>

        {/* Quiet Footnote */}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          InvBulto POS · Facturación Bimonetaria y Control de Almacén
        </p>
      </div>

      {/* Database Setup Modal */}
      <DatabaseSetupModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onSuccess={() => {
          setUsername('admin');
          setPassword('admin');
          setSuccessNotice(
            '¡Base de datos conectada! Se ha configurado el usuario estándar: admin con contraseña: admin.'
          );
          setError(null);
        }}
      />
    </div>
  );
};

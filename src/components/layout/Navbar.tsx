import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  RefreshCw,
  Settings,
  ChevronDown,
  ArrowRightLeft,
  CheckCircle,
  Menu,
  Palette,
  Boxes,
  Package,
  Store,
  Layers,
  ShoppingBag,
  Building2,
  Barcode,
  Truck,
  LogOut,
  Database,
  Activity,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { LogoIconType } from '../../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenLowStock: () => void;
  onOpenSettings: () => void;
  onOpenBranding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenLowStock,
  onOpenSettings,
  onOpenBranding,
}) => {
  const {
    exchangeRate,
    syncLiveDailyRate,
    isSyncingRate,
    users,
    currentUser,
    lowStockProducts,
    settings,
    branding,
    setIsMobileOffcanvasOpen,
    toggleSidebarCollapse,
    logout,
    databaseConfig,
    isDatabaseConnected,
    isDbOnline,
    databaseDiagnostics,
    systemAlerts,
    setIsDiagnosticsModalOpen,
  } = useApp();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.rate.toString());
  const { updateExchangeRate } = useApp();

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempRate);
    if (!isNaN(val) && val > 0) {
      updateExchangeRate(val, 'manual');
      setShowRateModal(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'gerente': return 'Gerente';
      case 'cajero': return 'Cajero';
      case 'almacen': return 'Almacén';
      default: return role;
    }
  };

  const renderLogoIcon = (iconType: LogoIconType, className = 'w-5 h-5') => {
    switch (iconType) {
      case 'Boxes': return <Boxes className={className} />;
      case 'Package': return <Package className={className} />;
      case 'Store': return <Store className={className} />;
      case 'Layers': return <Layers className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      case 'Building2': return <Building2 className={className} />;
      case 'Barcode': return <Barcode className={className} />;
      case 'Truck': return <Truck className={className} />;
      default: return <Boxes className={className} />;
    }
  };

  const isLight = branding.barTextColor === '#0f172a' || branding.barBgColor.toLowerCase() === '#ffffff';

  return (
    <>
      <header
        className="sticky top-0 z-30 transition-colors duration-200 border-b shadow-2xs"
        style={{
          backgroundColor: branding.barBgColor,
          color: branding.barTextColor,
          borderColor: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Top Bar Contract: 3 zones */}
          <div className="flex items-center justify-between h-16">
            {/* Zone 1: Mobile Hamburger + Brand Wordmark / Logo */}
            <div className="flex items-center gap-3">
              {/* Sidebar Menu Trigger (Opens drawer on mobile or expands on desktop) */}
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setIsMobileOffcanvasOpen(true);
                  } else {
                    toggleSidebarCollapse();
                  }
                }}
                className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={branding.isSidebarCollapsed ? 'Abrir / Expandir Menú Lateral' : 'Alternar Menú'}
                style={{ color: branding.barTextColor }}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Brand Logo & Name */}
              <button
                onClick={() => onSelectTab('dashboard')}
                className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
              >
                {branding.logoType === 'image' && branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.brandName}
                    className="w-8 h-8 rounded object-contain bg-white/10 p-0.5"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)',
                      color: branding.barTextColor,
                    }}
                  >
                    {renderLogoIcon(branding.logoIcon, 'w-4 h-4')}
                  </div>
                )}
                <div>
                  <span
                    className="text-base sm:text-lg font-extrabold tracking-tight block leading-tight truncate max-w-[180px] sm:max-w-none"
                    style={{ color: branding.barTextColor }}
                  >
                    {branding.brandName}
                  </span>
                  <span
                    className="text-[10px] hidden md:block opacity-75 font-medium leading-none truncate max-w-[200px]"
                  >
                    {branding.brandTagline}
                  </span>
                </div>
              </button>
            </div>

            {/* Zone 2: Navigation Links (desktop breadcrumb / quick tabs) */}
            <div className="hidden xl:flex items-center gap-5 text-xs font-semibold opacity-90">
              <span className="opacity-60 text-[11px]">Sistema ERP & POS Mayorista</span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span className="font-mono-numbers">
                Tasa Hoy: 1 USD = {exchangeRate.rate.toFixed(2)} {settings.currencySymbol}
              </span>
            </div>

            {/* Zone 3: Primary Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Daily Exchange Rate Trigger */}
              <button
                onClick={() => {
                  setTempRate(exchangeRate.rate.toString());
                  setShowRateModal(true);
                }}
                title="Tasa de cambio vigente. Clic para editar o sincronizar."
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.15)',
                  color: branding.barTextColor,
                }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono-numbers font-semibold">
                  1$ = {exchangeRate.rate.toFixed(2)} {settings.currencySymbol}
                </span>
              </button>

              {/* Theme & Bar Color Customizer Button */}
              <button
                onClick={onOpenBranding}
                title="Personalizar color de barra, logotipo y tema"
                className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                style={{ color: branding.barTextColor }}
              >
                <Palette className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Personalizar</span>
              </button>

              {/* Database Status & Diagnostics Indicator Button */}
              <button
                type="button"
                onClick={() => setIsDiagnosticsModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all hover:scale-102 ${
                  isDbOnline && databaseDiagnostics.missingTables.length === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                    : !isDbOnline
                    ? 'bg-rose-500/25 text-rose-200 border-rose-400/50 hover:bg-rose-500/35'
                    : 'bg-amber-500/25 text-amber-200 border-amber-400/50 hover:bg-amber-500/35'
                }`}
                title={
                  isDbOnline && databaseDiagnostics.missingTables.length === 0
                    ? `Base de Datos MySQL Conectada (10/10 tablas). Clic para ver diagnóstico.`
                    : !isDbOnline
                    ? `Señal de Error: No se conectó a MySQL (puerto 3306). Clic para diagnosticar.`
                    : `Señal de Error: Faltan ${databaseDiagnostics.missingTables.length} tablas. Clic para reparar.`
                }
              >
                <Database className="w-3.5 h-3.5" />
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDbOnline && databaseDiagnostics.missingTables.length === 0
                      ? 'bg-emerald-400 animate-pulse'
                      : !isDbOnline
                      ? 'bg-rose-400 animate-ping'
                      : 'bg-amber-400 animate-bounce'
                  }`}
                />
                <span className="font-mono text-[10px] hidden sm:inline">
                  {databaseConfig.database}
                </span>
                {!isDbOnline && (
                  <span className="text-[9px] font-bold bg-rose-700 text-white px-1 rounded uppercase tracking-wider">
                    Sin Conexión
                  </span>
                )}
                {isDbOnline && databaseDiagnostics.missingTables.length > 0 && (
                  <span className="text-[9px] font-bold bg-amber-700 text-white px-1 rounded uppercase tracking-wider">
                    Faltan Tablas
                  </span>
                )}
              </button>

              {/* System Error Signals Bell Button */}
              {systemAlerts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDiagnosticsModalOpen(true)}
                  title={`${systemAlerts.length} señales de error registradas. Clic para inspeccionar.`}
                  className="relative p-2 rounded-md bg-rose-500/20 text-rose-300 border border-rose-400/40 hover:bg-rose-500/30 transition-colors cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4 text-rose-300 animate-pulse" />
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white font-mono shadow-xs">
                    {systemAlerts.length}
                  </span>
                </button>
              )}

              {/* Low Stock Notification Bell */}
              <button
                onClick={onOpenLowStock}
                title="Alertas de inventario bajo"
                className="relative p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                style={{ color: branding.barTextColor }}
              >
                <Bell className="w-4 h-4" />
                {lowStockProducts.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white font-mono-numbers shadow-2xs">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>

              {/* Active User Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 pl-2.5 rounded-md border border-white/20 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  style={{ color: branding.barTextColor }}
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-xs">
                    <div className="font-semibold truncate max-w-[90px] leading-tight">
                      {currentUser.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] opacity-75 uppercase tracking-wider leading-none">
                      {getRoleBadge(currentUser.role)}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* User Profile Info */}
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                          {currentUser.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-900 truncate">{currentUser.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">@{currentUser.username}</p>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {getRoleBadge(currentUser.role)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notice: Fast switching disabled for security */}
                    <div className="px-3 py-1.5 text-[10px] text-slate-500 bg-slate-50 border-y border-slate-100/80 mb-1 leading-snug">
                      🔒 Cambio rápido deshabilitado. Para acceder con otra cuenta, use "Cerrar Sesión" e ingrese su contraseña.
                    </div>

                    <div className="px-3 space-y-1">
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenBranding();
                        }}
                        className="w-full py-1.5 flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <Palette className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Colores & Logo</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenSettings();
                        }}
                        className="w-full py-1.5 flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configuración de la Tienda</span>
                      </button>

                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            logout();
                          }}
                          className="w-full py-1.5 flex items-center gap-2 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded px-1 cursor-pointer font-semibold transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Tasa de Cambio */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Gestión de Tasa de Cambio Vigente
                </h3>
              </div>
              <button
                onClick={() => setShowRateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Todos los precios en el Punto de Venta, inventario y facturación se convierten en tiempo real usando esta tasa de referencia.
            </p>

            <form onSubmit={handleSaveRate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tasa Actual (1 USD a {settings.currencyName})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={tempRate}
                    onChange={e => setTempRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md font-mono-numbers text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="45.50"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                    {settings.currencySymbol} / USD
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Modo configurado:</span>
                  <span className="font-medium text-slate-900 capitalize">{exchangeRate.mode}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Última actualización:</span>
                  <span className="font-mono-numbers text-slate-900">
                    {new Date(exchangeRate.lastUpdated).toLocaleString('es-ES')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await syncLiveDailyRate();
                    setTempRate(exchangeRate.rate.toString());
                  }}
                  disabled={isSyncingRate}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRate ? 'animate-spin text-emerald-600' : ''}`} />
                  {isSyncingRate ? 'Sincronizando...' : 'Actualizar Tasa del Día'}
                </button>

                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Guardar Tasa Manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  DollarSign,
  Users,
  ShieldCheck,
  Database,
  ChevronLeft,
  ChevronRight,
  X,
  Palette,
  Boxes,
  Store,
  Layers,
  ShoppingBag,
  Building2,
  Barcode,
  Truck,
  Tag,
  Receipt,
} from 'lucide-react';
import { LogoIconType } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenLowStock: () => void;
  onOpenBranding: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenBranding,
}) => {
  const {
    currentUser,
    hasPermission,
    lowStockProducts,
    branding,
    toggleSidebarCollapse,
    isMobileOffcanvasOpen,
    setIsMobileOffcanvasOpen,
  } = useApp();

  const isCollapsed = branding.isSidebarCollapsed;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Panel y Métricas',
      shortLabel: 'Panel',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'pos',
      label: 'Punto de Venta',
      shortLabel: 'POS',
      icon: ShoppingCart,
      show: hasPermission('canAccessPos'),
    },
    {
      id: 'inventory',
      label: 'Control de Inventario',
      shortLabel: 'Almacén',
      icon: Package,
      badge: lowStockProducts.length > 0 ? lowStockProducts.length : undefined,
      show: hasPermission('canManageInventory'),
    },
    {
      id: 'quick_products',
      label: 'Alta Rápida (Código y Nombre)',
      shortLabel: 'Alta Rápida',
      icon: Tag,
      show: hasPermission('canManageInventory'),
    },
    {
      id: 'purchases',
      label: 'Compras de Mercancía',
      shortLabel: 'Compras',
      icon: Truck,
      show: hasPermission('canManagePurchases'),
    },
    {
      id: 'purchase_history',
      label: 'Historial de Compras',
      shortLabel: 'Facturas Compra',
      icon: Receipt,
      show: hasPermission('canManagePurchases'),
    },
    {
      id: 'sales',
      label: 'Ventas y Facturas',
      shortLabel: 'Facturas',
      icon: FileText,
      show: hasPermission('canViewReports') || currentUser.role === 'cajero',
    },
    {
      id: 'expenses',
      label: 'Control de Gastos',
      shortLabel: 'Gastos',
      icon: Receipt,
      show: hasPermission('canManageFinances'),
    },
    {
      id: 'finances',
      label: 'Estado de Resultados P&L',
      shortLabel: 'P&L',
      icon: DollarSign,
      show: hasPermission('canManageFinances'),
    },
    {
      id: 'clients',
      label: 'Gestión de Clientes',
      shortLabel: 'Clientes',
      icon: Users,
      show: hasPermission('canManageClients'),
    },
    {
      id: 'users',
      label: 'Usuarios y Permisos',
      shortLabel: 'Roles',
      icon: ShieldCheck,
      show: hasPermission('canManageUsers'),
    },
    {
      id: 'laravel',
      label: 'Arquitectura Laravel MySQL',
      shortLabel: 'Laravel',
      icon: Database,
      show: hasPermission('canViewLaravelArchitecture'),
    },
  ].filter(item => item.show);

  // Dynamic Theme Colors calculation
  const getSidebarBg = () => {
    if (branding.sidebarTheme === 'match_bar') return branding.barBgColor;
    if (branding.sidebarTheme === 'light') return '#ffffff';
    return '#0f172a'; // dark
  };

  const isColorLight = (hexColor: string) => {
    const c = hexColor.replace('#', '');
    if (c.length === 6) {
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
      return hsp > 165;
    }
    return false;
  };

  const isLight =
    branding.sidebarTheme === 'light' ||
    (branding.sidebarTheme === 'match_bar' && isColorLight(branding.barBgColor));

  const textColor = isLight ? '#0f172a' : '#ffffff';
  const itemTextColor = isLight ? '#1e293b' : '#f1f5f9'; // Crisp, highly readable
  const activeTextColor = isLight ? '#065f46' : '#34d399'; // Emerald accented
  const mutedTextColor = isLight ? '#64748b' : '#94a3b8';
  const borderColor = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)';
  const activeBg = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';

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

  // Reusable function to render sidebar content, with explicit collapsed parameter
  const renderSidebarContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Brand Header */}
      <div>
        <div
          className={`p-3.5 flex items-center border-b ${
            collapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-2'
          }`}
          style={{ borderColor }}
        >
          <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center' : 'flex-1'}`}>
            {branding.logoType === 'image' && branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="w-8 h-8 rounded object-contain bg-white/10 p-0.5 shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold"
                style={{
                  backgroundColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)',
                  color: isLight ? '#0f172a' : '#ffffff',
                }}
              >
                {renderLogoIcon(branding.logoIcon, 'w-4 h-4')}
              </div>
            )}

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <span
                  className="font-extrabold text-sm tracking-tight truncate block leading-tight"
                  style={{ color: textColor }}
                >
                  {branding.brandName}
                </span>
                <span
                  className="text-[10px] truncate block opacity-80"
                  style={{ color: mutedTextColor }}
                >
                  {branding.brandTagline}
                </span>
              </div>
            )}
          </div>

          {/* Collapse/Expand Toggle button (only in desktop sidebar) */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            style={{ color: mutedTextColor }}
            title={collapsed ? 'Abrir / Expandir menú lateral' : 'Colapsar menú lateral'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setIsMobileOffcanvasOpen(false);
                }}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer relative min-w-0 ${
                  collapsed ? 'justify-center' : 'justify-start'
                } ${
                  isActive ? 'shadow-2xs font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                }`}
                style={{
                  backgroundColor: isActive ? activeBg : 'transparent',
                }}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-emerald-500"
                  />
                )}

                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-500' : ''
                  }`}
                  style={{ color: isActive ? activeTextColor : itemTextColor }}
                />

                {/* Name of the icon / navigation label - guaranteed visible when uncollapsed */}
                {!collapsed && (
                  <span
                    className="flex-1 text-left truncate text-xs font-semibold leading-tight min-w-0"
                    style={{ color: isActive ? activeTextColor : itemTextColor }}
                  >
                    {item.label}
                  </span>
                )}

                {/* Badge (e.g. low stock alerts) */}
                {item.badge !== undefined && (
                  <span
                    className={`flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white font-mono shrink-0 ${
                      collapsed ? 'absolute top-1 right-1' : 'ml-auto'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom utilities & user profile */}
      <div className="p-3 border-t space-y-2 shrink-0" style={{ borderColor }}>
        {/* Customization quick trigger */}
        <button
          onClick={onOpenBranding}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
          style={{ color: mutedTextColor }}
          title="Personalizar color de la barra, logo y tema"
        >
          <Palette className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          {!collapsed && <span className="truncate text-xs font-medium">Personalizar Colores & Logo</span>}
        </button>

        {/* User Card */}
        <div
          className={`flex items-center gap-2.5 p-2 rounded-lg ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
          style={{
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold truncate leading-tight" style={{ color: textColor }}>
                {currentUser.name}
              </p>
              <p className="text-[10px] capitalize opacity-80" style={{ color: mutedTextColor }}>
                Rol: {currentUser.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 border-r z-30 h-screen sticky top-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{
          backgroundColor: getSidebarBg(),
          borderColor,
        }}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* 2. Mobile / Tablet Offcanvas Slide-over Drawer */}
      {isMobileOffcanvasOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileOffcanvasOpen(false)}
          />

          {/* Drawer content: ALWAYS uncollapsed (collapsed = false) to show all icon names! */}
          <div
            className="relative flex-1 flex flex-col w-72 sm:w-80 max-w-[85vw] shadow-2xl z-50 h-full animate-in slide-in-from-left duration-200"
            style={{
              backgroundColor: getSidebarBg(),
            }}
          >
            {/* Mobile close button */}
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setIsMobileOffcanvasOpen(false)}
                className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                style={{ color: textColor }}
                title="Cerrar menú lateral"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render full uncollapsed sidebar with all icon labels visible */}
            <div className="h-full flex flex-col justify-between">
              {renderSidebarContent(false)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

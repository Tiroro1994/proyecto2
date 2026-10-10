import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LowStockModal } from './components/layout/LowStockModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { BrandingCustomizerModal } from './components/settings/BrandingCustomizerModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosView } from './components/pos/PosView';
import { InventoryView } from './components/inventory/InventoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { SalesView } from './components/sales/SalesView';
import { FinancesView } from './components/finances/FinancesView';
import { ExpensesView } from './components/finances/ExpensesView';
import { ClientsView } from './components/clients/ClientsView';
import { UsersView } from './components/users/UsersView';
import { LaravelHubView } from './components/laravel/LaravelHubView';
import { QuickProductsView } from './components/products/QuickProductsView';
import { PurchaseHistoryView } from './components/purchases/PurchaseHistoryView';
import { LoginView } from './components/auth/LoginView';
import { DatabaseDiagnosticsModal } from './components/common/DatabaseDiagnosticsModal';
import { SystemAlertsContainer } from './components/layout/SystemAlertsContainer';

const MainAppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isLowStockOpen, setIsLowStockOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState<boolean>(false);

  const { isAuthenticated, hasPermission, branding } = useApp();

  if (!isAuthenticated) {
    return (
      <>
        <SystemAlertsContainer />
        <DatabaseDiagnosticsModal />
        <LoginView />
      </>
    );
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={tab => setCurrentTab(tab)}
            onOpenLowStock={() => setIsLowStockOpen(true)}
          />
        );
      case 'pos':
        return hasPermission('canAccessPos') ? (
          <PosView />
        ) : (
          <PermissionDenied tabName="Punto de Venta" />
        );
      case 'inventory':
        return hasPermission('canManageInventory') ? (
          <InventoryView onNavigate={tab => setCurrentTab(tab)} />
        ) : (
          <PermissionDenied tabName="Control de Inventario" />
        );
      case 'quick_products':
        return hasPermission('canManageInventory') ? (
          <QuickProductsView onNavigate={tab => setCurrentTab(tab)} />
        ) : (
          <PermissionDenied tabName="Alta Rápida de Productos" />
        );
      case 'purchases':
        return hasPermission('canManagePurchases') ? (
          <PurchasesView onNavigate={tab => setCurrentTab(tab)} />
        ) : (
          <PermissionDenied tabName="Compras de Mercancía" />
        );
      case 'purchase_history':
        return hasPermission('canManagePurchases') ? (
          <PurchaseHistoryView
            onNavigate={tab => setCurrentTab(tab)}
            onNewPurchase={() => setCurrentTab('purchases')}
          />
        ) : (
          <PermissionDenied tabName="Historial de Facturas de Compras" />
        );
      case 'sales':
        return <SalesView />;
      case 'expenses':
        return hasPermission('canManageFinances') ? (
          <ExpensesView onNavigate={tab => setCurrentTab(tab)} />
        ) : (
          <PermissionDenied tabName="Control de Gastos" />
        );
      case 'finances':
        return hasPermission('canManageFinances') ? (
          <FinancesView onNavigate={tab => setCurrentTab(tab)} />
        ) : (
          <PermissionDenied tabName="Gastos y Beneficios" />
        );
      case 'clients':
        return hasPermission('canManageClients') ? (
          <ClientsView />
        ) : (
          <PermissionDenied tabName="Gestión de Clientes" />
        );
      case 'users':
        return hasPermission('canManageUsers') ? (
          <UsersView />
        ) : (
          <PermissionDenied tabName="Usuarios y Permisos" />
        );
      case 'laravel':
        return <LaravelHubView />;
      default:
        return (
          <DashboardView
            onNavigate={tab => setCurrentTab(tab)}
            onOpenLowStock={() => setIsLowStockOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* 1. Sidebar & Offcanvas Drawer */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
        onOpenLowStock={() => setIsLowStockOpen(true)}
        onOpenBranding={() => setIsBrandingOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Universal Top Bar with Customizer triggers and branding */}
        <Navbar
          currentTab={currentTab}
          onSelectTab={tab => setCurrentTab(tab)}
          onOpenLowStock={() => setIsLowStockOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenBranding={() => setIsBrandingOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderActiveView()}
        </main>

        {/* Quiet Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">{branding.brandName}</span>
              <span aria-hidden="true">·</span>
              <span>Control de Inventario por Bulto y Unidad</span>
              <span aria-hidden="true">·</span>
              <span>Facturación Dual Divisas y Local</span>
            </div>
            <div>
              <span>Arquitectura PHP & Laravel MySQL</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Low Stock Notification Drawer */}
      <LowStockModal
        isOpen={isLowStockOpen}
        onClose={() => setIsLowStockOpen(false)}
        onNavigateToInventory={() => setCurrentTab('inventory')}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Branding & Bar Color Customizer Modal */}
      <BrandingCustomizerModal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
      />

      {/* Real-time System Error Signals & Alerts Banner */}
      <SystemAlertsContainer />

      {/* Database & System Integrity Diagnostics Modal */}
      <DatabaseDiagnosticsModal />
    </div>
  );
};

const PermissionDenied: React.FC<{ tabName: string }> = ({ tabName }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-12 text-center max-w-md mx-auto my-12">
    <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
      !
    </div>
    <h3 className="font-bold text-slate-900 text-base">Acceso Restringido</h3>
    <p className="text-xs text-slate-500 mt-2">
      Su rol actual no posee los privilegios necesarios para acceder al módulo de{' '}
      <strong>{tabName}</strong>. Cierre sesión en la barra superior para iniciar sesión con una cuenta con permisos (por ejemplo, Administrador o Gerente).
    </p>
  </div>
);

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Palette,
  Upload,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sparkles,
  Package,
  Layers,
  Store,
  Boxes,
  ShoppingBag,
  Building2,
  Barcode,
  Truck,
  Eye,
  Trash2,
} from 'lucide-react';
import { BrandingConfig, LogoIconType } from '../../types';

interface BrandingCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { id: 'slate', name: 'Slate Ejecutivo', bg: '#0f172a', text: '#ffffff' },
  { id: 'emerald', name: 'Verde Esmeralda', bg: '#064e3b', text: '#ffffff' },
  { id: 'indigo', name: 'Azul Medianoche', bg: '#1e1b4b', text: '#ffffff' },
  { id: 'zinc', name: 'Negro Minimal', bg: '#18181b', text: '#ffffff' },
  { id: 'navy', name: 'Azul Zafiro', bg: '#0c4a6e', text: '#ffffff' },
  { id: 'wine', name: 'Vino Tinto', bg: '#4c0519', text: '#ffffff' },
  { id: 'teal', name: 'Verde Petróleo', bg: '#134e4a', text: '#ffffff' },
  { id: 'light', name: 'Blanco Puro', bg: '#ffffff', text: '#0f172a' },
];

const ACCENT_OPTIONS = [
  { id: 'emerald', name: 'Esmeralda', hex: '#10b981' },
  { id: 'indigo', name: 'Índigo', hex: '#6366f1' },
  { id: 'blue', name: 'Azul', hex: '#3b82f6' },
  { id: 'purple', name: 'Púrpura', hex: '#a855f7' },
  { id: 'amber', name: 'Ámbar', hex: '#f59e0b' },
  { id: 'rose', name: 'Rosa Coral', hex: '#f43f5e' },
];

const ICON_PRESETS: { id: LogoIconType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'Boxes', label: 'Bultos & Cajas', icon: Boxes },
  { id: 'Package', label: 'Paquete', icon: Package },
  { id: 'Store', label: 'Tienda POS', icon: Store },
  { id: 'Layers', label: 'Capas / ERP', icon: Layers },
  { id: 'ShoppingBag', label: 'Bolsa Mayorista', icon: ShoppingBag },
  { id: 'Building2', label: 'Empresa / Galpón', icon: Building2 },
  { id: 'Barcode', label: 'Código de Barras', icon: Barcode },
  { id: 'Truck', label: 'Distribución', icon: Truck },
];

export const BrandingCustomizerModal: React.FC<BrandingCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { branding, updateBranding } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<BrandingConfig>({ ...branding });
  const [activeTab, setActiveTab] = useState<'colors' | 'logo' | 'style'>('colors');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(prev => ({
      ...prev,
      barTheme: preset.id as any,
      barBgColor: preset.bg,
      barTextColor: preset.text,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setImageError('El archivo es demasiado grande. Por favor seleccione una imagen menor a 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        setForm(prev => ({
          ...prev,
          logoType: 'image',
          logoUrl: result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setForm(prev => ({
      ...prev,
      logoType: 'icon',
      logoUrl: undefined,
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding(form);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const renderIconPreview = (iconType: LogoIconType, className = 'w-5 h-5') => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Personalización Visual del Sistema</h3>
              <p className="text-[11px] text-slate-300">
                Cambie los colores de la barra superior, el logo, el menú lateral y la identidad corporativa.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Live Preview Strip */}
        <div className="p-4 bg-slate-100 border-b border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Vista Previa en Vivo de la Barra de Navegación:
          </span>
          <div
            className="rounded-lg p-3 shadow-sm border border-slate-300 flex items-center justify-between transition-colors duration-200"
            style={{
              backgroundColor: form.barBgColor,
              color: form.barTextColor,
            }}
          >
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5">
              {form.logoType === 'image' && form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="w-8 h-8 rounded object-contain bg-white/10 p-0.5"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: form.barTextColor,
                  }}
                >
                  {renderIconPreview(form.logoIcon, 'w-4 h-4')}
                </div>
              )}
              <div>
                <span className="font-extrabold text-sm tracking-tight block leading-tight">
                  {form.brandName || 'InvBulto POS'}
                </span>
                <span className="text-[10px] opacity-75 block truncate max-w-[200px]">
                  {form.brandTagline || 'Control de Inventario & ERP'}
                </span>
              </div>
            </div>

            {/* Mock nav items */}
            <div className="hidden sm:flex items-center gap-3 text-xs opacity-90 font-medium">
              <span className="underline underline-offset-4 font-bold">Panel</span>
              <span>Punto de Venta</span>
              <span>Inventario</span>
            </div>

            {/* Mock right badge */}
            <div
              className="px-2 py-1 rounded text-[11px] font-mono font-semibold"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: form.barTextColor,
              }}
            >
              1 USD = 45.50 Bs.
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('colors')}
            className={`py-2.5 px-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'colors'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Color de la Barra y Menú
          </button>
          <button
            onClick={() => setActiveTab('logo')}
            className={`py-2.5 px-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'logo'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Logo y Nombre de Marca
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`py-2.5 px-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'style'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Menú Lateral & Acento
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 text-xs space-y-4">
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  Paletas Predefinidas para la Barra:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {COLOR_PRESETS.map(preset => {
                    const isSelected = form.barBgColor.toLowerCase() === preset.bg.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-emerald-500 border-emerald-500 font-bold' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                          style={{ backgroundColor: preset.bg }}
                        />
                        <span className="text-[11px] truncate text-slate-800 font-medium">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="pt-3 border-t border-slate-200">
                <label className="block font-bold text-slate-800 mb-2">
                  O elija su color exacto con el Selector:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-700 block">Color de Fondo de la Barra:</span>
                      <span className="font-mono text-slate-400 text-[11px] uppercase">{form.barBgColor}</span>
                    </div>
                    <input
                      type="color"
                      value={form.barBgColor}
                      onChange={e => setForm({ ...form, barBgColor: e.target.value, barTheme: 'custom' })}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-700 block">Color de Texto de la Barra:</span>
                      <span className="font-mono text-slate-400 text-[11px] uppercase">{form.barTextColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, barTextColor: '#ffffff' })}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          form.barTextColor === '#ffffff' ? 'bg-slate-900 text-white' : 'bg-white border'
                        }`}
                      >
                        Blanco
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, barTextColor: '#0f172a' })}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          form.barTextColor === '#0f172a' ? 'bg-slate-900 text-white' : 'bg-white border'
                        }`}
                      >
                        Oscuro
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logo' && (
            <div className="space-y-4">
              {/* Brand Name and Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de Marca / Sistema *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.brandName}
                    onChange={e => setForm({ ...form, brandName: e.target.value })}
                    placeholder="InvBulto POS"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Eslogan o Subtítulo
                  </label>
                  <input
                    type="text"
                    value={form.brandTagline}
                    onChange={e => setForm({ ...form, brandTagline: e.target.value })}
                    placeholder="Control de Inventario Mayorista"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload image vs preset icon */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="radio"
                      name="logoType"
                      checked={form.logoType === 'icon'}
                      onChange={() => setForm({ ...form, logoType: 'icon' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Usar Icono Predefinido de Negocio</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="radio"
                      name="logoType"
                      checked={form.logoType === 'image'}
                      onChange={() => setForm({ ...form, logoType: 'image' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Subir Mi Propio Logo (Imagen)</span>
                  </label>
                </div>

                {form.logoType === 'icon' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {ICON_PRESETS.map(preset => {
                      const IconComp = preset.icon;
                      const isSelected = form.logoIcon === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setForm({ ...form, logoIcon: preset.id })}
                          className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold ring-1 ring-emerald-500'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <IconComp className="w-5 h-5 text-emerald-600" />
                          <span className="text-[11px]">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center space-y-3">
                    {imageError && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center justify-between">
                        <span>{imageError}</span>
                        <button
                          type="button"
                          onClick={() => setImageError(null)}
                          className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {form.logoUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={form.logoUrl}
                          alt="Logo cargado"
                          className="h-16 w-auto object-contain bg-white border border-slate-200 rounded p-1 shadow-2xs"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-semibold cursor-pointer"
                          >
                            Cambiar Imagen
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded font-semibold cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Quitar Logo</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">Suba el archivo de su logotipo</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG o SVG (máx. 2MB)</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Seleccionar Archivo</span>
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Estilo Visual del Menú Lateral (Sidebar & Offcanvas):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, sidebarTheme: 'match_bar' })}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      form.sidebarTheme === 'match_bar'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 font-bold'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">Mismo Color de la Barra</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Hereda el tono de la barra superior ({form.barBgColor})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, sidebarTheme: 'dark' })}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      form.sidebarTheme === 'dark'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 font-bold'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">Oscuro Elegante (#0f172a)</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Contraste nocturno con textos claros
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, sidebarTheme: 'light' })}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      form.sidebarTheme === 'light'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 font-bold'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">Blanco Minimalista</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Fondo blanco limpio con bordes sutiles
                    </span>
                  </button>
                </div>
              </div>

              {/* Accent Color for action points */}
              <div className="pt-3 border-t border-slate-200">
                <label className="block font-bold text-slate-800 mb-1.5">
                  Color de Acento (Botones Principales & Indicadores):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {ACCENT_OPTIONS.map(acc => {
                    const isSelected = form.accentColor === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setForm({ ...form, accentColor: acc.id as any })}
                        className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-slate-900 border-slate-900 font-bold' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: acc.hex }}
                        />
                        <span className="text-[10px] text-slate-700">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setForm({
                brandName: 'InvBulto POS',
                brandTagline: 'Control de Inventario & ERP Mayorista',
                logoType: 'icon',
                logoIcon: 'Boxes',
                barTheme: 'slate',
                barBgColor: '#0f172a',
                barTextColor: '#ffffff',
                sidebarTheme: 'match_bar',
                accentColor: 'emerald',
                isSidebarCollapsed: false,
              });
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Predeterminados</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md bg-white hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{savedSuccess ? '¡Aplicado!' : 'Guardar y Aplicar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

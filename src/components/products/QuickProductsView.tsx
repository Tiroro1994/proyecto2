import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Tag,
  Barcode,
  Sparkles,
  Plus,
  Search,
  Check,
  CheckCircle,
  Copy,
  Trash2,
  Edit2,
  Download,
  Printer,
  ArrowRight,
  Package,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  X,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Product } from '../../types';

interface QuickProductsViewProps {
  onNavigate?: (tab: string) => void;
}

export const QuickProductsView: React.FC<QuickProductsViewProps> = ({ onNavigate }) => {
  const { products, registerQuickProduct, deleteProduct, updateProduct } = useApp();

  // Single Express Form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [continuousMode, setContinuousMode] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Bulk Paste Form states
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState<{ total: number; successCount: number; errors: string[] } | null>(null);

  // Catalog search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editName, setEditName] = useState('');

  // Barcode Label Modal
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const skuInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Computed next auto SKU
  const nextGeneratedSku = useMemo(() => {
    const existingNums = products
      .map(p => {
        const match = p.sku.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    return `PROD-${String(maxNum + 1).padStart(4, '0')}`;
  }, [products]);

  // Check if current SKU exists in real-time
  const isSkuTaken = useMemo(() => {
    if (!sku.trim()) return false;
    const clean = sku.trim().toLowerCase();
    return products.some(p => p.sku.toLowerCase() === clean || p.barcode.toLowerCase() === clean);
  }, [sku, products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return products;
    return products.filter(
      p => p.sku.toLowerCase().includes(term) || p.name.toLowerCase().includes(term) || p.barcode.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Handle single quick registration
  const handleRegisterProduct = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedback(null);

    const result = registerQuickProduct(sku, name);
    if (!result.success) {
      setFeedback({ message: result.error || 'Error al registrar producto', type: 'error' });
      return;
    }

    setFeedback({
      message: `¡Producto "${result.product?.name}" (${result.product?.sku}) registrado exitosamente!`,
      type: 'success',
    });

    // Reset inputs
    setSku('');
    setName('');

    // If continuous mode is on, re-focus the SKU input for instant next entry
    if (continuousMode && skuInputRef.current) {
      setTimeout(() => {
        skuInputRef.current?.focus();
      }, 50);
    }
  };

  // Generate random or sequential SKU
  const handleGenerateSku = () => {
    setSku(nextGeneratedSku);
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  // Simulate barcode scanner scan
  const handleSimulateBarcodeScan = () => {
    // Generate a random 12-digit EAN-like code
    const randomCode = '759' + Math.floor(100000000 + Math.random() * 900000000).toString();
    setSku(randomCode);
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  // Process Bulk Paste of "Code, Name" or "Code TAB Name"
  const handleProcessBulk = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
    let success = 0;
    const errors: string[] = [];

    lines.forEach((line, idx) => {
      // Split by tab, comma, or semicolon
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes(' - ')) {
        parts = line.split(' - ');
      } else {
        // Fallback: first word as SKU, rest as Name
        const firstSpace = line.indexOf(' ');
        if (firstSpace > 0) {
          parts = [line.slice(0, firstSpace), line.slice(firstSpace + 1)];
        }
      }

      if (parts.length >= 2) {
        const itemSku = parts[0].trim();
        const itemName = parts.slice(1).join(' ').trim();
        if (itemSku && itemName) {
          const res = registerQuickProduct(itemSku, itemName);
          if (res.success) {
            success++;
          } else {
            errors.push(`Línea ${idx + 1} (${itemSku}): ${res.error}`);
          }
        } else {
          errors.push(`Línea ${idx + 1}: Faltan datos (código o nombre vacíos).`);
        }
      } else {
        errors.push(`Línea ${idx + 1}: Formato no reconocido. Utilice "CÓDIGO, NOMBRE".`);
      }
    });

    setBulkResult({
      total: lines.length,
      successCount: success,
      errors,
    });

    if (success > 0) {
      setBulkText('');
    }
  };

  // Inline edit
  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditSku(product.sku);
    setEditName(product.name);
  };

  const saveEdit = (id: string) => {
    if (!editSku.trim() || !editName.trim()) return;
    updateProduct(id, {
      sku: editSku.trim(),
      barcode: editSku.trim(),
      name: editName.trim(),
    });
    setEditingId(null);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Código / SKU', 'Nombre del Producto', 'Unid por Bulto', 'Stock Unidades', 'Fecha Registro'];
    const rows = products.map(p => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.unitsPerPackage,
      p.totalUnitsInStock,
      `"${p.updatedAt.slice(0, 10)}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_productos_codigo_nombre_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Alta Rápida de Productos</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Solo Código y Nombre
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Apartado express para registrar nuevos productos en el sistema ingresando exclusivamente su código y nombre comercial.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('inventory')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-slate-500" />
                <span>Ver Inventario Completo</span>
              </button>

              <button
                onClick={() => onNavigate('purchases')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Ir a Compras de Mercancía</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            title="Exportar códigos y nombres a Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Catálogo</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Fast Registration Form, Right = Summary & Quick Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Express Registration Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Tab switch: Single vs Bulk */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                  activeTab === 'single'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registro Individual (Código + Nombre)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bulk')}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                  activeTab === 'bulk'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Registro Masivo (Pegar Lista)</span>
              </button>
            </div>

            {/* TAB 1: Single Express Entry Form */}
            {activeTab === 'single' && (
              <form onSubmit={handleRegisterProduct} className="p-5 space-y-4">
                {/* Feedback message banner */}
                {feedback && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between border ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-red-50 text-red-900 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {feedback.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{feedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedback(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Field 1: Product Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      1. Código del Producto (SKU o Código de Barras) *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleGenerateSku}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Autogenerar ({nextGeneratedSku})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSimulateBarcodeScan}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-medium bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Simular escaneo de lector de barras"
                      >
                        <Barcode className="w-3 h-3" />
                        <span>Escanear</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      ref={skuInputRef}
                      type="text"
                      required
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                      placeholder="Ej: HAR-PAN-01, ARROZ-01 o escanee código de barras..."
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg font-mono text-sm font-semibold focus:outline-none focus:ring-2 ${
                        isSkuTaken
                          ? 'border-red-400 focus:ring-red-400 text-red-900 bg-red-50/30'
                          : 'border-slate-300 focus:ring-emerald-500 text-slate-900'
                      }`}
                    />
                    {isSkuTaken && (
                      <span className="absolute right-3 top-3 text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Ya existe este código</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Identificador único para el punto de venta, inventario y búsqueda por lector láser.
                  </span>
                </div>

                {/* Field 2: Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    2. Nombre del Producto (Descripción Comercial) *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Harina de Maíz Pan 1kg, Arroz Primor 1kg, Refresco 2L..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Nombre visible en las facturas PDF, reportes y pantalla de ventas.
                  </span>
                </div>

                {/* Action button & Continuous Mode switch */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={continuousMode}
                      onChange={e => setContinuousMode(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Modo Ráfaga (re-enfocar código automáticamente al guardar)</span>
                  </label>

                  <button
                    type="submit"
                    disabled={!sku.trim() || !name.trim() || isSkuTaken}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>⚡ Registrar Producto en el Sistema</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Bulk Paste */}
            {activeTab === 'bulk' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Pegar Lista de Productos (Código y Nombre):
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Pegue una línea por producto con el formato: <code className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">CÓDIGO, NOMBRE</code> o copiado directamente desde Excel.
                  </p>
                  <textarea
                    rows={6}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={`HAR-001, Harina de Maíz Pan 1kg\nARR-002, Arroz Blanco Especial 1kg\nACE-003, Aceite Vegetal 1L\nAZU-004, Azúcar Refinada 1kg`}
                    className="w-full p-3 font-mono text-xs bg-slate-50 text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                  />
                </div>

                {bulkResult && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <p className="font-bold text-slate-800">
                      Resultado del proceso: {bulkResult.successCount} de {bulkResult.total} productos registrados exitosamente.
                    </p>
                    {bulkResult.errors.length > 0 && (
                      <div className="text-[11px] text-red-600 max-h-24 overflow-y-auto pt-1 border-t border-slate-200">
                        {bulkResult.errors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkText('');
                      setBulkResult(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Limpiar
                  </button>

                  <button
                    type="button"
                    onClick={handleProcessBulk}
                    disabled={!bulkText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Registrar Todos los Productos</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Notice Card */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>¿Cómo funciona el registro con solo Código y Nombre?</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Al guardar un producto con solo código y nombre, el sistema le asigna valores iniciales predeterminados (categoría <strong>General</strong>, <strong>12 unidades por bulto</strong> y stock <strong>0</strong>). Tan pronto reciba una factura en el módulo de <strong>Compras</strong> o ingrese al <strong>Inventario Completo</strong>, podrá asignarle sus costos, precios en divisa y existencias.
            </p>
          </div>
        </div>

        {/* Right Column: Statistics & Highlights (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Metrics summary */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Resumen del Catálogo
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Total Productos</span>
                <span className="text-2xl font-bold font-mono text-slate-900">{products.length}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Siguiente Código</span>
                <span className="text-sm font-bold font-mono text-emerald-700">{nextGeneratedSku}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <span className="font-semibold text-slate-700 block">Acciones Rápidas con tus Productos:</span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Disponibles de inmediato en el Punto de Venta (POS)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Listos para registrar facturas de compra por bulto</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Generación e impresión de código de barras</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Barcode Scanner Simulation Tip */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Barcode className="w-4 h-4" />
              <span>Soporte para Pistola / Lector Láser USB</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Puede conectar cualquier lector de código de barras físico USB o Bluetooth. Al pistolear el producto en el anaquel, el código se escribirá automáticamente en el campo Código y saltará al Nombre.
            </p>
          </div>
        </div>
      </div>

      {/* Catalog Table: All Registered Products */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              Catálogo de Productos Registrados ({filteredProducts.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por código o nombre..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Código (SKU)</th>
                <th className="py-3 px-4">Nombre del Producto</th>
                <th className="py-3 px-4">Código de Barras</th>
                <th className="py-3 px-4">Configuración Base</th>
                <th className="py-3 px-4">Stock Actual</th>
                <th className="py-3 px-4 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se encontraron productos con el término de búsqueda ingresado.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const isEditing = editingId === product.id;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* SKU / Code */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSku}
                            onChange={e => setEditSku(e.target.value)}
                            className="px-2 py-1 border border-emerald-500 rounded font-mono font-bold text-xs bg-white text-slate-900"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-100 text-slate-900 rounded border border-slate-200">
                              {product.sku}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(product.sku);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                              title="Copiar código"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-2 py-1 border border-emerald-500 rounded font-medium text-xs bg-white text-slate-900"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900 text-xs block">
                            {product.name}
                          </span>
                        )}
                      </td>

                      {/* Barcode representation */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setBarcodeModalProduct(product)}
                          className="group inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
                          title="Ver e imprimir etiqueta de código de barras"
                        >
                          <Barcode className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900" />
                          <span className="font-mono text-[11px] text-slate-600 group-hover:text-slate-900">
                            {product.barcode || product.sku}
                          </span>
                        </button>
                      </td>

                      {/* Defaults */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                          {product.unitsPerPackage} unid / {product.packageLabel}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {product.totalUnitsInStock} unids
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(product.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Guardar</span>
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(product)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                                title="Editar código o nombre"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setBarcodeModalProduct(product)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                                title="Imprimir etiqueta"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setProductToDelete(product)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                title="Eliminar producto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Eliminar Producto</h3>
                <p className="text-xs text-slate-500">¿Está seguro de eliminar este producto del sistema?</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <p className="font-bold text-slate-800">{productToDelete.name}</p>
              <p className="font-mono text-slate-500 text-[11px]">Código: {productToDelete.sku}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md cursor-pointer shadow-xs"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Label Modal */}
      {barcodeModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-emerald-600" />
                <span>Etiqueta de Código de Barras</span>
              </h3>
              <button
                onClick={() => setBarcodeModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Label Card */}
            <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-lg text-center space-y-2 select-all">
              <p className="font-bold text-slate-900 text-sm truncate">
                {barcodeModalProduct.name}
              </p>

              {/* Simulated Barcode lines */}
              <div className="flex justify-center items-end gap-0.5 h-14 py-1">
                {[4, 2, 6, 3, 5, 2, 7, 4, 3, 6, 2, 5, 3, 4, 6, 2, 4, 3, 5, 2, 6, 3, 4].map((h, i) => (
                  <div
                    key={i}
                    className="bg-black"
                    style={{
                      width: i % 3 === 0 ? '3px' : '2px',
                      height: `${h * 7 + 10}px`,
                    }}
                  />
                ))}
              </div>

              <p className="font-mono font-bold text-sm tracking-widest text-slate-800">
                {barcodeModalProduct.barcode || barcodeModalProduct.sku}
              </p>

              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {barcodeModalProduct.packageLabel} de {barcodeModalProduct.unitsPerPackage} Unidades
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBarcodeModalProduct(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Etiqueta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

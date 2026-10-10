import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Plus,
  Filter,
  Download,
  FileText,
  AlertTriangle,
  ArrowUpDown,
  Edit,
  Trash2,
  Package,
  Layers,
  CheckCircle,
  Truck,
  Sparkles,
  FileSpreadsheet,
  SlidersHorizontal,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Product } from '../../types';
import { exportInventoryToCSV, exportInventoryToExcel } from '../../utils/excelGenerator';
import { generateInventoryReportPDF } from '../../utils/pdfGenerator';
import { FormFieldError, getInputErrorClass } from '../common/FormFieldError';

interface InventoryViewProps {
  onNavigate?: (tab: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onNavigate }) => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    exchangeRate,
    settings,
    lowStockProducts,
    hasPermission,
    triggerErrorSignal,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Validation error states for forms
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [productFieldErrors, setProductFieldErrors] = useState<Record<string, string>>({});
  const [adjustFormError, setAdjustFormError] = useState<string | null>(null);
  const [adjustFieldErrors, setAdjustFieldErrors] = useState<Record<string, string>>({});

  // Export states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');

  // Form states for Stock Adjustment
  const [adjustType, setAdjustType] = useState<
    'recepcion_bulto' | 'recepcion_unidad' | 'ajuste_positivo' | 'ajuste_negativo' | 'merma'
  >('recepcion_bulto');
  const [adjustPackages, setAdjustPackages] = useState('1');
  const [adjustUnits, setAdjustUnits] = useState('0');
  const [adjustReason, setAdjustReason] = useState('');

  // Form state for New / Edit Product
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Alimentos',
    description: '',
    unitsPerPackage: 12,
    packageLabel: 'Bulto',
    totalUnitsInStock: 0,
    minStockUnits: 20,
    costUnitUSD: 1.0,
    costPackageUSD: 12.0,
    priceUnitUSD: 1.5,
    pricePackageUSD: 16.0,
  });

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesLowStock = !filterLowStockOnly || p.totalUnitsInStock <= p.minStockUnits;
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [products, searchTerm, selectedCategory, filterLowStockOnly]);

  const isFiltered = searchTerm.trim() !== '' || selectedCategory !== 'all' || filterLowStockOnly;

  const activeFilterDescription = useMemo(() => {
    const parts: string[] = [];
    if (searchTerm.trim()) parts.push(`Búsqueda: "${searchTerm.trim()}"`);
    if (selectedCategory !== 'all') parts.push(`Categoría: "${selectedCategory}"`);
    if (filterLowStockOnly) parts.push('Solo Alerta Stock Bajo');
    return parts.join(' | ');
  }, [searchTerm, selectedCategory, filterLowStockOnly]);

  const summaryStats = useMemo(() => {
    const list = filteredProducts;
    const totalPackages = list.reduce((acc, p) => acc + Math.floor(p.totalUnitsInStock / p.unitsPerPackage), 0);
    const totalUnits = list.reduce((acc, p) => acc + p.totalUnitsInStock, 0);
    const totalSaleUSD = list.reduce((acc, p) => acc + (p.totalUnitsInStock * p.priceUnitUSD), 0);
    const totalCostUSD = list.reduce((acc, p) => acc + (p.totalUnitsInStock * p.costUnitUSD), 0);
    return { totalPackages, totalUnits, totalSaleUSD, totalCostUSD };
  }, [filteredProducts]);

  const handleExportCSV = (scope: 'current' | 'all' = 'current') => {
    const target = scope === 'current' ? filteredProducts : products;
    if (target.length === 0) {
      alert('No hay productos que exportar en la selección actual.');
      return;
    }
    const filterDesc = scope === 'current' && isFiltered ? activeFilterDescription : undefined;
    exportInventoryToCSV(target, exchangeRate.rate, settings, filterDesc);
    setExportFeedback(`✓ Planilla CSV descargada con éxito (${target.length} productos con columnas de existencias por bulto/unidad y precios).`);
    setTimeout(() => setExportFeedback(null), 4500);
  };

  const handleExportPDF = (scope: 'current' | 'all' = 'current') => {
    const target = scope === 'current' ? filteredProducts : products;
    if (target.length === 0) {
      alert('No hay productos que exportar en la selección actual.');
      return;
    }
    const filterDesc = scope === 'current' && isFiltered ? activeFilterDescription : undefined;
    generateInventoryReportPDF(target, exchangeRate.rate, settings, filterDesc);
    setExportFeedback(`✓ Reporte PDF descargado con éxito (${target.length} productos con columnas de existencias por bulto/unidad y precios).`);
    setTimeout(() => setExportFeedback(null), 4500);
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProductForAdjust(product);
    setAdjustType('recepcion_bulto');
    setAdjustPackages('1');
    setAdjustUnits('0');
    setAdjustReason('Recepción de mercancía por proveedor');
    setAdjustFormError(null);
    setAdjustFieldErrors({});
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    setAdjustFormError(null);
    const errors: Record<string, string> = {};

    const cleanReason = adjustReason.trim();
    const pkgs = parseInt(adjustPackages) || 0;
    const units = parseInt(adjustUnits) || 0;

    if (!cleanReason) {
      errors.reason = '⚠️ Este campo no se rellenó (Debe indicar el motivo del movimiento)';
    }

    if (pkgs <= 0 && units <= 0) {
      errors.quantity = '⚠️ Debe indicar una cantidad de bultos o unidades mayor a 0';
    }

    if (Object.keys(errors).length > 0) {
      setAdjustFieldErrors(errors);
      setAdjustFormError('⚠️ Señal de Error: Complete los campos requeridos antes de confirmar.');
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error: Campo sin rellenar en Ajuste de Stock',
        message: 'No se rellenó el motivo o la cantidad requerida para el ajuste de stock.',
        fieldName: Object.keys(errors)[0],
        severity: 'warning',
      });
      return;
    }

    setAdjustFieldErrors({});
    adjustStock(selectedProductForAdjust.id, adjustType, pkgs, units, cleanReason);
    setIsAdjustModalOpen(false);
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      sku: `PROD-${Date.now().toString().slice(-4)}`,
      barcode: '',
      category: 'Alimentos',
      description: '',
      unitsPerPackage: 12,
      packageLabel: 'Bulto',
      totalUnitsInStock: 24,
      minStockUnits: 12,
      costUnitUSD: 1.0,
      costPackageUSD: 11.5,
      priceUnitUSD: 1.5,
      pricePackageUSD: 16.0,
    });
    setProductFormError(null);
    setProductFieldErrors({});
    setIsAddModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      description: product.description || '',
      unitsPerPackage: product.unitsPerPackage,
      packageLabel: product.packageLabel,
      totalUnitsInStock: product.totalUnitsInStock,
      minStockUnits: product.minStockUnits,
      costUnitUSD: product.costUnitUSD,
      costPackageUSD: product.costPackageUSD,
      priceUnitUSD: product.priceUnitUSD,
      pricePackageUSD: product.pricePackageUSD,
    });
    setProductFormError(null);
    setProductFieldErrors({});
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);
    const errors: Record<string, string> = {};

    const cleanName = productForm.name.trim();
    const cleanSku = productForm.sku.trim();
    const cleanCategory = productForm.category.trim();
    const cleanPackageLabel = productForm.packageLabel.trim();
    const unitsPerPkg = Number(productForm.unitsPerPackage);
    const priceUnit = Number(productForm.priceUnitUSD);
    const pricePackage = Number(productForm.pricePackageUSD);

    if (!cleanName) {
      errors.name = '⚠️ Este campo no se rellenó (Nombre del producto es obligatorio)';
    }

    if (!cleanSku) {
      errors.sku = '⚠️ Este campo no se rellenó (Código SKU es obligatorio)';
    } else {
      const duplicateSku = products.find(
        p => p.sku.toLowerCase() === cleanSku.toLowerCase() && p.id !== editingProduct?.id
      );
      if (duplicateSku) {
        errors.sku = `⚠️ El código SKU "${cleanSku}" ya pertenece a otro producto (${duplicateSku.name})`;
      }
    }

    if (!cleanCategory) {
      errors.category = '⚠️ Este campo no se rellenó (Categoría es obligatoria)';
    }

    if (!cleanPackageLabel) {
      errors.packageLabel = '⚠️ Este campo no se rellenó (Nombre presentación mayorista)';
    }

    if (isNaN(unitsPerPkg) || unitsPerPkg < 1) {
      errors.unitsPerPackage = '⚠️ Debe indicar al menos 1 unidad por bulto';
    }

    if (isNaN(priceUnit) || priceUnit <= 0) {
      errors.priceUnitUSD = '⚠️ Debe indicar un precio unitario mayor a 0';
    }

    if (isNaN(pricePackage) || pricePackage <= 0) {
      errors.pricePackageUSD = '⚠️ Debe indicar un precio por bulto mayor a 0';
    }

    if (Object.keys(errors).length > 0) {
      setProductFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      setProductFormError('⚠️ Señal de Error: Hay campos obligatorios sin rellenar. Revise los campos marcados en rojo.');
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error: Campo sin rellenar en Producto',
        message: `No se rellenó el campo obligatorio "${firstField}" en la ficha del producto.`,
        fieldName: firstField,
        severity: 'warning',
      });
      return;
    }

    setProductFieldErrors({});

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...productForm,
        name: cleanName,
        sku: cleanSku,
        category: cleanCategory,
        packageLabel: cleanPackageLabel,
        unitsPerPackage: unitsPerPkg,
        totalUnitsInStock: Number(productForm.totalUnitsInStock) || 0,
        minStockUnits: Number(productForm.minStockUnits) || 1,
        costUnitUSD: Number(productForm.costUnitUSD) || 0,
        costPackageUSD: Number(productForm.costPackageUSD) || 0,
        priceUnitUSD: priceUnit,
        pricePackageUSD: pricePackage,
      });
    } else {
      addProduct({
        ...productForm,
        name: cleanName,
        sku: cleanSku,
        category: cleanCategory,
        packageLabel: cleanPackageLabel,
        unitsPerPackage: unitsPerPkg,
        totalUnitsInStock: Number(productForm.totalUnitsInStock) || 0,
        minStockUnits: Number(productForm.minStockUnits) || 1,
        costUnitUSD: Number(productForm.costUnitUSD) || 0,
        costPackageUSD: Number(productForm.costPackageUSD) || 0,
        priceUnitUSD: priceUnit,
        pricePackageUSD: pricePackage,
      });
    }
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Control de Inventario (Bultos y Unidades)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestione existencias discriminadas por paquete/bulto y unidades sueltas con doble precio (USD y {settings.currencyName}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('canManageInventory') && (
            <>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('quick_products')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Registrar productos de forma express con solo código y nombre"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>⚡ Alta Rápida (Código y Nombre)</span>
                </button>
              )}

              <button
                onClick={openNewProductModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto Completo</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleExportCSV('current')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title={`Exportar inventario actual a CSV (${filteredProducts.length} productos con existencias por bulto/unidad y precios)`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar CSV {isFiltered ? `(${filteredProducts.length})` : ''}</span>
            </button>
            <button
              onClick={() => handleExportPDF('current')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title={`Generar reporte oficial en PDF (${filteredProducts.length} productos con columnas de bultos/unidades y precios)`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar PDF {isFiltered ? `(${filteredProducts.length})` : ''}</span>
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded transition-colors cursor-pointer"
              title="Opciones avanzadas de exportación (Alcance y desglose de columnas)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Export Success Feedback Notification */}
      {exportFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
          <button
            onClick={() => setExportFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, código SKU o código de barras..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick filter for low stock */}
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-2 text-xs font-semibold rounded-md border transition-colors flex items-center gap-2 cursor-pointer ${
              filterLowStockOnly
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Solo Alerta Stock Bajo ({lowStockProducts.length})</span>
          </button>
        </div>

        {/* Categories selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'Todas las Categorías' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Status & Columns Summary Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <div>
            <span className="font-bold text-slate-900">{filteredProducts.length}</span>{' '}
            {filteredProducts.length === 1 ? 'producto' : 'productos'}{' '}
            {isFiltered && <span className="text-emerald-700 font-semibold">(vista filtrada)</span>}
          </div>
          <span className="text-slate-300">|</span>
          <div>
            Existencias Bultos: <strong className="font-mono-numbers text-slate-900">{summaryStats.totalPackages}</strong>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            Existencias Unidades: <strong className="font-mono-numbers text-slate-900">{summaryStats.totalUnits}</strong>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            Valorización Venta:{' '}
            <strong className="font-mono-numbers text-emerald-700">
              ${summaryStats.totalSaleUSD.toFixed(2)} USD
            </strong>{' '}
            <span className="text-slate-500 font-mono-numbers">
              ({(summaryStats.totalSaleUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setFilterLowStockOnly(false);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer mr-2"
            >
              Restablecer filtros
            </button>
          )}
          <button
            onClick={() => handleExportCSV('current')}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Exportar selección actual a CSV"
          >
            <Download className="w-3 h-3 text-emerald-600" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExportPDF('current')}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Exportar selección actual a PDF"
          >
            <FileText className="w-3 h-3 text-emerald-400" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Código/SKU</th>
                <th className="py-3 px-3">Producto</th>
                <th className="py-3 px-3">Presentación</th>
                <th className="py-3 px-3">Stock en Bultos y Unidades</th>
                <th className="py-3 px-3 text-right">Costo ($)</th>
                <th className="py-3 px-3 text-right">P. Venta USD</th>
                <th className="py-3 px-3 text-right">P. Venta {settings.currencySymbol}</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No se encontraron productos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const packagesCount = Math.floor(product.totalUnitsInStock / product.unitsPerPackage);
                  const looseUnits = product.totalUnitsInStock % product.unitsPerPackage;
                  const isLow = product.totalUnitsInStock <= product.minStockUnits;
                  const isOutOfStock = product.totalUnitsInStock <= 0;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLow ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* SKU */}
                      <td className="py-3 px-3 font-mono-numbers font-medium text-slate-900">
                        <div>{product.sku}</div>
                        {product.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono-numbers">
                            {product.barcode}
                          </div>
                        )}
                      </td>

                      {/* Product Name & Category */}
                      <td className="py-3 px-3 font-medium">
                        <div className="font-semibold text-slate-900">{product.name}</div>
                        <div className="text-[11px] text-slate-500">{product.category}</div>
                      </td>

                      {/* Bulk Config */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">{product.packageLabel}</span>
                        <div className="text-[11px] text-slate-500 font-mono-numbers">
                          {product.unitsPerPackage} un. por {product.packageLabel.toLowerCase()}
                        </div>
                      </td>

                      {/* Stock in Packages + Units */}
                      <td className="py-3 px-3">
                        <div className="font-mono-numbers font-bold text-slate-900 text-sm">
                          {packagesCount} <span className="text-xs font-semibold text-slate-600">{product.packageLabel}(s)</span>
                          <span className="text-slate-300 mx-1">+</span>
                          {looseUnits} <span className="text-xs font-normal text-slate-500">un.</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-numbers">
                          Total: {product.totalUnitsInStock} un. (Mín: {product.minStockUnits})
                        </div>
                      </td>

                      {/* Cost USD */}
                      <td className="py-3 px-3 text-right font-mono-numbers">
                        <div className="text-slate-900 font-semibold">${product.costUnitUSD.toFixed(2)}/u</div>
                        <div className="text-[10px] text-slate-500">${product.costPackageUSD.toFixed(2)}/b</div>
                      </td>

                      {/* Price USD */}
                      <td className="py-3 px-3 text-right font-mono-numbers">
                        <div className="font-bold text-slate-900 text-sm">
                          ${product.priceUnitUSD.toFixed(2)}
                          <span className="text-[10px] font-normal text-slate-500"> /u</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700">
                          ${product.pricePackageUSD.toFixed(2)}
                          <span className="text-[10px] font-normal text-slate-400"> /{product.packageLabel.toLowerCase()}</span>
                        </div>
                      </td>

                      {/* Price Local */}
                      <td className="py-3 px-3 text-right font-mono-numbers text-emerald-700">
                        <div className="font-bold text-xs">
                          {(product.priceUnitUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
                        </div>
                        <div className="text-[10px] font-medium text-emerald-600">
                          {(product.pricePackageUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            Agotado
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Bajo Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openAdjustModal(product)}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                            title="Recepción de bultos o ajuste de stock"
                          >
                            + Stock
                          </button>
                          {hasPermission('canManageInventory') && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditProductModal(product)}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Editar producto"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductToDelete(product)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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

      {/* Stock Adjustment / Merchandise Reception Modal */}
      {isAdjustModalOpen && selectedProductForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Movimiento de Almacén: {selectedProductForAdjust.name}
                </h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 p-2.5 bg-slate-50 rounded text-xs space-y-1 text-slate-600">
              <div>
                Stock actual: <strong className="font-mono-numbers text-slate-900">{selectedProductForAdjust.totalUnitsInStock} unidades</strong>
              </div>
              <div>
                Equivale a: <strong className="font-mono-numbers text-slate-900">{Math.floor(selectedProductForAdjust.totalUnitsInStock / selectedProductForAdjust.unitsPerPackage)} {selectedProductForAdjust.packageLabel}(s) y {selectedProductForAdjust.totalUnitsInStock % selectedProductForAdjust.unitsPerPackage} unidades</strong> (Factor: {selectedProductForAdjust.unitsPerPackage} un/{selectedProductForAdjust.packageLabel.toLowerCase()})
              </div>
            </div>

            {adjustFormError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{adjustFormError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipo de Movimiento *
                </label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-2 font-medium text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="recepcion_bulto">Recepción de Mercancía (Por Bultos Completos)</option>
                  <option value="recepcion_unidad">Recepción de Mercancía (Por Unidades Sueltas)</option>
                  <option value="ajuste_positivo">Ajuste Positivo / Sobrante de Inventario</option>
                  <option value="ajuste_negativo">Ajuste Negativo / Faltante</option>
                  <option value="merma">Merma / Producto Averiado o Vencido</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cantidad {selectedProductForAdjust.packageLabel}(s)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustPackages}
                    onChange={e => {
                      setAdjustPackages(e.target.value);
                      if (adjustFieldErrors.quantity) setAdjustFieldErrors({ ...adjustFieldErrors, quantity: '' });
                    }}
                    className={`w-full px-2.5 py-1.5 rounded font-mono-numbers text-slate-900 focus:outline-none transition-all ${getInputErrorClass(
                      !!adjustFieldErrors.quantity,
                      'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                    )}`}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cantidad Unidades Sueltas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustUnits}
                    onChange={e => {
                      setAdjustUnits(e.target.value);
                      if (adjustFieldErrors.quantity) setAdjustFieldErrors({ ...adjustFieldErrors, quantity: '' });
                    }}
                    className={`w-full px-2.5 py-1.5 rounded font-mono-numbers text-slate-900 focus:outline-none transition-all ${getInputErrorClass(
                      !!adjustFieldErrors.quantity,
                      'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                    )}`}
                  />
                </div>
                {adjustFieldErrors.quantity && (
                  <div className="col-span-2">
                    <FormFieldError error={adjustFieldErrors.quantity} />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo o N° de Guía / Factura de Proveedor *
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => {
                    setAdjustReason(e.target.value);
                    if (adjustFieldErrors.reason) setAdjustFieldErrors({ ...adjustFieldErrors, reason: '' });
                  }}
                  placeholder="Ej: Factura Proveedor N° 45812"
                  className={`w-full px-2.5 py-1.5 rounded text-slate-900 focus:outline-none transition-all ${getInputErrorClass(
                    !!adjustFieldErrors.reason,
                    'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                  )}`}
                />
                <FormFieldError error={adjustFieldErrors.reason} />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded cursor-pointer"
                >
                  Confirmar e Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto en Almacén'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {productFormError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{productFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={e => {
                      setProductForm({ ...productForm, name: e.target.value });
                      if (productFieldErrors.name) setProductFieldErrors({ ...productFieldErrors, name: '' });
                    }}
                    placeholder="Ej: Harina de Trigo Todo Uso 1kg"
                    className={`w-full px-2.5 py-1.5 rounded focus:outline-none transition-all ${getInputErrorClass(
                      !!productFieldErrors.name,
                      'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                    )}`}
                  />
                  <FormFieldError error={productFieldErrors.name} />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código SKU *</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={e => {
                      setProductForm({ ...productForm, sku: e.target.value });
                      if (productFieldErrors.sku) setProductFieldErrors({ ...productFieldErrors, sku: '' });
                    }}
                    placeholder="ALM-TR-01"
                    className={`w-full px-2.5 py-1.5 rounded focus:outline-none transition-all ${getInputErrorClass(
                      !!productFieldErrors.sku,
                      'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                    )}`}
                  />
                  <FormFieldError error={productFieldErrors.sku} />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código de Barras</label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                    placeholder="7591000000000"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría *</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={e => {
                      setProductForm({ ...productForm, category: e.target.value });
                      if (productFieldErrors.category) setProductFieldErrors({ ...productFieldErrors, category: '' });
                    }}
                    placeholder="Alimentos / Bebidas / etc."
                    className={`w-full px-2.5 py-1.5 rounded focus:outline-none transition-all ${getInputErrorClass(
                      !!productFieldErrors.category,
                      'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                    )}`}
                  />
                  <FormFieldError error={productFieldErrors.category} />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Presentación Mayorista *</label>
                  <input
                    type="text"
                    value={productForm.packageLabel}
                    onChange={e => {
                      setProductForm({ ...productForm, packageLabel: e.target.value });
                      if (productFieldErrors.packageLabel) setProductFieldErrors({ ...productFieldErrors, packageLabel: '' });
                    }}
                    placeholder="Bulto, Caja, Fardo, Saco"
                    className={`w-full px-2.5 py-1.5 rounded focus:outline-none transition-all ${getInputErrorClass(
                      !!productFieldErrors.packageLabel,
                      'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                    )}`}
                  />
                  <FormFieldError error={productFieldErrors.packageLabel} />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidades por Bulto/Caja *</label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.unitsPerPackage}
                    onChange={e => {
                      setProductForm({ ...productForm, unitsPerPackage: parseInt(e.target.value) || 0 });
                      if (productFieldErrors.unitsPerPackage) setProductFieldErrors({ ...productFieldErrors, unitsPerPackage: '' });
                    }}
                    className={`w-full px-2.5 py-1.5 rounded font-mono-numbers focus:outline-none transition-all ${getInputErrorClass(
                      !!productFieldErrors.unitsPerPackage,
                      'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                    )}`}
                  />
                  <FormFieldError error={productFieldErrors.unitsPerPackage} />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Inicial (Total Unidades)</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.totalUnitsInStock}
                    onChange={e => setProductForm({ ...productForm, totalUnitsInStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono-numbers focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Umbral Mínimo para Alerta de Stock Bajo (en unidades)</label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.minStockUnits}
                    onChange={e => setProductForm({ ...productForm, minStockUnits: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono-numbers focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cost & Price row */}
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900 text-xs block mb-2">Costos y Precios de Venta (USD)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Costo Compra Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.costUnitUSD}
                      onChange={e => setProductForm({ ...productForm, costUnitUSD: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono-numbers focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Costo Compra Bulto ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.costPackageUSD}
                      onChange={e => setProductForm({ ...productForm, costPackageUSD: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono-numbers focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Precio Venta Unitario ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.priceUnitUSD}
                      onChange={e => {
                        setProductForm({ ...productForm, priceUnitUSD: parseFloat(e.target.value) || 0 });
                        if (productFieldErrors.priceUnitUSD) setProductFieldErrors({ ...productFieldErrors, priceUnitUSD: '' });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded font-mono-numbers focus:outline-none transition-all ${getInputErrorClass(
                        !!productFieldErrors.priceUnitUSD,
                        'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                      )}`}
                    />
                    <FormFieldError error={productFieldErrors.priceUnitUSD} />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Precio Venta por Bulto ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.pricePackageUSD}
                      onChange={e => {
                        setProductForm({ ...productForm, pricePackageUSD: parseFloat(e.target.value) || 0 });
                        if (productFieldErrors.pricePackageUSD) setProductFieldErrors({ ...productFieldErrors, pricePackageUSD: '' });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded font-mono-numbers focus:outline-none transition-all ${getInputErrorClass(
                        !!productFieldErrors.pricePackageUSD,
                        'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                      )}`}
                    />
                    <FormFieldError error={productFieldErrors.pricePackageUSD} />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded cursor-pointer"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Opciones Avanzadas de Exportación */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Exportación de Inventario (CSV / PDF)
                </h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  1. Seleccione el Alcance de la Exportación:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('current')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      exportScope === 'current'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Inventario Actual en Pantalla</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {filteredProducts.length} producto(s) {isFiltered ? '(con filtros aplicados)' : ''}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      exportScope === 'all'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Todo el Catálogo</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {products.length} producto(s) totales registrados
                    </div>
                  </button>
                </div>
              </div>

              {/* Columnas verificadas */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Columnas discriminadas que se incluirán en el archivo:</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Existencias por Bulto (Bultos)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Existencias por Unidad (Sueltas y Tot.)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Precio por Unidad (USD y {settings.currencySymbol})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Precio por Bulto (USD y {settings.currencySymbol})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Costos (Unitario y por Bulto)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Código SKU, Barra y Categoría</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Alerta Stock Mínimo y Estado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Fila final con Totales generales</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-full sm:w-auto px-3 py-2 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportCSV(exportScope);
                    setIsExportModalOpen(false);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-md shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Descargar CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportPDF(exportScope);
                    setIsExportModalOpen(false);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-xs">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-100 rounded-full">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">¿Eliminar Producto?</h3>
                <p className="text-[11px] text-slate-500">Se removerá del catálogo e inventario</p>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4">
              ¿Está seguro que desea eliminar <strong>{productToDelete.name}</strong> (SKU: {productToDelete.sku})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded cursor-pointer shadow-xs"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Package, PlusCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface LowStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToInventory: () => void;
}

export const LowStockModal: React.FC<LowStockModalProps> = ({
  isOpen,
  onClose,
  onNavigateToInventory,
}) => {
  const { lowStockProducts, adjustStock, settings } = useApp();
  const [replenishSuccessId, setReplenishSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickReplenish = (productId: string, packagesCount: number) => {
    adjustStock(productId, 'recepcion_bulto', packagesCount, 0, 'Reposición rápida de emergencia por stock bajo');
    setReplenishSuccessId(productId);
    setTimeout(() => setReplenishSuccessId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Alertas de Inventario Bajo ({lowStockProducts.length})
              </h3>
              <p className="text-xs text-slate-500">
                Productos con existencias por debajo del umbral mínimo de seguridad.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-slate-900 text-sm">Inventario en Niveles Óptimos</p>
              <p className="text-xs text-slate-500 mt-1">
                No hay productos con existencias por debajo del mínimo configurado.
              </p>
            </div>
          ) : (
            lowStockProducts.map(product => {
              const currentPkgs = Math.floor(product.totalUnitsInStock / product.unitsPerPackage);
              const currentUnits = product.totalUnitsInStock % product.unitsPerPackage;
              const suggestedPkgs = Math.max(1, Math.ceil((product.minStockUnits * 2 - product.totalUnitsInStock) / product.unitsPerPackage));
              const isDone = replenishSuccessId === product.id;

              return (
                <div
                  key={product.id}
                  className="p-3.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {product.name}
                      </span>
                      <span className="text-[11px] font-mono-numbers px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {product.sku}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>
                        Stock actual: <strong className="text-red-600 font-mono-numbers">{currentPkgs} {product.packageLabel}(s) + {currentUnits} un.</strong> ({product.totalUnitsInStock} tot.)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Mínimo requerido: <span className="font-mono-numbers">{product.minStockUnits} un.</span></span>
                      <span aria-hidden="true">·</span>
                      <span>{product.unitsPerPackage} un/{product.packageLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isDone ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded-md">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Reabastecido
                      </span>
                    ) : (
                      <button
                        onClick={() => handleQuickReplenish(product.id, suggestedPkgs)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                        title={`Ingresar ${suggestedPkgs} ${product.packageLabel}(s)`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Recibir +{suggestedPkgs} {product.packageLabel}(s)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Los bultos recibidos actualizan de inmediato el stock en unidades y bultos.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onNavigateToInventory();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md bg-white hover:bg-slate-50 cursor-pointer"
            >
              <span>Ver Todo en Inventario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

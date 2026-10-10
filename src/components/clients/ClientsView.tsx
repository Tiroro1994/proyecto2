import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  DollarSign,
  Edit,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Client } from '../../types';
import { FormFieldError, getInputErrorClass } from '../common/FormFieldError';

export const ClientsView: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, sales, exchangeRate, settings, hasPermission, triggerErrorSignal } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [clientForm, setClientForm] = useState({
    name: '',
    docId: '',
    phone: '',
    email: '',
    address: '',
  });

  // Calculate client purchase metrics dynamically from actual completed sales (eliminating redundant counters)
  const clientStats = useMemo(() => {
    const stats: Record<string, { totalOrders: number; totalPurchasesUSD: number }> = {};
    for (const s of sales) {
      if (s.clientId && s.status === 'completada') {
        if (!stats[s.clientId]) {
          stats[s.clientId] = { totalOrders: 0, totalPurchasesUSD: 0 };
        }
        stats[s.clientId].totalOrders += 1;
        stats[s.clientId].totalPurchasesUSD += (s.totalUSD || 0);
      }
    }
    return stats;
  }, [sales]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return clients;
    return clients.filter(c => {
      return (
        c.name.toLowerCase().includes(term) ||
        c.docId.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term))
      );
    });
  }, [clients, searchTerm]);

  const openAddModal = () => {
    setEditingClient(null);
    setClientForm({
      name: '',
      docId: '',
      phone: '',
      email: '',
      address: '',
    });
    setFormError(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      docId: client.docId,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
    });
    setFormError(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors: Record<string, string> = {};

    const cleanName = clientForm.name.trim();
    const cleanDoc = clientForm.docId.trim();

    if (!cleanName) {
      errors.name = '⚠️ Este campo no se rellenó (Nombre / Razón Social es obligatorio)';
    }

    if (!cleanDoc) {
      errors.docId = '⚠️ Este campo no se rellenó (Cédula / RIF / Doc es obligatorio)';
    } else {
      // Validate unique document ID to prevent MySQL UNIQUE constraint collisions
      const duplicate = clients.find(
        c => c.docId.toLowerCase() === cleanDoc.toLowerCase() && c.id !== editingClient?.id
      );
      if (duplicate) {
        errors.docId = `⚠️ El documento "${cleanDoc}" ya está asignado al cliente "${duplicate.name}".`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      setFormError('⚠️ Señal de Error: Hay campos obligatorios sin rellenar o duplicados.');
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error en Cliente',
        message: errors[firstField],
        fieldName: firstField,
        severity: 'warning',
      });
      return;
    }

    setFieldErrors({});

    if (editingClient) {
      updateClient(editingClient.id, {
        name: cleanName,
        docId: cleanDoc,
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim(),
        address: clientForm.address.trim(),
      });
    } else {
      addClient({
        name: cleanName,
        docId: cleanDoc,
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim(),
        address: clientForm.address.trim(),
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteClient = () => {
    if (!clientToDelete) return;
    deleteClient(clientToDelete.id);
    setClientToDelete(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Directorio y Gestión de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de clientes frecuentes y mayoristas, historial de compras acumuladas e identificación fiscal.
          </p>
        </div>

        {hasPermission('canManageClients') && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento (RIF/Cédula) o teléfono..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-medium">No se encontraron clientes</p>
          </div>
        ) : (
          filteredClients.map(client => {
            const stats = clientStats[client.id] || {
              totalOrders: client.totalOrders || 0,
              totalPurchasesUSD: client.totalPurchasesUSD || 0,
            };

            return (
              <div
                key={client.id}
                className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{client.name}</h3>
                    {hasPermission('canManageClients') && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(client)}
                          title="Editar cliente"
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded hover:bg-slate-100 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientToDelete(client)}
                          title="Eliminar cliente"
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer rounded hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-1 font-mono-numbers text-xs text-slate-500 font-semibold">
                    Doc: {client.docId}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total purchases footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Compras ({stats.totalOrders} órdenes):
                    </span>
                    <span className="font-mono-numbers font-bold text-slate-900">
                      ${stats.totalPurchasesUSD.toFixed(2)} USD
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-numbers text-[11px] text-emerald-700 font-semibold block">
                      {(stats.totalPurchasesUSD * exchangeRate.rate).toFixed(2)} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClient} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre o Razón Social *</label>
                <input
                  type="text"
                  placeholder="Ej: Distribuidora del Norte C.A."
                  value={clientForm.name}
                  onChange={e => {
                    setClientForm({ ...clientForm, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                  }}
                  className={`w-full px-2.5 py-1.5 rounded focus:outline-none transition-all ${getInputErrorClass(
                    !!fieldErrors.name,
                    'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                  )}`}
                />
                <FormFieldError error={fieldErrors.name} />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cédula / RIF / NIT *</label>
                <input
                  type="text"
                  placeholder="Ej: J-30491823-1"
                  value={clientForm.docId}
                  onChange={e => {
                    setClientForm({ ...clientForm, docId: e.target.value });
                    if (fieldErrors.docId) setFieldErrors({ ...fieldErrors, docId: '' });
                  }}
                  className={`w-full px-2.5 py-1.5 rounded focus:outline-none transition-all ${getInputErrorClass(
                    !!fieldErrors.docId,
                    'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                  )}`}
                />
                <FormFieldError error={fieldErrors.docId} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+58 412 1234567"
                    value={clientForm.phone}
                    onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="contacto@cliente.com"
                    value={clientForm.email}
                    onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dirección Fiscal / Despacho</label>
                <input
                  type="text"
                  placeholder="Calle, Edificio, Ciudad"
                  value={clientForm.address}
                  onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded cursor-pointer"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-xs">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-100 rounded-full">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">¿Eliminar Cliente?</h3>
                <p className="text-[11px] text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4">
              ¿Está seguro que desea eliminar a <strong>{clientToDelete.name}</strong> (Doc: {clientToDelete.docId}) del directorio?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
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

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Check,
  X,
  Lock,
  Edit,
  Eye,
  EyeOff,
  AlertCircle,
  Key,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { FormFieldError, getInputErrorClass } from '../common/FormFieldError';

export const UsersView: React.FC = () => {
  const { users, currentUser, addUser, updateUser, hasPermission, triggerErrorSignal } = useApp();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'cajero' as UserRole,
  });

  const openCreateModal = () => {
    setEditingUserId(null);
    setUserForm({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'cajero',
    });
    setFormError(null);
    setFieldErrors({});
    setShowPassword(false);
    setIsAddUserModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '', // Dejar en blanco para mantener la actual
      role: user.role,
    });
    setFormError(null);
    setFieldErrors({});
    setShowPassword(false);
    setIsAddUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors: Record<string, string> = {};

    const cleanName = userForm.name.trim();
    const cleanUsername = userForm.username.trim().toLowerCase();
    const cleanPassword = userForm.password.trim();

    if (!cleanName) {
      errors.name = '⚠️ Este campo no se rellenó (Nombre completo es obligatorio)';
    }

    if (!cleanUsername) {
      errors.username = '⚠️ Este campo no se rellenó (Nombre de usuario es obligatorio)';
    }

    if (!editingUserId && !cleanPassword) {
      errors.password = '⚠️ Este campo no se rellenó (La contraseña es obligatoria)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      setFormError('⚠️ Señal de Error: Hay campos obligatorios sin rellenar. Complete los campos resaltados en rojo.');
      triggerErrorSignal({
        type: 'unfilled_field_error',
        title: 'Señal de Error: Campo sin rellenar',
        message: `No se rellenó un campo obligatorio al gestionar usuarios (${firstField}).`,
        fieldName: firstField,
        severity: 'warning',
      });
      return;
    }

    setFieldErrors({});

    // Verificar nombre de usuario duplicado
    const duplicate = users.find(
      u => u.username.toLowerCase() === cleanUsername && u.id !== editingUserId
    );
    if (duplicate) {
      setFieldErrors({ username: 'Este nombre de usuario ya está en uso' });
      setFormError(`El nombre de usuario "${cleanUsername}" ya está registrado por otro operador.`);
      return;
    }

    if (editingUserId) {
      const updates: Partial<User> = {
        name: cleanName,
        username: cleanUsername,
        email: userForm.email.trim(),
        role: userForm.role,
      };
      if (cleanPassword) {
        updates.password = cleanPassword;
      }
      updateUser(editingUserId, updates);
    } else {
      addUser({
        name: cleanName,
        username: cleanUsername,
        email: userForm.email.trim(),
        password: cleanPassword,
        role: userForm.role,
        active: true,
      });
    }

    setIsAddUserModalOpen(false);
    setEditingUserId(null);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador', class: 'bg-purple-100 text-purple-800' };
      case 'gerente':
        return { label: 'Gerente General', class: 'bg-blue-100 text-blue-800' };
      case 'cajero':
        return { label: 'Cajero / Facturación', class: 'bg-emerald-100 text-emerald-800' };
      case 'almacen':
        return { label: 'Almacén / Depósito', class: 'bg-amber-100 text-amber-800' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Control de Usuarios y Niveles de Acceso (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure operadores, asigne contraseñas individuales y controle los privilegios permitidos en caja, inventario y finanzas.
          </p>
        </div>

        {hasPermission('canManageUsers') && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Usuario con Contraseña</span>
          </button>
        )}
      </div>

      {/* Users List (Security hardened: Fast switcher disabled) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map(user => {
          const badge = getRoleBadge(user.role);
          const isCurrent = user.id === currentUser.id;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-lg border p-4 flex flex-col justify-between transition-all ${
                isCurrent ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-xs' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${badge.class}`}>
                    {badge.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Sesión Activa
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{user.name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">@{user.username}</p>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <p className="truncate text-[11px]">{user.email}</p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 pt-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Contraseña: </span>
                    <span className="font-mono text-slate-900 font-bold">••••••••</span>
                  </div>
                </div>
              </div>

              {/* Action area: Fast switching disabled, only edit/password management */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                {isCurrent ? (
                  <div className="text-center py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
                    Operador Actual
                  </div>
                ) : (
                  <div className="text-center py-1 text-[10px] text-slate-500 bg-slate-50 rounded border border-slate-200/60 leading-tight">
                    🔒 Cambio rápido deshabilitado (Cierre sesión para ingresar)
                  </div>
                )}

                {hasPermission('canManageUsers') && (
                  <button
                    type="button"
                    onClick={() => openEditModal(user)}
                    className="w-full py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                    <span>Editar / Cambiar Clave</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Matriz de Permisos por Rol</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cada rol define de forma estricta las vistas y operaciones a las que tiene acceso el operador
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-2.5 px-3">Módulo / Acción</th>
                <th className="py-2.5 px-3 text-center">Administrador</th>
                <th className="py-2.5 px-3 text-center">Gerente</th>
                <th className="py-2.5 px-3 text-center">Cajero</th>
                <th className="py-2.5 px-3 text-center">Almacén</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="py-2.5 px-3 font-medium">Punto de Venta (POS) y Cobros</td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Gestión de Inventario (Bultos y Unidades)</td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Compras y Facturas de Proveedores</td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Recepción y Ajustes de Almacén</td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Registro de Clientes</td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Control de Gastos y Finanzas P&L</td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Reportes y Exportación Excel/PDF</td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Creación de Usuarios y Contraseñas</td>
                <td className="py-2.5 px-3 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300"><X className="w-4 h-4 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingUserId ? 'Editar Operador y Contraseña' : 'Crear Nuevo Operador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Laura Morales"
                  value={userForm.name}
                  onChange={e => {
                    setUserForm({ ...userForm, name: e.target.value });
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre de Usuario (Para Iniciar Sesión) *
                </label>
                <input
                  type="text"
                  placeholder="ej: laura.caja"
                  value={userForm.username}
                  onChange={e => {
                    setUserForm({ ...userForm, username: e.target.value });
                    if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: '' });
                  }}
                  className={`w-full px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none transition-all ${getInputErrorClass(
                    !!fieldErrors.username,
                    'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                  )}`}
                />
                <FormFieldError error={fieldErrors.username} />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contraseña de Acceso {editingUserId ? '(Dejar vacía para conservar la actual)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingUserId ? '•••••••• (Sin cambios)' : '•••••••• (Ingrese la contraseña)'}
                    value={userForm.password}
                    onChange={e => {
                      setUserForm({ ...userForm, password: e.target.value });
                      if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                    }}
                    className={`w-full pl-2.5 pr-9 py-1.5 rounded font-mono text-xs focus:outline-none transition-all ${getInputErrorClass(
                      !!fieldErrors.password,
                      'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-emerald-500'
                    )}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <FormFieldError error={fieldErrors.password} />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="laura@distribuidora.com"
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rol y Nivel de Acceso *
                </label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none"
                >
                  <option value="cajero">Cajero / Facturación (Solo POS y Clientes)</option>
                  <option value="almacen">Almacén / Depósito (Solo Inventario y Recepción)</option>
                  <option value="gerente">Gerente (POS, Inventario, Finanzas, Reportes)</option>
                  <option value="admin">Administrador (Acceso Total y Usuarios)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs cursor-pointer"
                >
                  {editingUserId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

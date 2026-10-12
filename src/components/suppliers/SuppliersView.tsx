import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Receipt,
  Tag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Supplier } from '../../types';
import { StatCard } from '../common/StatCard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SupplierModal } from './SupplierModal';

export const SuppliersView: React.FC = () => {
  const { suppliers, invoices, deleteSupplier } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Invoices count map per supplier
  const supplierInvoicesMap = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((inv) => {
      const key = inv.supplierId || inv.supplierName;
      map.set(key, (map.get(key) || 0) + 1);
      if (inv.supplierName) {
        map.set(inv.supplierName.toLowerCase(), (map.get(inv.supplierName.toLowerCase()) || 0) + 1);
      }
    });
    return map;
  }, [invoices]);

  // Unique categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(suppliers.map((s) => s.category).filter(Boolean))) as string[];
    return list.sort();
  }, [suppliers]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(term) ||
        (s.nif && s.nif.toLowerCase().includes(term)) ||
        (s.phone && s.phone.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.address && s.address.toLowerCase().includes(term));

      const matchCategory =
        selectedCategory === 'all' || s.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [suppliers, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total de Fornecedores"
          value={String(suppliers.length)}
          subtext="Entidades parceiras de compras e materiais"
          icon={<Building2 className="h-5 w-5 text-amber-600" />}
          highlight="warning"
        />

        <StatCard
          title="Com Faturas Registadas"
          value={String(
            suppliers.filter(
              (s) =>
                (supplierInvoicesMap.get(s.id) || 0) > 0 ||
                (supplierInvoicesMap.get(s.name.toLowerCase()) || 0) > 0
            ).length
          )}
          subtext="Fornecedores ativos com histórico de faturação"
          icon={<Receipt className="h-5 w-5 text-emerald-600" />}
          highlight="success"
        />

        <StatCard
          title="Ramos / Categorias"
          value={String(categories.length || (suppliers.length > 0 ? 1 : 0))}
          subtext="Áreas de especialidade dos materiais"
          icon={<Tag className="h-5 w-5 text-blue-600" />}
          highlight="primary"
        />
      </div>

      {/* Control Bar: Search, Category Filter & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por fornecedor, NIF, telefone, email..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Create Supplier Button */}
        <button
          type="button"
          onClick={() => {
            setEditingSupplier(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ Novo Fornecedor</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[11px] font-bold">
              <tr>
                <th className="p-3.5">Fornecedor</th>
                <th className="p-3.5">NIF</th>
                <th className="p-3.5">Categoria / Ramo</th>
                <th className="p-3.5">Contactos</th>
                <th className="p-3.5">Morada</th>
                <th className="p-3.5 text-center">Faturas</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-10 w-10 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">
                        Nenhum fornecedor registado.
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Crie aqui os seus fornecedores habituais. Ao registar novas faturas, poderá escolher diretamente o fornecedor pretendido.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSupplier(null);
                          setIsModalOpen(true);
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-600 shadow-xs transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Registar Primeiro Fornecedor
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const invCount =
                    (supplierInvoicesMap.get(supplier.id) || 0) +
                    (supplierInvoicesMap.get(supplier.name.toLowerCase()) || 0);

                  return (
                    <tr
                      key={supplier.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Notes */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-800 text-xs">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {supplier.name}
                            </div>
                            {supplier.notes && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {supplier.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* NIF */}
                      <td className="p-3.5 font-mono text-slate-700">
                        {supplier.nif || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {supplier.category || 'Geral'}
                        </span>
                      </td>

                      {/* Contacts */}
                      <td className="p-3.5 space-y-1 text-slate-600">
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">
                        {supplier.address ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{supplier.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Invoices Count */}
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {invCount}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Editar fornecedor"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingSupplier(supplier)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar fornecedor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Supplier Modal */}
      <SupplierModal
        supplier={editingSupplier}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Confirmation Dialog for Deleting Supplier */}
      <ConfirmDialog
        isOpen={!!deletingSupplier}
        title="Eliminar Fornecedor"
        message={`Tem a certeza de que deseja eliminar o fornecedor "${deletingSupplier?.name}"? Esta ação removerá o registo do fornecedor.`}
        confirmText="Eliminar Fornecedor"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deletingSupplier) {
            deleteSupplier(deletingSupplier.id);
            setDeletingSupplier(null);
          }
        }}
        onCancel={() => setDeletingSupplier(null)}
      />
    </div>
  );
};

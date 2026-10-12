import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  FileText,
  Sparkles,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { NewInvoiceModal } from './NewInvoiceModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';

export const InvoicesView: React.FC = () => {
  const { invoices, deleteInvoice } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  // Unique suppliers for filter dropdown
  const uniqueSuppliers = useMemo(() => {
    const list = Array.from(new Set(invoices.map((i) => i.supplierName))).filter(Boolean);
    return list.sort();
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.supplierNif && inv.supplierNif.includes(searchTerm)) ||
        inv.items.some((it) => it.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSupplier =
        selectedSupplier === 'all' || inv.supplierName === selectedSupplier;

      return matchSearch && matchSupplier;
    });
  }, [invoices, searchTerm, selectedSupplier]);

  // Financial sums
  const totalAmount = filteredInvoices.reduce((acc, i) => acc + i.total, 0);
  const totalVat = filteredInvoices.reduce((acc, i) => acc + i.vatAmount, 0);
  const totalMaterialsCount = filteredInvoices.reduce(
    (acc, i) => acc + i.items.reduce((s, it) => s + it.quantity, 0),
    0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total em Faturas"
          value={formatCurrency(totalAmount)}
          subtext={`${filteredInvoices.length} faturas de compras`}
          icon={<Receipt className="h-5 w-5 text-amber-600" />}
          highlight="warning"
        />

        <StatCard
          title="IVA Dedutível"
          value={formatCurrency(totalVat)}
          subtext="Recuperável na declaração periódica"
          icon={<FileText className="h-5 w-5 text-emerald-600" />}
          highlight="success"
        />

        <StatCard
          title="Fornecedores"
          value={String(uniqueSuppliers.length)}
          subtext="Parceiros de materiais registados"
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
          highlight="primary"
        />

        <StatCard
          title="Unidades de Materiais"
          value={String(Math.round(totalMaterialsCount))}
          subtext="Artigos adicionados ao inventário"
          icon={<Sparkles className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Control Bar: Search, Filters & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por fornecedor, número, NIF ou material..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Supplier filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="all">Todos os Fornecedores</option>
              {uniqueSuppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Create Invoice button */}
        <button
          onClick={() => setIsNewInvoiceOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ Nova Fatura</span>
        </button>
      </div>

      {/* Invoices Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="p-3.5">N.º Fatura</th>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Fornecedor</th>
                <th className="p-3.5">NIF</th>
                <th className="p-3.5 text-center">Artigos</th>
                <th className="p-3.5 text-right">Subtotal</th>
                <th className="p-3.5 text-right">IVA (23%)</th>
                <th className="p-3.5 text-right">Total</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Nenhuma fatura encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setViewingInvoice(inv)}
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {inv.number}
                    </td>
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="p-3.5 font-medium text-slate-900">
                      <div className="max-w-[200px] truncate" title={inv.supplierName}>
                        {inv.supplierName}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {inv.supplierNif || '—'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {inv.items.length} itens
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-600 font-medium whitespace-nowrap">
                      {formatCurrency(inv.vatAmount)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <Badge variant="success" size="sm">
                        Confirmada
                      </Badge>
                    </td>
                    <td
                      className="p-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingInvoice(inv)}
                          className="rounded p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                          title="Ver Detalhe"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingInvoice(inv)}
                          className="rounded p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar Fatura"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingInvoice(inv)}
                          className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Eliminar Fatura"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Invoice Modal */}
      <NewInvoiceModal
        isOpen={isNewInvoiceOpen || !!editingInvoice}
        invoiceToEdit={editingInvoice}
        onClose={() => {
          setIsNewInvoiceOpen(false);
          setEditingInvoice(null);
        }}
        onSuccess={() => {
          setIsNewInvoiceOpen(false);
          setEditingInvoice(null);
        }}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={viewingInvoice}
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        onEdit={(inv) => {
          setViewingInvoice(null);
          setEditingInvoice(inv);
        }}
        onDelete={(invId) => {
          deleteInvoice(invId);
          setViewingInvoice(null);
        }}
      />

      {/* Confirmation Dialog for Deleting Invoice */}
      <ConfirmDialog
        isOpen={!!deletingInvoice}
        title="Eliminar Fatura"
        message={`Tem a certeza de que deseja eliminar a fatura ${deletingInvoice?.number} (${deletingInvoice?.supplierName})?`}
        confirmText="Eliminar Fatura"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deletingInvoice) {
            deleteInvoice(deletingInvoice.id);
            setDeletingInvoice(null);
          }
        }}
        onCancel={() => setDeletingInvoice(null)}
      />
    </div>
  );
};

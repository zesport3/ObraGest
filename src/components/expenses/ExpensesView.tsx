import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  Receipt,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GeneralExpense } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatCard } from '../common/StatCard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ExpenseModal } from './ExpenseModal';

export const ExpensesView: React.FC = () => {
  const { generalExpenses, deleteGeneralExpense } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GeneralExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<GeneralExpense | null>(null);

  // Categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(generalExpenses.map((e) => e.category))).filter(Boolean);
    return list.sort();
  }, [generalExpenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return generalExpenses.filter((e) => {
      const matchSearch =
        e.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || e.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [generalExpenses, searchTerm, selectedCategory]);

  // Metrics
  const totalAmount = filteredExpenses.reduce((acc, e) => acc + e.total, 0);
  const totalSubtotal = filteredExpenses.reduce((acc, e) => acc + e.subtotal, 0);
  const totalVat = filteredExpenses.reduce((acc, e) => acc + e.vatAmount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Despesas Gerais"
          value={formatCurrency(totalAmount)}
          subtext={`${filteredExpenses.length} registos operacionais`}
          icon={<CreditCard className="h-5 w-5 text-amber-600" />}
          highlight="warning"
        />

        <StatCard
          title="Base Incidente (s/ IVA)"
          value={formatCurrency(totalSubtotal)}
          subtext="Custo líquido para a empresa"
          icon={<Receipt className="h-5 w-5 text-blue-600" />}
          highlight="primary"
        />

        <StatCard
          title="IVA Dedutível"
          value={formatCurrency(totalVat)}
          subtext="Apurado a deduzir no IVA trimestral"
          icon={<FileText className="h-5 w-5 text-emerald-600" />}
          highlight="success"
        />

        <StatCard
          title="Categorias de Despesa"
          value={String(categories.length)}
          subtext="Combustíveis, rendas, seguros, energia..."
          icon={<Building2 className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por fornecedor, categoria ou descrição..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ Nova Despesa</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Fornecedor / Entidade</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Descrição</th>
                <th className="p-3.5 text-right">Valor s/ IVA</th>
                <th className="p-3.5 text-right">Taxa</th>
                <th className="p-3.5 text-right">Valor IVA</th>
                <th className="p-3.5 text-right">Total com IVA</th>
                <th className="p-3.5">Notas</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Nenhuma despesa geral encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {exp.supplier}
                    </td>
                    <td className="p-3.5 text-slate-700 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatCurrency(exp.subtotal)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500 whitespace-nowrap">
                      {exp.vatRate}%
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-600 font-semibold whitespace-nowrap">
                      {formatCurrency(exp.vatAmount)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(exp.total)}
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                      {exp.notes || '—'}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpense(exp);
                            setIsModalOpen(true);
                          }}
                          className="rounded p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingExpense(exp)}
                          className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                          title="Eliminar Despesa"
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

      {/* Expense Modal */}
      <ExpenseModal
        expense={editingExpense}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
      />

      {/* Confirmation Dialog for Deleting Expense */}
      <ConfirmDialog
        isOpen={!!deletingExpense}
        title="Eliminar Despesa"
        message={`Tem a certeza de que deseja eliminar esta despesa (${deletingExpense?.supplier} - ${formatCurrency(deletingExpense?.total || 0)})?`}
        confirmText="Eliminar Despesa"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deletingExpense) {
            deleteGeneralExpense(deletingExpense.id);
            setDeletingExpense(null);
          }
        }}
        onCancel={() => setDeletingExpense(null)}
      />
    </div>
  );
};

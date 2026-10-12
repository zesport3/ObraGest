import React, { useState, useMemo } from 'react';
import {
  HardHat,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  MapPin,
  TrendingUp,
  CreditCard,
  Percent,
  CheckCircle2,
  Clock,
  ArrowRight,
  List,
  LayoutGrid,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Work, WorkStatus } from '../../types';
import { calculateWorkFinancials } from '../../utils/calculations';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { NewWorkModal } from './NewWorkModal';

interface WorksViewProps {
  onSelectWork: (workId: string) => void;
}

export const WorksView: React.FC<WorksViewProps> = ({ onSelectWork }) => {
  const { works, stockMovements, workHourLogs, deleteWork } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [isNewWorkOpen, setIsNewWorkOpen] = useState(false);
  const [deletingWork, setDeletingWork] = useState<Work | null>(null);

  // Filter works
  const filteredWorks = useMemo(() => {
    return works.filter((w) => {
      const matchSearch =
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.address && w.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (w.proposalNumber && w.proposalNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || w.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [works, searchTerm, statusFilter]);

  // Aggregate metrics
  const activeCount = works.filter((w) => w.status === 'Em curso').length;
  const completedCount = works.filter((w) => w.status === 'Concluída').length;

  let totalRevenue = 0;
  let totalCost = 0;
  works.forEach((w) => {
    const fin = calculateWorkFinancials(w, stockMovements, workHourLogs);
    totalRevenue += fin.revenue;
    totalCost += fin.totalCost;
  });
  const totalProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const statusVariant: Record<WorkStatus, 'warning' | 'success' | 'info' | 'danger' | 'neutral'> = {
    'Em curso': 'warning',
    'Concluída': 'success',
    'Planeada': 'info',
    'Suspensa': 'danger',
    'Cancelada': 'neutral',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturação Total Obras"
          value={formatCurrency(totalRevenue)}
          subtext={`${works.length} obras cadastradas`}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          highlight="success"
        />

        <StatCard
          title="Custos Acumulados"
          value={formatCurrency(totalCost)}
          subtext="Materiais, trabalhadores e diretos"
          icon={<CreditCard className="h-5 w-5 text-rose-600" />}
          highlight="danger"
        />

        <StatCard
          title="Resultado (Lucro)"
          value={formatCurrency(totalProfit)}
          subtext={`Margem média global: ${formatPercent(overallMargin)}`}
          icon={<HardHat className="h-5 w-5 text-amber-600" />}
          highlight="primary"
        />

        <StatCard
          title="Obras em Execução"
          value={String(activeCount)}
          subtext={`${completedCount} empreitadas já concluídas`}
          icon={<Clock className="h-5 w-5 text-purple-600" />}
          highlight="warning"
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
              placeholder="Pesquisar por obra, cliente, morada ou orçamento..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="all">Todos os Estados</option>
            <option value="Em curso">Em curso</option>
            <option value="Concluída">Concluídas</option>
            <option value="Planeada">Planeadas</option>
            <option value="Suspensa">Suspensas</option>
            <option value="Cancelada">Canceladas</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualização em Lista"
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualização em Cartões"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cartões</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewWorkOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nova Obra</span>
          </button>
        </div>
      </div>

      {/* Works Content: List View or Cards View */}
      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5">Obra / Empreitada</th>
                  <th className="p-3.5">Cliente & Localização</th>
                  <th className="p-3.5">Período</th>
                  <th className="p-3.5 text-right">Receita (Adjudicado)</th>
                  <th className="p-3.5 text-right">Custo Acumulado</th>
                  <th className="p-3.5 text-right">Resultado (Lucro)</th>
                  <th className="p-3.5 text-right">Margem</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400">
                      Nenhuma obra encontrada. Clique em "+ Nova Obra" para iniciar um novo projeto.
                    </td>
                  </tr>
                ) : (
                  filteredWorks.map((work) => {
                    const fin = calculateWorkFinancials(work, stockMovements, workHourLogs);
                    return (
                      <tr
                        key={work.id}
                        onClick={() => onSelectWork(work.id)}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <Badge variant={statusVariant[work.status] || 'neutral'} size="sm">
                            {work.status}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                            {work.name}
                          </div>
                          {work.proposalNumber && (
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              Orçamento: {work.proposalNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-900">{work.clientName}</div>
                          {work.address && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 max-w-xs truncate" title={work.address}>
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{work.address}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 whitespace-nowrap text-[11px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>Início: {formatDate(work.startDate)}</span>
                          </div>
                          {work.estimatedEndDate && (
                            <div className="text-slate-400 text-[10px] mt-0.5">
                              Fim: {formatDate(work.estimatedEndDate)}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(fin.revenue)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-semibold text-rose-600 whitespace-nowrap">
                          {formatCurrency(fin.totalCost)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                          <span className={fin.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {formatCurrency(fin.profit)}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-700 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              fin.marginPercent >= 20
                                ? 'bg-emerald-50 text-emerald-700'
                                : fin.marginPercent >= 0
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {formatPercent(fin.marginPercent)}
                          </span>
                        </td>
                        <td
                          className="p-3.5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectWork(work.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                              title="Abrir Painel da Obra"
                            >
                              <span>Abrir</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingWork(work)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={`Eliminar obra ${work.name}`}
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
      ) : (
        /* Works Grid / Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorks.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              Nenhuma obra encontrada. Clique em "+ Nova Obra" para iniciar um novo projeto.
            </div>
          ) : (
            filteredWorks.map((work) => {
              const fin = calculateWorkFinancials(work, stockMovements, workHourLogs);
              return (
                <div
                  key={work.id}
                  onClick={() => onSelectWork(work.id)}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div>
                    {/* Card Header: Status & Proposal */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <Badge variant={statusVariant[work.status] || 'neutral'} size="sm">
                        {work.status}
                      </Badge>
                      {work.proposalNumber && (
                        <span className="font-mono text-[11px] font-semibold text-slate-500">
                          {work.proposalNumber}
                        </span>
                      )}
                    </div>

                    {/* Title & Client */}
                    <div className="mt-3">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                        {work.name}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                        {work.clientName}
                      </p>
                      {work.address && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {work.address}
                        </p>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Início: {formatDate(work.startDate)}</span>
                      <span>• Previsto: {formatDate(work.estimatedEndDate)}</span>
                    </div>

                    {/* Financial Highlights */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Receita</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(fin.revenue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Custo Acumulado</span>
                        <span className="font-mono font-bold text-rose-600 text-sm">
                          {formatCurrency(fin.totalCost)}
                        </span>
                      </div>
                    </div>

                    {/* Profit & Margin Bar */}
                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Lucro Previsto</span>
                        <span className={`font-mono font-bold ${fin.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(fin.profit)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">Margem</span>
                        <span className="font-bold text-slate-900">
                          {formatPercent(fin.marginPercent)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Abrir Painel da Obra</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingWork(work);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title={`Eliminar obra ${work.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* New Work Modal */}
      <NewWorkModal
        work={null}
        isOpen={isNewWorkOpen}
        onClose={() => setIsNewWorkOpen(false)}
        onSaved={(newW) => onSelectWork(newW.id)}
        onOpenExistingWork={(workId) => onSelectWork(workId)}
      />

      {/* Confirmation Dialog for Deleting Work */}
      <ConfirmDialog
        isOpen={!!deletingWork}
        title="Eliminar Obra"
        message={`Tem a certeza de que deseja eliminar a obra "${deletingWork?.name}" (${deletingWork?.clientName})? Todos os registos de custos e materiais associados serão removidos.`}
        confirmText="Eliminar Obra"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deletingWork) {
            deleteWork(deletingWork.id);
            setDeletingWork(null);
          }
        }}
        onCancel={() => setDeletingWork(null)}
      />
    </div>
  );
};

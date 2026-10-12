import React, { useState, useMemo } from 'react';
import {
  Work,
  WorkStatus,
  StockMovement,
  WorkHourLog,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  calculateWorkFinancials,
} from '../../utils/calculations';
import { formatCurrency, formatDate, formatPercent, formatNumber, getTodayDateString } from '../../utils/formatters';
import {
  ArrowLeft,
  HardHat,
  Boxes,
  Users,
  CreditCard,
  FileSpreadsheet,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  TrendingUp,
  Scale,
  Percent,
  AlertTriangle,
  Clock,
  Edit2,
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AssignMaterialModal } from './AssignMaterialModal';
import { NewWorkModal } from './NewWorkModal';

interface WorkDetailViewProps {
  workId: string;
  onBack: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const WorkDetailView: React.FC<WorkDetailViewProps> = ({
  workId,
  onBack,
  onNavigateToTab,
}) => {
  const {
    works,
    stockMovements,
    workHourLogs,
    proposals,
    addWorkOtherCost,
    removeWorkOtherCost,
    updateWork,
    deleteWork,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'materials' | 'labor' | 'otherCosts'>('overview');
  const [isAssignMaterialOpen, setIsAssignMaterialOpen] = useState(false);
  const [isEditWorkOpen, setIsEditWorkOpen] = useState(false);
  const [isDeletingWork, setIsDeletingWork] = useState(false);

  // New Other Cost form state
  const [showAddOtherCost, setShowAddOtherCost] = useState(false);
  const [otherCostDesc, setOtherCostDesc] = useState('');
  const [otherCostCategory, setOtherCostCategory] = useState('Aluguer de Equipamento');
  const [otherCostAmount, setOtherCostAmount] = useState<number>(0);
  const [otherCostDate, setOtherCostDate] = useState(getTodayDateString());
  const [otherCostError, setOtherCostError] = useState<string | null>(null);

  const currentWork = works.find((w) => w.id === workId);

  // Work financials
  const financials = useMemo(() => {
    if (!currentWork) return null;
    return calculateWorkFinancials(currentWork, stockMovements, workHourLogs);
  }, [currentWork, stockMovements, workHourLogs]);

  // Materials consumed in this work
  const workMaterials = useMemo(() => {
    return stockMovements.filter(
      (m) => m.workId === workId && m.type === 'obra'
    );
  }, [stockMovements, workId]);

  // Labor logs in this work
  const workLaborLogs = useMemo(() => {
    return workHourLogs.filter((l) => l.workId === workId);
  }, [workHourLogs, workId]);

  if (!currentWork || !financials) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Obra não encontrada.</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950"
        >
          Voltar às Obras
        </button>
      </div>
    );
  }

  const handleCreateOtherCost = (e: React.FormEvent) => {
    e.preventDefault();
    setOtherCostError(null);
    if (!otherCostDesc.trim() || otherCostAmount <= 0) {
      setOtherCostError('Preencha a descrição e um valor superior a zero.');
      return;
    }
    addWorkOtherCost(currentWork.id, {
      description: otherCostDesc,
      category: otherCostCategory,
      amount: otherCostAmount,
      date: otherCostDate,
    });
    setOtherCostDesc('');
    setOtherCostAmount(0);
    setOtherCostError(null);
    setShowAddOtherCost(false);
  };

  const statusVariant = {
    'Em curso': 'warning',
    'Concluída': 'success',
    'Planeada': 'info',
    'Suspensa': 'danger',
    'Cancelada': 'neutral',
  } as const;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Obras
            </button>
            <span className="text-slate-300">/</span>
            <Badge variant={statusVariant[currentWork.status] || 'neutral'} size="sm">
              {currentWork.status}
            </Badge>
          </div>

          <h2 className="text-lg font-bold text-slate-950 leading-tight">
            {currentWork.name}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
            <span className="font-semibold text-slate-700">Cliente: {currentWork.clientName}</span>
            {currentWork.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {currentWork.address}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Início: {formatDate(currentWork.startDate)} • Previsto: {formatDate(currentWork.estimatedEndDate)}
            </span>
            {currentWork.proposalNumber && (
              <span className="flex items-center gap-1 font-mono text-amber-700 font-semibold">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {currentWork.proposalNumber}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAssignMaterialOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors"
          >
            <Boxes className="h-3.5 w-3.5" />
            + Material da Obra
          </button>
          <button
            onClick={() => setIsEditWorkOpen(true)}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Editar Obra"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsDeletingWork(true)}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Eliminar Obra"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* RENTABILIDADE: 4 Top Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RECEITA DA OBRA */}
        <StatCard
          title="Receita da Obra"
          value={formatCurrency(financials.revenue)}
          subtext="Valor contratado (sem IVA)"
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          highlight="success"
        />

        {/* CUSTO TOTAL */}
        <StatCard
          title="Custo Total Acumulado"
          value={formatCurrency(financials.totalCost)}
          subtext="Materiais + Mão-de-Obra + Custos Diretos"
          icon={<CreditCard className="h-5 w-5 text-rose-600" />}
          highlight="danger"
        />

        {/* RESULTADO DA OBRA */}
        <StatCard
          title="Resultado (Lucro)"
          value={formatCurrency(financials.profit)}
          subtext="Receita contratada menos custo total"
          icon={<Scale className="h-5 w-5 text-blue-600" />}
          highlight={financials.profit >= 0 ? 'primary' : 'danger'}
        />

        {/* MARGEM % */}
        <StatCard
          title="Margem de Lucro"
          value={formatPercent(financials.marginPercent)}
          subtext="Margem percentual sobre a receita"
          icon={<Percent className="h-5 w-5 text-purple-600" />}
          highlight={financials.marginPercent >= 20 ? 'success' : 'warning'}
        />
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeSubTab === 'overview'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Resumo & Análise de Custos</span>
        </button>

        <button
          onClick={() => setActiveSubTab('materials')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeSubTab === 'materials'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Materiais Utilizados ({workMaterials.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('labor')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeSubTab === 'labor'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Trabalhadores & Horas ({workLaborLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('otherCosts')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeSubTab === 'otherCosts'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Outros Custos Diretos ({(currentWork.otherCosts || []).length})</span>
        </button>
      </div>

      {/* SUBTAB 1: OVERVIEW & COST BREAKDOWN */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Breakdown cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Decomposição Detalhada dos Custos da Obra
              </h4>

              <div className="space-y-3">
                {/* Materiais */}
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-amber-600" />
                      Custo dos Materiais Consumidos
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(financials.materialCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                    <span>{workMaterials.length} lotes de materiais registados</span>
                    <span>
                      {financials.revenue > 0
                        ? `${((financials.materialCost / financials.revenue) * 100).toFixed(1)}% da receita`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Mão de Obra */}
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Custo dos Trabalhadores & Horas
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(financials.laborCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                    <span>{formatNumber(financials.laborHours, 0)} horas de trabalho apuradas</span>
                    <span>
                      {financials.revenue > 0
                        ? `${((financials.laborCost / financials.revenue) * 100).toFixed(1)}% da receita`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Outros Custos */}
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      Outros Custos Diretos da Obra
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(financials.otherCostsTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                    <span>Equipamentos, licenças camarárias, vazadouro e subempreiteiros</span>
                    <span>
                      {financials.revenue > 0
                        ? `${((financials.otherCostsTotal / financials.revenue) * 100).toFixed(1)}% da receita`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="rounded-xl bg-slate-900 p-4 text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">
                    Custo Global da Obra
                  </span>
                  <span className="text-xs text-slate-300">
                    Materiais + Mão-de-Obra + Outros Custos
                  </span>
                </div>
                <span className="text-xl font-black font-mono text-amber-400">
                  {formatCurrency(financials.totalCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Profit & Margin Gauge / Graphic */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Rentabilidade da Empreitada
              </h4>

              {/* Visual Bar: Revenue vs Cost vs Profit */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Receita Total:</span>
                    <span className="text-slate-900">{formatCurrency(financials.revenue)}</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Consumo em Custos:</span>
                    <span className="text-rose-600">
                      {financials.revenue > 0
                        ? `${((financials.totalCost / financials.revenue) * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          financials.revenue > 0 ? (financials.totalCost / financials.revenue) * 100 : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Profit summary card */}
              <div className={`rounded-xl p-4 border mt-4 text-center ${
                financials.profit >= 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                  {financials.profit >= 0 ? 'Lucro Líquido Previsto' : 'Prejuízo Operacional'}
                </span>
                <p className="text-2xl font-black mt-1 font-mono">
                  {formatCurrency(financials.profit)}
                </p>
                <div className="inline-block mt-2 rounded-full px-3 py-0.5 text-xs font-bold bg-white/80 shadow-2xs">
                  Margem: {formatPercent(financials.marginPercent)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: MATERIALS */}
      {activeSubTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Materiais Utilizados nesta Obra ({workMaterials.length})
            </h4>
            <button
              onClick={() => setIsAssignMaterialOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Consumir Material do Armazém
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5">Material</th>
                  <th className="p-3.5 text-right">Qtd Consumida</th>
                  <th className="p-3.5 text-right">Preço Custo Unit.</th>
                  <th className="p-3.5 text-right">Custo Total</th>
                  <th className="p-3.5">Notas / Divisão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Nenhum material imputado a esta obra ainda. Clique em "+ Consumir Material do Armazém".
                    </td>
                  </tr>
                ) : (
                  workMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        {formatDate(m.date)}
                      </td>
                      <td className="p-3.5 font-medium text-slate-900">
                        {m.materialName}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        {Math.abs(m.quantity)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatCurrency(m.unitCost)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(Math.abs(m.totalCost))}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {m.note || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: LABOR LOGS */}
      {activeSubTab === 'labor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Registo de Horas & Funcionários nesta Obra ({workLaborLogs.length})
            </h4>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('trabalhadores')}
                className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-semibold"
              >
                Abrir Módulo de Presenças <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5">Trabalhador</th>
                  <th className="p-3.5 text-center">Horário</th>
                  <th className="p-3.5 text-right">Horas Trabalhadas</th>
                  <th className="p-3.5 text-right">Valor / Hora</th>
                  <th className="p-3.5 text-right">Custo Imputado</th>
                  <th className="p-3.5">Trabalhos Realizados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workLaborLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhum registo de horas associado a esta obra.
                    </td>
                  </tr>
                ) : (
                  workLaborLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        {formatDate(log.date)}
                      </td>
                      <td className="p-3.5 font-medium text-slate-900 whitespace-nowrap">
                        {log.workerName}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-600 whitespace-nowrap">
                        {log.startTime} - {log.endTime} (Pausa: {log.breakHours}h)
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {log.totalHours} h
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatCurrency(log.hourlyRate)}/h
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(log.totalCost)}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: OTHER COSTS */}
      {activeSubTab === 'otherCosts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Custos Diretos Complementares da Obra ({(currentWork.otherCosts || []).length})
            </h4>
            <button
              onClick={() => setShowAddOtherCost(!showAddOtherCost)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Outro Custo
            </button>
          </div>

          {showAddOtherCost && (
            <form onSubmit={handleCreateOtherCost} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h5 className="text-xs font-bold text-slate-800 uppercase">Novo Custo Direto</h5>
              {otherCostError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                  {otherCostError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Data</label>
                  <input
                    type="date"
                    required
                    value={otherCostDate}
                    onChange={(e) => setOtherCostDate(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Categoria</label>
                  <select
                    value={otherCostCategory}
                    onChange={(e) => setOtherCostCategory(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800"
                  >
                    <option value="Aluguer de Equipamento">Aluguer de Equipamento</option>
                    <option value="Subempreiteiros">Subempreiteiros</option>
                    <option value="Licenças & Taxas">Licenças & Taxas</option>
                    <option value="Entulho & Vazadouro">Entulho & Vazadouro</option>
                    <option value="Transportes">Transportes</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Descrição</label>
                  <input
                    type="text"
                    required
                    value={otherCostDesc}
                    onChange={(e) => setOtherCostDesc(e.target.value)}
                    placeholder="ex: Contentor entulho, andaimes..."
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Valor (€ sem IVA)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={otherCostAmount}
                    onChange={(e) => setOtherCostAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOtherCost(false)}
                  className="rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded bg-amber-500 hover:bg-amber-600 px-3 py-1 text-xs font-bold text-slate-950"
                >
                  Guardar Custo
                </button>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Descrição</th>
                  <th className="p-3.5 text-right">Valor (€)</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(currentWork.otherCosts || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Sem outros custos diretos registados para esta obra.
                    </td>
                  </tr>
                ) : (
                  currentWork.otherCosts.map((cost) => (
                    <tr key={cost.id} className="hover:bg-slate-50/60">
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        {formatDate(cost.date)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {cost.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-900">
                        {cost.description}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(cost.amount)}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => removeWorkOtherCost(currentWork.id, cost.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AssignMaterialModal
        work={currentWork}
        isOpen={isAssignMaterialOpen}
        onClose={() => setIsAssignMaterialOpen(false)}
      />

      <NewWorkModal
        work={currentWork}
        isOpen={isEditWorkOpen}
        onClose={() => setIsEditWorkOpen(false)}
      />

      {/* Confirmation Dialog for Deleting Work */}
      <ConfirmDialog
        isOpen={isDeletingWork}
        title="Eliminar Obra"
        message={`Tem a certeza de que deseja eliminar a obra "${currentWork.name}"? Todos os materiais, registos de mão de obra e custos desta obra serão removidos.`}
        confirmText="Eliminar Obra"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          deleteWork(currentWork.id);
          setIsDeletingWork(false);
          onBack();
        }}
        onCancel={() => setIsDeletingWork(false)}
      />
    </div>
  );
};

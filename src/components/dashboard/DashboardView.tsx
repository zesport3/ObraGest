import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Boxes,
  Users,
  HardHat,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  PackageCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeriodFilter, WorkStatus } from '../../types';
import { TabType } from '../layout/Sidebar';
import {
  calculateWorkFinancials,
  getDateRange,
} from '../../utils/calculations';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';

export const DashboardView: React.FC<{
  onNavigateToTab?: (tab: TabType) => void;
  onOpenWorkDetail?: (workId: string) => void;
}> = ({ onNavigateToTab, onOpenWorkDetail }) => {
  const {
    invoices,
    generalExpenses,
    works,
    workers,
    workHourLogs,
    stockMovements,
    materials,
  } = useApp();

  const [period, setPeriod] = useState<PeriodFilter>('this_year');
  const [customStart, setCustomStart] = useState<string>('2026-01-01');
  const [customEnd, setCustomEnd] = useState<string>('2026-12-31');

  // Compute active date range
  const range = useMemo(() => {
    return getDateRange(period, customStart, customEnd);
  }, [period, customStart, customEnd]);

  // ----------------------------------------------------
  // 1. GASTOS POR CATEGORIA
  // ----------------------------------------------------
  const expensesData = useMemo(() => {
    const periodInvoices = invoices.filter(
      (i) =>
        i.status === 'confirmed' &&
        new Date(i.date) >= range.start &&
        new Date(i.date) <= range.end
    );
    const periodHourLogs = workHourLogs.filter(
      (l) =>
        new Date(l.date) >= range.start &&
        new Date(l.date) <= range.end
    );
    const periodExpenses = generalExpenses.filter(
      (e) =>
        new Date(e.date) >= range.start &&
        new Date(e.date) <= range.end
    );

    const materialsAmount = periodInvoices.reduce((sum, i) => sum + i.subtotal, 0);
    const laborAmount = periodHourLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);

    const categoryMap: Record<string, { amount: number; count: number; color: string }> = {
      'Materiais de Construção': {
        amount: materialsAmount,
        count: periodInvoices.length,
        color: 'bg-amber-500',
      },
      'Mão-de-Obra (Pessoal)': {
        amount: laborAmount,
        count: periodHourLogs.length,
        color: 'bg-blue-500',
      },
    };

    const colorPalette = [
      'bg-emerald-500',
      'bg-purple-500',
      'bg-rose-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
      'bg-pink-500',
    ];
    let colorIdx = 0;

    periodExpenses.forEach((e) => {
      const cat = e.category?.trim() || 'Outras Despesas';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          amount: 0,
          count: 0,
          color: colorPalette[colorIdx % colorPalette.length],
        };
        colorIdx++;
      }
      categoryMap[cat].amount += e.subtotal;
      categoryMap[cat].count += 1;
    });

    const items = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        color: data.color,
      }))
      .filter((it) => it.amount > 0 || it.count > 0)
      .sort((a, b) => b.amount - a.amount);

    const totalGastos = items.reduce((sum, it) => sum + it.amount, 0);

    return {
      items,
      totalGastos,
      invoicesCount: periodInvoices.length,
      expensesCount: periodExpenses.length,
      logsCount: periodHourLogs.length,
    };
  }, [invoices, workHourLogs, generalExpenses, range]);

  // ----------------------------------------------------
  // 2. INVENTÁRIO
  // ----------------------------------------------------
  const inventoryData = useMemo(() => {
    const totalItems = materials.length;
    const totalUnits = materials.reduce((sum, m) => sum + (m.quantity || 0), 0);
    const totalStockValue = materials.reduce(
      (sum, m) => sum + (m.totalValue || m.quantity * m.averagePrice || 0),
      0
    );

    const sortedByValue = [...materials].sort(
      (a, b) =>
        (b.totalValue || b.quantity * b.averagePrice || 0) -
        (a.totalValue || a.quantity * a.averagePrice || 0)
    );

    return {
      totalItems,
      totalUnits,
      totalStockValue,
      topMaterials: sortedByValue.slice(0, 5),
    };
  }, [materials]);

  // ----------------------------------------------------
  // 3. FUNCIONÁRIOS
  // ----------------------------------------------------
  const workersData = useMemo(() => {
    const totalWorkers = workers.length;
    const activeWorkers = workers.filter((w) => w.isActive).length;

    // Hours logged in selected period
    const periodLogs = workHourLogs.filter((l) => {
      const d = new Date(l.date);
      return d >= range.start && d <= range.end;
    });

    const totalHours = periodLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    const totalLaborCost = periodLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);
    const averageHourlyCost = totalHours > 0 ? totalLaborCost / totalHours : 0;

    // Per-worker breakdown in period
    const workerStats = workers.map((worker) => {
      const logs = periodLogs.filter((l) => l.workerId === worker.id);
      const hours = logs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
      const cost = logs.reduce((sum, l) => sum + (l.totalCost || 0), 0);
      return {
        ...worker,
        periodHours: hours,
        periodCost: cost,
      };
    }).sort((a, b) => b.periodHours - a.periodHours);

    return {
      totalWorkers,
      activeWorkers,
      totalHours,
      totalLaborCost,
      averageHourlyCost,
      workerStats,
    };
  }, [workers, workHourLogs, range]);

  // ----------------------------------------------------
  // 4. OBRAS
  // ----------------------------------------------------
  const worksData = useMemo(() => {
    const totalWorks = works.length;
    const activeWorks = works.filter((w) => w.status === 'Em curso');
    const completedWorks = works.filter((w) => w.status === 'Concluída');

    let totalRevenue = 0; // Total Contratado
    let totalReceived = 0; // Total Já Recebido (não assume adiantado)
    let totalPending = 0; // Pendente a receber
    let totalCost = 0; // Custos acumulados

    const worksWithFin = works.map((w) => {
      const fin = calculateWorkFinancials(w, stockMovements, workHourLogs);
      totalRevenue += fin.revenue;
      totalReceived += fin.receivedTotal;
      totalPending += fin.pendingAmount;
      totalCost += fin.totalCost;
      return {
        ...w,
        fin,
      };
    });

    const totalCashBalance = totalReceived - totalCost;
    const totalExpectedProfit = totalRevenue - totalCost;

    return {
      totalWorks,
      activeCount: activeWorks.length,
      completedCount: completedWorks.length,
      totalRevenue,
      totalReceived,
      totalPending,
      totalCost,
      totalCashBalance,
      totalExpectedProfit,
      worksList: worksWithFin.slice(0, 6),
    };
  }, [works, stockMovements, workHourLogs]);

  const workStatusVariant: Record<WorkStatus, 'warning' | 'success' | 'info' | 'danger' | 'neutral'> = {
    'Em curso': 'warning',
    'Concluída': 'success',
    'Planeada': 'info',
    'Suspensa': 'danger',
    'Cancelada': 'neutral',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Filter & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Painel Principal</span>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              Visão Simplificada
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento central de gastos, inventário, equipa e obras em execução
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
            <Calendar className="h-4 w-4 text-amber-600" />
            <span>Período:</span>
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-amber-500 focus:outline-hidden cursor-pointer"
          >
            <option value="this_month">Este Mês</option>
            <option value="last_month">Mês Anterior</option>
            <option value="this_quarter">Este Trimestre</option>
            <option value="this_year">Este Ano (2026)</option>
            <option value="last_year">Ano Anterior</option>
            <option value="custom">Personalizado</option>
          </select>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-2xs"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-2xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 TOP SUMMARY CARDS (One for each core pillar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. GASTOS */}
        <StatCard
          title="Gastos do Período"
          value={formatCurrency(expensesData.totalGastos)}
          subtext={`${expensesData.items.length} categorias • Materiais & Pessoal`}
          icon={<CreditCard className="h-5 w-5 text-rose-600" />}
          highlight="danger"
        />

        {/* 2. INVENTÁRIO */}
        <StatCard
          title="Valor em Inventário"
          value={formatCurrency(inventoryData.totalStockValue)}
          subtext={`${inventoryData.totalItems} artigos • ${formatNumber(inventoryData.totalUnits, 0)} unidades`}
          icon={<Boxes className="h-5 w-5 text-amber-600" />}
          highlight="default"
        />

        {/* 3. FUNCIONÁRIOS */}
        <StatCard
          title="Horas de Trabalho"
          value={`${formatNumber(workersData.totalHours, 0)} h`}
          subtext={`${workersData.activeWorkers} ativos • ${formatCurrency(workersData.totalLaborCost)} em salários`}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          highlight="primary"
        />

        {/* 4. OBRAS */}
        <StatCard
          title="Obras em Execução"
          value={`${worksData.activeCount} ativas`}
          subtext={`Recebido: ${formatCurrency(worksData.totalReceived)} / Contratado: ${formatCurrency(worksData.totalRevenue)}`}
          icon={<HardHat className="h-5 w-5 text-emerald-600" />}
          highlight="success"
        />
      </div>

      {/* 4 CORE SECTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ============================================================ */}
        {/* PILLAR 1: GASTOS POR CATEGORIA                               */}
        {/* ============================================================ */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Gastos por Categoria</h3>
                  <p className="text-xs text-slate-500">Repartição de custos no período selecionado</p>
                </div>
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('despesas')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <span>Ver Despesas</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Total Expense Highlight */}
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200/70 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total de Gastos no Período
                </span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {formatCurrency(expensesData.totalGastos)}
                </span>
              </div>
              <div className="text-right text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{expensesData.invoicesCount}</span> faturas confirmadas
                <br />
                <span className="font-semibold text-slate-800">{expensesData.expensesCount}</span> despesas gerais
              </div>
            </div>

            {/* Categories List with Progress Bars */}
            <div className="mt-4 space-y-3">
              {expensesData.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum gasto registado no período selecionado.
                </div>
              ) : (
                expensesData.items.map((cat, idx) => {
                  const percent =
                    expensesData.totalGastos > 0
                      ? (cat.amount / expensesData.totalGastos) * 100
                      : 0;

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cat.color}`} />
                          <span className="font-semibold text-slate-800 truncate" title={cat.name}>
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({cat.count} {cat.count === 1 ? 'registo' : 'registos'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(cat.amount)}
                          </span>
                          <span className="font-mono text-[11px] font-medium text-slate-500 w-12 text-right">
                            {percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cat.color} transition-all duration-300`}
                          style={{ width: `${Math.min(100, Math.max(1, percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick link bottom */}
          {onNavigateToTab && (
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Gestão de faturas de compras e despesas gerais</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('faturas')}
                className="font-bold text-slate-700 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
              >
                Faturas Fornecedores →
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* PILLAR 2: INVENTÁRIO                                         */}
        {/* ============================================================ */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Inventário & Materiais</h3>
                  <p className="text-xs text-slate-500">Stock de armazém e valorização de materiais</p>
                </div>
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('inventarios')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                >
                  <span>Ver Inventário</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-amber-50/50 border border-amber-200/80 p-3.5">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Valorização do Stock
                </span>
                <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                  {formatCurrency(inventoryData.totalStockValue)}
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {inventoryData.totalItems} referências registadas
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Unidades em Armazém
                </span>
                <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                  {formatNumber(inventoryData.totalUnits, 0)}
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  total de unidades disponíveis
                </span>
              </div>
            </div>

            {/* Top Materials List */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Principais Artigos em Stock
              </h4>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden text-xs">
                {inventoryData.topMaterials.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">Nenhum artigo registado.</div>
                ) : (
                  inventoryData.topMaterials.map((mat) => {
                    const val = mat.totalValue || mat.quantity * mat.averagePrice || 0;
                    return (
                      <div key={mat.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-800 truncate">{mat.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {mat.category || 'Geral'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900">
                            {formatNumber(mat.quantity, mat.unit === 'un' || mat.unit === 'saco' ? 0 : 2)} {mat.unit}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {formatCurrency(val)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Entradas e saídas para obras automáticas</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('inventarios')}
                className="font-bold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
              >
                Gerir Stock & Movimentos →
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* PILLAR 3: FUNCIONÁRIOS                                       */}
        {/* ============================================================ */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Funcionários & Mão-de-Obra</h3>
                  <p className="text-xs text-slate-500">Horas trabalhadas e custo de pessoal no período</p>
                </div>
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('trabalhadores')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <span>Ver Funcionários</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Equipa Ativa
                </span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {workersData.activeWorkers} / {workersData.totalWorkers}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">colaboradores</span>
              </div>

              <div className="rounded-xl bg-blue-50/60 border border-blue-200/80 p-3 text-center">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  Total Horas
                </span>
                <p className="text-lg font-bold font-mono text-blue-700 mt-0.5">
                  {formatNumber(workersData.totalHours, 0)} h
                </p>
                <span className="text-[10px] text-blue-600 block mt-0.5">no período</span>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Custo Pessoal
                </span>
                <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {formatCurrency(workersData.totalLaborCost)}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  méd: {formatCurrency(workersData.averageHourlyCost)}/h
                </span>
              </div>
            </div>

            {/* Workers List */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Atividade dos Colaboradores
              </h4>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden text-xs">
                {workersData.workerStats.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">Nenhum funcionário registado.</div>
                ) : (
                  workersData.workerStats.slice(0, 5).map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 truncate">{w.name}</span>
                          {!w.isActive && (
                            <Badge variant="neutral" size="sm">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {w.category || 'Colaborador'} • {formatCurrency(w.hourlyRate)}/h
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-800">
                          {formatNumber(w.periodHours, 1)} horas
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {formatCurrency(w.periodCost)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Folha de horas e pagamentos a funcionários</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('trabalhadores')}
                className="font-bold text-blue-700 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
              >
                Registar Horas & Pagamentos →
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* PILLAR 4: OBRAS                                              */}
        {/* ============================================================ */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <HardHat className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Obras & Empreitadas</h3>
                  <p className="text-xs text-slate-500">
                    Controlo financeiro real de recebimentos e custos de obras
                  </p>
                </div>
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('obras')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <span>Ver Obras</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Financial Highlights (Respects rule: strictly registered receipts only) */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Contratado
                </span>
                <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {formatCurrency(worksData.totalRevenue)}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {worksData.totalWorks} obras no total
                </span>
              </div>

              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Já Recebido
                </span>
                <p className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  {formatCurrency(worksData.totalReceived)}
                </p>
                <span className="text-[10px] text-emerald-800 font-medium block mt-0.5">
                  Pendente: {formatCurrency(worksData.totalPending)}
                </span>
              </div>

              <div className="rounded-xl bg-rose-50/60 border border-rose-200 p-3">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Custos Reais Acumulados
                </span>
                <p className="text-base font-bold font-mono text-rose-700 mt-0.5">
                  {formatCurrency(worksData.totalCost)}
                </p>
                <span className="text-[10px] text-rose-600 block mt-0.5">
                  Materiais, horas e diretos
                </span>
              </div>

              <div className={`rounded-xl border p-3 ${
                worksData.totalCashBalance >= 0
                  ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Saldo Real em Caixa
                </span>
                <p className={`text-base font-bold font-mono mt-0.5 ${
                  worksData.totalCashBalance >= 0 ? 'text-blue-700' : 'text-rose-700'
                }`}>
                  {formatCurrency(worksData.totalCashBalance)}
                </p>
                <span className="text-[10px] opacity-80 block mt-0.5">
                  Recebido menos custos
                </span>
              </div>
            </div>

            {/* Works List */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Obras Recentes & Estado
              </h4>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden text-xs">
                {worksData.worksList.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">Nenhuma obra registada.</div>
                ) : (
                  worksData.worksList.map((work) => (
                    <div
                      key={work.id}
                      onClick={() => onOpenWorkDetail ? onOpenWorkDetail(work.id) : onNavigateToTab?.('obras')}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 group-hover:text-amber-600 transition-colors truncate">
                            {work.name}
                          </span>
                          <Badge variant={workStatusVariant[work.status] || 'neutral'} size="sm">
                            {work.status}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {work.clientName}
                          {work.proposalNumber && ` • Orç: ${work.proposalNumber}`}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(work.fin.revenue)}
                        </div>
                        <div className="text-[11px]">
                          <span className="text-emerald-700 font-semibold font-mono">
                            Rec: {formatCurrency(work.fin.receivedTotal)}
                          </span>
                          <span className="text-slate-400 ml-1">
                            ({work.fin.receivedPercent.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Acompanhe orçamentos, materiais e tranches</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('obras')}
                className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
              >
                Abrir Painel de Obras →
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

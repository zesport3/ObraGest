import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  HardHat,
  FileSpreadsheet,
  Users,
  Calendar,
  Percent,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Euro,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeriodFilter } from '../../types';
import {
  calculateDashboardSummary,
  calculateWorkFinancials,
  getDateRange,
} from '../../utils/calculations';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { DoubleBarChart, CategoryBreakdownList } from '../common/SimpleChart';

export const DashboardView: React.FC<{
  onNavigateToTab?: (tab: any) => void;
  onOpenWorkDetail?: (workId: string) => void;
}> = ({ onNavigateToTab, onOpenWorkDetail }) => {
  const {
    invoices,
    generalExpenses,
    works,
    proposals,
    workers,
    workHourLogs,
    stockMovements,
  } = useApp();

  const [period, setPeriod] = useState<PeriodFilter>('this_year');
  const [customStart, setCustomStart] = useState<string>('2026-01-01');
  const [customEnd, setCustomEnd] = useState<string>('2026-12-31');

  // Compute summary for selected period
  const summary = useMemo(() => {
    return calculateDashboardSummary({
      period,
      customStart,
      customEnd,
      invoices,
      generalExpenses,
      works,
      proposals,
      workers,
      workHourLogs,
      stockMovements,
    });
  }, [
    period,
    customStart,
    customEnd,
    invoices,
    generalExpenses,
    works,
    proposals,
    workers,
    workHourLogs,
    stockMovements,
  ]);

  // Data for "Rendimentos vs Gastos" over time
  const monthlyComparisonData = useMemo(() => {
    const months = [
      { num: 0, label: 'Jan' },
      { num: 1, label: 'Fev' },
      { num: 2, label: 'Mar' },
      { num: 3, label: 'Abr' },
      { num: 4, label: 'Mai' },
      { num: 5, label: 'Jun' },
    ];

    const currentYear = 2026;

    return months.map((m) => {
      const monthStart = new Date(currentYear, m.num, 1, 0, 0, 0);
      const monthEnd = new Date(currentYear, m.num + 1, 0, 23, 59, 59);

      // Revenue for month
      const mWorks = works.filter((w) => {
        const d = new Date(w.startDate);
        return d >= monthStart && d <= monthEnd;
      });
      const mRev = mWorks.reduce((acc, w) => acc + (w.revenue || 0), 0);

      // Invoices for month
      const mInv = invoices.filter((i) => {
        const d = new Date(i.date);
        return i.status === 'confirmed' && d >= monthStart && d <= monthEnd;
      });
      const mInvCost = mInv.reduce((acc, i) => acc + i.subtotal, 0);

      // Labor for month
      const mLogs = workHourLogs.filter((l) => {
        const d = new Date(l.date);
        return d >= monthStart && d <= monthEnd;
      });
      const mLaborCost = mLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0);

      // Expenses for month
      const mExp = generalExpenses.filter((e) => {
        const d = new Date(e.date);
        return d >= monthStart && d <= monthEnd;
      });
      const mExpCost = mExp.reduce((acc, e) => acc + e.subtotal, 0);

      const totalMExp = mInvCost + mLaborCost + mExpCost;

      return {
        label: m.label,
        value1: mRev,
        value2: totalMExp,
      };
    });
  }, [works, invoices, workHourLogs, generalExpenses]);

  // Expenses breakdown by category
  const expenseBreakdown = useMemo(() => {
    const range = getDateRange(period, customStart, customEnd);

    const periodInvoices = invoices.filter(
      (i) => i.status === 'confirmed' && new Date(i.date) >= range.start && new Date(i.date) <= range.end
    );
    const periodHourLogs = workHourLogs.filter(
      (l) => new Date(l.date) >= range.start && new Date(l.date) <= range.end
    );
    const periodExpenses = generalExpenses.filter(
      (e) => new Date(e.date) >= range.start && new Date(e.date) <= range.end
    );

    const materialsAmount = periodInvoices.reduce((sum, i) => sum + i.subtotal, 0);
    const laborAmount = periodHourLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);

    const byCat: Record<string, number> = {
      'Materiais de Construção': materialsAmount,
      'Mão-de-Obra (Trabalhadores)': laborAmount,
    };

    periodExpenses.forEach((e) => {
      const cat = e.category || 'Outras Despesas';
      byCat[cat] = (byCat[cat] || 0) + e.subtotal;
    });

    return Object.entries(byCat)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [period, customStart, customEnd, invoices, workHourLogs, generalExpenses]);

  // Work cost vs revenue chart data
  const worksChartData = useMemo(() => {
    return works.slice(0, 6).map((w) => {
      const fin = calculateWorkFinancials(w, stockMovements, workHourLogs);
      return {
        label: w.name.length > 18 ? `${w.name.substring(0, 16)}...` : w.name,
        value1: fin.revenue,
        value2: fin.totalCost,
      };
    });
  }, [works, stockMovements, workHourLogs]);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Period Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Período de Análise</h3>
            <p className="text-xs text-slate-500">
              Filtre todos os indicadores e gráficos financeiros em tempo real
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-amber-500 focus:outline-hidden"
          >
            <option value="this_month">Este mês</option>
            <option value="last_month">Mês anterior</option>
            <option value="this_quarter">Este trimestre</option>
            <option value="last_quarter">Trimestre anterior</option>
            <option value="this_year">Este ano</option>
            <option value="last_year">Ano anterior</option>
            <option value="custom">Personalizado</option>
          </select>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RENDIMENTOS */}
        <StatCard
          title="Rendimentos"
          value={formatCurrency(summary.totalRevenue)}
          subtext="Total de receitas e faturação no período"
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          highlight="success"
        />

        {/* GASTOS */}
        <StatCard
          title="Gastos Totais"
          value={formatCurrency(summary.totalExpenses)}
          subtext="Materiais, trabalhadores e custos gerais"
          icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
          highlight="danger"
        />

        {/* RESULTADO */}
        <StatCard
          title="Resultado Líquido"
          value={formatCurrency(summary.netResult)}
          subtext="Rendimentos menos gastos"
          icon={<Scale className="h-5 w-5 text-blue-600" />}
          highlight={summary.netResult >= 0 ? 'primary' : 'danger'}
        />

        {/* IVA ESTIMADO */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                IVA Estimado
              </p>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {summary.iva.hasIvaCredit
                  ? formatCurrency(summary.iva.ivaCreditAmount)
                  : formatCurrency(summary.iva.ivaEstimadoAPagar)}
              </div>
            </div>
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                summary.iva.hasIvaCredit
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Percent className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            {summary.iva.hasIvaCredit ? (
              <Badge variant="success" size="sm">
                Crédito de IVA a favor
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                IVA estimado a pagar
              </Badge>
            )}
            <span className="text-slate-500 font-mono text-[11px]">
              Liq: {formatCurrency(summary.iva.ivaLiquidado)} | Ded: {formatCurrency(summary.iva.ivaDedutivel)}
            </span>
          </div>
        </div>
      </div>

      {/* Operational KPI Grid: Obras, Orçamentos, Trabalhadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* OBRAS */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <HardHat className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Obras</h4>
            </div>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('obras')}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
              >
                Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <span className="text-[11px] text-slate-500 font-medium">Em Curso</span>
              <p className="text-xl font-bold text-amber-600">{summary.works.activeCount}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <span className="text-[11px] text-slate-500 font-medium">Concluídas</span>
              <p className="text-xl font-bold text-emerald-600">{summary.works.completedCount}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Faturação das Obras:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(summary.works.totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Custo Total das Obras:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(summary.works.totalCost)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-50">
              <span>Resultado das Obras:</span>
              <span className={summary.works.totalResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {formatCurrency(summary.works.totalResult)}
              </span>
            </div>
          </div>
        </div>

        {/* ORÇAMENTOS */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Orçamentos</h4>
            </div>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('orcamentos')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 my-4">
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-slate-500 font-medium block">Emitidos</span>
              <span className="text-lg font-bold text-slate-800">{summary.proposals.issued}</span>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-emerald-700 font-medium block">Aceites</span>
              <span className="text-lg font-bold text-emerald-700">{summary.proposals.accepted}</span>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-amber-700 font-medium block">Pendentes</span>
              <span className="text-lg font-bold text-amber-700">{summary.proposals.pending}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Valor Total Orçamentado:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(summary.proposals.totalValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Taxa de Conversão:</span>
              <span className="font-semibold text-emerald-600">
                {summary.proposals.issued > 0
                  ? `${((summary.proposals.accepted / summary.proposals.issued) * 100).toFixed(0)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* TRABALHADORES */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Trabalhadores</h4>
            </div>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('trabalhadores')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <span className="text-[11px] text-slate-500 font-medium">Equipa Ativa</span>
              <p className="text-xl font-bold text-slate-900">{summary.workers.count} pessoas</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <span className="text-[11px] text-slate-500 font-medium">Horas Trabalhadas</span>
              <p className="text-xl font-bold text-slate-900">{formatNumber(summary.workers.totalHours, 0)} h</p>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Custo Total de Mão-de-Obra:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(summary.workers.totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Custo Médio / Hora:</span>
              <span className="font-semibold text-slate-700">
                {summary.workers.totalHours > 0
                  ? formatCurrency(summary.workers.totalCost / summary.workers.totalHours) + '/h'
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimentos vs Gastos */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Rendimentos vs Gastos (Evolução Mensal)</h4>
              <p className="text-xs text-slate-500">Comparação cronológica das receitas e custos operacionais</p>
            </div>
          </div>
          <DoubleBarChart
            data={monthlyComparisonData}
            label1="Rendimentos"
            label2="Gastos"
            height={200}
          />
        </div>

        {/* Gastos por Categoria */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Gastos por Categoria</h4>
              <p className="text-xs text-slate-500">Repartição de custos no período selecionado</p>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              Total: {formatCurrency(summary.totalExpenses)}
            </span>
          </div>
          <CategoryBreakdownList items={expenseBreakdown} total={summary.totalExpenses} />
        </div>

        {/* Faturação vs Custos por Obra */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Faturação vs Custos por Obra</h4>
              <p className="text-xs text-slate-500">Comparativo financeiro das principais obras ativas</p>
            </div>
          </div>
          <DoubleBarChart
            data={worksChartData}
            label1="Receita Contratada"
            label2="Custo Acumulado"
            height={200}
          />
        </div>

        {/* IVA: Liquidado vs Dedutível */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">IVA Liquidado vs IVA Dedutível</h4>
              <p className="text-xs text-slate-500">Imposto apurado sobre vendas vs imposto suportado em compras</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-4">
              <span className="text-xs font-medium text-emerald-800">IVA Liquidado (Vendas)</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {formatCurrency(summary.iva.ivaLiquidado)}
              </p>
              <span className="text-[11px] text-emerald-600 block mt-1">Taxa normal 23%</span>
            </div>

            <div className="rounded-lg bg-rose-50/60 border border-rose-100 p-4">
              <span className="text-xs font-medium text-rose-800">IVA Dedutível (Compras/Despesas)</span>
              <p className="text-xl font-bold text-rose-700 mt-1">
                {formatCurrency(summary.iva.ivaDedutivel)}
              </p>
              <span className="text-[11px] text-rose-600 block mt-1">
                Compras: {formatCurrency(summary.iva.ivaCompras)} | Despesas: {formatCurrency(summary.iva.ivaDespesas)}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            summary.iva.hasIvaCredit
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">
                {summary.iva.hasIvaCredit ? 'Saldo a Favor: Crédito de IVA' : 'Saldo a Pagar ao Estado'}
              </p>
              <p className="text-xl font-extrabold mt-0.5">
                {summary.iva.hasIvaCredit
                  ? formatCurrency(summary.iva.ivaCreditAmount)
                  : formatCurrency(summary.iva.ivaEstimadoAPagar)}
              </p>
            </div>
            {summary.iva.hasIvaCredit ? (
              <Badge variant="success">Crédito de IVA</Badge>
            ) : (
              <Badge variant="warning">IVA a Pagar</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

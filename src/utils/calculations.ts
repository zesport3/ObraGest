import {
  Invoice,
  GeneralExpense,
  Work,
  Proposal,
  Worker,
  WorkHourLog,
  WorkerPayment,
  StockMovement,
  PeriodFilter,
  QuarterFilter,
} from '../types';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(
  period: PeriodFilter,
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (period) {
    case 'this_month': {
      const start = new Date(year, month, 1, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start, end };
    }
    case 'last_month': {
      const start = new Date(year, month - 1, 1, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59);
      return { start, end };
    }
    case 'this_quarter': {
      const qMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, qMonth, 1, 0, 0, 0);
      const end = new Date(year, qMonth + 3, 0, 23, 59, 59);
      return { start, end };
    }
    case 'last_quarter': {
      const qMonth = Math.floor(month / 3) * 3 - 3;
      const qYear = qMonth < 0 ? year - 1 : year;
      const adjQMonth = (qMonth + 12) % 12;
      const start = new Date(qYear, adjQMonth, 1, 0, 0, 0);
      const end = new Date(qYear, adjQMonth + 3, 0, 23, 59, 59);
      return { start, end };
    }
    case 'this_year': {
      const start = new Date(year, 0, 1, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return { start, end };
    }
    case 'last_year': {
      const start = new Date(year - 1, 0, 1, 0, 0, 0);
      const end = new Date(year - 1, 11, 31, 23, 59, 59);
      return { start, end };
    }
    case 'custom': {
      const start = customStart ? new Date(`${customStart}T00:00:00`) : new Date(year, 0, 1);
      const end = customEnd ? new Date(`${customEnd}T23:59:59`) : new Date();
      return { start, end };
    }
    default:
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59),
      };
  }
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  return d >= range.start && d <= range.end;
}

// Work Cost & Profitability calculations
export function calculateWorkFinancials(
  work: Work,
  stockMovements: StockMovement[],
  workHourLogs: WorkHourLog[]
) {
  // Material costs from movements directed to this work
  const materialMovements = stockMovements.filter(
    (m) => m.workId === work.id && m.type === 'obra'
  );
  const materialCost = materialMovements.reduce(
    (sum, m) => sum + Math.abs(m.totalCost),
    0
  );

  // Worker hours cost for this work
  const workLogs = workHourLogs.filter((l) => l.workId === work.id);
  const laborCost = workLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);
  const laborHours = workLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);

  // Other direct costs
  const otherCostsTotal = (work.otherCosts || []).reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0
  );

  const totalCost = materialCost + laborCost + otherCostsTotal;
  const revenue = Number(work.revenue) || 0;
  const profit = revenue - totalCost;
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    materialCost,
    laborCost,
    laborHours,
    otherCostsTotal,
    totalCost,
    profit,
    marginPercent,
  };
}

// Global Financial Summary for Dashboard
export function calculateDashboardSummary({
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
}: {
  period: PeriodFilter;
  customStart?: string;
  customEnd?: string;
  invoices: Invoice[];
  generalExpenses: GeneralExpense[];
  works: Work[];
  proposals: Proposal[];
  workers: Worker[];
  workHourLogs: WorkHourLog[];
  stockMovements: StockMovement[];
}) {
  const range = getDateRange(period, customStart, customEnd);

  // Filter items in period
  const periodInvoices = invoices.filter(
    (i) => i.status === 'confirmed' && isDateInRange(i.date, range)
  );
  const periodExpenses = generalExpenses.filter((e) =>
    isDateInRange(e.date, range)
  );
  const periodHourLogs = workHourLogs.filter((l) =>
    isDateInRange(l.date, range)
  );
  const periodProposals = proposals.filter((p) =>
    isDateInRange(p.date, range)
  );
  const periodMovements = stockMovements.filter(
    (m) => m.type === 'obra' && isDateInRange(m.date, range)
  );

  // RENDIMENTOS:
  // Revenue from accepted proposals or active/completed works in this period
  // We calculate from works that started or concluded in period, or accepted proposals in period
  const acceptedProposalsInPeriod = periodProposals.filter(
    (p) => p.status === 'Aceite'
  );
  const proposalRevenue = acceptedProposalsInPeriod.reduce(
    (sum, p) => sum + p.subtotal,
    0
  );

  const worksInPeriod = works.filter((w) => isDateInRange(w.startDate, range));
  const workRevenue = worksInPeriod.reduce(
    (sum, w) => sum + (w.revenue || 0),
    0
  );

  // Total company gross revenue (excl. VAT)
  const totalRevenue = workRevenue > 0 ? workRevenue : proposalRevenue;

  // GASTOS:
  // 1. Materiais comprados nas faturas confirmadas do período
  const invoicesMaterialsCost = periodInvoices.reduce(
    (sum, i) => sum + i.subtotal,
    0
  );
  // 2. Custo de mão de obra registado no período
  const laborCost = periodHourLogs.reduce(
    (sum, l) => sum + (l.totalCost || 0),
    0
  );
  // 3. Despesas gerais sem IVA
  const generalExpensesCost = periodExpenses.reduce(
    (sum, e) => sum + e.subtotal,
    0
  );
  // 4. Outros custos de obras no período
  const otherWorkCosts = worksInPeriod.reduce((sum, w) => {
    return (
      sum +
      (w.otherCosts || []).reduce(
        (cSum, c) => cSum + (Number(c.amount) || 0),
        0
      )
    );
  }, 0);

  const totalExpenses =
    invoicesMaterialsCost + laborCost + generalExpensesCost + otherWorkCosts;

  // RESULTADO: Rendimentos - Gastos
  const netResult = totalRevenue - totalExpenses;

  // IVA CALCULATIONS:
  // IVA Liquidado: 23% da faturação/rendimentos da empresa
  const ivaLiquidado = Number((totalRevenue * 0.23).toFixed(2));

  // IVA Dedutível: IVA das compras (faturas) + IVA das despesas gerais
  const ivaCompras = periodInvoices.reduce((sum, i) => sum + i.vatAmount, 0);
  const ivaDespesas = periodExpenses.reduce((sum, e) => sum + e.vatAmount, 0);
  const ivaDedutivel = Number((ivaCompras + ivaDespesas).toFixed(2));

  // IVA a pagar = IVA liquidado - IVA dedutível
  const ivaEstimadoAPagar = Number((ivaLiquidado - ivaDedutivel).toFixed(2));
  const hasIvaCredit = ivaEstimadoAPagar < 0;

  // OBRAS SUMMARY:
  const activeWorksCount = works.filter((w) => w.status === 'Em curso').length;
  const completedWorksCount = works.filter(
    (w) => w.status === 'Concluída'
  ).length;

  let totalWorksCost = 0;
  let totalWorksRevenue = 0;
  works.forEach((w) => {
    const fin = calculateWorkFinancials(w, stockMovements, workHourLogs);
    totalWorksCost += fin.totalCost;
    totalWorksRevenue += fin.revenue;
  });
  const totalWorksResult = totalWorksRevenue - totalWorksCost;

  // ORÇAMENTOS SUMMARY:
  const proposalsIssued = periodProposals.length;
  const proposalsAccepted = periodProposals.filter(
    (p) => p.status === 'Aceite'
  ).length;
  const proposalsPending = periodProposals.filter(
    (p) => p.status === 'Pendente' || p.status === 'Enviado'
  ).length;
  const totalProposalValue = periodProposals.reduce(
    (sum, p) => sum + p.total,
    0
  );

  // TRABALHADORES SUMMARY:
  const activeWorkersCount = workers.filter((w) => w.isActive).length;
  const totalWorkerHours = periodHourLogs.reduce(
    (sum, l) => sum + (l.totalHours || 0),
    0
  );
  const totalWorkerCost = laborCost;

  return {
    totalRevenue,
    totalExpenses,
    netResult,
    iva: {
      ivaLiquidado,
      ivaDedutivel,
      ivaCompras,
      ivaDespesas,
      ivaEstimadoAPagar,
      hasIvaCredit,
      ivaCreditAmount: hasIvaCredit ? Math.abs(ivaEstimadoAPagar) : 0,
    },
    works: {
      activeCount: activeWorksCount,
      completedCount: completedWorksCount,
      totalCost: totalWorksCost,
      totalRevenue: totalWorksRevenue,
      totalResult: totalWorksResult,
    },
    proposals: {
      issued: proposalsIssued,
      accepted: proposalsAccepted,
      pending: proposalsPending,
      totalValue: totalProposalValue,
    },
    workers: {
      count: activeWorkersCount,
      totalHours: totalWorkerHours,
      totalCost: totalWorkerCost,
    },
  };
}

// Quarter specific IVA calculation
export function calculateQuarterlyIva({
  year,
  quarter,
  invoices,
  generalExpenses,
  works,
  proposals,
}: {
  year: number;
  quarter: QuarterFilter;
  invoices: Invoice[];
  generalExpenses: GeneralExpense[];
  works: Work[];
  proposals: Proposal[];
}) {
  let startMonth = 0;
  let endMonth = 2;

  if (quarter === 'Q2') {
    startMonth = 3;
    endMonth = 5;
  } else if (quarter === 'Q3') {
    startMonth = 6;
    endMonth = 8;
  } else if (quarter === 'Q4') {
    startMonth = 9;
    endMonth = 11;
  }

  const start = new Date(year, startMonth, 1, 0, 0, 0);
  const end = new Date(year, endMonth + 1, 0, 23, 59, 59);
  const range = { start, end };

  const qInvoices = invoices.filter(
    (i) => i.status === 'confirmed' && isDateInRange(i.date, range)
  );
  const qExpenses = generalExpenses.filter((e) => isDateInRange(e.date, range));
  const qWorks = works.filter((w) => isDateInRange(w.startDate, range));
  const qProposals = proposals.filter(
    (p) => p.status === 'Aceite' && isDateInRange(p.date, range)
  );

  const workRev = qWorks.reduce((sum, w) => sum + (w.revenue || 0), 0);
  const propRev = qProposals.reduce((sum, p) => sum + p.subtotal, 0);
  const revenue = workRev > 0 ? workRev : propRev;

  const ivaLiquidado = Number((revenue * 0.23).toFixed(2));
  const ivaCompras = Number(
    qInvoices.reduce((sum, i) => sum + i.vatAmount, 0).toFixed(2)
  );
  const ivaDespesas = Number(
    qExpenses.reduce((sum, e) => sum + e.vatAmount, 0).toFixed(2)
  );
  const ivaDedutivel = Number((ivaCompras + ivaDespesas).toFixed(2));
  const ivaEstimadoAPagar = Number((ivaLiquidado - ivaDedutivel).toFixed(2));
  const hasIvaCredit = ivaEstimadoAPagar < 0;

  return {
    quarter,
    year,
    revenue,
    ivaLiquidado,
    ivaCompras,
    ivaDespesas,
    ivaDedutivel,
    ivaEstimadoAPagar,
    hasIvaCredit,
    creditAmount: hasIvaCredit ? Math.abs(ivaEstimadoAPagar) : 0,
  };
}

// Worker balance calculation
export function calculateWorkerBalance(
  workerId: string,
  workHourLogs: WorkHourLog[],
  workerPayments: WorkerPayment[]
) {
  const workerLogs = workHourLogs.filter((l) => l.workerId === workerId);
  const totalHours = workerLogs.reduce(
    (sum, l) => sum + (l.totalHours || 0),
    0
  );
  const totalEarned = workerLogs.reduce(
    (sum, l) => sum + (l.totalCost || 0),
    0
  );

  const workerPays = workerPayments.filter((p) => p.workerId === workerId);
  const totalPaid = workerPays.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balancePending = totalEarned - totalPaid;

  return {
    totalHours,
    totalEarned,
    totalPaid,
    balancePending,
  };
}

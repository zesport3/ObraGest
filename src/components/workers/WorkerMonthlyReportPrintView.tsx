import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Printer,
  ArrowLeft,
  Calendar,
  Users,
  HardHat,
  Download,
  Loader2,
  CalendarCheck,
  AlertCircle,
  Coffee,
  Clock,
  Check,
  FileSpreadsheet,
  User,
} from 'lucide-react';
import { downloadElementAsPdf } from '../../utils/pdfGenerator';

interface WorkerMonthlyReportPrintViewProps {
  onBack: () => void;
  initialYear?: number;
  initialMonth?: number;
  initialWorkerId?: string;
  initialReportMode?: 'geral' | 'individual';
}

export const WorkerMonthlyReportPrintView: React.FC<WorkerMonthlyReportPrintViewProps> = ({
  onBack,
  initialYear,
  initialMonth,
  initialWorkerId,
  initialReportMode = 'geral',
}) => {
  const { workers, workHourLogs, companySettings } = useApp();
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || now.getMonth() + 1); // 1-12
  const [reportType, setReportType] = useState<'geral' | 'individual'>(
    initialReportMode === 'individual' || (initialWorkerId && initialWorkerId !== 'all')
      ? 'individual'
      : 'geral'
  );
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(() => {
    if (initialWorkerId && initialWorkerId !== 'all') return initialWorkerId;
    return workers[0]?.id || '';
  });

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const monthString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthLabel = `${monthNames[selectedMonth - 1]} de ${selectedYear}`;

  // Active individual worker
  const activeWorker = useMemo(() => {
    return workers.find((w) => w.id === selectedWorkerId) || workers[0] || null;
  }, [workers, selectedWorkerId]);

  // Hourly rate for active worker
  const activeHourlyRate = useMemo(() => {
    if (!activeWorker) return 10;
    return activeWorker.hourlyRate !== undefined && activeWorker.hourlyRate > 0
      ? activeWorker.hourlyRate
      : activeWorker.dailyRate
      ? Number((activeWorker.dailyRate / 8).toFixed(2))
      : 10;
  }, [activeWorker]);

  // Filter logs for selected month
  const monthLogs = useMemo(() => {
    return workHourLogs.filter((l) => l.date.startsWith(monthString));
  }, [workHourLogs, monthString]);

  // Map of logs for the active worker: date -> WorkHourLog
  const activeWorkerLogsMap = useMemo(() => {
    const map = new Map<string, (typeof workHourLogs)[0]>();
    if (!activeWorker) return map;
    monthLogs.forEach((l) => {
      if (l.workerId === activeWorker.id) {
        map.set(l.date, l);
      }
    });
    return map;
  }, [activeWorker, monthLogs]);

  // Calendar dates generation for individual calendar map
  const calendarDays = useMemo(() => {
    const y = selectedYear;
    const m = selectedMonth - 1; // 0-indexed
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const daysInMonth = lastDay.getDate();

    // 0 = Sunday, 1 = Monday ... convert to Monday=0, Sunday=6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
    }> = [];

    // Prev month padding
    const prevMonthLastDay = new Date(y, m, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(y, m - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      const dow = prevDate.getDay();
      days.push({
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(y, m, d);
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = dateObj.getDay();
      days.push({
        dateString: dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    // Trailing padding to fill 35 or 42 cells
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(y, m + 1, d);
      const dateStr = nextDate.toISOString().split('T')[0];
      const dow = nextDate.getDay();
      days.push({
        dateString: dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    return days;
  }, [selectedYear, selectedMonth]);

  // Aggregate stats per worker (For the General Report with all workers)
  const allWorkersReport = useMemo(() => {
    return workers.map((w) => {
      const wLogs = monthLogs.filter((l) => l.workerId === w.id);
      const hRate =
        w.hourlyRate !== undefined && w.hourlyRate > 0
          ? w.hourlyRate
          : w.dailyRate
          ? Number((w.dailyRate / 8).toFixed(2))
          : 10;

      let totalHours = 0;
      let daysWorked = 0;
      let daysOff = 0;
      const absencesList: Array<{ date: string; reason: string }> = [];

      wLogs.forEach((l) => {
        if (l.status === 'falta') {
          absencesList.push({
            date: l.date,
            reason: l.absenceReason || 'Falta',
          });
        } else if (l.status === 'folga') {
          daysOff += 1;
        } else if (l.totalHours > 0 || l.status === 'presente' || l.status === 'meio_dia') {
          const h = l.totalHours || (l.status === 'meio_dia' ? 4 : 8);
          totalHours += h;
          daysWorked += 1;
        }
      });

      const totalCost = Number((totalHours * hRate).toFixed(2));

      return {
        worker: w,
        hourlyRate: hRate,
        totalHours,
        daysWorked,
        daysOff,
        absencesList,
        absencesCount: absencesList.length,
        totalCost,
      };
    });
  }, [workers, monthLogs]);

  // Stats for the active individual worker
  const individualStats = useMemo(() => {
    if (!activeWorker) {
      return {
        totalHours: 0,
        daysWorked: 0,
        daysOff: 0,
        absencesCount: 0,
        absencesList: [],
        totalCost: 0,
      };
    }
    const found = allWorkersReport.find((r) => r.worker.id === activeWorker.id);
    return (
      found || {
        totalHours: 0,
        daysWorked: 0,
        daysOff: 0,
        absencesCount: 0,
        absencesList: [],
        totalCost: 0,
      }
    );
  }, [activeWorker, allWorkersReport]);

  // General Report Totals
  const generalTotals = useMemo(() => {
    return {
      totalHours: allWorkersReport.reduce((acc, r) => acc + r.totalHours, 0),
      totalDays: allWorkersReport.reduce((acc, r) => acc + r.daysWorked, 0),
      totalAbsences: allWorkersReport.reduce((acc, r) => acc + r.absencesCount, 0),
      totalDaysOff: allWorkersReport.reduce((acc, r) => acc + r.daysOff, 0),
      totalCost: allWorkersReport.reduce((acc, r) => acc + r.totalCost, 0),
    };
  }, [allWorkersReport]);

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    const filename =
      reportType === 'individual' && activeWorker
        ? `Mapa_Calendario_${activeWorker.name.replace(/\s+/g, '_')}_${monthString}.pdf`
        : `Relatorio_Geral_Funcionarios_${monthString}.pdf`;

    setIsGeneratingPdf(true);

    try {
      if (documentRef.current) {
        await downloadElementAsPdf(documentRef.current, filename, setIsGeneratingPdf);
      }
    } catch (err) {
      console.error('Erro ao transferir PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title =
      reportType === 'individual' && activeWorker
        ? `Mapa_Calendario_${activeWorker.name}_${monthString}`
        : `Relatorio_Geral_Funcionarios_${monthString}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top action & filter bar (hidden on print) */}
      <div className="print:hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar aos Funcionários</span>
          </button>

          <span className="text-slate-300 hidden sm:inline">|</span>

          {/* Report Type Selector Switch */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setReportType('individual')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'individual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              <span>Mapa de Calendário Individual</span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('geral')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'geral'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              <span>Relatório Geral da Equipa</span>
            </button>
          </div>

          {/* Individual Worker Selector (Shown when in individual report mode) */}
          {reportType === 'individual' && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.category}) — {formatCurrency(w.hourlyRate || 10)}/h
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden font-mono"
            >
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Direct PDF Download & Print */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 px-5 py-2.5 text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Transferir documento em formato PDF"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <Download className="h-4 w-4 text-slate-950" />
            )}
            <span>{isGeneratingPdf ? 'A Gerar PDF...' : 'Transferir PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-4 py-2.5 text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Imprimir documento através do navegador"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DOCUMENT SHEET (Screen, Print & PDF Exact 1:1 Rendering) */}
      {/* ========================================================================= */}
      <div
        ref={documentRef}
        id="attendance-report-document"
        className="mx-auto max-w-5xl bg-white p-8 sm:p-10 rounded-2xl shadow-md border border-slate-200 print:border-none print:shadow-none print:p-6 print:m-0 print:max-w-none text-slate-900 space-y-6"
      >
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            {companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Logo"
                className="h-16 w-auto max-h-20 max-w-[160px] object-contain shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
                <HardHat className="h-8 w-8" />
              </div>
            )}
            <div className="space-y-0.5">
              <h1 className="text-lg font-black text-slate-950 uppercase tracking-tight">
                {companySettings.name || 'Empresa de Construção Civil'}
              </h1>
              {companySettings.nif && (
                <p className="text-xs text-slate-600 font-mono">
                  NIF: <strong>{companySettings.nif}</strong>
                  {companySettings.address && ` • ${companySettings.address}`}
                </p>
              )}
              <h2 className="text-sm font-bold text-amber-600">
                {reportType === 'individual'
                  ? 'Mapa Mensal Individual de Calendário & Horas Trabalhadas'
                  : 'Mapa Geral de Assiduidade — Horas Trabalhadas & Faltas da Equipa'}
              </h2>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
            <div className="inline-block bg-slate-950 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider mb-1">
              Mês: {monthLabel}
            </div>
            <p>Emitido em: {new Date().toLocaleDateString('pt-PT')}</p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* REPORT OPTION 1: MAPA DE CALENDÁRIO INDIVIDUAL */}
        {/* ========================================================================= */}
        {reportType === 'individual' && activeWorker && (
          <div className="space-y-6">
            {/* Worker Identification Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Colaborador
                </span>
                <h3 className="text-base font-bold text-slate-950">{activeWorker.name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-slate-800">{activeWorker.category}</span>
                  {activeWorker.nif && <span>NIF: <strong className="font-mono">{activeWorker.nif}</strong></span>}
                  {activeWorker.contact && <span>Contacto: {activeWorker.contact}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Valor por Hora
                  </span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {formatCurrency(activeHourlyRate)}/h
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (Ref. {formatCurrency(activeHourlyRate * 8)}/dia 8h)
                  </span>
                </div>
              </div>
            </div>

            {/* Individual KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Horas Trabalhadas
                </span>
                <span className="text-xl font-black text-emerald-950 font-mono">
                  {individualStats.totalHours}{' '}
                  <span className="text-xs font-semibold text-emerald-700">h</span>
                </span>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                  Dias Trabalhados
                </span>
                <span className="text-xl font-black text-sky-950">
                  {individualStats.daysWorked}{' '}
                  <span className="text-xs font-semibold text-sky-700">dias</span>
                </span>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Faltas no Mês
                </span>
                <span className="text-xl font-black text-rose-950">
                  {individualStats.absencesCount}{' '}
                  <span className="text-xs font-semibold text-rose-700">faltas</span>
                </span>
              </div>

              <div className="rounded-xl border-2 border-slate-900 bg-slate-900 text-white p-3">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Total a Pagar / Custo
                </span>
                <span className="text-xl font-black font-mono text-white">
                  {formatCurrency(individualStats.totalCost)}
                </span>
              </div>
            </div>

            {/* Visual Calendar Grid for the Month */}
            <div className="rounded-xl border-2 border-slate-300 overflow-hidden">
              <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Mapa Visual do Calendário Mensal ({monthLabel})
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {activeWorker.name}
                </span>
              </div>

              {/* Day of week headers */}
              <div className="grid grid-cols-7 border-b border-slate-300 bg-slate-50 text-center text-[11px] font-bold text-slate-700 py-2">
                <div>Segunda</div>
                <div>Terça</div>
                <div>Quarta</div>
                <div>Quinta</div>
                <div>Sexta</div>
                <div className="text-amber-700">Sábado</div>
                <div className="text-amber-700">Domingo</div>
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-50/30 text-xs">
                {calendarDays.map((cell, idx) => {
                  const log = activeWorkerLogsMap.get(cell.dateString);

                  let status: 'presente' | 'meio_dia' | 'falta' | 'folga' | 'none' = 'none';
                  if (log) {
                    if (log.status) {
                      status = log.status;
                    } else if (log.totalHours <= 4 && log.totalHours > 0) {
                      status = 'meio_dia';
                    } else if (log.totalHours > 0) {
                      status = 'presente';
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className={`min-h-[82px] p-1.5 flex flex-col justify-between ${
                        cell.isCurrentMonth
                          ? cell.isWeekend
                            ? 'bg-slate-50/80'
                            : 'bg-white'
                          : 'bg-slate-100/50 text-slate-300'
                      }`}
                    >
                      {/* Day number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center justify-center text-xs font-bold rounded-md h-5 w-5 ${
                            cell.isCurrentMonth
                              ? cell.isWeekend
                                ? 'text-amber-800 font-bold'
                                : 'text-slate-800'
                              : 'text-slate-300'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {cell.isWeekend && cell.isCurrentMonth && status === 'none' && (
                          <span className="text-[9px] text-slate-400 font-medium">Fim de sem.</span>
                        )}
                      </div>

                      {/* Day Attendance Content */}
                      <div className="mt-1 flex-1 flex flex-col justify-center">
                        {status === 'presente' && (
                          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-1 text-emerald-950">
                            <div className="flex items-center justify-between font-black text-[10px]">
                              <span className="flex items-center gap-0.5">
                                <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                                <span>{log?.totalHours || 8}h</span>
                              </span>
                              <span className="font-mono text-emerald-800">
                                {formatCurrency((log?.totalHours || 8) * activeHourlyRate)}
                              </span>
                            </div>
                            {log?.workName && (
                              <div className="text-[9px] text-emerald-700 truncate font-medium">
                                {log.workName}
                              </div>
                            )}
                          </div>
                        )}

                        {status === 'meio_dia' && (
                          <div className="rounded-md border border-sky-300 bg-sky-50 p-1 text-sky-950">
                            <div className="flex items-center justify-between font-black text-[10px]">
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3 text-sky-600" />
                                <span>{log?.totalHours || 4}h</span>
                              </span>
                              <span className="font-mono text-sky-800">
                                {formatCurrency((log?.totalHours || 4) * activeHourlyRate)}
                              </span>
                            </div>
                            {log?.workName && (
                              <div className="text-[9px] text-sky-700 truncate font-medium">
                                {log.workName}
                              </div>
                            )}
                          </div>
                        )}

                        {status === 'falta' && (
                          <div className="rounded-md border border-rose-300 bg-rose-50 p-1 text-rose-900">
                            <div className="flex items-center gap-1 font-bold text-[10px]">
                              <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
                              <span>FALTA (0h)</span>
                            </div>
                            <div className="text-[9px] text-rose-800 truncate font-medium">
                              {log?.absenceReason || 'Sem motivo'}
                            </div>
                          </div>
                        )}

                        {status === 'folga' && (
                          <div className="rounded-md border border-amber-300 bg-amber-50 p-1 text-amber-900">
                            <div className="flex items-center gap-1 font-bold text-[10px]">
                              <Coffee className="h-3 w-3 text-amber-600 shrink-0" />
                              <span>FOLGA (0h)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List of Absences (if any) */}
            {individualStats.absencesList.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>Discriminação de Faltas no Mês ({individualStats.absencesCount})</span>
                </h4>
                <div className="divide-y divide-rose-200">
                  {individualStats.absencesList.map((abs, i) => (
                    <div key={i} className="py-1.5 flex items-center justify-between text-xs text-rose-950">
                      <span className="font-bold">{formatDate(abs.date)}</span>
                      <span className="text-rose-800 font-medium">Motivo: {abs.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures Block */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-slate-700 border-t border-slate-300">
              <div className="space-y-8">
                <p className="font-semibold">Pela Gerência / Direção:</p>
                <div className="border-b border-slate-400 w-3/4"></div>
                <p className="text-[11px] text-slate-500">Assinatura e Carimbo</p>
              </div>

              <div className="space-y-8">
                <p className="font-semibold">O Colaborador ({activeWorker.name}):</p>
                <div className="border-b border-slate-400 w-3/4"></div>
                <p className="text-[11px] text-slate-500">Assinatura</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REPORT OPTION 2: RELATÓRIO GERAL (TODOS OS FUNCIONÁRIOS) */}
        {/* ========================================================================= */}
        {reportType === 'geral' && (
          <div className="space-y-6">
            {/* General Team Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Total da Equipa
                </span>
                <span className="text-xl font-black text-slate-900">
                  {workers.length}{' '}
                  <span className="text-xs font-normal text-slate-500">colaboradores</span>
                </span>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Horas Trabalhadas
                </span>
                <span className="text-xl font-black text-emerald-950 font-mono">
                  {generalTotals.totalHours}{' '}
                  <span className="text-xs font-normal text-emerald-700">horas</span>
                </span>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Total Faltas da Equipa
                </span>
                <span className="text-xl font-black text-rose-950">
                  {generalTotals.totalAbsences}{' '}
                  <span className="text-xs font-normal text-rose-700">faltas</span>
                </span>
              </div>

              <div className="rounded-xl border-2 border-slate-900 bg-slate-900 text-white p-3.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Custo Total da Equipa
                </span>
                <span className="text-xl font-black font-mono text-white">
                  {formatCurrency(generalTotals.totalCost)}
                </span>
              </div>
            </div>

            {/* Consolidated All-Workers Table */}
            <div className="overflow-hidden rounded-xl border-2 border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Funcionário</th>
                    <th className="p-3 text-right">Valor Hora</th>
                    <th className="p-3 text-center bg-emerald-50/80 text-emerald-950">
                      Horas Trabalhadas
                    </th>
                    <th className="p-3 text-center">Dias Trab.</th>
                    <th className="p-3 min-w-[220px]">Faltas Registadas & Motivos</th>
                    <th className="p-3 text-center">Folgas</th>
                    <th className="p-3 text-right">Total Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {allWorkersReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhum funcionário registado.
                      </td>
                    </tr>
                  ) : (
                    allWorkersReport.map((row) => (
                      <tr key={row.worker.id} className="hover:bg-slate-50/70">
                        {/* Worker */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-sm">{row.worker.name}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {row.worker.category}
                          </div>
                          {row.worker.nif && (
                            <div className="text-[10px] font-mono text-slate-400">
                              NIF: {row.worker.nif}
                            </div>
                          )}
                        </td>

                        {/* Hourly Rate */}
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(row.hourlyRate)}/h
                        </td>

                        {/* Worked Hours (Key Request Highlight) */}
                        <td className="p-3 text-center font-black font-mono text-emerald-900 bg-emerald-50/40 text-sm">
                          {row.totalHours} h
                        </td>

                        {/* Days worked */}
                        <td className="p-3 text-center font-bold text-slate-700">
                          {row.daysWorked} dias
                        </td>

                        {/* Absences with reasons (Key Request Highlight) */}
                        <td className="p-3 text-xs">
                          {row.absencesList.length === 0 ? (
                            <span className="text-slate-400 font-normal">— Nenhuma falta</span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                {row.absencesList.length}{' '}
                                {row.absencesList.length === 1 ? 'falta' : 'faltas'}
                              </span>
                              <div className="space-y-0.5 text-[11px]">
                                {row.absencesList.map((abs, i) => (
                                  <div key={i} className="text-rose-900 leading-tight">
                                    <strong>{formatDate(abs.date)}:</strong> {abs.reason}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Days off */}
                        <td className="p-3 text-center font-medium text-slate-600">
                          {row.daysOff > 0 ? row.daysOff : '—'}
                        </td>

                        {/* Total Cost / Pay */}
                        <td className="p-3 text-right font-black font-mono text-slate-900">
                          {formatCurrency(row.totalCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-900 text-xs font-bold text-slate-900">
                  <tr>
                    <td className="p-3" colSpan={2}>
                      TOTAIS DA EQUIPA ({monthLabel})
                    </td>
                    <td className="p-3 text-center font-black font-mono text-sm text-emerald-950 bg-emerald-100/50">
                      {generalTotals.totalHours} horas
                    </td>
                    <td className="p-3 text-center font-bold text-slate-900">
                      {generalTotals.totalDays} dias
                    </td>
                    <td className="p-3 text-rose-900 font-bold">
                      {generalTotals.totalAbsences} faltas registadas
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      {generalTotals.totalDaysOff} folgas
                    </td>
                    <td className="p-3 text-right font-black font-mono text-sm text-slate-950">
                      {formatCurrency(generalTotals.totalCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* General Signatures */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-slate-700 border-t border-slate-300">
              <div className="space-y-8">
                <p className="font-semibold">Responsável pelos Recursos Humanos / Obras:</p>
                <div className="border-b border-slate-400 w-3/4"></div>
                <p className="text-[11px] text-slate-500">Assinatura</p>
              </div>

              <div className="space-y-8">
                <p className="font-semibold">Aprovação da Gerência:</p>
                <div className="border-b border-slate-400 w-3/4"></div>
                <p className="text-[11px] text-slate-500">Assinatura e Data</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';
import {
  Printer,
  Calendar,
  Users,
  HardHat,
  CalendarCheck,
  AlertCircle,
  Coffee,
} from 'lucide-react';

interface WorkerMonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkerMonthlyReportModal: React.FC<WorkerMonthlyReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { workers, workHourLogs, companySettings } = useApp();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');

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

  // Filter logs for selected month
  const monthLogs = useMemo(() => {
    return workHourLogs.filter((l) => l.date.startsWith(monthString));
  }, [workHourLogs, monthString]);

  // Aggregate stats per worker
  const workersReport = useMemo(() => {
    const list =
      selectedWorkerId === 'all'
        ? workers.filter((w) => w.isActive !== false || monthLogs.some((l) => l.workerId === w.id))
        : workers.filter((w) => w.id === selectedWorkerId);

    return list.map((w) => {
      const wLogs = monthLogs.filter((l) => l.workerId === w.id);

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

      return {
        worker: w,
        totalHours,
        daysWorked,
        absencesList,
        absencesCount: absencesList.length,
        daysOff,
      };
    });
  }, [workers, monthLogs, selectedWorkerId]);

  // Global totals for this month
  const totalHoursMonth = workersReport.reduce((acc, r) => acc + r.totalHours, 0);
  const totalDaysMonth = workersReport.reduce((acc, r) => acc + r.daysWorked, 0);
  const totalAbsences = workersReport.reduce((acc, r) => acc + r.absencesCount, 0);
  const totalDaysOff = workersReport.reduce((acc, r) => acc + r.daysOff, 0);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Mapa_Presencas_${monthString}`;
    document.body.style.overflow = 'visible';
    try {
      window.print();
    } catch (err) {
      console.error('Print error:', err);
    }
    setTimeout(() => {
      document.title = originalTitle;
      document.body.style.overflow = 'hidden';
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mapa Mensal de Presenças & Faltas"
      subtitle="Registo discriminado de dias trabalhados, faltas com motivo e folgas"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Filter Controls (Hidden on Print) */}
        <div className="print:hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Select */}
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
            </div>

            {/* Year Select */}
            <div>
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

            {/* Worker Filter */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="all">Todos os Funcionários ({workers.length})</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {!w.isActive ? '(Saída / Histórico)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors shrink-0"
            title="Exportar para PDF ou Imprimir Mapa de Presenças"
          >
            <Printer className="h-4 w-4 text-amber-400" />
            <span>Imprimir / PDF</span>
          </button>
        </div>

        {/* Printable Document Sheet */}
        <div className="bg-white p-2 sm:p-4 rounded-xl print:p-0 print:border-none space-y-6">
          {/* Header on Document */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              {companySettings.logoUrl ? (
                <img
                  src={companySettings.logoUrl}
                  alt="Logo"
                  className="h-14 w-auto max-h-16 max-w-[140px] object-contain shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
                  <HardHat className="h-6 w-6" />
                </div>
              )}
              <div>
                <h2 className="text-base font-black text-slate-950 uppercase tracking-tight">
                  {companySettings.name || 'Empresa de Construção Civil'}
                </h2>
                {companySettings.nif && (
                  <p className="text-xs text-slate-500 font-mono">
                    NIF: {companySettings.nif}
                  </p>
                )}
                <h3 className="text-sm font-bold text-amber-600 mt-0.5">
                  Mapa Mensal de Presenças e Faltas
                </h3>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-600">
              <div className="inline-block bg-slate-950 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase mb-1">
                Mês de Referência: {monthLabel}
              </div>
              <p>Emitido em: {new Date().toLocaleDateString('pt-PT')}</p>
            </div>
          </div>

          {/* Quick Summary KPIs on Document (Sem valores monetários) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center gap-2.5">
              <CalendarCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Horas Trabalhadas
                </span>
                <span className="text-base font-black text-emerald-950 font-mono">
                  {totalHoursMonth}{' '}
                  <span className="text-xs font-normal text-emerald-700">horas</span>
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Total Faltas no Mês
                </span>
                <span className="text-base font-black text-rose-950">
                  {totalAbsences}{' '}
                  <span className="text-xs font-normal text-rose-700">faltas</span>
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 flex items-center gap-2.5">
              <Coffee className="h-5 w-5 text-sky-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                  Total Folgas no Mês
                </span>
                <span className="text-base font-black text-sky-950">
                  {totalDaysOff}{' '}
                  <span className="text-xs font-normal text-sky-700">folgas</span>
                </span>
              </div>
            </div>
          </div>

          {/* Workers Detailed Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Funcionário</th>
                  <th className="p-3 text-center bg-emerald-50 text-emerald-950">Horas Trabalhadas</th>
                  <th className="p-3 text-center">Dias Trabalhados</th>
                  <th className="p-3 min-w-[200px]">Faltas & Motivos</th>
                  <th className="p-3 text-center">Folgas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {workersReport.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Nenhum registo de funcionários encontrado para este mês.
                    </td>
                  </tr>
                ) : (
                  workersReport.map((row) => (
                    <tr key={row.worker.id} className="hover:bg-slate-50/70">
                      {/* Worker info */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{row.worker.name}</div>
                        <div className="text-[10px] text-slate-500">{row.worker.category}</div>
                        {row.worker.nif && (
                          <div className="text-[10px] font-mono text-slate-400">
                            NIF: {row.worker.nif}
                          </div>
                        )}
                      </td>

                      {/* Worked Hours */}
                      <td className="p-3 text-center font-black font-mono text-emerald-900 bg-emerald-50/30 text-sm">
                        {row.totalHours} h
                      </td>

                      {/* Days worked */}
                      <td className="p-3 text-center font-bold text-slate-700">
                        {row.daysWorked} dias
                      </td>

                      {/* Absences with reasons */}
                      <td className="p-3 text-xs">
                        {row.absencesList.length === 0 ? (
                          <span className="text-slate-400 font-normal">— Nenhuma falta</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              {row.absencesList.length}{' '}
                              {row.absencesList.length === 1 ? 'falta' : 'faltas'}
                            </span>
                            <div className="space-y-1 text-[11px]">
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
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-900 text-xs font-bold text-slate-900">
                <tr>
                  <td className="p-3">
                    TOTAIS DO MÊS ({monthLabel})
                  </td>
                  <td className="p-3 text-center font-black font-mono text-sm text-emerald-900 bg-emerald-100/50">
                    {totalHoursMonth} horas
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">
                    {totalDaysMonth} dias
                  </td>
                  <td className="p-3 text-rose-900 font-bold">
                    {totalAbsences} faltas registadas
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">
                    {totalDaysOff} folgas
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Sem assinaturas nem valores monetários */}
        </div>

        {/* Footer Actions */}
        <div className="print:hidden flex justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4 text-amber-400" />
            <span>Imprimir Mapa do Mês</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

import React, { useState, useMemo } from 'react';
import { Worker, WorkHourLog } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  Clock,
  AlertTriangle,
  Coffee,
  HardHat,
  Plus,
  Users,
  Edit2,
  Trash2,
  FileSpreadsheet,
  UserCheck,
  UserX,
} from 'lucide-react';
import { WorkerAttendanceModal } from './WorkerAttendanceModal';
import { WorkerExitModal } from './WorkerExitModal';

interface WorkerAttendanceCalendarProps {
  initialWorkerId?: string;
  onOpenWorkerModal?: (worker?: Worker) => void;
  onOpenReport?: (mode?: 'individual' | 'geral', workerId?: string) => void;
}

export const WorkerAttendanceCalendar: React.FC<WorkerAttendanceCalendarProps> = ({
  initialWorkerId,
  onOpenWorkerModal,
  onOpenReport,
}) => {
  const { workers, workHourLogs, deleteWorker, reactivateWorker } = useApp();

  // Active Worker State
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(() => {
    if (initialWorkerId) return initialWorkerId;
    return workers[0]?.id || '';
  });

  // Current calendar month view
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Modal for editing day attendance
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // Split workers into active and inactive
  const activeWorkers = useMemo(() => workers.filter((w) => w.isActive !== false), [workers]);
  const inactiveWorkers = useMemo(() => workers.filter((w) => w.isActive === false), [workers]);

  // Sync selected worker if empty
  const activeWorker = useMemo(() => {
    return workers.find((w) => w.id === selectedWorkerId) || workers[0] || null;
  }, [workers, selectedWorkerId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const monthName = useMemo(() => {
    const d = new Date(year, month, 1);
    const name = d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [year, month]);

  // Hourly rate for active worker
  const activeHourlyRate = useMemo(() => {
    if (!activeWorker) return 10;
    return activeWorker.hourlyRate !== undefined && activeWorker.hourlyRate > 0
      ? activeWorker.hourlyRate
      : activeWorker.dailyRate
      ? Number((activeWorker.dailyRate / 8).toFixed(2))
      : 10;
  }, [activeWorker]);

  // Calendar dates generation (Monday - Sunday standard)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // 0 = Sunday, 1 = Monday ... convert to Monday=0, Sunday=6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Padding for previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      const dayOfWeek = prevDate.getDay();
      days.push({
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = dateObj.getDay();
      days.push({
        dateString: dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateStr === todayStr,
      });
    }

    // Trailing padding to fill 35 or 42 cells
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = nextDate.toISOString().split('T')[0];
      const dayOfWeek = nextDate.getDay();
      days.push({
        dateString: dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [year, month]);

  // Attendance map for active worker in the displayed month: dateString -> WorkHourLog
  const workerLogsMap = useMemo(() => {
    const map = new Map<string, WorkHourLog>();
    if (!activeWorker) return map;

    workHourLogs.forEach((l) => {
      if (l.workerId === activeWorker.id) {
        map.set(l.date, l);
      }
    });
    return map;
  }, [activeWorker, workHourLogs]);

  // Month Statistics for active worker
  const monthStats = useMemo(() => {
    let totalHoursWorked = 0;
    let daysWorked = 0;
    let absences = 0;
    let daysOff = 0;
    const absenceDetails: Array<{ date: string; reason: string }> = [];

    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    workHourLogs.forEach((l) => {
      if (activeWorker && l.workerId === activeWorker.id && l.date.startsWith(monthPrefix)) {
        if (l.status === 'falta') {
          absences += 1;
          absenceDetails.push({ date: l.date, reason: l.absenceReason || 'Falta' });
        } else if (l.status === 'folga') {
          daysOff += 1;
        } else if (l.totalHours > 0 || l.status === 'presente' || l.status === 'meio_dia') {
          const h = l.totalHours || (l.status === 'meio_dia' ? 4 : 8);
          totalHoursWorked += h;
          daysWorked += 1;
        }
      }
    });

    const totalPay = Number((totalHoursWorked * activeHourlyRate).toFixed(2));

    return {
      totalHoursWorked,
      daysWorked,
      absences,
      daysOff,
      totalPay,
      absenceDetails,
    };
  }, [workHourLogs, activeWorker, year, month, activeHourlyRate]);

  return (
    <div className="space-y-6">
      {/* Top Controls: Worker Selector, Month Navigation & Quick Stats */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Worker Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Selecionar Funcionário
                </span>
                {workers.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium">
                    Nenhum funcionário registado
                  </span>
                ) : (
                  <select
                    value={activeWorker?.id || ''}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="text-sm font-bold text-slate-900 bg-transparent border-none p-0 focus:outline-hidden cursor-pointer"
                  >
                    <optgroup label="Funcionários Ativos">
                      {activeWorkers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.category}) — {formatCurrency(w.hourlyRate || 10)}/h
                        </option>
                      ))}
                    </optgroup>
                    {inactiveWorkers.length > 0 && (
                      <optgroup label="Histórico / Saídos">
                        {inactiveWorkers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} (Saída: {w.exitDate ? formatDate(w.exitDate) : 'Inativo'})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              {activeWorker && (
                <>
                  {!activeWorker.isActive && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 text-[10px] font-bold">
                      Saída: {activeWorker.exitDate ? formatDate(activeWorker.exitDate) : 'Inativo'}
                    </span>
                  )}
                  {onOpenWorkerModal && (
                    <button
                      type="button"
                      onClick={() => onOpenWorkerModal(activeWorker)}
                      className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                      title="Alterar informações do funcionário selecionado"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-amber-600" />
                      <span>Editar</span>
                    </button>
                  )}
                  {!activeWorker.isActive ? (
                    <button
                      type="button"
                      onClick={() => reactivateWorker(activeWorker.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition-colors cursor-pointer"
                      title="Reativar funcionário na escala ativa"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Reativar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsExitModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-2xs transition-colors cursor-pointer"
                      title="Registar saída do funcionário (histórico e custos guardados)"
                    >
                      <UserX className="h-3.5 w-3.5 text-rose-600" />
                      <span>Registar Saída</span>
                    </button>
                  )}
                  {onOpenReport && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenReport('individual', activeWorker.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs transition-colors cursor-pointer"
                        title="Abrir mapa de calendário individual deste funcionário para exportar em PDF ou imprimir"
                      >
                        <CalendarIcon className="h-3.5 w-3.5 text-amber-600" />
                        <span>Mapa Individual (PDF)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenReport('geral')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition-colors cursor-pointer"
                        title="Abrir mapa geral de todos os funcionários com horas e faltas"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Relatório Geral</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {activeWorker && (
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
                <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200">
                  {formatCurrency(activeHourlyRate)} / h
                </span>
                <span className="text-slate-500">
                  (Ref: {formatCurrency(activeHourlyRate * 8)} / dia normal 8h)
                </span>
              </div>
            )}
          </div>

          {/* Month Navigation Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Mês Anterior"
                className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="rounded-lg px-3 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:text-slate-900 transition-colors"
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Mês Seguinte"
                className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs">
              <CalendarIcon className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-black text-slate-900">{monthName}</span>
            </div>
          </div>
        </div>

        {/* Monthly Summary Cards for the Active Worker */}
        {activeWorker && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
            {/* Horas Trabalhadas */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Horas Trabalhadas
              </span>
              <div className="text-lg font-black text-emerald-950 mt-0.5">
                {monthStats.totalHoursWorked}{' '}
                <span className="text-xs font-medium text-emerald-700">horas</span>
              </div>
            </div>

            {/* Dias Trabalhados */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                Dias Trabalhados
              </span>
              <div className="text-lg font-black text-sky-950 mt-0.5">
                {monthStats.daysWorked}{' '}
                <span className="text-xs font-medium text-sky-700">dias</span>
              </div>
            </div>

            {/* Faltas */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                Faltas no Mês
              </span>
              <div className="text-lg font-black text-rose-950 mt-0.5">
                {monthStats.absences}{' '}
                <span className="text-xs font-medium text-rose-700">faltas</span>
              </div>
            </div>

            {/* Folgas */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Folgas no Mês
              </span>
              <div className="text-lg font-black text-amber-950 mt-0.5">
                {monthStats.daysOff}{' '}
                <span className="text-xs font-medium text-amber-700">folgas</span>
              </div>
            </div>

            {/* Valor Hora */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Valor por Hora
              </span>
              <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                {formatCurrency(activeHourlyRate)}/h
              </div>
            </div>

            {/* Total a Pagar no Mês */}
            <div className="rounded-xl border-2 border-slate-900 bg-slate-900 text-white p-3 shadow-xs">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Total a Pagar
              </span>
              <div className="text-lg font-black font-mono mt-0.5">
                {formatCurrency(monthStats.totalPay)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Calendar Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 py-3">
          <div>Segunda</div>
          <div>Terça</div>
          <div>Quarta</div>
          <div>Quinta</div>
          <div>Sexta</div>
          <div className="text-amber-700">Sábado</div>
          <div className="text-amber-700">Domingo</div>
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/50">
          {calendarDays.map((cell, idx) => {
            const log = workerLogsMap.get(cell.dateString);

            // Determine status
            let badgeType: 'presente' | 'meio_dia' | 'falta' | 'folga' | 'none' = 'none';
            if (log) {
              if (log.status) {
                badgeType = log.status;
              } else if (log.totalHours <= 4 && log.totalHours > 0) {
                badgeType = 'meio_dia';
              } else if (log.totalHours > 0) {
                badgeType = 'presente';
              }
            }

            return (
              <div
                key={idx}
                onClick={() => {
                  if (activeWorker) {
                    setEditingDate(cell.dateString);
                  }
                }}
                className={`min-h-[105px] p-2 flex flex-col justify-between transition-all cursor-pointer relative group ${
                  cell.isCurrentMonth
                    ? cell.isWeekend
                      ? 'bg-slate-50/70 hover:bg-amber-50/40'
                      : 'bg-white hover:bg-slate-50'
                    : 'bg-slate-50/40 text-slate-300'
                } ${cell.isToday ? 'ring-2 ring-amber-500 ring-inset z-10' : ''}`}
              >
                {/* Cell Header: Day Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-bold rounded-lg h-6 w-6 ${
                      cell.isToday
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : cell.isCurrentMonth
                        ? cell.isWeekend
                          ? 'text-amber-800'
                          : 'text-slate-800'
                        : 'text-slate-300'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.isToday && (
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      Hoje
                    </span>
                  )}
                </div>

                {/* Status Indicator */}
                <div className="mt-1 flex-1 flex flex-col justify-center">
                  {badgeType === 'presente' && (
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-1.5 text-left text-emerald-900 shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <div className="flex items-center gap-1">
                          <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3] shrink-0" />
                          <span>{log?.totalHours || 8}h</span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-800 font-bold">
                          {formatCurrency((log?.totalHours || 8) * activeHourlyRate)}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-700 truncate mt-0.5 flex items-center gap-1">
                        <HardHat className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {log?.workName || 'Sem obra (Geral)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {badgeType === 'meio_dia' && (
                    <div className="rounded-lg border border-sky-300 bg-sky-50 p-1.5 text-left text-sky-900 shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          <span>{log?.totalHours || 4}h</span>
                        </div>
                        <span className="font-mono text-[10px] text-sky-800 font-bold">
                          {formatCurrency((log?.totalHours || 4) * activeHourlyRate)}
                        </span>
                      </div>
                      <div className="text-[10px] text-sky-700 truncate mt-0.5 flex items-center gap-1">
                        <HardHat className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {log?.workName || 'Sem obra (Geral)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {badgeType === 'falta' && (
                    <div className="rounded-lg border border-rose-300 bg-rose-50 p-1.5 text-left text-rose-900 shadow-2xs">
                      <div className="flex items-center gap-1 font-bold text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>Falta (0h)</span>
                      </div>
                      <div
                        className="text-[10px] text-rose-700 font-medium truncate mt-0.5"
                        title={log?.absenceReason || 'Falta'}
                      >
                        {log?.absenceReason || 'Motivo não indicado'}
                      </div>
                    </div>
                  )}

                  {badgeType === 'folga' && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-1.5 text-left text-amber-900 shadow-2xs">
                      <div className="flex items-center gap-1 font-bold text-[11px]">
                        <Coffee className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Folga (0h)</span>
                      </div>
                      {log?.notes && log.notes !== 'Folga' && (
                        <div className="text-[10px] text-amber-700 truncate mt-0.5">
                          {log.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {badgeType === 'none' && cell.isCurrentMonth && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center py-2 text-[11px] text-slate-400 font-medium">
                      + Registar Horas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-800">Trabalhou (Horas Registadas)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-sky-500"></span>
            <span className="font-semibold text-slate-800">Meio Dia (4h)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500"></span>
            <span className="font-semibold text-slate-800">Falta (com observação/motivo)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500"></span>
            <span className="font-semibold text-slate-800">Folga / Descanso</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          💡 Clique em qualquer dia para registar as horas trabalhadas ou marcar falta com motivo
        </div>
      </div>

      {/* Day Attendance Modal */}
      {editingDate && activeWorker && (
        <WorkerAttendanceModal
          isOpen={!!editingDate}
          onClose={() => setEditingDate(null)}
          worker={activeWorker}
          date={editingDate}
        />
      )}

      {/* Worker Exit / Termination Modal (Preserving History & Costs) */}
      <WorkerExitModal
        worker={activeWorker}
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
      />
    </div>
  );
};

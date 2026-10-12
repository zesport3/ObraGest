import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Phone,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  Coffee,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Worker, AttendanceStatus } from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import { WorkerModal } from './WorkerModal';
import { WorkerAttendanceCalendar } from './WorkerAttendanceCalendar';
import { WorkerAttendanceModal } from './WorkerAttendanceModal';
import { WorkerMonthlyReportModal } from './WorkerMonthlyReportModal';
import { WorkerMonthlyReportPrintView } from './WorkerMonthlyReportPrintView';
import { WorkerExitModal } from './WorkerExitModal';

export const WorkersView: React.FC<{
  onSelectWork?: (workId: string) => void;
}> = ({ onSelectWork }) => {
  const {
    workers,
    works,
    workHourLogs,
    deleteWorker,
    reactivateWorker,
    setWorkerAttendance,
  } = useApp();

  // Primary View Mode: 'calendario' or 'diario'
  const [activeTab, setActiveTab] = useState<'calendario' | 'diario'>('calendario');

  // Selected date for daily list view
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchTerm, setSearchTerm] = useState('');
  const [workerFilter, setWorkerFilter] = useState<'ativos' | 'todos' | 'inativos'>('ativos');

  // Modals state
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportPrintViewOpen, setIsReportPrintViewOpen] = useState(false);
  const [reportMode, setReportMode] = useState<'individual' | 'geral'>('geral');
  const [reportWorkerId, setReportWorkerId] = useState<string>('all');

  // Day Attendance modal for quick edit
  const [attendanceModalWorker, setAttendanceModalWorker] = useState<Worker | null>(null);
  const [attendanceModalDate, setAttendanceModalDate] = useState<string>('');

  // Feedback toast
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  // Date navigation helpers
  const handlePreviousDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(getTodayDateString());
  };

  const formattedDateTitle = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('pt-PT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return selectedDate;
  }, [selectedDate]);

  // Attendance map for selected date: workerId -> WorkHourLog
  const dailyAttendanceMap = useMemo(() => {
    const map = new Map<string, typeof workHourLogs[0]>();
    workHourLogs.forEach((log) => {
      if (log.date === selectedDate) {
        map.set(log.workerId, log);
      }
    });
    return map;
  }, [workHourLogs, selectedDate]);

  const activeCount = useMemo(() => workers.filter((w) => w.isActive !== false).length, [workers]);
  const inactiveCount = useMemo(() => workers.filter((w) => w.isActive === false).length, [workers]);

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        w.name.toLowerCase().includes(term) ||
        w.category.toLowerCase().includes(term) ||
        (w.contact && w.contact.toLowerCase().includes(term)) ||
        (w.nif && w.nif.includes(term));
      if (!matchesSearch) return false;

      const hasAttendanceToday = dailyAttendanceMap.has(w.id);
      const isExited = w.isActive === false || (!!w.exitDate && w.exitDate < selectedDate);

      if (workerFilter === 'ativos') {
        return !isExited || hasAttendanceToday;
      }
      if (workerFilter === 'inativos') {
        return isExited;
      }
      return true; // 'todos'
    });
  }, [workers, searchTerm, workerFilter, dailyAttendanceMap, selectedDate]);

  // Stats for the selected day
  const presentCount = useMemo(() => {
    return workers.filter((w) => {
      const log = dailyAttendanceMap.get(w.id);
      return log && (log.status === 'presente' || log.status === 'meio_dia' || log.totalHours > 0);
    }).length;
  }, [workers, dailyAttendanceMap]);

  // Toggle quick attendance
  const handleSetStatus = (worker: Worker, newStatus: AttendanceStatus | 'remover') => {
    const existing = dailyAttendanceMap.get(worker.id);
    const workId = existing?.workId || undefined;

    if (newStatus === 'falta') {
      // Open modal to specify absence reason
      setAttendanceModalWorker(worker);
      setAttendanceModalDate(selectedDate);
      return;
    }

    setWorkerAttendance({
      date: selectedDate,
      workerId: worker.id,
      status: newStatus,
      workId,
    });

    if (newStatus === 'presente') showFeedback(`${worker.name}: Presente (1 dia)`);
    if (newStatus === 'meio_dia') showFeedback(`${worker.name}: Meio Dia (0.5 dia)`);
    if (newStatus === 'folga') showFeedback(`${worker.name}: Folga`);
    if (newStatus === 'remover') showFeedback(`${worker.name}: Registo limpo`);
  };

  // Change assigned work for a worker on the selected day (Optional work!)
  const handleWorkChange = (workerId: string, newWorkId: string) => {
    const existing = dailyAttendanceMap.get(workerId);
    const currentStatus = (existing?.status as AttendanceStatus) || 'presente';

    setWorkerAttendance({
      date: selectedDate,
      workerId,
      status: currentStatus,
      workId: newWorkId || undefined,
    });
    showFeedback('Obra atualizada');
  };

  // Handle setting exact hours worked
  const handleSetHours = (worker: Worker, hours: number) => {
    const existing = dailyAttendanceMap.get(worker.id);
    const workId = existing?.workId || undefined;

    setWorkerAttendance({
      date: selectedDate,
      workerId: worker.id,
      status: hours === 4 ? 'meio_dia' : 'presente',
      hours,
      workId,
    });
    showFeedback(`${worker.name}: ${hours}h registadas`);
  };

  const handleOpenReport = (mode: 'individual' | 'geral' = 'geral', workerId: string = 'all') => {
    setReportMode(mode);
    setReportWorkerId(workerId);
    setIsReportPrintViewOpen(true);
  };

  // Batch operations
  const handleMarkAllPresent = () => {
    const targetWorkers = workers.filter(
      (w) => w.isActive !== false && (!w.exitDate || w.exitDate >= selectedDate)
    );
    targetWorkers.forEach((w) => {
      setWorkerAttendance({
        date: selectedDate,
        workerId: w.id,
        status: 'presente',
        hours: 8,
      });
    });
    showFeedback(`${targetWorkers.length} funcionários ativos marcados com 8 horas`);
  };

  const handleMarkAllAbsent = () => {
    workers.forEach((w) => {
      setWorkerAttendance({
        date: selectedDate,
        workerId: w.id,
        status: 'remover',
      });
    });
    showFeedback('Todas as presenças deste dia foram limpas');
  };

  // If user opened the full dedicated Monthly Report Print / PDF view
  if (isReportPrintViewOpen) {
    return (
      <WorkerMonthlyReportPrintView
        onBack={() => setIsReportPrintViewOpen(false)}
        initialReportMode={reportMode}
        initialWorkerId={reportWorkerId}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Main Navigation Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Gestão de Funcionários, Horas & Assiduidade
                </h2>
                <p className="text-xs text-slate-500">
                  Registo diário de horas trabalhadas, valor hora, mapa visual de calendário e relatório geral da equipa
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Relatórios (Individual / Geral) & Novo Funcionário */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mapa de Calendário Individual */}
            <button
              type="button"
              onClick={() => handleOpenReport('individual', workers[0]?.id || 'all')}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-2.5 text-xs font-bold text-amber-950 shadow-2xs transition-colors cursor-pointer"
              title="Mapa de calendário mensal com presenças, horas e faltas por colaborador"
            >
              <Calendar className="h-4 w-4 text-amber-600" />
              <span>Mapa Individual (PDF)</span>
            </button>

            {/* Relatório Geral de Todos os Funcionários */}
            <button
              type="button"
              onClick={() => handleOpenReport('geral')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition-colors cursor-pointer"
              title="Relatório geral com todos os colaboradores, total de horas trabalhadas e faltas"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Relatório Geral da Equipa</span>
            </button>

            {/* Novo Funcionário Button */}
            <button
              type="button"
              onClick={() => {
                setEditingWorker(null);
                setIsWorkerModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Novo Funcionário</span>
            </button>
          </div>
        </div>

        {/* View Mode Switcher: Calendário Mensal vs Registo Diário */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/70 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('calendario')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'calendario'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              <span>Calendário de Presenças</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diario')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'diario'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-sky-600" />
              <span>Registo Diário da Equipa</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: CALENDAR VIEW */}
      {activeTab === 'calendario' && (
        <WorkerAttendanceCalendar
          onOpenWorkerModal={(worker) => {
            setEditingWorker(worker || null);
            setIsWorkerModalOpen(true);
          }}
          onOpenReport={(mode, workerId) => handleOpenReport(mode || 'individual', workerId || 'all')}
        />
      )}

      {/* VIEW 2: DAILY REGISTRATION VIEW */}
      {activeTab === 'diario' && (
        <div className="space-y-4">
          {/* Day Navigation Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={handlePreviousDay}
                  title="Dia Anterior"
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="rounded-lg px-3 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:text-slate-900 transition-colors"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={handleNextDay}
                  title="Dia Seguinte"
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden"
                />
              </div>

              <span className="text-xs font-bold text-slate-700 capitalize hidden sm:inline-block">
                {formattedDateTitle}
              </span>
            </div>

            {/* Attendance Counter & Feedback */}
            <div className="flex items-center gap-3">
              {feedbackMsg && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 animate-fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {feedbackMsg}
                </span>
              )}

              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800">
                <span>Presenças no dia:</span>
                <span className="text-emerald-700">
                  {presentCount} de {workers.length}
                </span>
              </div>
            </div>
          </div>

          {/* Control & Batch Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar funcionário por nome, cargo ou contacto..."
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setWorkerFilter('ativos')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    workerFilter === 'ativos'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ativos ({activeCount})
                </button>
                {inactiveCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setWorkerFilter('inativos')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      workerFilter === 'inativos'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Histórico / Saídos ({inactiveCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setWorkerFilter('todos')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    workerFilter === 'todos'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({workers.length})
                </button>
              </div>
            </div>

            {/* Quick batch controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Todos Presentes (8 Horas)</span>
              </button>

              <button
                type="button"
                onClick={handleMarkAllAbsent}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
                <span>Limpar Dia</span>
              </button>
            </div>
          </div>

          {/* Workers Daily Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="p-4">Funcionário</th>
                    <th className="p-4 text-right">Valor / Hora</th>
                    <th className="p-4 text-center">Horas Trabalhadas & Situação</th>
                    <th className="p-4 min-w-[220px]">Obra Onde Participou</th>
                    <th className="p-4 text-right">Custo do Dia</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        Nenhum funcionário registado.
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((worker) => {
                      const dayLog = dailyAttendanceMap.get(worker.id);
                      const hourlyRate =
                        worker.hourlyRate !== undefined && worker.hourlyRate > 0
                          ? worker.hourlyRate
                          : worker.dailyRate
                          ? Number((worker.dailyRate / 8).toFixed(2))
                          : 10;

                      // Status check
                      const currentStatus: AttendanceStatus | 'nenhum' =
                        (dayLog?.status as AttendanceStatus) ||
                        (dayLog && dayLog.totalHours > 4
                          ? 'presente'
                          : dayLog && dayLog.totalHours > 0
                          ? 'meio_dia'
                          : 'nenhum');

                      const currentHours =
                        dayLog && dayLog.totalHours !== undefined
                          ? dayLog.totalHours
                          : currentStatus === 'presente'
                          ? 8
                          : currentStatus === 'meio_dia'
                          ? 4
                          : 0;

                      const assignedWorkId = dayLog?.workId || '';
                      const dayCost = currentHours * hourlyRate;

                      return (
                        <tr
                          key={worker.id}
                          className={`transition-colors ${
                            currentStatus === 'presente'
                              ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                              : currentStatus === 'meio_dia'
                              ? 'bg-sky-50/20 hover:bg-sky-50/40'
                              : currentStatus === 'falta'
                              ? 'bg-rose-50/20 hover:bg-rose-50/40'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Worker details */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200">
                                {worker.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">{worker.name}</span>
                                  {!worker.isActive && (
                                    <span className="rounded bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 text-[10px] font-bold">
                                      Saída: {worker.exitDate ? formatDate(worker.exitDate) : 'Inativo'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                    {worker.category}
                                  </span>
                                  {worker.contact && (
                                    <span className="text-[11px] text-slate-400">
                                      {worker.contact}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Hourly Rate */}
                          <td className="p-4 text-right font-mono font-bold text-slate-800">
                            {formatCurrency(hourlyRate)}/h
                          </td>

                          {/* Status Chooser Buttons */}
                          <td className="p-4 text-center">
                            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1 shadow-2xs">
                              {/* 8 Horas */}
                              <button
                                type="button"
                                onClick={() =>
                                  currentStatus === 'presente' && currentHours === 8
                                    ? handleSetStatus(worker, 'remover')
                                    : handleSetHours(worker, 8)
                                }
                                title="Registar 8 Horas de Trabalho"
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentStatus === 'presente' && currentHours === 8
                                    ? 'bg-emerald-500 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                8h
                              </button>

                              {/* 4 Horas (Meio Dia) */}
                              <button
                                type="button"
                                onClick={() =>
                                  currentStatus === 'meio_dia' || (currentStatus === 'presente' && currentHours === 4)
                                    ? handleSetStatus(worker, 'remover')
                                    : handleSetHours(worker, 4)
                                }
                                title="Registar 4 Horas (Meio Dia)"
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentStatus === 'meio_dia' || (currentStatus === 'presente' && currentHours === 4)
                                    ? 'bg-sky-500 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                4h
                              </button>

                              {/* Falta */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetStatus(
                                    worker,
                                    currentStatus === 'falta' ? 'remover' : 'falta'
                                  )
                                }
                                title="Marcar Falta (com observação/motivo)"
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentStatus === 'falta'
                                    ? 'bg-rose-500 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Falta
                              </button>

                              {/* Folga */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetStatus(
                                    worker,
                                    currentStatus === 'folga' ? 'remover' : 'folga'
                                  )
                                }
                                title="Folga / Descanso"
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentStatus === 'folga'
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Folga
                              </button>

                              {/* Custom hours indicator */}
                              {dayLog && dayLog.totalHours > 0 && dayLog.totalHours !== 8 && dayLog.totalHours !== 4 && (
                                <span className="ml-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px]">
                                  {dayLog.totalHours}h
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Work assignment (Optional!) */}
                          <td className="p-4">
                            {currentStatus === 'presente' || currentStatus === 'meio_dia' ? (
                              <div className="flex items-center gap-2">
                                <HardHat className="h-4 w-4 text-amber-500 shrink-0" />
                                <select
                                  value={assignedWorkId}
                                  onChange={(e) => handleWorkChange(worker.id, e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-amber-500 focus:outline-hidden"
                                >
                                  <option value="">-- Sem obra associada (Geral) --</option>
                                  {works.map((work) => (
                                    <option key={work.id} value={work.id}>
                                      {work.name} ({work.status})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : currentStatus === 'falta' ? (
                              <div
                                onClick={() => {
                                  setAttendanceModalWorker(worker);
                                  setAttendanceModalDate(selectedDate);
                                }}
                                className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-1.5 font-medium cursor-pointer hover:bg-rose-100"
                                title="Clique para alterar observação da falta"
                              >
                                <strong>Motivo da falta:</strong>{' '}
                                {dayLog?.absenceReason || 'Clique para indicar motivo'}
                              </div>
                            ) : currentStatus === 'folga' ? (
                              <span className="text-xs text-amber-700 italic">Folga / Dia de descanso</span>
                            ) : (
                              <span className="text-xs text-slate-300 italic">— Sem registo</span>
                            )}
                          </td>

                          {/* Day Cost */}
                          <td className="p-4 text-right font-mono font-bold text-slate-900">
                            {dayCost > 0 ? formatCurrency(dayCost) : <span className="text-slate-300">0,00 €</span>}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenReport('individual', worker.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title={`Abrir Mapa do Calendário Individual de ${worker.name} (PDF)`}
                              >
                                <Calendar className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttendanceModalWorker(worker);
                                  setAttendanceModalDate(selectedDate);
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Detalhes / Horas deste dia"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWorker(worker);
                                  setIsWorkerModalOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Editar dados do funcionário"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {!worker.isActive ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    reactivateWorker(worker.id);
                                    showFeedback(`${worker.name} reativado na lista ativa`);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Reativar funcionário na lista ativa"
                                >
                                  <UserCheck className="h-4 w-4 text-emerald-600" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingWorker(worker)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Registar saída / Eliminar (guardar histórico e custos)"
                                >
                                  <UserX className="h-4 w-4 text-rose-500" />
                                </button>
                              )}
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
        </div>
      )}

      {/* Worker Edit/Create Modal */}
      <WorkerModal
        worker={editingWorker}
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
      />

      {/* Attendance Detail Modal */}
      {attendanceModalWorker && (
        <WorkerAttendanceModal
          worker={attendanceModalWorker}
          date={attendanceModalDate}
          isOpen={!!attendanceModalWorker}
          onClose={() => {
            setAttendanceModalWorker(null);
            setAttendanceModalDate('');
          }}
        />
      )}

      {/* Monthly Report Modal */}
      <WorkerMonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Worker Exit / Termination Modal (Guarantees History & Costs Retention) */}
      <WorkerExitModal
        worker={deletingWorker}
        isOpen={!!deletingWorker}
        onClose={() => setDeletingWorker(null)}
        onSuccess={(msg) => {
          showFeedback(msg);
          setDeletingWorker(null);
        }}
      />
    </div>
  );
};

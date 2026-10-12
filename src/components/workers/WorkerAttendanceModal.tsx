import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { Worker, AttendanceStatus } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';
import {
  Calendar,
  Check,
  Clock,
  AlertTriangle,
  Coffee,
  Trash2,
  HardHat,
  FileText,
} from 'lucide-react';

interface WorkerAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  date: string; // YYYY-MM-DD
}

export const WorkerAttendanceModal: React.FC<WorkerAttendanceModalProps> = ({
  isOpen,
  onClose,
  worker,
  date,
}) => {
  const { works, workHourLogs, setWorkerAttendance } = useApp();

  const [status, setStatus] = useState<AttendanceStatus>('presente');
  const [hours, setHours] = useState<number>(8);
  const [selectedWorkId, setSelectedWorkId] = useState<string>(''); // empty = sem obra
  const [absenceReason, setAbsenceReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Find existing log for this worker on this date
  useEffect(() => {
    if (worker && date) {
      const existing = workHourLogs.find(
        (l) => l.workerId === worker.id && l.date === date
      );

      if (existing) {
        if (existing.status) {
          setStatus(existing.status);
        } else if (existing.totalHours <= 4 && existing.totalHours > 0) {
          setStatus('meio_dia');
        } else if (existing.totalHours > 0) {
          setStatus('presente');
        } else {
          setStatus('presente');
        }

        setHours(existing.totalHours > 0 ? existing.totalHours : (existing.status === 'meio_dia' ? 4 : 8));
        setSelectedWorkId(existing.workId || '');
        setAbsenceReason(existing.absenceReason || '');
        setNotes(existing.notes || '');
      } else {
        setStatus('presente');
        setHours(8);
        setSelectedWorkId('');
        setAbsenceReason('');
        setNotes('');
      }
    }
  }, [worker, date, workHourLogs, isOpen]);

  if (!worker) return null;

  const hourlyRate =
    worker.hourlyRate !== undefined && worker.hourlyRate > 0
      ? worker.hourlyRate
      : worker.dailyRate
      ? Number((worker.dailyRate / 8).toFixed(2))
      : 10;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const loggedHours = status === 'presente' || status === 'meio_dia' ? hours : 0;

    setWorkerAttendance({
      date,
      workerId: worker.id,
      status,
      hours: loggedHours,
      workId: status === 'presente' || status === 'meio_dia' ? selectedWorkId : undefined,
      absenceReason: status === 'falta' ? absenceReason : undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const handleRemove = () => {
    setWorkerAttendance({
      date,
      workerId: worker.id,
      status: 'remover',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registo de Horas & Presença — ${formatDate(date)}`}
      subtitle={`${worker.name} (${worker.category}) • ${formatCurrency(hourlyRate)}/h`}
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Status Chooser Buttons */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
            Situação no Dia *
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* 1. Presente (Trabalhou) */}
            <button
              type="button"
              onClick={() => {
                setStatus('presente');
                if (hours <= 0) setHours(8);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                status === 'presente'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400/50 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 mb-1">
                <Check className="h-4 w-4 stroke-[3]" />
              </span>
              <span>Trabalhou</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                {status === 'presente' ? `${hours}h (${formatCurrency(hours * hourlyRate)})` : 'Dia Normal (8h)'}
              </span>
            </button>

            {/* 2. Meio Dia Trabalhado (4h) */}
            <button
              type="button"
              onClick={() => {
                setStatus('meio_dia');
                setHours(4);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                status === 'meio_dia'
                  ? 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-400/50 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 mb-1">
                <Clock className="h-4 w-4" />
              </span>
              <span>Meio Dia</span>
              <span className="text-[10px] text-sky-600 font-semibold mt-0.5">
                4.0h ({formatCurrency(4 * hourlyRate)})
              </span>
            </button>

            {/* 3. Falta */}
            <button
              type="button"
              onClick={() => {
                setStatus('falta');
                setHours(0);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                status === 'falta'
                  ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-400/50 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 mb-1">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span>Falta</span>
              <span className="text-[10px] text-rose-600 font-semibold mt-0.5">
                0 horas (Ausência)
              </span>
            </button>

            {/* 4. Folga */}
            <button
              type="button"
              onClick={() => {
                setStatus('folga');
                setHours(0);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                status === 'folga'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/50 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mb-1">
                <Coffee className="h-4 w-4" />
              </span>
              <span>Folga</span>
              <span className="text-[10px] text-amber-600 font-semibold mt-0.5">
                Descanso
              </span>
            </button>
          </div>
        </div>

        {/* Hours input when worked */}
        {(status === 'presente' || status === 'meio_dia') && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Horas Trabalhadas no Dia *</span>
              </label>
              <span className="text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg">
                Valor do Dia: {formatCurrency(hours * hourlyRate)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  required
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-14 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                  horas
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5">
                {[4, 6, 8, 9, 10].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHours(h);
                      if (h === 4) setStatus('meio_dia');
                      else setStatus('presente');
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      hours === h
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>Taxa: {formatCurrency(hourlyRate)}/hora</span>
              <span className="font-semibold text-emerald-700">
                {hours} horas × {formatCurrency(hourlyRate)} = {formatCurrency(hours * hourlyRate)}
              </span>
            </div>
          </div>
        )}

        {/* Work Selector (for Presente & Meio Dia) - Optional Work! */}
        {(status === 'presente' || status === 'meio_dia') && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <HardHat className="h-4 w-4 text-amber-600" />
              <span>Afetação a Obra (Opcional)</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Pode registar a presença sem associar a nenhuma obra (ex: armazém, oficina, manutenção geral)
            </p>

            <select
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="">-- Sem obra associada (Geral / Armazém) --</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.clientName || 'Cliente'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Absence Reason (for Falta) */}
        {status === 'falta' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
            <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>Observação / Motivo da Falta *</span>
            </label>
            <p className="text-[11px] text-rose-700">
              Indique o motivo pelo qual o funcionário faltou para constar no relatório mensal
            </p>

            {/* Quick reason suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Doença / Baixa médica',
                'Consulta médica',
                'Motivo de força maior / Familiar',
                'Assuntos pessoais',
                'Falta injustificada',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setAbsenceReason(reason)}
                  className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>

            <input
              type="text"
              required
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              placeholder="ex: Doença, consulta médica, motivo familiar..."
              className="w-full mt-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
            />
          </div>
        )}

        {/* Additional Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Notas Adicionais (Opcional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alguma nota relevante sobre este dia..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            title="Limpar qualquer registo deste dia"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpar Registo do Dia</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors"
            >
              Guardar Registo
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

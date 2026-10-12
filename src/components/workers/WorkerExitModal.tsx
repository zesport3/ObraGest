import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Worker } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDate, formatCurrency, getTodayDateString } from '../../utils/formatters';
import { ShieldCheck, UserX, AlertTriangle, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface WorkerExitModalProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const WorkerExitModal: React.FC<WorkerExitModalProps> = ({
  worker,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { workHourLogs, workerPayments, deleteWorker } = useApp();

  const [exitDate, setExitDate] = useState<string>(getTodayDateString());
  const [exitReason, setExitReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExitDate(worker?.exitDate || getTodayDateString());
      setExitReason(worker?.exitReason || '');
      setError(null);
    }
  }, [isOpen, worker]);

  if (!worker) return null;

  // Calculate worker history stats
  const workerLogs = workHourLogs.filter((l) => l.workerId === worker.id);
  const workerPaymentsList = workerPayments.filter((p) => p.workerId === worker.id);
  const totalDays = workerLogs.reduce((acc, l) => acc + (l.daysCount ?? (l.totalHours >= 6 ? 1 : l.totalHours > 0 ? 0.5 : 0)), 0);
  const totalLaborCost = workerLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0);
  const hasHistory = workerLogs.length > 0 || workerPaymentsList.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!exitDate) {
      setError('Por favor, indique a data de saída do funcionário.');
      return;
    }

    if (worker.hireDate && exitDate < worker.hireDate) {
      setError(`A data de saída (${formatDate(exitDate)}) não pode ser anterior à data de entrada (${formatDate(worker.hireDate)}).`);
      return;
    }

    // Call deleteWorker with exitDate and reason
    deleteWorker(worker.id, exitDate, exitReason);
    if (onSuccess) {
      onSuccess(`Saída de ${worker.name} registada com sucesso a ${formatDate(exitDate)}. O histórico e custos foram guardados.`);
    }
    onClose();
  };

  const handlePermanentPurge = () => {
    // Only available when the worker has zero logs and zero payments
    deleteWorker(worker.id, undefined, undefined, true);
    if (onSuccess) {
      onSuccess(`Registo de ${worker.name} removido.`);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registar Saída de Funcionário"
      subtitle="O histórico de presenças, pagamentos e custos em obras fica totalmente guardado"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Worker Card summary */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{worker.name}</span>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {worker.category}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                {worker.nif && <span>NIF: <strong className="font-mono text-slate-700">{worker.nif}</strong></span>}
                {worker.hireDate && (
                  <span>Data de Entrada: <strong className="text-slate-700">{formatDate(worker.hireDate)}</strong></span>
                )}
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <UserX className="h-5 w-5" />
            </div>
          </div>

          {/* Associated stats */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
            <div className="bg-white rounded-lg p-2 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Registos de Presença</span>
              <span className="font-bold text-slate-800">{workerLogs.length} registos ({totalDays} dias)</span>
            </div>
            <div className="bg-white rounded-lg p-2 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Custos Imputados a Obras</span>
              <span className="font-bold text-emerald-700 font-mono">{formatCurrency(totalLaborCost)}</span>
            </div>
          </div>
        </div>

        {/* Form Inputs: Exit Date & Reason */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-800 block">
              Data de Saída da Empresa *
            </label>
            <div className="relative mt-1">
              <input
                type="date"
                required
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-2xs focus:border-amber-500 focus:outline-hidden"
              />
              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Data a partir da qual o trabalhador deixou de prestar serviços na empresa.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block">
              Motivo ou Observações de Saída (Opcional)
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                placeholder="ex: Fim de contrato a termo, rescisão por mútuo acordo, reforma..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-amber-500 focus:outline-hidden"
              />
              <FileText className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Protection Guarantee Notice */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Histórico e Custos 100% Preservados</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            Ao registar a saída, o funcionário é desativado da escala ativa diária, mas <strong>todos os custos em obras, dias trabalhados, faltas e pagamentos anteriores permanecem integralmente guardados</strong>. Poderá consultar os relatórios e mapas deste trabalhador a qualquer momento.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div>
            {!hasHistory ? (
              <button
                type="button"
                onClick={handlePermanentPurge}
                className="text-[11px] text-rose-600 hover:text-rose-800 underline font-medium cursor-pointer"
                title="Este funcionário não tem histórico associado e pode ser removido permanentemente"
              >
                Eliminar registo (sem histórico)
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Histórico protegido
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors cursor-pointer"
            >
              <UserX className="h-4 w-4" />
              <span>Confirmar Saída</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

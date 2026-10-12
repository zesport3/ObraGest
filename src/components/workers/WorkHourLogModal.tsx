import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';

interface WorkHourLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWorkerId?: string;
  defaultWorkId?: string;
}

export const WorkHourLogModal: React.FC<WorkHourLogModalProps> = ({
  isOpen,
  onClose,
  defaultWorkerId,
  defaultWorkId,
}) => {
  const { workers, works, addWorkHourLog } = useApp();

  const [workerId, setWorkerId] = useState(defaultWorkerId || '');
  const [workId, setWorkId] = useState(defaultWorkId || '');
  const [date, setDate] = useState(getTodayDateString());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakHours, setBreakHours] = useState<number>(1.0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Auto set worker hourly rate when worker selected
  useEffect(() => {
    setFormError(null);
    if (defaultWorkerId) setWorkerId(defaultWorkerId);
    if (defaultWorkId) setWorkId(defaultWorkId);

    const targetId = defaultWorkerId || workerId;
    if (targetId) {
      const w = workers.find((item) => item.id === targetId);
      if (w) setHourlyRate(w.hourlyRate);
    }
  }, [defaultWorkerId, defaultWorkId, workers, isOpen]);

  const handleWorkerChange = (wId: string) => {
    setWorkerId(wId);
    const w = workers.find((item) => item.id === wId);
    if (w) setHourlyRate(w.hourlyRate);
  };

  // Automatic calculation of worked hours
  const calculateTotalHours = (): number => {
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      const grossHours = totalMinutes / 60;
      const netHours = Math.max(0, grossHours - breakHours);
      return Number(netHours.toFixed(2));
    } catch {
      return 8.0;
    }
  };

  const calculatedHours = calculateTotalHours();
  const calculatedCost = Number((calculatedHours * hourlyRate).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!workerId) {
      setFormError('Selecione o trabalhador.');
      return;
    }
    if (!workId) {
      setFormError('Selecione a obra.');
      return;
    }
    if (calculatedHours <= 0) {
      setFormError('O número de horas trabalhadas deve ser superior a zero.');
      return;
    }

    addWorkHourLog({
      workerId,
      workId,
      date,
      startTime,
      endTime,
      breakHours,
      totalHours: calculatedHours,
      hourlyRate,
      notes,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registar Presença / Horas de Trabalho"
      subtitle="O custo das horas calculadas é imputado automaticamente à obra"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Trabalhador *</label>
            <select
              required
              value={workerId}
              onChange={(e) => handleWorkerChange(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            >
              <option value="">Selecione funcionário...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatCurrency(w.hourlyRate)}/h)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Data de Trabalho *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Obra Associada *</label>
          <select
            required
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium"
          >
            <option value="">Selecione a obra...</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.clientName})
              </option>
            ))}
          </select>
        </div>

        {/* Schedule grid */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Hora Entrada *</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 font-mono text-center"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Hora Saída *</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 font-mono text-center"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Pausa (Horas)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="4"
              value={breakHours}
              onChange={(e) => setBreakHours(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 font-mono text-center"
            />
          </div>
        </div>

        {/* Automatic calculation banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Cálculo Automático de Horas:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {calculatedHours} horas líquidas
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Valor / Hora:</span>
            <span className="font-mono font-semibold text-slate-700">
              {formatCurrency(hourlyRate)} / hora
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 pt-2 font-bold">
            <span className="text-slate-800">Custo Total Imputado à Obra:</span>
            <span className="font-mono text-emerald-700 text-base">
              {formatCurrency(calculatedCost)}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Tarefas Executadas / Notas</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="ex: Assentamento de alvenaria na sala, tubagem de água..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs"
          >
            Registar Presença
          </button>
        </div>
      </form>
    </Modal>
  );
};

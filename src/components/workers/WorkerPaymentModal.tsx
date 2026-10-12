import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/formatters';

interface WorkerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWorkerId?: string;
}

export const WorkerPaymentModal: React.FC<WorkerPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultWorkerId,
}) => {
  const { workers, addWorkerPayment } = useApp();

  const [workerId, setWorkerId] = useState(defaultWorkerId || '');
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Transferência bancária');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!workerId) {
      setFormError('Selecione o trabalhador.');
      return;
    }
    if (amount <= 0) {
      setFormError('Introduza um valor de pagamento superior a zero.');
      return;
    }

    const w = workers.find((item) => item.id === workerId);

    addWorkerPayment({
      workerId,
      workerName: w?.name || 'Trabalhador',
      date,
      amount: Number(amount) || 0,
      paymentMethod,
      notes,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registar Pagamento a Trabalhador"
      subtitle="Liquidação ou adiantamento de vencimentos"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {formError}
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-700 block">Trabalhador *</label>
          <select
            required
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
          >
            <option value="">Selecione o funcionário...</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.category})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Data do Pagamento *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Valor Liquidado (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Método de Pagamento</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
          >
            <option value="Transferência bancária">Transferência bancária</option>
            <option value="Numerário (Dinheiro)">Numerário (Dinheiro)</option>
            <option value="Cheque">Cheque</option>
            <option value="MB Way">MB Way</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Descrição / Recibo</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: Vencimento do mês, adiantamento quinzenal..."
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
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
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            Confirmar Pagamento
          </button>
        </div>
      </form>
    </Modal>
  );
};

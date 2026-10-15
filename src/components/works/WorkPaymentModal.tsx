import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Work, WorkPayment, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';
import { Check, Wallet, FileText, Calendar, CreditCard, AlertCircle } from 'lucide-react';

interface WorkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: Work;
  payment: WorkPayment | null;
}

export const WorkPaymentModal: React.FC<WorkPaymentModalProps> = ({
  isOpen,
  onClose,
  work,
  payment,
}) => {
  const { addWorkPayment, updateWorkPayment } = useApp();

  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transferência');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Compute other received payments excluding this one
  const otherPaymentsTotal = (work.payments || [])
    .filter((p) => (payment ? p.id !== payment.id : true))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingBeforeThis = Math.max(0, work.revenue - otherPaymentsTotal);

  useEffect(() => {
    setFormError(null);
    if (payment) {
      setDate(payment.date);
      setAmount(payment.amount);
      setDescription(payment.description);
      setPaymentMethod(payment.paymentMethod || 'Transferência');
      setReceiptNumber(payment.receiptNumber || '');
      setNotes(payment.notes || '');
    } else {
      setDate(getTodayDateString());
      // Default to pending amount if > 0, else 0
      setAmount(pendingBeforeThis > 0 ? pendingBeforeThis : 0);
      setDescription(
        (work.payments || []).length === 0
          ? 'Adiantamento inicial'
          : `Tranche ${(work.payments || []).length + 1}`
      );
      setPaymentMethod('Transferência');
      setReceiptNumber('');
      setNotes('');
    }
  }, [payment, isOpen, work]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = Number(amount);
    if (!val || val <= 0) {
      setFormError('Por favor introduza um valor recebido válido superior a 0 €.');
      return;
    }

    if (!description.trim()) {
      setFormError('Por favor introduza uma descrição para o recebimento.');
      return;
    }

    if (payment) {
      updateWorkPayment(work.id, payment.id, {
        date,
        amount: val,
        description: description.trim(),
        paymentMethod,
        receiptNumber: receiptNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addWorkPayment(work.id, {
        date,
        amount: val,
        description: description.trim(),
        paymentMethod,
        receiptNumber: receiptNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  const handleApplyPreset = (type: '30' | '50' | 'remaining') => {
    if (type === '30') {
      const val = Number((work.revenue * 0.3).toFixed(2));
      setAmount(val);
      setDescription('Adiantamento 30% na adjudicação');
    } else if (type === '50') {
      const val = Number((work.revenue * 0.5).toFixed(2));
      setAmount(val);
      setDescription('Adiantamento 50% na adjudicação');
    } else if (type === 'remaining') {
      setAmount(Number(pendingBeforeThis.toFixed(2)));
      setDescription('Liquidação do valor restante');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={payment ? 'Editar Recebimento' : 'Registar Recebimento da Obra'}
      subtitle={`Obra: ${work.name} (${work.clientName})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Work Financial Context Info */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Situação Financeira da Obra</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Valores reais recebidos
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Obra
              </span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(work.revenue)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Já Recebido
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {formatCurrency(otherPaymentsTotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Por Receber
              </span>
              <span className="font-mono font-bold text-amber-600">
                {formatCurrency(pendingBeforeThis)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick presets (only if creating a new payment) */}
        {!payment && work.revenue > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] text-slate-500 font-medium">Preenchimento rápido:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('30')}
              className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
            >
              Adiantamento 30% ({formatCurrency(work.revenue * 0.3)})
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('50')}
              className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
            >
              Adiantamento 50% ({formatCurrency(work.revenue * 0.5)})
            </button>
            {pendingBeforeThis > 0 && (
              <button
                type="button"
                onClick={() => handleApplyPreset('remaining')}
                className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors font-medium"
              >
                Restante ({formatCurrency(pendingBeforeThis)})
              </button>
            )}
          </div>
        )}

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
              Valor Recebido (€) *
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
              Data do Recebimento *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Description & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
              Descrição / Finalidade *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Adiantamento 30%, 1ª Tranche alvenarias..."
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="Transferência">Transferência Bancária</option>
              <option value="Numerário">Numerário / Dinheiro</option>
              <option value="Cheque">Cheque</option>
              <option value="MBWay">MBWay</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>

        {/* Receipt number & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block">
              Nº Recibo / Fatura (Opcional)
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="ex: Recibo nº 15/2026"
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block">
              Notas Adicionais (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: Comprovativo bancário recebido por email..."
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>{payment ? 'Guardar Alterações' : 'Registar Recebimento'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

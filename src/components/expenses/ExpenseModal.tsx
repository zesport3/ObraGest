import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { GeneralExpense } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';

interface ExpenseModalProps {
  expense: GeneralExpense | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
}) => {
  const { addGeneralExpense, updateGeneralExpense } = useApp();

  const [date, setDate] = useState(getTodayDateString());
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState('Eletricidade');
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(23);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (expense) {
      setDate(expense.date);
      setSupplier(expense.supplier);
      setCategory(expense.category);
      setDescription(expense.description);
      setSubtotal(expense.subtotal);
      setVatRate(expense.vatRate);
      setNotes(expense.notes || '');
    } else {
      setDate(getTodayDateString());
      setSupplier('');
      setCategory('Combustível');
      setDescription('');
      setSubtotal(0);
      setVatRate(23);
      setNotes('');
    }
  }, [expense, isOpen]);

  const [formError, setFormError] = useState<string | null>(null);

  const vatAmount = Number((subtotal * (vatRate / 100)).toFixed(2));
  const total = Number((subtotal + vatAmount).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!supplier.trim()) {
      setFormError('Introduza o fornecedor ou entidade.');
      return;
    }
    if (subtotal <= 0) {
      setFormError('Introduza um valor sem IVA superior a zero.');
      return;
    }

    const payload = {
      date,
      supplier,
      category,
      description: description || category,
      subtotal: Number(subtotal),
      vatRate,
      vatAmount,
      total,
      notes,
    };

    if (expense) {
      updateGeneralExpense(expense.id, payload);
    } else {
      addGeneralExpense(payload);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? 'Editar Despesa Geral' : 'Registar Nova Despesa Geral'}
      subtitle="Custos operacionais de suporte (renda, eletricidade, combustíveis, seguros, etc.)"
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
            <label className="text-xs font-semibold text-slate-700 block">Data *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Categoria *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="Combustível">Combustível</option>
              <option value="Renda Armazém / Escritório">Renda Armazém / Escritório</option>
              <option value="Eletricidade">Eletricidade</option>
              <option value="Água">Água</option>
              <option value="Telefone & Internet">Telefone & Internet</option>
              <option value="Seguros">Seguros</option>
              <option value="Contabilidade">Contabilidade</option>
              <option value="Software & Informática">Software & Informática</option>
              <option value="Material Escritório">Material Escritório</option>
              <option value="Manutenção Viaturas">Manutenção Viaturas</option>
              <option value="Ferramentas Gerais">Ferramentas Gerais</option>
              <option value="Outras Despesas">Outras Despesas</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Fornecedor / Entidade *</label>
          <input
            type="text"
            required
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="ex: Galp Energia, EDP Comercial, Fidelidade..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Descrição da Despesa</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="ex: Abastecimento furgão de trabalho, seguro de acidentes..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Valor sem IVA (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={subtotal}
              onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Taxa de IVA *</label>
            <select
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-semibold"
            >
              <option value={23}>23% (Normal)</option>
              <option value={13}>13% (Intermédia)</option>
              <option value={6}>6% (Reduzida)</option>
              <option value={0}>0% (Isento CIVA)</option>
            </select>
          </div>
        </div>

        {/* Calculation summary */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Valor sem IVA:</span>
            <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">IVA Dedutível ({vatRate}%):</span>
            <span className="font-mono text-rose-600 font-semibold">{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
            <span className="text-slate-900">Total da Despesa:</span>
            <span className="font-mono text-slate-900 text-sm">{formatCurrency(total)}</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Observações / N.º Documento</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="N.º de fatura, matrícula da carrinha..."
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
            {expense ? 'Guardar Alterações' : 'Registar Despesa'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

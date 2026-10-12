import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Work, Material } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';
import { AlertCircle, Boxes, CheckCircle2 } from 'lucide-react';

interface AssignMaterialModalProps {
  work: Work;
  isOpen: boolean;
  onClose: () => void;
}

export const AssignMaterialModal: React.FC<AssignMaterialModalProps> = ({
  work,
  isOpen,
  onClose,
}) => {
  const { materials, assignMaterialToWork } = useApp();

  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMaterialId) {
      setError('Por favor selecione um material do inventário.');
      return;
    }
    if (quantity <= 0) {
      setError('A quantidade deve ser superior a zero.');
      return;
    }

    const res = assignMaterialToWork(
      work.id,
      selectedMaterialId,
      quantity,
      date,
      note || `Material consumido na obra ${work.name}`
    );

    if (!res.success) {
      setError(res.error || 'Erro ao atribuir material.');
    } else {
      setSelectedMaterialId('');
      setQuantity(1);
      setNote('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Consumir Material do Inventário na Obra"
      subtitle={`Obra: ${work.name} • A quantidade selecionada será abatida no stock`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block">
            Selecionar Material do Inventário *
          </label>
          <select
            required
            value={selectedMaterialId}
            onChange={(e) => {
              setSelectedMaterialId(e.target.value);
              setError(null);
            }}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="">Escolha um material em armazém...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id} disabled={m.quantity <= 0}>
                {m.name} — Disponível: {m.quantity} {m.unit} (Custo médio: {formatCurrency(m.averagePrice)})
                {m.quantity <= 0 ? ' [ESGOTADO]' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedMaterial && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Stock Disponível em Armazém:</span>
              <span className={`font-mono font-bold ${
                selectedMaterial.quantity <= selectedMaterial.minStock ? 'text-rose-600' : 'text-slate-900'
              }`}>
                {selectedMaterial.quantity} {selectedMaterial.unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Preço Médio de Custo:</span>
              <span className="font-mono text-slate-900 font-semibold">
                {formatCurrency(selectedMaterial.averagePrice)} / {selectedMaterial.unit}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-700 font-semibold">Custo Previsto a Imputar à Obra:</span>
              <span className="font-mono text-amber-700 font-bold">
                {formatCurrency(quantity * selectedMaterial.averagePrice)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">
              Quantidade a Utilizar ({selectedMaterial?.unit || 'un'}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Data de Aplicação *</label>
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
          <label className="text-xs font-semibold text-slate-700 block">Observação / Divisão</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="ex: Aplicação na sala, teto falso do corredor..."
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
            Registar Saída e Adicionar à Obra
          </button>
        </div>
      </form>
    </Modal>
  );
};

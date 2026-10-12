import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Material, MovementType } from '../../types';
import { useApp } from '../../context/AppContext';

interface StockAdjustModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  material,
  isOpen,
  onClose,
}) => {
  const { adjustStock, works } = useApp();

  const [type, setType] = useState<MovementType>('ajuste');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAddition, setIsAddition] = useState<boolean>(true);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!material) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError('A quantidade deve ser superior a zero.');
      return;
    }

    const delta = isAddition ? Math.abs(quantity) : -Math.abs(quantity);

    if (!isAddition && Math.abs(delta) > material.quantity) {
      setError(
        `Quantidade indisponível! Stock atual: ${material.quantity} ${material.unit}. A saída pretendida é ${Math.abs(delta)} ${material.unit}.`
      );
      return;
    }

    const success = adjustStock(
      material.id,
      delta,
      type,
      note || `Ajuste manual de stock de ${material.name}`,
      selectedWorkId || undefined
    );

    if (success) {
      onClose();
    } else {
      setError('Não foi possível realizar o movimento.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajuste / Movimento de Stock"
      subtitle={`Material: ${material.name} • Stock Disponível: ${material.quantity} ${material.unit}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Tipo de Movimento</label>
          <select
            value={type}
            onChange={(e) => {
              const val = e.target.value as MovementType;
              setType(val);
              if (val === 'obra') {
                setIsAddition(false);
              } else if (val === 'compra' || val === 'devolucao') {
                setIsAddition(true);
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
          >
            <option value="ajuste">Ajuste de Inventário</option>
            <option value="obra">Saída para Obra</option>
            <option value="compra">Entrada de Compra Direta</option>
            <option value="devolucao">Devolução de Obra ao Armazém</option>
          </select>
        </div>

        {type === 'obra' && (
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Obra Associada *</label>
            <select
              required
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            >
              <option value="">Selecione a obra de destino...</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.clientName})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Sentido do Fluxo</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsAddition(true)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  isAddition
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                + Entrada
              </button>
              <button
                type="button"
                onClick={() => setIsAddition(false)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  !isAddition
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                - Saída
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">
              Quantidade ({material.unit}) *
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
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Justificação / Observação *</label>
          <input
            type="text"
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="ex: Retirada para reparação de roço, contagem física..."
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
          Stock resultante estimado:{' '}
          <strong className="text-slate-900 font-mono">
            {isAddition ? material.quantity + quantity : material.quantity - quantity}{' '}
            {material.unit}
          </strong>
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
            Registar Movimento
          </button>
        </div>
      </form>
    </Modal>
  );
};

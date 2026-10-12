import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Material } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: Material | null;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addMaterial, materials } = useApp();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('un');
  const [quantity, setQuantity] = useState<number>(1);
  const [averagePrice, setAveragePrice] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setUnit('un');
      setQuantity(1);
      setAveragePrice(0);
      setNotes('');
      setFormError(null);
    }
  }, [isOpen]);

  const [formError, setFormError] = useState<string | null>(null);

  const totalValue = Number((quantity * averagePrice).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Por favor introduza o nome do material.');
      return;
    }

    addMaterial({
      code: `MAT-${String(materials.length + 1).padStart(3, '0')}`,
      name: name.trim(),
      category: 'Geral',
      unit: unit || 'un',
      quantity: Number(quantity) || 0,
      minStock: 0,
      averagePrice: Number(averagePrice) || 0,
      notes,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Adição ao Inventário"
      subtitle="Registe o nome do material, a quantidade de entrada em armazém e o valor unitário"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {formError}
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-700 block">Nome do Material *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            placeholder="ex: Cimento Portland 32.5R, Tinta Plástica Branca, Tijolo Furado..."
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-700 block">Quantidade *</label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Unidade</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 text-center"
              placeholder="un, saco..."
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Valor Unitário (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={averagePrice || ''}
            onChange={(e) => setAveragePrice(parseFloat(e.target.value) || 0)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono font-bold"
            placeholder="0,00"
          />
        </div>

        {/* Calculated Total preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Valor Total em Armazém:</span>
          <span className="font-mono text-slate-900 font-bold text-sm">
            {formatCurrency(totalValue)}
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Observações (Opcional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="Fornecedor, prateleira, especificações..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs cursor-pointer"
          >
            Adicionar ao Inventário
          </button>
        </div>
      </form>
    </Modal>
  );
};

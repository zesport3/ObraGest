import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Supplier } from '../../types';
import { useApp } from '../../context/AppContext';
import { Building2, Phone, Mail, MapPin, Hash, Tag, FileText, Trash2 } from 'lucide-react';

interface SupplierModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (created: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { addSupplier, updateSupplier, deleteSupplier } = useApp();

  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Materiais de Construção');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setFormError(null);
    if (supplier) {
      setName(supplier.name || '');
      setNif(supplier.nif || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setCategory(supplier.category || 'Materiais de Construção');
      setNotes(supplier.notes || '');
    } else {
      setName('');
      setNif('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCategory('Materiais de Construção');
      setNotes('');
    }
  }, [supplier, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Por favor introduza o nome ou razão social do fornecedor.');
      return;
    }

    if (supplier) {
      updateSupplier(supplier.id, {
        name: name.trim(),
        nif: nif.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        category: category.trim(),
        notes: notes.trim(),
      });
      onSaved?.({
        ...supplier,
        name: name.trim(),
        nif: nif.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        category: category.trim(),
        notes: notes.trim(),
      });
    } else {
      const created = addSupplier({
        name: name.trim(),
        nif: nif.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        category: category.trim(),
        notes: notes.trim(),
      });
      onSaved?.(created);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      subtitle="Registe os dados comerciais do fornecedor para seleção nas faturas de compra"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {formError}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-amber-600" />
            <span>Nome / Razão Social *</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Cimentos & Argamassas do Norte, Lda."
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-slate-400" />
              <span>NIF</span>
            </label>
            <input
              type="text"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              placeholder="ex: 501 234 567"
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 font-mono focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <span>Ramo / Categoria</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            >
              <option value="Materiais de Construção">Materiais de Construção</option>
              <option value="Cimento & Áridos">Cimento & Áridos</option>
              <option value="Tintas & Vernizes">Tintas & Vernizes</option>
              <option value="Pladur & Isolamentos">Pladur & Isolamentos</option>
              <option value="Canalização & Sanitários">Canalização & Sanitários</option>
              <option value="Eletricidade & Iluminação">Eletricidade & Iluminação</option>
              <option value="Madeiras & Carpintaria">Madeiras & Carpintaria</option>
              <option value="Ferramentas & Maquinaria">Ferramentas & Maquinaria</option>
              <option value="Aluguer de Equipamento">Aluguer de Equipamento</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>Telefone / Contacto</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="210 000 000 / 910 000 000"
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>Email</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="encomendas@fornecedor.pt"
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>Morada Completa</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, N.º, Código Postal, Localidade"
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Notas / Condições Comerciais</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Prazos acordados, descontos habituais, contacto do comercial..."
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            {supplier && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Eliminar Fornecedor</span>
              </button>
            )}
          </div>
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
              {supplier ? 'Guardar Alterações' : 'Criar Fornecedor'}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog for Deleting Supplier */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Eliminar Fornecedor"
        message={`Tem a certeza de que deseja eliminar o fornecedor "${supplier?.name}"?`}
        confirmText="Eliminar Fornecedor"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (supplier) {
            deleteSupplier(supplier.id);
            setIsConfirmDeleteOpen(false);
            onClose();
          }
        }}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </Modal>
  );
};

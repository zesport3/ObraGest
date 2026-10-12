import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Proposal, ProposalStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { User, FileText, CheckCircle, Calculator, Trash2 } from 'lucide-react';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';

interface ProposalEditorModalProps {
  proposal: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (p: Proposal) => void;
}

export const ProposalEditorModal: React.FC<ProposalEditorModalProps> = ({
  proposal,
  isOpen,
  onClose,
  onSaved,
}) => {
  const {
    getNextProposalNumber,
    addProposal,
    updateProposal,
    deleteProposal,
    companySettings,
  } = useApp();

  const [number, setNumber] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [validUntil, setValidUntil] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientNif, setClientNif] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // 1. Quadro branco para descrição do orçamento
  const [description, setDescription] = useState('');

  // 2. Quadro branco para condições de pagamento
  const [paymentTerms, setPaymentTerms] = useState('');

  // 3. Valor do orçamento e taxa de IVA
  const [amount, setAmount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(23);

  const [status, setStatus] = useState<ProposalStatus>('Pendente');
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setFormError(null);
    if (proposal) {
      setNumber(proposal.number);
      setDate(proposal.date);
      setValidUntil(proposal.validUntil);
      setClientId(proposal.clientId || '');
      setClientName(proposal.clientName);
      setClientNif(proposal.clientNif || '');
      setClientAddress(proposal.clientAddress || '');
      setClientPhone(proposal.clientPhone || '');
      setClientEmail(proposal.clientEmail || '');
      setDescription(proposal.description || '');
      setPaymentTerms(proposal.paymentTerms || '');
      setAmount(proposal.subtotal || 0);

      // Extract vat rate from items or default to 23
      const firstItemVat = proposal.items?.[0]?.vatRate;
      setVatRate(firstItemVat !== undefined ? firstItemVat : 23);
      setStatus(proposal.status);
    } else {
      const nextNum = getNextProposalNumber();
      setNumber(nextNum);
      const today = getTodayDateString();
      setDate(today);

      const d = new Date();
      d.setDate(d.getDate() + 30);
      setValidUntil(d.toISOString().split('T')[0]);

      setClientId('');
      setClientName('');
      setClientNif('');
      setClientAddress('');
      setClientPhone('');
      setClientEmail('');
      setDescription('');
      setPaymentTerms('');
      setAmount(0);
      setVatRate(companySettings.defaultVatRate || 23);
      setStatus('Pendente');
    }
  }, [proposal, isOpen, companySettings]);

  // Calculations
  const subtotal = Number(amount) || 0;
  const vatTotal = Number((subtotal * (vatRate / 100)).toFixed(2));
  const finalTotal = Number((subtotal + vatTotal).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim()) {
      setFormError('Por favor introduza o nome do cliente.');
      return;
    }
    if (!description.trim()) {
      setFormError('Por favor introduza a descrição do orçamento no quadro.');
      return;
    }
    if (subtotal <= 0) {
      setFormError('Por favor introduza um valor superior a zero para o orçamento.');
      return;
    }

    // Clean single item representing the works description for compatibility
    const singleItem = [
      {
        id: `item-${Date.now()}`,
        description: description.substring(0, 150),
        quantity: 1,
        unit: 'vg',
        unitPrice: subtotal,
        discount: 0,
        vatRate,
        total: subtotal,
      },
    ];

    const payload = {
      number,
      date,
      validUntil,
      clientId: clientId || `cli-${Date.now()}`,
      clientName,
      clientNif,
      clientAddress,
      clientPhone,
      clientEmail,
      description,
      paymentTerms,
      notes: '',
      status,
      items: singleItem,
      subtotal,
      discountTotal: 0,
      vatTotal,
      total: finalTotal,
    };

    let savedResult: Proposal;
    if (proposal) {
      updateProposal(proposal.id, payload);
      savedResult = { ...proposal, ...payload };
    } else {
      savedResult = addProposal(payload);
    }

    if (onSaved) onSaved(savedResult);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={proposal ? `Editar Orçamento ${proposal.number}` : `Novo Orçamento: ${number}`}
      subtitle="Preencha a descrição, condições de pagamento e valor com IVA"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {formError}
          </div>
        )}

        {/* Header Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block">Número *</label>
            <input
              type="text"
              required
              readOnly={!!proposal}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block">Data de Emissão *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block">Validade *</label>
            <input
              type="date"
              required
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Client Details */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-500" />
              Dados do Cliente
            </h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block">Nome do Cliente *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                placeholder="ex: Dr. João Ferreira..."
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block">NIF</label>
              <input
                type="text"
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono"
                placeholder="ex: 215 678 901"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block">Telefone</label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                placeholder="912 345 678"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block">Morada da Obra / Local</label>
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                placeholder="Rua, número, localidade..."
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block">Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                placeholder="cliente@email.pt"
              />
            </div>
          </div>
        </div>

        {/* 1. QUADRO BRANCO PARA DESCRIÇÃO DO ORÇAMENTO */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Descrição do Orçamento *
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs text-slate-900 leading-relaxed focus:border-amber-500 focus:outline-hidden"
            placeholder="Escreva aqui a descrição completa dos trabalhos a realizar, materiais incluídos, fases da obra, intervenções em alvenaria, pintura, canalização, eletricidade, etc."
          />
        </div>

        {/* 2. QUADRO BRANCO PARA CONDIÇÕES DE PAGAMENTO */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Condições de Pagamento
          </label>
          <textarea
            rows={3}
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs text-slate-900 leading-relaxed focus:border-amber-500 focus:outline-hidden"
            placeholder="Exemplo: 50% na adjudicação, 50% na conclusão da obra. Ou 30% adjudicação, 40% durante os trabalhos e 30% conclusão."
          />
        </div>

        {/* 3. VALOR E TAXA DE IVA */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block">
                Valor do Orçamento (€ sem IVA) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block">
                Taxa de IVA *
              </label>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
              >
                <option value={23}>23% (Taxa Normal)</option>
                <option value={13}>13% (Taxa Intermédia)</option>
                <option value={6}>6% (Taxa Reduzida - Reabilitação Urbana)</option>
                <option value={0}>0% (Isento)</option>
              </select>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 rounded-xl bg-slate-900 p-4 text-white">
            <div className="text-xs text-slate-400">
              {status === 'Aceite' ? (
                <span className="text-emerald-400 font-semibold">
                  ✓ Orçamento Aceite: Poderá gerar a respetiva Obra com 1 clique!
                </span>
              ) : (
                'O valor do IVA e total são calculados automaticamente.'
              )}
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Valor Base</span>
                <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">IVA ({vatRate}%)</span>
                <span className="text-sm font-semibold text-rose-300">{formatCurrency(vatTotal)}</span>
              </div>
              <div className="border-l border-slate-700 pl-6">
                <span className="text-[10px] uppercase text-amber-400 font-bold block">Valor Total</span>
                <span className="text-xl font-extrabold text-white">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div>
            {proposal && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Eliminar Orçamento</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors"
            >
              {proposal ? 'Guardar Alterações' : 'Emitir Orçamento'}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog for Deleting Proposal */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Eliminar Orçamento"
        message={`Tem a certeza de que deseja eliminar o orçamento ${proposal?.number} (${proposal?.clientName})? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar Orçamento"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (proposal) {
            deleteProposal(proposal.id);
            setIsConfirmDeleteOpen(false);
            onClose();
          }
        }}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </Modal>
  );
};

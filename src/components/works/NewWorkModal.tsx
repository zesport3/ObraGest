import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Work, WorkStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/formatters';
import { Trash2, AlertCircle, ArrowRight, HardHat } from 'lucide-react';

interface NewWorkModalProps {
  work: Work | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (w: Work) => void;
  onOpenExistingWork?: (workId: string) => void;
}

export const NewWorkModal: React.FC<NewWorkModalProps> = ({
  work,
  isOpen,
  onClose,
  onSaved,
  onOpenExistingWork,
}) => {
  const { addWork, updateWork, deleteWork, proposals, works } = useApp();

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [estimatedEndDate, setEstimatedEndDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [status, setStatus] = useState<WorkStatus>('Em curso');
  const [proposalId, setProposalId] = useState('');
  const [revenue, setRevenue] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Check if selected proposal already has an existing work (strict 1:1 relationship)
  const existingAssociatedWork = proposalId
    ? works.find(
        (w) =>
          (w.proposalId === proposalId ||
            (proposals.find((p) => p.id === proposalId)?.workId &&
              w.id === proposals.find((p) => p.id === proposalId)?.workId)) &&
          w.id !== work?.id
      )
    : null;

  useEffect(() => {
    setFormError(null);
    if (work) {
      setName(work.name);
      setClientId(work.clientId);
      setClientName(work.clientName);
      setAddress(work.address);
      setStartDate(work.startDate);
      setEstimatedEndDate(work.estimatedEndDate);
      setCompletionDate(work.completionDate || '');
      setStatus(work.status);
      setProposalId(work.proposalId || '');
      setRevenue(work.revenue);
      setNotes(work.notes || '');
    } else {
      setName('');
      setClientId('');
      setClientName('');
      setAddress('');
      setStartDate(getTodayDateString());

      const d = new Date();
      d.setDate(d.getDate() + 60);
      setEstimatedEndDate(d.toISOString().split('T')[0]);
      setCompletionDate('');
      setStatus('Em curso');
      setProposalId('');
      setRevenue(0);
      setNotes('');
    }
  }, [work, isOpen]);

  // When picking proposal, autofill client, revenue, description
  const handleProposalSelect = (pId: string) => {
    setProposalId(pId);
    const prop = proposals.find((p) => p.id === pId);
    if (prop) {
      setClientId(prop.clientId);
      setClientName(prop.clientName);
      setAddress(prop.clientAddress || '');
      setRevenue(prop.subtotal);
      if (!name) setName(prop.description || `Obra ${prop.clientName}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Introduza o nome da obra.');
      return;
    }
    if (!clientName.trim()) {
      setFormError('Introduza o nome do cliente.');
      return;
    }

    if (existingAssociatedWork) {
      setFormError(
        `Este orçamento já tem a obra "${existingAssociatedWork.name}" associada. Só é permitido ter uma obra para cada orçamento.`
      );
      return;
    }

    const payload = {
      name,
      clientId: clientId || `cli-${Date.now()}`,
      clientName,
      address,
      startDate,
      estimatedEndDate,
      completionDate: completionDate || undefined,
      status,
      proposalId: proposalId || undefined,
      proposalNumber: proposals.find((p) => p.id === proposalId)?.number,
      revenue: Number(revenue) || 0,
      notes,
      otherCosts: work ? work.otherCosts : [],
      payments: work ? (work.payments || []) : [],
    };

    let savedResult: Work;
    if (work) {
      updateWork(work.id, payload);
      savedResult = { ...work, ...payload };
    } else {
      savedResult = addWork(payload);
    }

    if (onSaved) onSaved(savedResult);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={work ? 'Editar Obra' : 'Criar Nova Obra'}
      subtitle="Defina o cliente, prazos, valor contratado e endereço dos trabalhos"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {formError}
          </div>
        )}

        {/* Proposal Link */}
        {!work && proposals.length > 0 && (
          <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 text-xs text-amber-950">
            <label className="font-bold block mb-1">Associar a Orçamento Aceite / Existente (Opcional):</label>
            <select
              value={proposalId}
              onChange={(e) => handleProposalSelect(e.target.value)}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            >
              <option value="">Nenhum (Criar obra avulsa)</option>
              {proposals.map((p) => {
                const workAlready = works.find(
                  (w) => w.proposalId === p.id || (p.workId && w.id === p.workId)
                );
                return (
                  <option key={p.id} value={p.id}>
                    {p.number} — {p.clientName} ({p.total.toFixed(2)} €)
                    {workAlready ? ` (⚠️ Já tem obra: ${workAlready.name})` : ''}
                  </option>
                );
              })}
            </select>

            {/* If selected proposal already has an existing work: Warning & Direct navigation */}
            {existingAssociatedWork && (
              <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-950">
                      Este orçamento já tem a obra &quot;{existingAssociatedWork.name}&quot; associada!
                    </p>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Só é permitido abrir uma única obra para cada orçamento. A criação de nova obra para este orçamento está bloqueada.
                    </p>
                  </div>
                </div>
                {onOpenExistingWork && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenExistingWork(existingAssociatedWork.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors shrink-0 cursor-pointer"
                    title={`Abrir o painel da obra ${existingAssociatedWork.name}`}
                  >
                    <HardHat className="h-4 w-4" />
                    <span>Ir para a Obra</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Nome / Título da Obra *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="ex: Remodelação Apartamento T3 - Av. Liberdade"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Cliente *</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              placeholder="Nome do cliente"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">
              Valor Contratado da Obra (€ sem IVA) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={revenue}
              onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-bold"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Valor total adjudicado. O sistema não assume recebimento antecipado: indique os valores já recebidos (adiantamentos e tranches) na ficha da obra.
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Morada da Obra / Localização</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="Rua, N.º, Andar, Localidade"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Data de Início *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Conclusão Prevista *</label>
            <input
              type="date"
              required
              value={estimatedEndDate}
              onChange={(e) => setEstimatedEndDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Estado da Obra *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkStatus)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="Planeada">Planeada</option>
              <option value="Em curso">Em curso</option>
              <option value="Suspensa">Suspensa</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {status === 'Concluída' && (
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Data Real de Conclusão</label>
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block">Observações e Notas</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
            placeholder="Detalhes sobre acessos, alvarás, contactos no local..."
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div>
            {work && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Eliminar Obra</span>
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
              disabled={!!existingAssociatedWork}
              className={`rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                existingAssociatedWork
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs cursor-pointer'
              }`}
              title={existingAssociatedWork ? `Este orçamento já tem a obra "${existingAssociatedWork.name}" associada.` : undefined}
            >
              {work ? 'Guardar Alterações' : existingAssociatedWork ? 'Obra Já Aberta (Bloqueado)' : 'Criar Obra'}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog for Deleting Work */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Eliminar Obra"
        message={`Tem a certeza de que deseja eliminar a obra "${work?.name}"? Esta ação removerá os custos e registos desta obra.`}
        confirmText="Eliminar Obra"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (work) {
            deleteWork(work.id);
            setIsConfirmDeleteOpen(false);
            onClose();
          }
        }}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </Modal>
  );
};

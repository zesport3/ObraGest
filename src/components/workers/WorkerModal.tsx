import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Worker } from '../../types';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/formatters';
import { UserX, LogOut } from 'lucide-react';
import { WorkerExitModal } from './WorkerExitModal';

interface WorkerModalProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WorkerModal: React.FC<WorkerModalProps> = ({
  worker,
  isOpen,
  onClose,
}) => {
  const { addWorker, updateWorker } = useApp();

  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('Pedreiro de 1.ª');
  const [hireDate, setHireDate] = useState(getTodayDateString());
  const [exitDate, setExitDate] = useState<string>('');
  const [exitReason, setExitReason] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<number>(10);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  useEffect(() => {
    if (worker) {
      setName(worker.name);
      setNif(worker.nif);
      setContact(worker.contact);
      setCategory(worker.category);
      setHireDate(worker.hireDate);
      setExitDate(worker.exitDate || '');
      setExitReason(worker.exitReason || '');
      setHourlyRate(
        worker.hourlyRate !== undefined && worker.hourlyRate > 0
          ? worker.hourlyRate
          : worker.dailyRate
          ? Number((worker.dailyRate / 8).toFixed(2))
          : 10
      );
      setNotes(worker.notes || '');
      setIsActive(worker.isActive);
    } else {
      setName('');
      setNif('');
      setContact('');
      setCategory('');
      setHireDate(getTodayDateString());
      setExitDate('');
      setExitReason('');
      setHourlyRate(10);
      setNotes('');
      setIsActive(true);
    }
  }, [worker, isOpen]);

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Introduza o nome do trabalhador.');
      return;
    }

    const hRate = Number(hourlyRate) || 0;
    const dRate = Number((hRate * 8).toFixed(2));

    if (worker) {
      updateWorker(worker.id, {
        name,
        nif,
        contact,
        category,
        hireDate,
        exitDate: isActive ? undefined : (exitDate || getTodayDateString()),
        exitReason: isActive ? undefined : exitReason,
        dailyRate: dRate,
        hourlyRate: hRate,
        notes,
        isActive,
      });
    } else {
      addWorker({
        name,
        nif,
        contact,
        category,
        hireDate,
        exitDate: isActive ? undefined : (exitDate || undefined),
        exitReason: isActive ? undefined : exitReason,
        dailyRate: dRate,
        hourlyRate: hRate,
        notes,
        isActive,
      });
    }
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={worker ? 'Editar Trabalhador' : 'Registar Novo Trabalhador'}
        subtitle="Defina os dados profissionais e o valor por hora de trabalho"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Nome Completo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              placeholder="ex: António Manuel Ferreira"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">NIF</label>
              <input
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono"
                placeholder="ex: 215 487 963"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Contacto Telefónico</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                placeholder="912 345 678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Função / Categoria *</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium"
                placeholder="ex: Pedreiro, Pintor, Eletricista, Ajudante..."
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Valor por Hora (€/h) *</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 pr-12 text-xs text-slate-800 font-mono font-bold"
                  placeholder="ex: 10.00"
                />
                <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">
                  €/h
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Ref. dia normal (8h): {((Number(hourlyRate) || 0) * 8).toFixed(2)} €
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Data de Entrada</label>
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsActive(checked);
                    if (!checked && !exitDate) {
                      setExitDate(getTodayDateString());
                    }
                  }}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                />
                Trabalhador Ativo na Empresa
              </label>
            </div>
          </div>

          {/* If worker is inactive, request exit date and optional reason */}
          {!isActive && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                <LogOut className="h-4 w-4 text-amber-600" />
                <span>Dados de Saída do Funcionário</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Data de Saída *</label>
                  <input
                    type="date"
                    required={!isActive}
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Motivo de Saída</label>
                  <input
                    type="text"
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    placeholder="ex: Fim de contrato"
                    className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Observações / Qualificações</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              placeholder="Cartas de condução, especialidades, certificados de segurança..."
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div>
              {worker && (
                <button
                  type="button"
                  onClick={() => setIsExitModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Dar saída ao funcionário e guardar histórico"
                >
                  <UserX className="h-4 w-4" />
                  <span>{worker.isActive ? 'Registar Saída / Eliminar' : 'Histórico de Saída'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs cursor-pointer"
              >
                {worker ? 'Guardar Alterações' : 'Registar Trabalhador'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Dedicated Exit Modal to prompt exit date & guarantee history preservation */}
      <WorkerExitModal
        worker={worker}
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onSuccess={() => {
          setIsExitModalOpen(false);
          onClose();
        }}
      />
    </>
  );
};

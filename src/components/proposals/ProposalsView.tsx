import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Printer,
  HardHat,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Proposal, ProposalStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProposalEditorModal } from './ProposalEditorModal';
import { ProposalPrintView } from './ProposalPrintView';
import { generateProposalDirectPdf } from '../../utils/pdfGenerator';

export const ProposalsView: React.FC<{
  onOpenWorkDetail?: (workId: string) => void;
  onNavigateToTab?: (tab: any) => void;
}> = ({ onOpenWorkDetail, onNavigateToTab }) => {
  const { proposals, deleteProposal, convertProposalToWork, works, companySettings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [printingProposal, setPrintingProposal] = useState<Proposal | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<Proposal | null>(null);

  // Filter proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchSearch =
        p.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.clientNif && p.clientNif.includes(searchTerm)) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());

      return matchSearch;
    });
  }, [proposals, searchTerm]);

  // Metrics
  const totalValue = filteredProposals.reduce((sum, p) => sum + p.total, 0);
  const averageValue = filteredProposals.length > 0 ? totalValue / filteredProposals.length : 0;
  const totalVat = filteredProposals.reduce((sum, p) => sum + p.vatTotal, 0);

  // If user selected to print/preview document
  if (printingProposal) {
    return (
      <ProposalPrintView
        proposal={printingProposal}
        onBack={() => setPrintingProposal(null)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Valor Total Orçamentado"
          value={formatCurrency(totalValue)}
          subtext={`${filteredProposals.length} propostas emitidas`}
          icon={<FileSpreadsheet className="h-5 w-5 text-blue-600" />}
          highlight="primary"
        />

        <StatCard
          title="Total de Orçamentos"
          value={String(filteredProposals.length)}
          subtext="Documentos de propostas comerciais"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          highlight="success"
        />

        <StatCard
          title="Valor Médio por Proposta"
          value={formatCurrency(averageValue)}
          subtext={`IVA global: ${formatCurrency(totalVat)}`}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          highlight="warning"
        />
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por número, cliente, NIF ou descrição..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setEditingProposal(null);
            setIsEditorOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ Novo Orçamento</span>
        </button>
      </div>

      {/* Proposals Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="p-3.5">Número</th>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Descrição dos Trabalhos</th>
                <th className="p-3.5 text-right">Subtotal</th>
                <th className="p-3.5 text-right">IVA</th>
                <th className="p-3.5 text-right">Total</th>
                <th className="p-3.5">Validade</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredProposals.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setPrintingProposal(prop)}
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {prop.number}
                    </td>
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">
                      {formatDate(prop.date)}
                    </td>
                    <td className="p-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <div>{prop.clientName}</div>
                      {prop.clientNif && (
                        <div className="text-[10px] text-slate-400 font-mono">{prop.clientNif}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-700 max-w-xs truncate">
                      {prop.description}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatCurrency(prop.subtotal)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500 whitespace-nowrap">
                      {formatCurrency(prop.vatTotal)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(prop.total)}
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {formatDate(prop.validUntil)}
                    </td>
                    <td
                      className="p-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {(() => {
                          const associatedWork = works.find(
                            (w) => w.proposalId === prop.id || (prop.workId && w.id === prop.workId)
                          );

                          if (associatedWork) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenWorkDetail) {
                                    onOpenWorkDetail(associatedWork.id);
                                  } else if (onNavigateToTab) {
                                    onNavigateToTab('obras');
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 text-[11px] font-semibold cursor-pointer"
                                title={`Obra já aberta: ${associatedWork.name}`}
                              >
                                <HardHat className="h-3 w-3 text-amber-600" />
                                <span>Ver Obra</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                const newWork = convertProposalToWork(prop.id);
                                if (newWork && onOpenWorkDetail) {
                                  onOpenWorkDetail(newWork.id);
                                } else if (onNavigateToTab) {
                                  onNavigateToTab('obras');
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 text-[11px] font-bold cursor-pointer"
                              title="Criar Obra a partir deste orçamento"
                            >
                              <HardHat className="h-3.5 w-3.5" />
                              <span>Gerar Obra</span>
                            </button>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateProposalDirectPdf(prop, companySettings);
                          }}
                          className="rounded p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 cursor-pointer"
                          title="Transferir PDF Diretamente para o computador"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintingProposal(prop)}
                          className="rounded p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          title="Imprimir / Visualizar Documento"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProposal(prop);
                            setIsEditorOpen(true);
                          }}
                          className="rounded p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                          title="Editar Orçamento (caso de engano, alterar valores, cliente ou descrição)"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProposal(prop)}
                          className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                          title="Eliminar Orçamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      <ProposalEditorModal
        proposal={editingProposal}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingProposal(null);
        }}
      />

      {/* Confirmation Dialog for Deletion */}
      <ConfirmDialog
        isOpen={!!deletingProposal}
        title="Eliminar Orçamento"
        message={`Tem a certeza de que deseja eliminar o orçamento ${deletingProposal?.number} (${deletingProposal?.clientName})? Esta ação não pode ser desfeita.`}
        confirmText="Eliminar Orçamento"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deletingProposal) {
            deleteProposal(deletingProposal.id);
            setDeletingProposal(null);
          }
        }}
        onCancel={() => setDeletingProposal(null)}
      />
    </div>
  );
};

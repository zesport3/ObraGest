import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Building2, Calendar, FileText, CheckCircle2, Trash2, Edit2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (id: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalhe da Fatura ${invoice.number}`}
      subtitle={`Registada em ${formatDate(invoice.date)} • Fornecedor: ${invoice.supplierName}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Header information cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-500" />
              Fornecedor
            </h5>
            <p className="font-bold text-sm text-slate-900">{invoice.supplierName}</p>
            {invoice.supplierNif && (
              <p className="text-slate-600 font-mono">NIF: {invoice.supplierNif}</p>
            )}
            {invoice.supplierAddress && (
              <p className="text-slate-600">{invoice.supplierAddress}</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              Dados do Documento
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">Número:</span>
                <span className="font-bold font-mono text-slate-900">{invoice.number}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Data Emissão:</span>
                <span className="font-semibold text-slate-900">{formatDate(invoice.date)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Vencimento:</span>
                <span className="font-semibold text-slate-900">{formatDate(invoice.dueDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Estado:</span>
                <Badge variant="success" size="sm">Confirmada</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div>
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Artigos & Materiais ({invoice.items.length})
          </h5>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-3">Material</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Qtd</th>
                  <th className="p-3 text-right">Preço Unit.</th>
                  <th className="p-3 text-right">Desc.</th>
                  <th className="p-3 text-right">IVA</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-900">
                      <div>{it.name}</div>
                      {it.description && (
                        <div className="text-[11px] text-slate-500 font-normal">{it.description}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px]">
                        {it.category || 'Geral'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="p-3 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                    <td className="p-3 text-right font-mono">{it.discount ? `${it.discount}%` : '—'}</td>
                    <td className="p-3 text-right font-mono">{it.vatRate}%</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-between items-center rounded-xl bg-slate-900 p-4 text-white">
          <div className="text-xs text-slate-400">
            Materiais registados no inventário e refletidos no apuramento de IVA.
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Subtotal</span>
              <span className="text-sm font-semibold">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">IVA</span>
              <span className="text-sm font-semibold text-rose-300">{formatCurrency(invoice.vatAmount)}</span>
            </div>
            <div className="border-l border-slate-700 pl-6">
              <span className="text-[10px] text-amber-400 font-bold block uppercase">Total Fatura</span>
              <span className="text-xl font-extrabold text-white">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar Fatura
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(invoice);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
                Editar Fatura
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {onDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteOpen}
          title="Eliminar Fatura"
          message={`Tem a certeza de que deseja eliminar esta fatura (${invoice.number})?`}
          confirmText="Eliminar Fatura"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            onDelete(invoice.id);
            setIsConfirmDeleteOpen(false);
            onClose();
          }}
          onCancel={() => setIsConfirmDeleteOpen(false)}
        />
      )}
    </Modal>
  );
};

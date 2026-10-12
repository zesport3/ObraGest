import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  Hash,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceItem, Supplier } from '../../types';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';
import { SupplierModal } from '../suppliers/SupplierModal';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  invoiceToEdit?: Invoice | null;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoiceToEdit,
}) => {
  const { suppliers, confirmInvoice, updateInvoice } = useApp();

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayDateString());
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [defaultVatRate, setDefaultVatRate] = useState<number>(23);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick New Supplier modal
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (invoiceToEdit) {
        setSelectedSupplierId(
          invoiceToEdit.supplierId || (suppliers.length > 0 ? suppliers[0].id : '')
        );
        setInvoiceNumber(invoiceToEdit.number);
        setInvoiceDate(invoiceToEdit.date);
        setInvoiceDueDate(invoiceToEdit.dueDate || '');
        setDefaultVatRate(invoiceToEdit.vatRate || 23);
        setFormError(null);
        setItems(
          invoiceToEdit.items && invoiceToEdit.items.length > 0
            ? invoiceToEdit.items.map((it, idx) => ({
                ...it,
                id: it.id || `item-edit-${Date.now()}-${idx}`,
                quantity: it.quantity ?? 1,
                unitPrice: it.unitPrice ?? 0,
                vatRate: it.vatRate ?? invoiceToEdit.vatRate ?? 23,
                discount: it.discount ?? 0,
                total:
                  it.total ??
                  Number(
                    (
                      (it.quantity || 1) *
                      (it.unitPrice || 0) *
                      (1 - (it.discount || 0) / 100)
                    ).toFixed(2)
                  ),
              }))
            : [
                {
                  id: `item-${Date.now()}-1`,
                  name: '',
                  description: '',
                  quantity: 1,
                  unit: 'un',
                  unitPrice: 0,
                  discount: 0,
                  vatRate: 23,
                  total: 0,
                  category: 'Materiais de Construção',
                },
              ]
        );
      } else {
        setSelectedSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
        setInvoiceNumber('');
        setInvoiceDate(getTodayDateString());
        setInvoiceDueDate('');
        setDefaultVatRate(23);
        setFormError(null);
        setItems([
          {
            id: `item-${Date.now()}-1`,
            name: '',
            description: '',
            quantity: 1,
            unit: 'un',
            unitPrice: 0,
            discount: 0,
            vatRate: 23,
            total: 0,
            category: 'Materiais de Construção',
          },
        ]);
      }
    }
  }, [isOpen, invoiceToEdit, suppliers]);

  // Selected supplier details
  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Item management
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        name: '',
        description: '',
        quantity: 1,
        unit: 'un',
        unitPrice: 0,
        discount: 0,
        vatRate: defaultVatRate,
        total: 0,
        category: 'Materiais de Construção',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setFormError('A fatura deve ter pelo menos uma linha de material.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      const qty = Number(current.quantity) || 0;
      const price = Number(current.unitPrice) || 0;
      const disc = Number(current.discount) || 0;
      const lineSubtotal = qty * price * (1 - disc / 100);
      current.total = Number(lineSubtotal.toFixed(2));

      updated[index] = current;
      return updated;
    });
  };

  // Financial Totals
  const subtotal = items.reduce(
    (acc, it) => acc + (it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100)),
    0
  );
  const vatAmount = items.reduce((acc, it) => {
    const itemSub = it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100);
    return acc + (itemSub * (it.vatRate / 100));
  }, 0);
  const total = subtotal + vatAmount;

  // Save Invoice
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSupplierId || !currentSupplier) {
      setFormError('Por favor selecione o fornecedor da fatura.');
      return;
    }

    if (!invoiceNumber.trim()) {
      setFormError('Por favor introduza o número da fatura (ex: FT 2026/0148).');
      return;
    }

    if (items.length === 0 || !items.some((it) => it.name.trim() !== '')) {
      setFormError('Adicione pelo menos um artigo/material com designação preenchida.');
      return;
    }

    // Filter valid items
    const validItems = items.filter((it) => it.name.trim() !== '');

    if (invoiceToEdit) {
      updateInvoice(invoiceToEdit.id, {
        number: invoiceNumber.trim(),
        date: invoiceDate,
        dueDate: invoiceDueDate || invoiceDate,
        supplierId: currentSupplier.id,
        supplierName: currentSupplier.name,
        supplierNif: currentSupplier.nif,
        supplierAddress: currentSupplier.address,
        subtotal: Number(subtotal.toFixed(2)),
        vatAmount: Number(vatAmount.toFixed(2)),
        vatRate: defaultVatRate,
        total: Number(total.toFixed(2)),
        items: validItems,
      });
    } else {
      confirmInvoice({
        number: invoiceNumber.trim(),
        date: invoiceDate,
        dueDate: invoiceDueDate || invoiceDate,
        supplierId: currentSupplier.id,
        supplierName: currentSupplier.name,
        supplierNif: currentSupplier.nif,
        supplierAddress: currentSupplier.address,
        subtotal: Number(subtotal.toFixed(2)),
        vatAmount: Number(vatAmount.toFixed(2)),
        vatRate: defaultVatRate,
        total: Number(total.toFixed(2)),
        documentName: 'Registo Manual',
        items: validItems,
      });
    }

    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={invoiceToEdit ? `Editar Fatura ${invoiceToEdit.number}` : 'Nova Fatura de Fornecedor'}
        subtitle={
          invoiceToEdit
            ? 'Atualize os dados comerciais, fornecedor e artigos da fatura de compra'
            : 'Registo manual de fatura de compra e entrada de materiais no inventário'
        }
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-2xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Supplier Selection */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-amber-600" />
                <span>Escolher Fornecedor *</span>
              </label>

              <button
                type="button"
                onClick={() => setIsQuickSupplierOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Criar Fornecedor</span>
              </button>
            </div>

            {suppliers.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center justify-between">
                <span>Ainda não tem nenhum fornecedor registado.</span>
                <button
                  type="button"
                  onClick={() => setIsQuickSupplierOpen(true)}
                  className="rounded-lg bg-amber-500 px-3 py-1 font-bold text-slate-950 hover:bg-amber-600 shadow-2xs"
                >
                  Criar Primeiro Fornecedor
                </button>
              </div>
            ) : (
              <div>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-amber-500 focus:outline-hidden"
                >
                  <option value="">-- Selecione o Fornecedor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.nif ? `— NIF: ${s.nif}` : ''} {s.category ? `(${s.category})` : ''}
                    </option>
                  ))}
                </select>

                {currentSupplier && (
                  <div className="mt-2.5 rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="font-semibold text-slate-500 block">NIF:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {currentSupplier.nif || 'Não indicado'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Morada:</span>
                      <span className="truncate block text-slate-800">
                        {currentSupplier.address || 'Não indicada'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Contacto:</span>
                      <span className="text-slate-800">
                        {currentSupplier.phone || currentSupplier.email || 'Não indicado'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoice Document Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                <span>N.º da Fatura *</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="ex: FT 2026/089"
                className="w-full mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Data de Emissão *</span>
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                <span>Data de Vencimento</span>
              </label>
              <input
                type="date"
                value={invoiceDueDate}
                onChange={(e) => setInvoiceDueDate(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Items & Materials Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Artigos & Materiais Faturados ({items.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Os artigos aqui registados entram diretamente no inventário de stock
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 transition-colors shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Adicionar Linha</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[200px]">Designação do Material *</th>
                      <th className="py-2.5 px-2 text-center w-20">Qtd</th>
                      <th className="py-2.5 px-2 text-center w-20">Unid</th>
                      <th className="py-2.5 px-2 text-right w-24">Preço (€)</th>
                      <th className="py-2.5 px-2 text-center w-20">IVA %</th>
                      <th className="py-2.5 px-3 text-right w-28">Total s/IVA</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/60">
                        {/* Name */}
                        <td className="p-2">
                          <input
                            type="text"
                            required
                            placeholder="ex: Cimento Secil 25kg"
                            value={it.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-amber-500 focus:outline-hidden"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="p-2">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={it.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center font-mono text-xs focus:border-amber-500 focus:outline-hidden"
                          />
                        </td>

                        {/* Unit */}
                        <td className="p-2">
                          <select
                            value={it.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-1 py-1.5 text-xs text-center focus:border-amber-500 focus:outline-hidden"
                          >
                            <option value="un">un</option>
                            <option value="kg">kg</option>
                            <option value="m">m</option>
                            <option value="m2">m²</option>
                            <option value="m3">m³</option>
                            <option value="saco">saco</option>
                            <option value="lt">lt</option>
                            <option value="cx">cx</option>
                            <option value="rolo">rolo</option>
                          </select>
                        </td>

                        {/* Unit Price */}
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={(e) =>
                              handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-right font-mono text-xs focus:border-amber-500 focus:outline-hidden"
                          />
                        </td>

                        {/* VAT Rate */}
                        <td className="p-2">
                          <select
                            value={it.vatRate}
                            onChange={(e) =>
                              handleItemChange(idx, 'vatRate', parseInt(e.target.value) || 23)
                            }
                            className="w-full rounded-lg border border-slate-300 px-1 py-1.5 text-center font-mono text-xs focus:border-amber-500 focus:outline-hidden"
                          >
                            <option value={23}>23%</option>
                            <option value={13}>13%</option>
                            <option value={6}>6%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>

                        {/* Total */}
                        <td className="p-2 text-right font-mono font-bold text-slate-900 pr-3">
                          {formatCurrency(it.total)}
                        </td>

                        {/* Delete row */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Eliminar linha"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="text-xs text-slate-500">
              <span>{items.filter((i) => i.name.trim()).length} artigos a registar</span>
            </div>

            <div className="w-full sm:w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (sem IVA):</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA Total:</span>
                <span className="font-mono font-bold text-emerald-700">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-300">
                <span>TOTAL DA FATURA:</span>
                <span className="font-mono text-base text-amber-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-xs transition-colors cursor-pointer"
            >
              {invoiceToEdit ? 'Guardar Alterações da Fatura' : 'Guardar Fatura e Dar Entrada de Materiais'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Supplier Creation Modal */}
      <SupplierModal
        supplier={null}
        isOpen={isQuickSupplierOpen}
        onClose={() => setIsQuickSupplierOpen(false)}
        onSaved={(created) => {
          setSelectedSupplierId(created.id);
        }}
      />
    </>
  );
};

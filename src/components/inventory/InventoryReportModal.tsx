import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatNumber, getTodayDateString } from '../../utils/formatters';
import { Calendar, Download, Printer, Loader2, HardHat, Boxes, FileSpreadsheet } from 'lucide-react';
import { downloadElementAsPdf, generateInventoryReportDirectPdf } from '../../utils/pdfGenerator';

interface InventoryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryReportModal: React.FC<InventoryReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { materials, stockMovements, companySettings } = useApp();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isDownloading, setIsDownloading] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  // Calculate stock quantities and valuation as of selected date
  const inventorySnapshot = useMemo(() => {
    // If selected date is today or in future, use current quantities
    const isTodayOrFuture = selectedDate >= getTodayDateString();

    return materials.map((mat) => {
      let qtyAtDate = mat.quantity;

      if (!isTodayOrFuture) {
        // Adjust for movements that happened AFTER the selected date
        // An entry after the date increased stock, so we subtract it
        // An exit after the date decreased stock, so we add it back
        const laterMovements = stockMovements.filter((m) => {
          if (m.materialId !== mat.id) return false;
          const movDate = m.createdAt.split('T')[0];
          return movDate > selectedDate;
        });

        const netAfterDate = laterMovements.reduce((sum, m) => sum + m.quantity, 0);
        qtyAtDate = Math.max(0, mat.quantity - netAfterDate);
      }

      const totalValue = Number((qtyAtDate * mat.averagePrice).toFixed(2));

      return {
        ...mat,
        quantityAtDate: qtyAtDate,
        totalValueAtDate: totalValue,
      };
    });
  }, [materials, stockMovements, selectedDate]);

  // Totals
  const totalItems = inventorySnapshot.length;
  const totalUnits = inventorySnapshot.reduce((acc, m) => acc + m.quantityAtDate, 0);
  const totalValuation = inventorySnapshot.reduce((acc, m) => acc + m.totalValueAtDate, 0);

  const handleDownloadPdf = async () => {
    const filename = `Relatorio_Inventario_${selectedDate}.pdf`;
    setIsDownloading(true);
    try {
      let success = false;
      if (documentRef.current) {
        success = await downloadElementAsPdf(documentRef.current, filename, setIsDownloading);
      }
      if (!success) {
        generateInventoryReportDirectPdf(inventorySnapshot, selectedDate, companySettings, filename);
      }
    } catch (err) {
      console.warn('Canvas export failed, using direct jsPDF generator:', err);
      generateInventoryReportDirectPdf(inventorySnapshot, selectedDate, companySettings, filename);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    document.body.style.overflow = 'visible';
    const originalTitle = document.title;
    document.title = `Relatorio_Inventario_${selectedDate}`;
    try {
      window.print();
    } catch (err) {
      console.error('Print error:', err);
    }
    setTimeout(() => {
      document.title = originalTitle;
      document.body.style.overflow = 'hidden';
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Relatório de Inventário à Data"
      subtitle="Gere o mapa oficial de existências e valorização de stock à data pretendida para PDF"
      maxWidth="5xl"
    >
      <div className="space-y-6">
        {/* Controls bar (Hidden on Print) */}
        <div className="print:hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Date Selector */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Selecionar Data do Inventário:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || getTodayDateString())}
                className="mt-0.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons: Download PDF and Print */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Transferir documento PDF para o computador"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              ) : (
                <Download className="h-4 w-4 text-slate-950" />
              )}
              <span>{isDownloading ? 'A Gerar PDF...' : 'Transferir PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              title="Imprimir ou pré-visualizar"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (Styled for Screen and A4 PDF) */}
        <div
          ref={documentRef}
          id="inventory-report-document"
          className="mx-auto max-w-4xl bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 space-y-6"
        >
          {/* 1. Company Header with Logo on top and Name below */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-2 max-w-md">
              {companySettings.logoUrl ? (
                <img
                  src={companySettings.logoUrl}
                  alt="Logo"
                  className="h-20 w-auto max-h-24 max-w-[200px] object-contain shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
                  <HardHat className="h-8 w-8" />
                </div>
              )}

              <div>
                <h1 className="text-xl font-black text-slate-950 tracking-tight">
                  {companySettings.name || 'Empresa de Construção'}
                </h1>
                {companySettings.commercialName && (
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                    {companySettings.commercialName}
                  </p>
                )}
              </div>

              <div className="text-xs text-slate-600 leading-relaxed">
                <p>
                  {companySettings.address}
                  {companySettings.postalCode ? `, ${companySettings.postalCode}` : ''}{' '}
                  {companySettings.city}
                </p>
                {companySettings.nif && (
                  <p>
                    NIF: <strong className="text-slate-900 font-mono">{companySettings.nif}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Document Details */}
            <div className="text-left sm:text-right space-y-1">
              <div className="inline-block bg-slate-950 text-white px-4 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase mb-1">
                Relatório de Inventário
              </div>
              <div className="text-xs text-slate-600">
                Data do Inventário:{' '}
                <strong className="text-slate-950 font-bold">{formatDate(selectedDate)}</strong>
              </div>
              <div className="text-xs text-slate-500">
                Data de Emissão: {formatDate(getTodayDateString())}
              </div>
            </div>
          </div>

          {/* 2. Summary KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total de Artigos
              </span>
              <span className="text-lg font-black text-slate-900">{totalItems}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Unidades em Stock
              </span>
              <span className="text-lg font-black text-slate-900">{formatNumber(totalUnits, 1)}</span>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Valor Total do Stock
              </span>
              <span className="text-lg font-black text-amber-950 font-mono">
                {formatCurrency(totalValuation)}
              </span>
            </div>
          </div>

          {/* 3. Detailed Inventory Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Artigo / Material</th>
                  <th className="p-3 w-24 text-center">Unidade</th>
                  <th className="p-3 w-28 text-right">Preço Médio</th>
                  <th className="p-3 w-28 text-right">Quantidade</th>
                  <th className="p-3 w-32 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {inventorySnapshot.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Nenhum material registado no inventário.
                    </td>
                  </tr>
                ) : (
                  inventorySnapshot.map((mat, idx) => (
                    <tr key={mat.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{mat.name}</div>
                        {mat.notes && <div className="text-[10px] text-slate-400">{mat.notes}</div>}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-600">
                        {mat.unit}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        {formatCurrency(mat.averagePrice)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatNumber(mat.quantityAtDate, 1)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-950">
                        {formatCurrency(mat.totalValueAtDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100/90 border-t-2 border-slate-900 font-black text-slate-950">
                <tr>
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-[11px]">
                    VALOR TOTAL DO INVENTÁRIO:
                  </td>
                  <td className="p-3 text-right font-mono text-sm">
                    {formatNumber(totalUnits, 1)}
                  </td>
                  <td className="p-3 text-right font-mono text-sm text-slate-950">
                    {formatCurrency(totalValuation)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between items-center">
            <span>Relatório gerado pelo Obragest — Gestão de Obras & Inventário</span>
            <span>{inventorySnapshot.length} registos à data de {formatDate(selectedDate)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

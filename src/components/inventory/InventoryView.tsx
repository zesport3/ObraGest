import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Trash2,
  PackageCheck,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Material, StockMovement } from '../../types';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { StatCard } from '../common/StatCard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MaterialModal } from './MaterialModal';
import { StockAdjustModal } from './StockAdjustModal';
import { InventoryReportModal } from './InventoryReportModal';

export const InventoryView: React.FC = () => {
  const { materials, stockMovements, deleteMaterial } = useApp();

  const [activeTab, setActiveTab] = useState<'materials' | 'movements'>('materials');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [materials, searchTerm]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((mov) => {
      return (
        mov.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.typeLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mov.workName && mov.workName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (mov.note && mov.note.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [stockMovements, searchTerm]);

  // Metrics
  const totalStockValue = materials.reduce((acc, m) => acc + (m.quantity * m.averagePrice), 0);
  const totalUnits = materials.reduce((acc, m) => acc + m.quantity, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Valor Total em Stock"
          value={formatCurrency(totalStockValue)}
          subtext="Soma total do valor dos materiais em armazém"
          icon={<Boxes className="h-5 w-5 text-amber-600" />}
          highlight="warning"
        />

        <StatCard
          title="Total de Materiais"
          value={String(materials.length)}
          subtext={`${formatNumber(totalUnits, 0)} unidades totais registadas`}
          icon={<PackageCheck className="h-5 w-5 text-blue-600" />}
          highlight="primary"
        />

        <StatCard
          title="Movimentos de Stock"
          value={String(stockMovements.length)}
          subtext="Histórico de entradas e consumos em obras"
          icon={<History className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'materials'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Inventário de Materiais ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'movements'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Histórico de Movimentos ({stockMovements.length})</span>
        </button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome do material..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition-colors cursor-pointer"
            title="Gerar e transferir relatório de inventário para PDF à data selecionada"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Relatório de Inventário (PDF)</span>
          </button>

          {activeTab === 'materials' && (
            <button
              onClick={() => {
                setIsMaterialModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Nova Adição</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: MATERIALS TABLE - SIMPLIFIED TO: Nome do Material, Quantidade, Valor Unitário, Valor Total */}
      {activeTab === 'materials' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[11px] font-bold">
                <tr>
                  <th className="p-4">Nome do Material</th>
                  <th className="p-4 text-right">Quantidade</th>
                  <th className="p-4 text-right">Valor Unitário</th>
                  <th className="p-4 text-right">Valor Total</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Nenhum material encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-semibold text-slate-900 text-sm">
                        <div>{mat.name}</div>
                        {mat.notes && (
                          <div className="text-[11px] text-slate-400 font-normal truncate max-w-sm">
                            {mat.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap text-sm">
                        {formatNumber(mat.quantity, mat.unit === 'un' || mat.unit === 'saco' ? 0 : 2)}{' '}
                        <span className="text-xs text-slate-500 font-normal">{mat.unit || 'un'}</span>
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-slate-700 whitespace-nowrap text-sm">
                        {formatCurrency(mat.averagePrice)}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-950 whitespace-nowrap text-sm">
                        {formatCurrency(mat.quantity * mat.averagePrice)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAdjustingMaterial(mat)}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Registar Entrada / Saída de Armazém"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingMaterial(mat)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Eliminar Material"
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
      )}

      {/* TAB 2: STOCK MOVEMENTS TABLE */}
      {activeTab === 'movements' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5">Tipo de Movimento</th>
                  <th className="p-3.5">Material</th>
                  <th className="p-3.5 text-right">Quantidade</th>
                  <th className="p-3.5 text-right">Valor Unitário</th>
                  <th className="p-3.5 text-right">Valor Total</th>
                  <th className="p-3.5">Destino / Origem</th>
                  <th className="p-3.5">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Nenhum movimento registado.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => {
                    const isPositive = mov.quantity > 0;
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 text-slate-600 whitespace-nowrap">
                          {formatDate(mov.date)}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {isPositive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                              {mov.typeLabel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              {mov.typeLabel}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-medium text-slate-900 whitespace-nowrap">
                          {mov.materialName}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPositive ? `+${mov.quantity}` : mov.quantity}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                          {formatCurrency(mov.unitCost)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(Math.abs(mov.totalCost))}
                        </td>
                        <td className="p-3.5 text-slate-700 whitespace-nowrap">
                          {mov.workName ? (
                            <span className="font-medium text-amber-700">{mov.workName}</span>
                          ) : mov.invoiceNumber ? (
                            <span className="font-mono text-slate-600">{mov.invoiceNumber}</span>
                          ) : (
                            'Armazém Geral'
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                          {mov.note || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Material Modal - Nova Adição */}
      <MaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
      />

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        material={adjustingMaterial}
        isOpen={!!adjustingMaterial}
        onClose={() => setAdjustingMaterial(null)}
      />

      {/* Inventory Report to PDF Modal */}
      <InventoryReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Confirmation Dialog for Deleting Material */}
      <ConfirmDialog
        isOpen={!!deletingMaterial}
        title="Eliminar Material"
        message={`Tem a certeza de que deseja eliminar o material "${deletingMaterial?.name}"?`}
        confirmText="Eliminar Material"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deletingMaterial) {
            deleteMaterial(deletingMaterial.id);
            setDeletingMaterial(null);
          }
        }}
        onCancel={() => setDeletingMaterial(null)}
      />
    </div>
  );
};

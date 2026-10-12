import React from 'react';
import {
  Menu,
  HardHat,
  Receipt,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { TabType } from './Sidebar';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  currentTab: TabType;
  onOpenMobileMenu: () => void;
  onNavigate: (tab: TabType) => void;
  onQuickAction?: (action: 'new-invoice' | 'new-proposal' | 'new-work') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  onNavigate,
  onQuickAction,
}) => {
  const { exportBackup } = useApp();
  const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Painel de Gestão & Indicadores',
      subtitle: 'Visão financeira global, obras em curso e apuramento de IVA',
    },
    faturas: {
      title: 'Faturas de Compras & Materiais',
      subtitle: 'Registo manual de faturas e entrada automática em inventário',
    },
    fornecedores: {
      title: 'Gestão de Fornecedores',
      subtitle: 'Registo e consulta de fornecedores de materiais e serviços',
    },
    inventarios: {
      title: 'Inventário de Materiais',
      subtitle: 'Controlo de stock, preços médios e histórico de entradas e saídas',
    },
    orcamentos: {
      title: 'Orçamentos & Propostas',
      subtitle: 'Numeração sequencial contínua, descrição, condições de pagamento e IVA',
    },
    obras: {
      title: 'Gestão de Obras',
      subtitle: 'Rentabilidade, custos de materiais, equipas e margens reais',
    },
    trabalhadores: {
      title: 'Funcionários & Presenças Diárias',
      subtitle: 'Lista de trabalhadores, seleção de presenças por dia e afetação a obras',
    },
    despesas: {
      title: 'Despesas Gerais de Estrutura',
      subtitle: 'Custos operacionais (rendas, energia, combustíveis, seguros) e IVA dedutível',
    },
    configuracoes: {
      title: 'Configurações da Empresa',
      subtitle: 'Dados fiscais, identificação da empresa e logótipo',
    },
  };

  const currentInfo = tabTitles[currentTab] || {
    title: 'Obragest',
    subtitle: 'Gestão de Construção Civil',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left side: Hamburger + Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {currentInfo.title}
          </h2>
          <p className="hidden sm:block text-xs text-slate-500">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right side: Quick Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={exportBackup}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs transition-colors"
            title="Descarregar Cópia de Segurança de Todos os Dados (.json)"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Cópia de Segurança</span>
          </button>
          <button
            onClick={() => onQuickAction ? onQuickAction('new-invoice') : onNavigate('faturas')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Receipt className="h-3.5 w-3.5 text-amber-600" />
            <span>+ Fatura</span>
          </button>
          <button
            onClick={() => onQuickAction ? onQuickAction('new-proposal') : onNavigate('orcamentos')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
            <span>+ Orçamento</span>
          </button>
          <button
            onClick={() => onQuickAction ? onQuickAction('new-work') : onNavigate('obras')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-xs transition-colors"
          >
            <HardHat className="h-3.5 w-3.5" />
            <span>+ Obra</span>
          </button>
        </div>
      </div>
    </header>
  );
};

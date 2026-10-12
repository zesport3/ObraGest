import React, { useRef, useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Boxes,
  FileSpreadsheet,
  HardHat,
  Users,
  CreditCard,
  Settings,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RestoreBackupModal } from '../common/RestoreBackupModal';

export type TabType =
  | 'dashboard'
  | 'faturas'
  | 'fornecedores'
  | 'inventarios'
  | 'orcamentos'
  | 'obras'
  | 'trabalhadores'
  | 'despesas'
  | 'configuracoes';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
}) => {
  const { companySettings, exportBackup } = useApp();
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExport = () => {
    exportBackup();
    setBackupStatus({ type: 'success', message: 'Cópia descarregada com sucesso!' });
    setTimeout(() => setBackupStatus(null), 3500);
  };

  const menuItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      id: 'faturas',
      label: 'Faturas',
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      id: 'fornecedores',
      label: 'Fornecedores',
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      id: 'inventarios',
      label: 'Inventários',
      icon: <Boxes className="h-5 w-5" />,
    },
    {
      id: 'orcamentos',
      label: 'Orçamentos',
      icon: <FileSpreadsheet className="h-5 w-5" />,
    },
    {
      id: 'obras',
      label: 'Obras',
      icon: <HardHat className="h-5 w-5" />,
    },
    {
      id: 'trabalhadores',
      label: 'Trabalhadores',
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: 'despesas',
      label: 'Despesas',
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const handleItemClick = (id: TabType) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800/80 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20">
            {companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Logo"
                className="h-8 w-8 rounded-lg object-contain"
              />
            ) : (
              <HardHat className="h-6 w-6 text-slate-950" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold tracking-tight text-white truncate">
              {companySettings.commercialName || companySettings.name || 'Obragest'}
            </h1>
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider truncate">
              Gestão de Obras & IVA
            </p>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Menu Principal
            </p>
            {menuItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs shadow-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`${
                        isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                      } transition-colors`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Backup & Restore Center */}
        <div className="px-3 pb-2 pt-1 space-y-1.5">
          {backupStatus && (
            <div
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${
                backupStatus.type === 'success'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {backupStatus.type === 'success' ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              )}
              <span className="truncate">{backupStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 hover:border-slate-700 py-2 px-2 text-[11px] font-semibold text-slate-300 hover:text-white transition-all shadow-2xs group cursor-pointer"
              title="Guardar cópia de segurança (.json) no computador"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Guardar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 hover:border-slate-700 py-2 px-2 text-[11px] font-semibold text-slate-300 hover:text-white transition-all shadow-2xs group cursor-pointer"
              title="Repor cópia de segurança a partir de ficheiro .json"
            >
              <Upload className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Repor</span>
            </button>
          </div>
        </div>

        {/* Company info footer */}
        <div className="p-3 border-t border-slate-900 bg-slate-950/70 text-[11px] text-slate-500">
          <div className="truncate font-medium text-slate-400">
            {companySettings.name || 'Configurar Empresa'}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
            <span>{companySettings.nif ? `NIF: ${companySettings.nif}` : 'Portugal'}</span>
            <span className="text-emerald-500 font-semibold">● PT-PT</span>
          </div>
        </div>
      </aside>

      {/* Restore Backup Modal */}
      <RestoreBackupModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
      />
    </>
  );
};

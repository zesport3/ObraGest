import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  FileSpreadsheet,
  HardHat,
  Menu,
} from 'lucide-react';
import { TabType } from './Sidebar';

interface MobileNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMore,
}) => {
  const primaryMobileTabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Painel',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      id: 'obras',
      label: 'Obras',
      icon: <HardHat className="h-5 w-5" />,
    },
    {
      id: 'faturas',
      label: 'Faturas',
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      id: 'inventarios',
      label: 'Stock',
      icon: <Boxes className="h-5 w-5" />,
    },
    {
      id: 'orcamentos',
      label: 'Orçam.',
      icon: <FileSpreadsheet className="h-5 w-5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md lg:hidden">
      {primaryMobileTabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-amber-50 text-amber-600' : ''}`}>
              {tab.icon}
            </div>
            <span className="truncate max-w-[55px]">{tab.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center py-1 px-2 text-[10px] font-medium text-slate-500 hover:text-slate-800"
      >
        <div className="p-1 rounded-lg">
          <Menu className="h-5 w-5" />
        </div>
        <span>Menu</span>
      </button>
    </nav>
  );
};

import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { InventoryView } from './components/inventory/InventoryView';
import { ProposalsView } from './components/proposals/ProposalsView';
import { WorksView } from './components/works/WorksView';
import { WorkDetailView } from './components/works/WorkDetailView';
import { WorkersView } from './components/workers/WorkersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { SettingsView } from './components/settings/SettingsView';

// Quick action modals
import { NewInvoiceModal } from './components/invoices/NewInvoiceModal';
import { ProposalEditorModal } from './components/proposals/ProposalEditorModal';
import { NewWorkModal } from './components/works/NewWorkModal';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Quick Action Modals
  const [isQuickInvoiceOpen, setIsQuickInvoiceOpen] = useState(false);
  const [isQuickProposalOpen, setIsQuickProposalOpen] = useState(false);
  const [isQuickWorkOpen, setIsQuickWorkOpen] = useState(false);

  const handleSelectTab = (tab: TabType) => {
    setCurrentTab(tab);
    // If switching tabs, clear active work detail
    if (tab !== 'obras') {
      setSelectedWorkId(null);
    }
  };

  const handleOpenWorkDetail = (workId: string) => {
    setSelectedWorkId(workId);
    setCurrentTab('obras');
  };

  const handleBackToWorksList = () => {
    setSelectedWorkId(null);
  };

  const handleQuickAction = (action: 'new-invoice' | 'new-proposal' | 'new-work') => {
    if (action === 'new-invoice') setIsQuickInvoiceOpen(true);
    if (action === 'new-proposal') setIsQuickProposalOpen(true);
    if (action === 'new-work') setIsQuickWorkOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-100/70 font-sans text-slate-800 antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col lg:pl-64 print:pl-0 min-w-0">
        {/* Header bar */}
        <Header
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigate={handleSelectTab}
          onQuickAction={handleQuickAction}
        />

        {/* View body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          <ErrorBoundary
            key={currentTab + (selectedWorkId || '')}
            isRoot={false}
            fallbackTitle={`Erro ao carregar o módulo de ${currentTab}`}
          >
            {currentTab === 'dashboard' && (
              <DashboardView
                onNavigateToTab={handleSelectTab}
                onOpenWorkDetail={handleOpenWorkDetail}
              />
            )}

            {currentTab === 'faturas' && <InvoicesView />}

            {currentTab === 'fornecedores' && <SuppliersView />}

            {currentTab === 'inventarios' && <InventoryView />}

            {currentTab === 'orcamentos' && (
              <ProposalsView
                onOpenWorkDetail={handleOpenWorkDetail}
                onNavigateToTab={handleSelectTab}
              />
            )}

            {currentTab === 'obras' && (
              <>
                {selectedWorkId ? (
                  <WorkDetailView
                    workId={selectedWorkId}
                    onBack={handleBackToWorksList}
                    onNavigateToTab={handleSelectTab}
                  />
                ) : (
                  <WorksView onSelectWork={handleOpenWorkDetail} />
                )}
              </>
            )}

            {currentTab === 'trabalhadores' && (
              <WorkersView onSelectWork={handleOpenWorkDetail} />
            )}

            {currentTab === 'despesas' && <ExpensesView />}

            {currentTab === 'configuracoes' && <SettingsView />}
          </ErrorBoundary>
        </main>

        {/* Mobile bottom nav */}
        <MobileNav
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          onOpenMore={() => setIsMobileMenuOpen(true)}
        />
      </div>

      {/* Quick Action Modals */}
      <NewInvoiceModal
        isOpen={isQuickInvoiceOpen}
        onClose={() => setIsQuickInvoiceOpen(false)}
        onSuccess={() => handleSelectTab('faturas')}
      />

      <ProposalEditorModal
        proposal={null}
        isOpen={isQuickProposalOpen}
        onClose={() => setIsQuickProposalOpen(false)}
        onSaved={() => handleSelectTab('orcamentos')}
      />

      <NewWorkModal
        work={null}
        isOpen={isQuickWorkOpen}
        onClose={() => setIsQuickWorkOpen(false)}
        onSaved={(w) => handleOpenWorkDetail(w.id)}
        onOpenExistingWork={(workId) => handleOpenWorkDetail(workId)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

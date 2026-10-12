import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CompanySettings,
  Client,
  Supplier,
  Material,
  StockMovement,
  Proposal,
  Work,
  Worker,
  WorkHourLog,
  WorkerPayment,
  GeneralExpense,
  Invoice,
  NotificationItem,
  MovementType,
} from '../types';
import {
  initialCompanySettings,
  initialClients,
  initialSuppliers,
  initialMaterials,
  initialProposals,
  initialWorks,
  initialWorkers,
  initialWorkHourLogs,
  initialWorkerPayments,
  initialGeneralExpenses,
  initialInvoices,
  initialStockMovements,
} from '../data/initialData';
import { getTodayDateString } from '../utils/formatters';

interface AppContextType {
  // Data
  companySettings: CompanySettings;
  clients: Client[];
  suppliers: Supplier[];
  materials: Material[];
  stockMovements: StockMovement[];
  proposals: Proposal[];
  works: Work[];
  workers: Worker[];
  workHourLogs: WorkHourLog[];
  workerPayments: WorkerPayment[];
  generalExpenses: GeneralExpense[];
  invoices: Invoice[];
  notifications: NotificationItem[];

  // Mutators
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;

  // Clients & Suppliers
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Materials & Stock
  addMaterial: (material: Omit<Material, 'id' | 'totalValue'>) => Material;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  adjustStock: (
    materialId: string,
    quantityChange: number,
    type: MovementType,
    note: string,
    workId?: string
  ) => boolean;

  // Invoices
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Invoice;
  confirmInvoice: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'status'> & { id?: string }) => Invoice;
  updateInvoice: (id: string, invoiceData: Partial<Invoice>) => Invoice;
  deleteInvoice: (id: string) => void;

  // Proposals
  getNextProposalNumber: () => string;
  addProposal: (proposal: Omit<Proposal, 'id' | 'createdAt' | 'number'> & { number?: string }) => Proposal;
  updateProposal: (id: string, proposal: Partial<Proposal>) => void;
  deleteProposal: (id: string) => void;
  convertProposalToWork: (proposalId: string) => Work | null;

  // Works
  addWork: (work: Omit<Work, 'id' | 'createdAt'>) => Work;
  updateWork: (id: string, work: Partial<Work>) => void;
  deleteWork: (id: string) => void;
  addWorkOtherCost: (workId: string, cost: { description: string; category: string; amount: number; date: string }) => void;
  removeWorkOtherCost: (workId: string, costId: string) => void;
  assignMaterialToWork: (
    workId: string,
    materialId: string,
    quantity: number,
    date?: string,
    note?: string
  ) => { success: boolean; error?: string };

  // Workers & Hours
  addWorker: (worker: Omit<Worker, 'id'>) => Worker;
  updateWorker: (id: string, worker: Partial<Worker>) => void;
  deleteWorker: (id: string, exitDate?: string, exitReason?: string, forcePurge?: boolean) => void;
  terminateWorker: (id: string, exitDate: string, exitReason?: string) => void;
  reactivateWorker: (id: string) => void;
  addWorkHourLog: (
    log: Omit<WorkHourLog, 'id' | 'createdAt' | 'totalCost' | 'workerName' | 'workName'>
  ) => WorkHourLog;
  deleteWorkHourLog: (id: string) => void;
  setWorkerDailyAttendance: (
    date: string,
    workerId: string,
    present: boolean,
    workId?: string,
    hours?: number,
    notes?: string
  ) => void;
  setWorkerAttendance: (options: {
    date: string;
    workerId: string;
    status: 'presente' | 'meio_dia' | 'falta' | 'folga' | 'remover';
    hours?: number;
    workId?: string;
    absenceReason?: string;
    notes?: string;
  }) => void;
  batchSetDailyAttendance: (
    date: string,
    attendances: Array<{
      workerId: string;
      present: boolean;
      workId?: string;
      hours?: number;
    }>
  ) => void;
  addWorkerPayment: (payment: Omit<WorkerPayment, 'id' | 'createdAt'>) => WorkerPayment;
  deleteWorkerPayment: (id: string) => void;

  // General Expenses
  addGeneralExpense: (expense: Omit<GeneralExpense, 'id' | 'createdAt'>) => GeneralExpense;
  updateGeneralExpense: (id: string, expense: Partial<GeneralExpense>) => void;
  deleteGeneralExpense: (id: string) => void;

  // System & Backup
  resetToDemoData: () => void;
  exportBackup: () => void;
  importBackup: (backupJson: string) => { success: boolean; error?: string };
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  SETTINGS: 'obragest_settings_v2',
  CLIENTS: 'obragest_clients_v2',
  SUPPLIERS: 'obragest_suppliers_v2',
  MATERIALS: 'obragest_materials_v2',
  MOVEMENTS: 'obragest_movements_v2',
  PROPOSALS: 'obragest_proposals_v2',
  WORKS: 'obragest_works_v2',
  WORKERS: 'obragest_workers_v2',
  HOUR_LOGS: 'obragest_hour_logs_v2',
  PAYMENTS: 'obragest_payments_v2',
  EXPENSES: 'obragest_expenses_v2',
  INVOICES: 'obragest_invoices_v2',
};

// Clear legacy demo data
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('obragest_') && k.endsWith('_v1')) {
        localStorage.removeItem(k);
      }
    });
  }
} catch {
  // ignore
}

/**
 * Resilient loader from localStorage with fallback and corruption prevention
 */
function safeLoadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      console.warn(`[Obragest] Dados inválidos na chave ${key}, a utilizar estrutura predefinida.`);
      return fallback;
    }
    return parsed;
  } catch (err) {
    console.error(`[Obragest] Erro ao interpretar ${key} do armazenamento local:`, err);
    return fallback;
  }
}

/**
 * Safe saver to localStorage handling quota limits and private browsing
 */
function safeSaveToStorage(key: string, value: any): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn(`[Obragest] Limite de quota do localStorage atingido ao gravar ${key}.`);
    } else {
      console.error(`[Obragest] Erro ao gravar chave ${key}:`, err);
    }
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() =>
    safeLoadFromStorage(STORAGE_KEYS.SETTINGS, initialCompanySettings)
  );

  const [clients, setClients] = useState<Client[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.CLIENTS, initialClients)
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.SUPPLIERS, initialSuppliers)
  );

  const [materials, setMaterials] = useState<Material[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.MATERIALS, initialMaterials)
  );

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.MOVEMENTS, initialStockMovements)
  );

  const [proposals, setProposals] = useState<Proposal[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.PROPOSALS, initialProposals)
  );

  const [works, setWorks] = useState<Work[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.WORKS, initialWorks)
  );

  const [workers, setWorkers] = useState<Worker[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.WORKERS, initialWorkers)
  );

  const [workHourLogs, setWorkHourLogs] = useState<WorkHourLog[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.HOUR_LOGS, initialWorkHourLogs)
  );

  const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.PAYMENTS, initialWorkerPayments)
  );

  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpense[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.EXPENSES, initialGeneralExpenses)
  );

  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    safeLoadFromStorage(STORAGE_KEYS.INVOICES, initialInvoices)
  );

  // Sync with localStorage using safe saver
  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.SETTINGS, companySettings);
  }, [companySettings]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.CLIENTS, clients);
  }, [clients]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
  }, [suppliers]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.MATERIALS, materials);
  }, [materials]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.MOVEMENTS, stockMovements);
  }, [stockMovements]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.PROPOSALS, proposals);
  }, [proposals]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.WORKS, works);
  }, [works]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.WORKERS, workers);
  }, [workers]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.HOUR_LOGS, workHourLogs);
  }, [workHourLogs]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.PAYMENTS, workerPayments);
  }, [workerPayments]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.EXPENSES, generalExpenses);
  }, [generalExpenses]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.INVOICES, invoices);
  }, [invoices]);

  // Sem alertas ou notificações ativas
  const notifications: NotificationItem[] = [];

  // COMPANY SETTINGS
  const updateCompanySettings = (updated: Partial<CompanySettings>) => {
    setCompanySettings((prev) => ({ ...prev, ...updated }));
  };

  // CLIENTS
  const addClient = (c: Omit<Client, 'id' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...c,
      id: `cli-${Date.now()}`,
      createdAt: getTodayDateString(),
    };
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  // SUPPLIERS
  const addSupplier = (s: Omit<Supplier, 'id' | 'createdAt'>): Supplier => {
    const newSupplier: Supplier = {
      ...s,
      id: `sup-${Date.now()}`,
      createdAt: getTodayDateString(),
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    return newSupplier;
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  // MATERIALS & STOCK
  const addMaterial = (m: Omit<Material, 'id' | 'totalValue'>): Material => {
    const totalValue = Number((m.quantity * m.averagePrice).toFixed(2));
    const newMaterial: Material = {
      ...m,
      id: `mat-${Date.now()}`,
      totalValue,
    };
    setMaterials((prev) => [newMaterial, ...prev]);
    return newMaterial;
  };

  const updateMaterial = (id: string, updated: Partial<Material>) => {
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const newQty = updated.quantity !== undefined ? updated.quantity : m.quantity;
        const newAvg = updated.averagePrice !== undefined ? updated.averagePrice : m.averagePrice;
        return {
          ...m,
          ...updated,
          totalValue: Number((newQty * newAvg).toFixed(2)),
        };
      })
    );
  };

  const deleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const adjustStock = (
    materialId: string,
    quantityChange: number,
    type: MovementType,
    note: string,
    workId?: string
  ): boolean => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return false;

    const newQty = mat.quantity + quantityChange;
    if (newQty < 0) return false;

    const typeLabels: Record<MovementType, string> = {
      compra: 'Entrada por compra',
      obra: 'Saída para obra',
      ajuste: 'Ajuste manual',
      devolucao: 'Devolução',
    };

    let targetWorkName: string | undefined;
    if (workId) {
      const w = works.find((item) => item.id === workId);
      targetWorkName = w?.name;
    }

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      date: getTodayDateString(),
      materialId: mat.id,
      materialName: mat.name,
      type,
      typeLabel: typeLabels[type],
      quantity: quantityChange,
      unitCost: mat.averagePrice,
      totalCost: Number((quantityChange * mat.averagePrice).toFixed(2)),
      workId,
      workName: targetWorkName,
      note,
      createdAt: getTodayDateString(),
    };

    setStockMovements((prev) => [movement, ...prev]);

    updateMaterial(materialId, {
      quantity: newQty,
    });

    return true;
  };

  // INVOICES & AUTOMATION
  const addInvoice = (inv: Omit<Invoice, 'id' | 'createdAt'>): Invoice => {
    const newInvoice: Invoice = {
      ...inv,
      id: `inv-${Date.now()}`,
      createdAt: getTodayDateString(),
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    return newInvoice;
  };

  const confirmInvoice = (
    invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'status'> & { id?: string }
  ): Invoice => {
    // 1. Ensure supplier is registered or updated
    let supplier = suppliers.find(
      (s) =>
        (s.nif && s.nif.replace(/\s+/g, '') === invoiceData.supplierNif.replace(/\s+/g, '')) ||
        s.name.toLowerCase() === invoiceData.supplierName.toLowerCase()
    );

    if (!supplier) {
      supplier = addSupplier({
        name: invoiceData.supplierName,
        nif: invoiceData.supplierNif,
        address: invoiceData.supplierAddress,
        phone: '',
        email: '',
        notes: `Registado automaticamente via Fatura ${invoiceData.number}`,
      });
    }

    const finalInvoiceId = invoiceData.id || `inv-${Date.now()}`;
    const confirmedInvoice: Invoice = {
      ...invoiceData,
      id: finalInvoiceId,
      supplierId: supplier.id,
      status: 'confirmed',
      createdAt: getTodayDateString(),
    };

    // 2. Add materials to inventory & create movements
    const newMovements: StockMovement[] = [];
    const updatedMaterials = [...materials];

    invoiceData.items.forEach((item, index) => {
      // Find existing material by name or code
      const existingMatIndex = updatedMaterials.findIndex(
        (m) =>
          m.name.toLowerCase().trim() === item.name.toLowerCase().trim() ||
          (item.materialId && m.id === item.materialId)
      );

      let targetMatId = '';
      let targetMatName = item.name;

      if (existingMatIndex >= 0) {
        const existing = updatedMaterials[existingMatIndex];
        targetMatId = existing.id;
        targetMatName = existing.name;

        // Weighted average price calculation
        const currentTotalCost = existing.quantity * existing.averagePrice;
        const newBatchCost = item.quantity * item.unitPrice;
        const newTotalQty = existing.quantity + item.quantity;
        const newAvgPrice =
          newTotalQty > 0
            ? Number(((currentTotalCost + newBatchCost) / newTotalQty).toFixed(2))
            : item.unitPrice;

        updatedMaterials[existingMatIndex] = {
          ...existing,
          quantity: newTotalQty,
          averagePrice: newAvgPrice,
          totalValue: Number((newTotalQty * newAvgPrice).toFixed(2)),
          lastPurchaseDate: invoiceData.date,
          lastSupplier: invoiceData.supplierName,
        };
      } else {
        // Create new material
        const nextMatCode = `MAT-${String(updatedMaterials.length + 1).padStart(3, '0')}`;
        const newMat: Material = {
          id: `mat-${Date.now()}-${index}`,
          code: nextMatCode,
          name: item.name,
          category: item.category || 'Geral',
          unit: item.unit || 'un',
          quantity: item.quantity,
          minStock: Math.max(5, Math.round(item.quantity * 0.2)),
          averagePrice: item.unitPrice,
          totalValue: Number((item.quantity * item.unitPrice).toFixed(2)),
          lastPurchaseDate: invoiceData.date,
          lastSupplier: invoiceData.supplierName,
          notes: item.description || '',
        };
        targetMatId = newMat.id;
        updatedMaterials.push(newMat);
      }

      // Add movement
      newMovements.push({
        id: `mov-${Date.now()}-${index}`,
        date: invoiceData.date,
        materialId: targetMatId,
        materialName: targetMatName,
        type: 'compra',
        typeLabel: 'Entrada por compra',
        quantity: item.quantity,
        unitCost: item.unitPrice,
        totalCost: Number((item.quantity * item.unitPrice).toFixed(2)),
        invoiceId: confirmedInvoice.id,
        invoiceNumber: confirmedInvoice.number,
        note: `Entrada automática da fatura ${confirmedInvoice.number}`,
        createdAt: getTodayDateString(),
      });
    });

    setMaterials(updatedMaterials);
    setStockMovements((prev) => [...newMovements, ...prev]);

    // Save or update invoice in state
    setInvoices((prev) => {
      const exists = prev.some((i) => i.id === confirmedInvoice.id);
      if (exists) {
        return prev.map((i) => (i.id === confirmedInvoice.id ? confirmedInvoice : i));
      }
      return [confirmedInvoice, ...prev];
    });

    return confirmedInvoice;
  };

  const updateInvoice = (
    id: string,
    updatedData: Partial<Invoice>
  ): Invoice => {
    let supplierId = updatedData.supplierId;
    let supplierName = updatedData.supplierName;
    let supplierNif = updatedData.supplierNif;
    let supplierAddress = updatedData.supplierAddress;

    if (supplierId) {
      const s = suppliers.find((sup) => sup.id === supplierId);
      if (s) {
        supplierName = s.name;
        supplierNif = s.nif;
        supplierAddress = s.address;
      }
    }

    let updatedInvoiceResult: Invoice | null = null;

    setInvoices((prev) => {
      return prev.map((inv) => {
        if (inv.id !== id) return inv;
        const updated: Invoice = {
          ...inv,
          ...updatedData,
          supplierId: supplierId || inv.supplierId,
          supplierName: supplierName || inv.supplierName,
          supplierNif: supplierNif !== undefined ? supplierNif : inv.supplierNif,
          supplierAddress: supplierAddress !== undefined ? supplierAddress : inv.supplierAddress,
        };
        updatedInvoiceResult = updated;
        return updated;
      });
    });

    // Keep related stock movements in sync with new invoice details
    setStockMovements((prev) =>
      prev.map((mov) => {
        if (mov.invoiceId === id) {
          return {
            ...mov,
            date: updatedData.date || mov.date,
            invoiceNumber: updatedData.number || mov.invoiceNumber,
            note: `Entrada da fatura ${updatedData.number || mov.invoiceNumber}`,
          };
        }
        return mov;
      })
    );

    return (
      updatedInvoiceResult || {
        ...updatedData,
        id,
      } as Invoice
    );
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  // PROPOSALS
  const getNextProposalNumber = (): string => {
    let maxNum = 0;
    proposals.forEach((p) => {
      const match = p.number.match(/ORC-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    });
    return `ORC-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const addProposal = (
    p: Omit<Proposal, 'id' | 'createdAt' | 'number'> & { number?: string }
  ): Proposal => {
    const number = p.number || getNextProposalNumber();
    const newProposal: Proposal = {
      ...p,
      number,
      id: `orc-${Date.now()}`,
      createdAt: getTodayDateString(),
    };
    setProposals((prev) => [newProposal, ...prev]);
    return newProposal;
  };

  const updateProposal = (id: string, updated: Partial<Proposal>) => {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  };

  const deleteProposal = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    setWorks((prev) =>
      prev.map((w) =>
        w.proposalId === id ? { ...w, proposalId: undefined, proposalNumber: undefined } : w
      )
    );
  };

  const convertProposalToWork = (proposalId: string): Work | null => {
    const prop = proposals.find((p) => p.id === proposalId);
    if (!prop) return null;

    // Só é possível abrir uma obra para cada orçamento
    const existingWork = works.find(
      (w) => w.proposalId === proposalId || (prop.workId && w.id === prop.workId)
    );
    if (existingWork) {
      if (!prop.workId) {
        updateProposal(proposalId, { workId: existingWork.id, status: 'Aceite' });
      }
      return existingWork;
    }

    const startDate = getTodayDateString();
    // Default 60 days
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 60);
    const estimatedEndDate = estDate.toISOString().split('T')[0];

    const newWork: Work = {
      id: `obra-${Date.now()}`,
      name: prop.description ? `${prop.description}` : `Obra ${prop.clientName}`,
      clientId: prop.clientId,
      clientName: prop.clientName,
      address: prop.clientAddress || '',
      startDate,
      estimatedEndDate,
      status: 'Em curso',
      proposalId: prop.id,
      proposalNumber: prop.number,
      revenue: prop.subtotal,
      notes: `Obra gerada automaticamente a partir do orçamento ${prop.number}. ${prop.notes || ''}`,
      otherCosts: [],
      createdAt: getTodayDateString(),
    };

    setWorks((prev) => [newWork, ...prev]);
    updateProposal(proposalId, {
      status: 'Aceite',
      workId: newWork.id,
    });

    return newWork;
  };

  // WORKS
  const addWork = (w: Omit<Work, 'id' | 'createdAt'>): Work => {
    const newWork: Work = {
      ...w,
      id: `obra-${Date.now()}`,
      createdAt: getTodayDateString(),
    };
    setWorks((prev) => [newWork, ...prev]);
    if (newWork.proposalId) {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === newWork.proposalId ? { ...p, workId: newWork.id, status: 'Aceite' } : p
        )
      );
    }
    return newWork;
  };

  const updateWork = (id: string, updated: Partial<Work>) => {
    setWorks((prev) => prev.map((w) => (w.id === id ? { ...w, ...updated } : w)));
  };

  const deleteWork = (id: string) => {
    setWorks((prev) => prev.filter((w) => w.id !== id));
    // Disassociate proposal workId so user can re-associate or create another work
    setProposals((prev) =>
      prev.map((p) => (p.workId === id ? { ...p, workId: undefined } : p))
    );
    setWorkHourLogs((prev) => prev.filter((log) => log.workId !== id));
    setStockMovements((prev) => prev.filter((sm) => sm.workId !== id));
  };

  const addWorkOtherCost = (
    workId: string,
    cost: { description: string; category: string; amount: number; date: string }
  ) => {
    setWorks((prev) =>
      prev.map((w) => {
        if (w.id !== workId) return w;
        const newCost = {
          ...cost,
          id: `oc-${Date.now()}`,
        };
        return {
          ...w,
          otherCosts: [...(w.otherCosts || []), newCost],
        };
      })
    );
  };

  const removeWorkOtherCost = (workId: string, costId: string) => {
    setWorks((prev) =>
      prev.map((w) => {
        if (w.id !== workId) return w;
        return {
          ...w,
          otherCosts: (w.otherCosts || []).filter((c) => c.id !== costId),
        };
      })
    );
  };

  const assignMaterialToWork = (
    workId: string,
    materialId: string,
    quantity: number,
    date?: string,
    note?: string
  ): { success: boolean; error?: string } => {
    const mat = materials.find((m) => m.id === materialId);
    const work = works.find((w) => w.id === workId);

    if (!mat) return { success: false, error: 'Material não encontrado.' };
    if (!work) return { success: false, error: 'Obra não encontrada.' };
    if (quantity <= 0) return { success: false, error: 'A quantidade deve ser superior a zero.' };

    if (quantity > mat.quantity) {
      return {
        success: false,
        error: `Stock insuficiente! Stock disponível: ${mat.quantity} ${mat.unit}. Quantidade pedida: ${quantity} ${mat.unit}.`,
      };
    }

    const movementDate = date || getTodayDateString();
    const costTotal = Number((quantity * mat.averagePrice).toFixed(2));

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      date: movementDate,
      materialId: mat.id,
      materialName: mat.name,
      type: 'obra',
      typeLabel: 'Saída para obra',
      quantity: -quantity,
      unitCost: mat.averagePrice,
      totalCost: -costTotal,
      workId: work.id,
      workName: work.name,
      note: note || `Utilização na obra ${work.name}`,
      createdAt: getTodayDateString(),
    };

    setStockMovements((prev) => [movement, ...prev]);

    updateMaterial(materialId, {
      quantity: mat.quantity - quantity,
    });

    return { success: true };
  };

  // WORKERS & HOURS
  const addWorker = (w: Omit<Worker, 'id'>): Worker => {
    const newWorker: Worker = {
      ...w,
      id: `wor-${Date.now()}`,
    };
    setWorkers((prev) => [newWorker, ...prev]);
    return newWorker;
  };

  const updateWorker = (id: string, updated: Partial<Worker>) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, ...updated } : w)));
  };

  const terminateWorker = (id: string, exitDate: string, exitReason?: string) => {
    const validExitDate = exitDate || getTodayDateString();
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const updatedNotes = exitReason
            ? w.notes
              ? `${w.notes}\n[Saída a ${validExitDate}]: ${exitReason}`
              : `[Saída a ${validExitDate}]: ${exitReason}`
            : w.notes;
          return {
            ...w,
            isActive: false,
            exitDate: validExitDate,
            exitReason: exitReason || w.exitReason,
            notes: updatedNotes,
          };
        }
        return w;
      })
    );
    // CRITICAL: NEVER delete workHourLogs or workerPayments.
    // All history and work costs are kept intact!
  };

  const reactivateWorker = (id: string) => {
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              isActive: true,
              exitDate: undefined,
              exitReason: undefined,
            }
          : w
      )
    );
  };

  const deleteWorker = (id: string, exitDate?: string, exitReason?: string, forcePurge = false) => {
    const hasHistory =
      workHourLogs.some((log) => log.workerId === id) ||
      workerPayments.some((p) => p.workerId === id);

    // If worker has any history (or if forcePurge is false), do NOT wipe out data!
    // Register worker departure with exitDate and keep all history and work costs saved!
    if (hasHistory || !forcePurge) {
      terminateWorker(id, exitDate || getTodayDateString(), exitReason);
      return;
    }

    // Only if worker has 0 history and forcePurge is explicitly true (empty stub worker)
    setWorkers((prev) => prev.filter((w) => w.id !== id));
  };

  const addWorkHourLog = (
    log: Omit<WorkHourLog, 'id' | 'createdAt' | 'totalCost' | 'workerName' | 'workName'>
  ): WorkHourLog => {
    const worker = workers.find((w) => w.id === log.workerId);
    const work = works.find((w) => w.id === log.workId);

    const hRate = log.hourlyRate ?? (log.dailyRate ? log.dailyRate / 8 : (worker?.hourlyRate ?? 10));
    const totalCost = Number((log.totalHours * hRate).toFixed(2));
    const newLog: WorkHourLog = {
      ...log,
      hourlyRate: hRate,
      id: `wh-${Date.now()}`,
      workerName: worker?.name || 'Trabalhador',
      workName: work?.name || 'Obra',
      totalCost,
      createdAt: getTodayDateString(),
    };

    setWorkHourLogs((prev) => [newLog, ...prev]);
    return newLog;
  };

  const deleteWorkHourLog = (id: string) => {
    setWorkHourLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const setWorkerAttendance = (options: {
    date: string;
    workerId: string;
    status: 'presente' | 'meio_dia' | 'falta' | 'folga' | 'remover';
    hours?: number;
    workId?: string;
    absenceReason?: string;
    notes?: string;
  }) => {
    const { date, workerId, status, hours, workId, absenceReason, notes } = options;
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;

    setWorkHourLogs((prev) => {
      // Remove any existing log for this worker on this date
      const filtered = prev.filter((l) => !(l.workerId === workerId && l.date === date));
      if (status === 'remover') {
        return filtered;
      }

      const hourlyRate =
        worker.hourlyRate !== undefined && worker.hourlyRate > 0
          ? worker.hourlyRate
          : worker.dailyRate
          ? Number((worker.dailyRate / 8).toFixed(2))
          : 10;
      const dailyRate = Number((hourlyRate * 8).toFixed(2));

      let daysCount = 0;
      let totalHours = 0;
      let targetWorkId: string | undefined = undefined;
      let workName: string | undefined = undefined;

      if (status === 'presente') {
        totalHours = hours !== undefined ? Number(hours) : 8.0;
        daysCount = Number((totalHours / 8).toFixed(2));
        if (workId) {
          const wObj = works.find((w) => w.id === workId);
          targetWorkId = workId;
          workName = wObj?.name || 'Obra';
        } else {
          targetWorkId = undefined;
          workName = 'Sem obra associada';
        }
      } else if (status === 'meio_dia') {
        totalHours = hours !== undefined ? Number(hours) : 4.0;
        daysCount = Number((totalHours / 8).toFixed(2));
        if (workId) {
          const wObj = works.find((w) => w.id === workId);
          targetWorkId = workId;
          workName = wObj?.name || 'Obra';
        } else {
          targetWorkId = undefined;
          workName = 'Sem obra associada';
        }
      } else if (status === 'falta') {
        daysCount = 0;
        totalHours = 0;
        targetWorkId = undefined;
        workName = undefined;
      } else if (status === 'folga') {
        daysCount = 0;
        totalHours = 0;
        targetWorkId = undefined;
        workName = undefined;
      }

      const totalCost = Number((totalHours * hourlyRate).toFixed(2));

      const newLog: WorkHourLog = {
        id: `wh-${workerId}-${date.replace(/-/g, '')}-${Date.now()}`,
        workerId: worker.id,
        workerName: worker.name,
        workId: targetWorkId,
        workName,
        date,
        startTime: status === 'presente' ? '08:00' : status === 'meio_dia' ? '08:00' : '',
        endTime: status === 'presente' ? '17:00' : status === 'meio_dia' ? '12:00' : '',
        breakHours: status === 'presente' ? 1 : 0,
        totalHours,
        hourlyRate,
        dailyRate,
        daysCount,
        status,
        absenceReason: status === 'falta' ? (absenceReason || 'Falta') : undefined,
        totalCost,
        notes: notes || (status === 'falta' ? absenceReason : status === 'folga' ? 'Folga' : 'Presença diária'),
        createdAt: getTodayDateString(),
      };

      return [newLog, ...filtered];
    });
  };

  const setWorkerDailyAttendance = (
    date: string,
    workerId: string,
    present: boolean,
    workId?: string,
    hours: number = 8,
    notes?: string
  ) => {
    if (!present) {
      setWorkerAttendance({
        date,
        workerId,
        status: 'remover',
      });
      return;
    }

    const isHalfDay = hours <= 4 && hours > 0;
    setWorkerAttendance({
      date,
      workerId,
      status: isHalfDay ? 'meio_dia' : 'presente',
      hours,
      workId,
      notes,
    });
  };

  const batchSetDailyAttendance = (
    date: string,
    attendances: Array<{
      workerId: string;
      present: boolean;
      workId?: string;
      hours?: number;
    }>
  ) => {
    attendances.forEach((att) => {
      if (att.present) {
        const isHalfDay = att.hours && att.hours <= 4 && att.hours > 0;
        setWorkerAttendance({
          date,
          workerId: att.workerId,
          status: isHalfDay ? 'meio_dia' : 'presente',
          hours: att.hours || 8,
          workId: att.workId,
        });
      } else {
        setWorkerAttendance({
          date,
          workerId: att.workerId,
          status: 'remover',
        });
      }
    });
  };

  const addWorkerPayment = (
    pay: Omit<WorkerPayment, 'id' | 'createdAt'>
  ): WorkerPayment => {
    const newPay: WorkerPayment = {
      ...pay,
      id: `pay-${Date.now()}`,
      createdAt: getTodayDateString(),
    };
    setWorkerPayments((prev) => [newPay, ...prev]);
    return newPay;
  };

  const deleteWorkerPayment = (id: string) => {
    setWorkerPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // GENERAL EXPENSES
  const addGeneralExpense = (
    exp: Omit<GeneralExpense, 'id' | 'createdAt'>
  ): GeneralExpense => {
    const newExp: GeneralExpense = {
      ...exp,
      id: `exp-${Date.now()}`,
      createdAt: getTodayDateString(),
    };
    setGeneralExpenses((prev) => [newExp, ...prev]);
    return newExp;
  };

  const updateGeneralExpense = (id: string, updated: Partial<GeneralExpense>) => {
    setGeneralExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  };

  const deleteGeneralExpense = (id: string) => {
    setGeneralExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // RESET
  const resetToDemoData = () => {
    setCompanySettings(initialCompanySettings);
    setClients(initialClients);
    setSuppliers(initialSuppliers);
    setMaterials(initialMaterials);
    setStockMovements(initialStockMovements);
    setProposals(initialProposals);
    setWorks(initialWorks);
    setWorkers(initialWorkers);
    setWorkHourLogs(initialWorkHourLogs);
    setWorkerPayments(initialWorkerPayments);
    setGeneralExpenses(initialGeneralExpenses);
    setInvoices(initialInvoices);
    localStorage.clear();
  };

  // BACKUP & RESTORE
  const exportBackup = () => {
    try {
      const backupData = {
        appName: 'Obragest',
        version: 2,
        exportedAt: new Date().toISOString(),
        companySettings,
        clients,
        suppliers,
        invoices,
        materials,
        stockMovements,
        proposals,
        works,
        workers,
        workHourLogs,
        workerPayments,
        generalExpenses,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      downloadAnchor.href = url;
      downloadAnchor.download = `copia_seguranca_obragest_${today}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar cópia de segurança:', err);
    }
  };

  const importBackup = (backupJson: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(backupJson);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'O ficheiro selecionado não contém dados válidos.' };
      }

      if (parsed.companySettings) {
        setCompanySettings(parsed.companySettings);
        safeSaveToStorage(STORAGE_KEYS.SETTINGS, parsed.companySettings);
      }
      if (Array.isArray(parsed.clients)) {
        setClients(parsed.clients);
        safeSaveToStorage(STORAGE_KEYS.CLIENTS, parsed.clients);
      }
      if (Array.isArray(parsed.suppliers)) {
        setSuppliers(parsed.suppliers);
        safeSaveToStorage(STORAGE_KEYS.SUPPLIERS, parsed.suppliers);
      }
      if (Array.isArray(parsed.invoices)) {
        setInvoices(parsed.invoices);
        safeSaveToStorage(STORAGE_KEYS.INVOICES, parsed.invoices);
      }
      if (Array.isArray(parsed.materials)) {
        setMaterials(parsed.materials);
        safeSaveToStorage(STORAGE_KEYS.MATERIALS, parsed.materials);
      }
      if (Array.isArray(parsed.stockMovements)) {
        setStockMovements(parsed.stockMovements);
        safeSaveToStorage(STORAGE_KEYS.MOVEMENTS, parsed.stockMovements);
      }
      if (Array.isArray(parsed.proposals)) {
        setProposals(parsed.proposals);
        safeSaveToStorage(STORAGE_KEYS.PROPOSALS, parsed.proposals);
      }
      if (Array.isArray(parsed.works)) {
        setWorks(parsed.works);
        safeSaveToStorage(STORAGE_KEYS.WORKS, parsed.works);
      }
      if (Array.isArray(parsed.workers)) {
        setWorkers(parsed.workers);
        safeSaveToStorage(STORAGE_KEYS.WORKERS, parsed.workers);
      }
      if (Array.isArray(parsed.workHourLogs)) {
        setWorkHourLogs(parsed.workHourLogs);
        safeSaveToStorage(STORAGE_KEYS.HOUR_LOGS, parsed.workHourLogs);
      }
      if (Array.isArray(parsed.workerPayments)) {
        setWorkerPayments(parsed.workerPayments);
        safeSaveToStorage(STORAGE_KEYS.PAYMENTS, parsed.workerPayments);
      }
      if (Array.isArray(parsed.generalExpenses)) {
        setGeneralExpenses(parsed.generalExpenses);
        safeSaveToStorage(STORAGE_KEYS.EXPENSES, parsed.generalExpenses);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Erro ao restaurar cópia de segurança: ' + (err.message || 'JSON inválido') };
    }
  };

  return (
    <AppContext.Provider
      value={{
        companySettings,
        clients,
        suppliers,
        materials,
        stockMovements,
        proposals,
        works,
        workers,
        workHourLogs,
        workerPayments,
        generalExpenses,
        invoices,
        notifications,

        updateCompanySettings,

        addClient,
        updateClient,
        deleteClient,

        addSupplier,
        updateSupplier,
        deleteSupplier,

        addMaterial,
        updateMaterial,
        deleteMaterial,
        adjustStock,

        addInvoice,
        confirmInvoice,
        updateInvoice,
        deleteInvoice,

        getNextProposalNumber,
        addProposal,
        updateProposal,
        deleteProposal,
        convertProposalToWork,

        addWork,
        updateWork,
        deleteWork,
        addWorkOtherCost,
        removeWorkOtherCost,
        assignMaterialToWork,

        addWorker,
        updateWorker,
        deleteWorker,
        terminateWorker,
        reactivateWorker,
        addWorkHourLog,
        deleteWorkHourLog,
        setWorkerDailyAttendance,
        setWorkerAttendance,
        batchSetDailyAttendance,
        addWorkerPayment,
        deleteWorkerPayment,

        addGeneralExpense,
        updateGeneralExpense,
        deleteGeneralExpense,

        resetToDemoData,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return context;
};

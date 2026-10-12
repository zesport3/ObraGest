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
} from '../types';

export const initialCompanySettings: CompanySettings = {
  name: '',
  commercialName: '',
  nif: '',
  address: '',
  postalCode: '',
  city: '',
  phone: '',
  mobile: '',
  email: '',
  website: '',
  otherContacts: '',
  logoUrl: '',
  defaultPaymentTerms: '',
  defaultProposalText: '',
  defaultNotes: '',
  defaultVatRate: 23,
};

export const initialClients: Client[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialMaterials: Material[] = [];
export const initialStockMovements: StockMovement[] = [];
export const initialProposals: Proposal[] = [];
export const initialWorks: Work[] = [];
export const initialWorkers: Worker[] = [];
export const initialWorkHourLogs: WorkHourLog[] = [];
export const initialWorkerPayments: WorkerPayment[] = [];
export const initialGeneralExpenses: GeneralExpense[] = [];
export const initialInvoices: Invoice[] = [];

export type PeriodFilter =
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export type QuarterFilter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface CompanySettings {
  name: string;
  commercialName: string;
  nif: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  otherContacts: string;
  logoUrl: string;
  defaultPaymentTerms: string;
  defaultProposalText: string;
  defaultNotes: string;
  defaultVatRate: number;
}

export interface Client {
  id: string;
  name: string;
  nif: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  nif: string;
  address: string;
  phone: string;
  email: string;
  category?: string;
  notes: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  materialId?: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  vatRate: number;
  total: number;
  category: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  supplierId: string;
  supplierName: string;
  supplierNif: string;
  supplierAddress: string;
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  status: 'confirmed' | 'draft';
  documentName?: string;
  items: InvoiceItem[];
  createdAt: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  averagePrice: number;
  totalValue: number;
  lastPurchaseDate?: string;
  lastSupplier?: string;
  notes?: string;
}

export type MovementType = 'compra' | 'obra' | 'ajuste' | 'devolucao';

export interface StockMovement {
  id: string;
  date: string;
  materialId: string;
  materialName: string;
  type: MovementType;
  typeLabel: string;
  quantity: number; // positive for entries, negative for exits
  unitCost: number;
  totalCost: number;
  workId?: string;
  workName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  note: string;
  createdAt: string;
}

export type ProposalStatus =
  | 'Rascunho'
  | 'Enviado'
  | 'Pendente'
  | 'Aceite'
  | 'Recusado'
  | 'Expirado';

export interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  vatRate: number;
  total: number;
}

export interface Proposal {
  id: string;
  number: string; // e.g. "ORC-0001"
  date: string;
  validUntil: string;
  clientId: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  description: string;
  paymentTerms: string;
  notes: string;
  status: ProposalStatus;
  items: ProposalItem[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  total: number;
  workId?: string;
  createdAt: string;
}

export type WorkStatus =
  | 'Planeada'
  | 'Em curso'
  | 'Suspensa'
  | 'Concluída'
  | 'Cancelada';

export interface WorkOtherCost {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

export interface Work {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  address: string;
  startDate: string;
  estimatedEndDate: string;
  completionDate?: string;
  status: WorkStatus;
  proposalId?: string;
  proposalNumber?: string;
  revenue: number;
  notes: string;
  otherCosts: WorkOtherCost[];
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  nif: string;
  contact: string;
  category: string;
  hireDate: string;
  exitDate?: string; // Data de saída da empresa
  exitReason?: string; // Motivo de saída
  hourlyRate: number; // in €
  dailyRate?: number; // valor por dia in €
  notes: string;
  isActive: boolean;
}

export type AttendanceStatus = 'presente' | 'meio_dia' | 'falta' | 'folga';

export interface WorkHourLog {
  id: string;
  workerId: string;
  workerName: string;
  workId?: string; // opcional: permite presença sem associar a obra
  workName?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // "08:00"
  endTime?: string; // "17:00"
  breakHours?: number; // 1.0
  totalHours: number; // 8.0 (1 dia), 4.0 (meio dia), 0 (falta/folga)
  hourlyRate?: number;
  dailyRate?: number; // valor por dia (€/dia)
  daysCount?: number; // 1.0 (dia completo), 0.5 (meio dia), 0 (falta/folga)
  status?: AttendanceStatus; // 'presente' | 'meio_dia' | 'falta' | 'folga'
  absenceReason?: string; // motivo/observação da falta
  totalCost: number; // custo apurado (ex: daysCount * dailyRate)
  notes?: string;
  createdAt: string;
}

export interface WorkerPayment {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  amount: number;
  paymentMethod: string;
  notes: string;
  createdAt: string;
}

export interface GeneralExpense {
  id: string;
  date: string;
  supplier: string;
  category: string;
  description: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  linkTab?: string;
  linkId?: string;
  date: string;
}

export type UserRole = 'admin' | 'sales';

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  marketId: string;
  displayName: string;
  createdAt: Date;
}

export interface Market {
  id: string;
  name: string;
  region: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  marketId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastDiscount?: number;
  productMargins?: Record<string, number>;
  purchaseHistory?: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  margin: number;
  total: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  marketId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'confirmed';
  whatsappSent: boolean;
  signatureUrl?: string;
  pdfUrl?: string;
  notes?: string;
}

export interface DeletionLog {
  id: string;
  deletedBy: string;
  entityType: string;
  entityId: string;
  reason: string;
  timestamp: Date;
  marketId: string;
}

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  documentId: string;
  data: any;
  timestamp: Date;
  retries: number;
}

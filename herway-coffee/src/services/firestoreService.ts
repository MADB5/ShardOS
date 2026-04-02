import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Customer, Invoice, AppUser, Market, DeletionLog } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function toDate(value: any): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

function docToCustomer(id: string, data: any): Customer {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Customer;
}

function docToInvoice(id: string, data: any): Invoice {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Invoice;
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getCustomers(marketId?: string, isAdmin = false): Promise<Customer[]> {
  const ref = collection(db, 'customers');
  const q =
    isAdmin || !marketId
      ? query(ref, orderBy('createdAt', 'desc'))
      : query(ref, where('marketId', '==', marketId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToCustomer(d.id, d.data()));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, 'customers', id));
  if (!snap.exists()) return null;
  return docToCustomer(snap.id, snap.data());
}

export async function createCustomer(data: Omit<Customer, 'id'>): Promise<Customer> {
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'customers'), payload);
  return { ...data, id: ref.id };
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  await updateDoc(doc(db, 'customers', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'customers', id));
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(marketId?: string, isAdmin = false): Promise<Invoice[]> {
  const ref = collection(db, 'invoices');
  const q =
    isAdmin || !marketId
      ? query(ref, orderBy('createdAt', 'desc'))
      : query(ref, where('marketId', '==', marketId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToInvoice(d.id, d.data()));
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, 'invoices', id));
  if (!snap.exists()) return null;
  return docToInvoice(snap.id, snap.data());
}

export async function createInvoice(data: Omit<Invoice, 'id'>): Promise<Invoice> {
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'invoices'), payload);
  return { ...data, id: ref.id };
}

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<void> {
  await updateDoc(doc(db, 'invoices', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInvoice(id: string): Promise<void> {
  await deleteDoc(doc(db, 'invoices', id));
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      uid: d.id,
      createdAt: toDate(data.createdAt),
    } as AppUser;
  });
}

export async function updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
}

// ── Markets ──────────────────────────────────────────────────────────────────

export async function getMarkets(): Promise<Market[]> {
  const snap = await getDocs(collection(db, 'markets'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Market));
}

export async function createMarket(data: Omit<Market, 'id'>): Promise<Market> {
  const ref = await addDoc(collection(db, 'markets'), data);
  return { id: ref.id, ...data };
}

// ── Deletion Logs ─────────────────────────────────────────────────────────────

export async function logDeletion(log: DeletionLog): Promise<void> {
  await setDoc(doc(db, 'deletionLogs', log.id), {
    ...log,
    timestamp: serverTimestamp(),
  });
}

import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { SyncQueueItem, Customer, Invoice } from '../types';
import { saveCustomers, saveInvoices } from './storageService';

const MAX_RETRIES = 3;

export async function syncToFirestore(
  db: Firestore,
  syncQueue: SyncQueueItem[],
  clearItem: (id: string) => Promise<void>,
  updateRetry?: (id: string, retries: number) => Promise<void>,
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const item of syncQueue) {
    if (item.retries >= MAX_RETRIES) {
      failed++;
      continue;
    }
    try {
      const ref = doc(db, item.collection, item.documentId);
      if (item.operation === 'create' || item.operation === 'update') {
        const payload = { ...item.data };
        // Convert Date objects to Firestore Timestamps for proper storage
        for (const key of Object.keys(payload)) {
          if (payload[key] instanceof Date) {
            payload[key] = Timestamp.fromDate(payload[key]);
          }
        }
        await setDoc(ref, payload, { merge: item.operation === 'update' });
      } else if (item.operation === 'delete') {
        await deleteDoc(ref);
      }
      await clearItem(item.id);
      succeeded++;
    } catch (err) {
      console.warn(`Sync failed for ${item.id}:`, err);
      if (updateRetry) {
        await updateRetry(item.id, item.retries + 1);
      }
      failed++;
    }
  }

  return { succeeded, failed };
}

export async function fetchFromFirestore(
  db: Firestore,
  marketId: string,
  role: 'admin' | 'sales',
): Promise<{ customers: Customer[]; invoices: Invoice[] }> {
  const customersRef = collection(db, 'customers');
  const invoicesRef = collection(db, 'invoices');

  const customerQuery =
    role === 'admin'
      ? query(customersRef, orderBy('updatedAt', 'desc'))
      : query(customersRef, where('marketId', '==', marketId), orderBy('updatedAt', 'desc'));

  const invoiceQuery =
    role === 'admin'
      ? query(invoicesRef, orderBy('updatedAt', 'desc'))
      : query(invoicesRef, where('marketId', '==', marketId), orderBy('updatedAt', 'desc'));

  const [customerSnap, invoiceSnap] = await Promise.all([
    getDocs(customerQuery),
    getDocs(invoiceQuery),
  ]);

  const customers: Customer[] = customerSnap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    } as Customer;
  });

  const invoices: Invoice[] = invoiceSnap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    } as Invoice;
  });

  await Promise.all([saveCustomers(customers), saveInvoices(invoices)]);

  return { customers, invoices };
}

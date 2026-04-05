import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer, Invoice, SyncQueueItem, DeletionLog } from '../types';

const KEYS = {
  CUSTOMERS: '@hw_customers',
  INVOICES: '@hw_invoices',
  SYNC_QUEUE: '@hw_sync_queue',
  DELETION_LOGS: '@hw_deletion_logs',
};

export async function saveCustomers(customers: Customer[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
}

export async function getCustomers(): Promise<Customer[]> {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOMERS);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as any[];
  return parsed.map((c) => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  }));
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
}

export async function getInvoices(): Promise<Invoice[]> {
  const raw = await AsyncStorage.getItem(KEYS.INVOICES);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as any[];
  return parsed.map((inv) => ({
    ...inv,
    createdAt: new Date(inv.createdAt),
    updatedAt: new Date(inv.updatedAt),
  }));
}

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const existing = await getSyncQueue();
  existing.push(item);
  await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(existing));
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const raw = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as any[];
  return parsed.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));
}

export async function clearSyncQueueItem(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const updated = queue.filter((item) => item.id !== id);
  await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(updated));
}

export async function saveDeletionLog(log: DeletionLog): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.DELETION_LOGS);
  const existing: DeletionLog[] = raw ? JSON.parse(raw) : [];
  existing.push(log);
  await AsyncStorage.setItem(KEYS.DELETION_LOGS, JSON.stringify(existing));
}

export async function getDeletionLogs(): Promise<DeletionLog[]> {
  const raw = await AsyncStorage.getItem(KEYS.DELETION_LOGS);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as any[];
  return parsed.map((log) => ({ ...log, timestamp: new Date(log.timestamp) }));
}

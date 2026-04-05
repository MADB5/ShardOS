import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Invoice } from '../types';

export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatDate(date: Date): string {
  return format(date, 'MMM dd, yyyy');
}

export function formatDateTime(date: Date): string {
  return format(date, 'MMM dd, yyyy HH:mm');
}

export function getMonthlyInvoices(invoices: Invoice[]): Invoice[] {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return invoices.filter((inv) =>
    isWithinInterval(new Date(inv.createdAt), { start, end }),
  );
}

export function calculateMonthlyRevenue(invoices: Invoice[]): number {
  return getMonthlyInvoices(invoices).reduce((sum, inv) => sum + inv.grandTotal, 0);
}

export function getStatusColor(status: Invoice['status']): string {
  switch (status) {
    case 'confirmed':
      return '#27AE60';
    case 'sent':
      return '#F39C12';
    case 'draft':
    default:
      return '#95A5A6';
  }
}

export function truncate(text: string, maxLength = 30): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export function parseFirebaseError(code: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later';
    case 'auth/network-request-failed':
      return 'No internet connection';
    default:
      return 'Something went wrong. Please try again.';
  }
}

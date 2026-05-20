import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import SyncIndicator from '../../components/SyncIndicator';
import QuickActions from '../../components/QuickActions';
import {
  getCustomers as getLocalCustomers,
  getInvoices as getLocalInvoices,
  getSyncQueue,
} from '../../services/storageService';
import { fetchFromFirestore } from '../../services/syncService';
import { syncToFirestore } from '../../services/syncService';
import { db } from '../../config/firebase';
import { Customer, Invoice } from '../../types';
import { formatCurrency, formatDate, getMonthlyInvoices, calculateMonthlyRevenue, getStatusColor } from '../../utils/helpers';
import { format } from 'date-fns';

type SyncStatus = 'online' | 'syncing' | 'offline' | 'error';

export default function SalesDashboard({ navigation }: any) {
  const { user, isOnline } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadLocal() {
        const [c, inv, queue] = await Promise.all([
          getLocalCustomers(),
          getLocalInvoices(),
          getSyncQueue(),
        ]);
        const filtered = c.filter((x) => x.marketId === user?.marketId);
        const filteredInv = inv.filter((x) => x.marketId === user?.marketId);
        setCustomers(filtered);
        setInvoices(filteredInv);
        setPendingCount(queue.length);
      }

      async function syncData() {
        if (!user) return;
        setSyncStatus('syncing');
        try {
          const queue = await getSyncQueue();
          if (queue.length > 0 && isOnline) {
            await syncToFirestore(db, queue, async (id) => {
              const { clearSyncQueueItem } = await import('../../services/storageService');
              await clearSyncQueueItem(id);
            });
          }
          if (isOnline) {
            await fetchFromFirestore(db, user.marketId, user.role);
          }
          await loadLocal();
          setSyncStatus(isOnline ? 'online' : 'offline');
        } catch {
          setSyncStatus('error');
        }
      }

      async function init() {
        setLoading(true);
        await loadLocal();
        await syncData();
        setLoading(false);
      }
      init();
    }, [user, isOnline]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const queue = await getSyncQueue();
      setSyncStatus('syncing');
      if (queue.length > 0 && isOnline) {
        await syncToFirestore(db, queue, async (id) => {
          const { clearSyncQueueItem } = await import('../../services/storageService');
          await clearSyncQueueItem(id);
        });
      }
      if (isOnline && user) {
        await fetchFromFirestore(db, user.marketId, user.role);
      }
      const [c, inv, q] = await Promise.all([getLocalCustomers(), getLocalInvoices(), getSyncQueue()]);
      setCustomers(c.filter((x) => x.marketId === user?.marketId));
      setInvoices(inv.filter((x) => x.marketId === user?.marketId));
      setPendingCount(q.length);
      setSyncStatus(isOnline ? 'online' : 'offline');
    } catch {
      setSyncStatus('error');
    }
    setRefreshing(false);
  }

  const monthlyInvoices = getMonthlyInvoices(invoices);
  const monthlyRevenue = calculateMonthlyRevenue(invoices);
  const recentInvoices = invoices.slice(0, 5);

  const quickActions = [
    {
      label: 'New Invoice',
      icon: 'receipt-outline' as const,
      color: '#5D3A1A',
      onPress: () => navigation.navigate('InvoiceForm'),
    },
    {
      label: 'Add Customer',
      icon: 'person-add-outline' as const,
      color: '#D4A96A',
      onPress: () => navigation.navigate('CustomerForm'),
    },
    {
      label: 'My Invoices',
      icon: 'document-text-outline' as const,
      color: '#27AE60',
      onPress: () => navigation.navigate('Invoices'),
    },
    {
      label: 'Customers',
      icon: 'people-outline' as const,
      color: '#3498DB',
      onPress: () => navigation.navigate('Customers'),
    },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5D3A1A" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5D3A1A" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.displayName?.split(' ')[0]} 👋</Text>
          <Text style={styles.marketName}>☕ {user?.marketId || 'Your Market'}</Text>
        </View>
        <SyncIndicator status={syncStatus} pendingCount={pendingCount} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: '#5D3A1A' }]}>
          <Text style={styles.statNumber}>{customers.length}</Text>
          <Text style={styles.statLabel}>Customers</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#D4A96A' }]}>
          <Text style={styles.statNumber}>{invoices.length}</Text>
          <Text style={styles.statLabel}>All Invoices</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#27AE60' }]}>
          <Text style={[styles.statNumber, { fontSize: 16 }]}>{formatCurrency(monthlyRevenue)}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
      </View>

      {/* Monthly Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>📊 This Month</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{monthlyInvoices.length}</Text>
            <Text style={styles.summaryLabel}>Invoices</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {monthlyInvoices.filter((i) => i.status === 'confirmed').length}
            </Text>
            <Text style={styles.summaryLabel}>Confirmed</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#27AE60' }]}>
              {formatCurrency(monthlyRevenue)}
            </Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
      <QuickActions actions={quickActions} />

      {/* Recent Invoices */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🧾 Recent Invoices</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Invoices')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentInvoices.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No invoices yet. Create your first one!</Text>
        </View>
      ) : (
        recentInvoices.map((invoice) => (
          <TouchableOpacity
            key={invoice.id}
            style={styles.invoiceCard}
            onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
            activeOpacity={0.75}
          >
            <View style={styles.invoiceLeft}>
              <Text style={styles.invoiceCustomer}>{invoice.customerName}</Text>
              <Text style={styles.invoiceDate}>{formatDate(invoice.createdAt)}</Text>
            </View>
            <View style={styles.invoiceRight}>
              <Text style={styles.invoiceAmount}>{formatCurrency(invoice.grandTotal)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                  {invoice.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6EE' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#2C1810' },
  marketName: { fontSize: 14, color: '#D4A96A', fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#2C1810' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, fontWeight: '500' },
  summaryCard: {
    backgroundColor: '#5D3A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: 20, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2C1810', marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 24,
  },
  viewAll: { fontSize: 14, color: '#D4A96A', fontWeight: '600' },
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  invoiceLeft: { flex: 1 },
  invoiceCustomer: { fontSize: 15, fontWeight: '600', color: '#2C1810' },
  invoiceDate: { fontSize: 12, color: '#888', marginTop: 3 },
  invoiceRight: { alignItems: 'flex-end' },
  invoiceAmount: { fontSize: 16, fontWeight: '700', color: '#5D3A1A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#888', fontSize: 14 },
});

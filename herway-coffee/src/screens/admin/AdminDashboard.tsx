import React, { useState, useCallback } from 'react';
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
import { getCustomers as getFirestoreCustomers, getInvoices as getFirestoreInvoices, getMarkets, getUsers } from '../../services/firestoreService';
import { Customer, Invoice, Market, AppUser } from '../../types';
import { formatCurrency, calculateMonthlyRevenue, getMonthlyInvoices } from '../../utils/helpers';

export default function AdminDashboard({ navigation }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [c, inv, m, u] = await Promise.all([
        getFirestoreCustomers(undefined, true),
        getFirestoreInvoices(undefined, true),
        getMarkets(),
        getUsers(),
      ]);
      setCustomers(c);
      setInvoices(inv);
      setMarkets(m);
      setUsers(u);
    } catch (err) {
      console.warn('Admin dashboard load error:', err);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, []),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const monthlyRevenue = calculateMonthlyRevenue(invoices);
  const monthlyInvoices = getMonthlyInvoices(invoices);

  // Market breakdown
  const marketStats = markets.map((market) => {
    const mCustomers = customers.filter((c) => c.marketId === market.id);
    const mInvoices = invoices.filter((i) => i.marketId === market.id);
    const mRevenue = mInvoices.reduce((s, i) => s + i.grandTotal, 0);
    return { market, customers: mCustomers.length, invoices: mInvoices.length, revenue: mRevenue };
  });

  // Top customers
  const customerRevenue = customers.map((c) => ({
    customer: c,
    revenue: invoices.filter((i) => i.customerId === c.id).reduce((s, i) => s + i.grandTotal, 0),
  }));
  const topCustomers = customerRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 5);

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
        <Text style={styles.title}>☕ Admin Dashboard</Text>
        <Text style={styles.subtitle}>Herway Coffee — All Markets</Text>
      </View>

      {/* Overview Stats */}
      <View style={styles.statsGrid}>
        <StatCard label="Total Customers" value={String(customers.length)} color="#5D3A1A" icon="👥" />
        <StatCard label="Total Invoices" value={String(invoices.length)} color="#D4A96A" icon="🧾" />
        <StatCard label="Monthly Revenue" value={formatCurrency(monthlyRevenue)} color="#27AE60" icon="💰" />
        <StatCard label="Active Users" value={String(users.length)} color="#3498DB" icon="👤" />
        <StatCard label="Markets" value={String(markets.length)} color="#9B59B6" icon="🏪" />
        <StatCard label="This Month" value={String(monthlyInvoices.length)} color="#E67E22" icon="📊" />
      </View>

      {/* Market Breakdown */}
      {marketStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 Market Breakdown</Text>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 2 }]}>Market</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Cust.</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Inv.</Text>
              <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Revenue</Text>
            </View>
            {marketStats.map((ms, idx) => (
              <View key={ms.market.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tdText, { flex: 2, fontWeight: '600' }]}>{ms.market.name}</Text>
                <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>{ms.customers}</Text>
                <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>{ms.invoices}</Text>
                <Text style={[styles.tdText, { flex: 1.5, textAlign: 'right', color: '#27AE60', fontWeight: '700' }]}>
                  {formatCurrency(ms.revenue)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Top Customers</Text>
          {topCustomers.map(({ customer, revenue }, idx) => (
            <View key={customer.id} style={styles.topCustomerRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>
              <Text style={styles.topCustomerName}>{customer.name}</Text>
              <Text style={styles.topCustomerRevenue}>{formatCurrency(revenue)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Navigation */}
      <View style={styles.navGrid}>
        <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('Users')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>User Management</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('Analytics')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Market Analytics</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[sStyles.card, { borderTopColor: color }]}>
      <Text style={sStyles.icon}>{icon}</Text>
      <Text style={[sStyles.value, { color }]}>{value}</Text>
      <Text style={sStyles.label}>{label}</Text>
    </View>
  );
}

const sStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: { fontSize: 24, marginBottom: 6 },
  value: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  label: { fontSize: 11, color: '#888', fontWeight: '500', textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6EE' },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#2C1810' },
  subtitle: { fontSize: 14, color: '#D4A96A', fontWeight: '600', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2C1810', marginBottom: 12 },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tableHeader: { flexDirection: 'row', backgroundColor: '#5D3A1A', paddingHorizontal: 14, paddingVertical: 10 },
  thText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#FDF6EE' },
  tdText: { fontSize: 13, color: '#2C1810' },
  topCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5D3A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  topCustomerName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#2C1810' },
  topCustomerRevenue: { fontSize: 15, fontWeight: '800', color: '#27AE60' },
  navGrid: { flexDirection: 'row', gap: 12 },
  navCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8D5C0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  navIcon: { fontSize: 32, marginBottom: 8 },
  navLabel: { fontSize: 13, fontWeight: '700', color: '#5D3A1A', textAlign: 'center' },
});

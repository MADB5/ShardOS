import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCustomers as getFirestoreCustomers, getInvoices as getFirestoreInvoices, getMarkets } from '../../services/firestoreService';
import { Customer, Invoice, Market } from '../../types';
import { formatCurrency, getMonthlyInvoices } from '../../utils/helpers';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function MarketAnalytics() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [c, inv, m] = await Promise.all([
        getFirestoreCustomers(undefined, true),
        getFirestoreInvoices(undefined, true),
        getMarkets(),
      ]);
      setCustomers(c);
      setInvoices(inv);
      setMarkets(m);
    } catch (err) {
      console.warn('Analytics load error:', err);
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

  // Build last 6 months data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthInvoices = invoices.filter((inv) =>
      isWithinInterval(new Date(inv.createdAt), { start, end }),
    );
    return {
      month: format(date, 'MMM yy'),
      invoices: monthInvoices.length,
      revenue: monthInvoices.reduce((s, i) => s + i.grandTotal, 0),
    };
  });

  const totalRevenue = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const confirmedRevenue = invoices
    .filter((i) => i.status === 'confirmed')
    .reduce((s, i) => s + i.grandTotal, 0);
  const avgInvoiceValue =
    invoices.length > 0 ? totalRevenue / invoices.length : 0;

  const marketRevenue = markets
    .map((m) => ({
      market: m,
      revenue: invoices
        .filter((i) => i.marketId === m.id)
        .reduce((s, i) => s + i.grandTotal, 0),
      invoiceCount: invoices.filter((i) => i.marketId === m.id).length,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = Math.max(...marketRevenue.map((m) => m.revenue), 1);

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
      <Text style={styles.title}>📊 Market Analytics</Text>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <SummaryCard label="Total Revenue" value={formatCurrency(totalRevenue)} color="#5D3A1A" />
        <SummaryCard label="Confirmed" value={formatCurrency(confirmedRevenue)} color="#27AE60" />
        <SummaryCard label="Avg Invoice" value={formatCurrency(avgInvoiceValue)} color="#D4A96A" />
      </View>

      {/* Monthly Revenue Chart (simple bar chart) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Monthly Revenue (Last 6 Months)</Text>
        <View style={styles.chartCard}>
          {monthlyData.map((data) => {
            const maxRev = Math.max(...monthlyData.map((d) => d.revenue), 1);
            const barHeight = Math.max((data.revenue / maxRev) * 100, 4);
            return (
              <View key={data.month} style={styles.barContainer}>
                <Text style={styles.barValue}>{formatCurrency(data.revenue)}</Text>
                <View style={[styles.bar, { height: barHeight }]} />
                <Text style={styles.barLabel}>{data.month}</Text>
                <Text style={styles.barCount}>{data.invoices} inv</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Market Revenue Breakdown */}
      {marketRevenue.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 Revenue by Market</Text>
          {marketRevenue.map((item) => (
            <View key={item.market.id} style={styles.marketRow}>
              <View style={styles.marketInfo}>
                <Text style={styles.marketName}>{item.market.name}</Text>
                <Text style={styles.marketSub}>{item.invoiceCount} invoices</Text>
              </View>
              <View style={styles.marketBarWrap}>
                <View
                  style={[
                    styles.marketBar,
                    { width: `${(item.revenue / maxRevenue) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.marketRevenue}>{formatCurrency(item.revenue)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Status breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Invoice Status Breakdown</Text>
        <View style={styles.statusGrid}>
          {(['draft', 'sent', 'confirmed'] as const).map((status) => {
            const count = invoices.filter((i) => i.status === status).length;
            const pct = invoices.length > 0 ? Math.round((count / invoices.length) * 100) : 0;
            const colors = { draft: '#95A5A6', sent: '#F39C12', confirmed: '#27AE60' };
            return (
              <View key={status} style={[styles.statusCard, { borderTopColor: colors[status] }]}>
                <Text style={[styles.statusCount, { color: colors[status] }]}>{count}</Text>
                <Text style={styles.statusLabel}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                <Text style={styles.statusPct}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[sumStyles.card, { borderTopColor: color }]}>
      <Text style={[sumStyles.value, { color }]}>{value}</Text>
      <Text style={sumStyles.label}>{label}</Text>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  value: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  label: { fontSize: 10, color: '#888', textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6EE' },
  title: { fontSize: 24, fontWeight: '800', color: '#2C1810', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2C1810', marginBottom: 14 },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  barContainer: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 8, color: '#888', marginBottom: 4, textAlign: 'center' },
  bar: { width: 28, backgroundColor: '#5D3A1A', borderRadius: 4, marginBottom: 4 },
  barLabel: { fontSize: 10, color: '#888', fontWeight: '600' },
  barCount: { fontSize: 8, color: '#D4A96A' },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  marketInfo: { width: 80 },
  marketName: { fontSize: 13, fontWeight: '700', color: '#2C1810' },
  marketSub: { fontSize: 10, color: '#888' },
  marketBarWrap: { flex: 1, height: 10, backgroundColor: '#f0e8e0', borderRadius: 5, overflow: 'hidden' },
  marketBar: { height: '100%', backgroundColor: '#5D3A1A', borderRadius: 5 },
  marketRevenue: { fontSize: 13, fontWeight: '700', color: '#27AE60', minWidth: 70, textAlign: 'right' },
  statusGrid: { flexDirection: 'row', gap: 12 },
  statusCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statusCount: { fontSize: 22, fontWeight: '800' },
  statusLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  statusPct: { fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 },
});

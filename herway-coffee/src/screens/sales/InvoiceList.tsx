import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import SearchBar from '../../components/SearchBar';
import DeleteConfirmModal from '../shared/DeleteConfirmModal';
import {
  getInvoices as getLocalInvoices,
  saveInvoices,
  addToSyncQueue,
  saveDeletionLog,
} from '../../services/storageService';
import { Invoice } from '../../types';
import { formatCurrency, formatDate, generateId, getStatusColor } from '../../utils/helpers';

export default function InvoiceList({ navigation }: any) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filtered, setFiltered] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  async function loadInvoices() {
    const all = await getLocalInvoices();
    const mine =
      user?.role === 'admin'
        ? all
        : all.filter((i) => i.marketId === user?.marketId);
    setInvoices(mine);
    applySearch(mine, search);
  }

  function applySearch(list: Invoice[], term: string) {
    if (!term.trim()) {
      setFiltered(list);
    } else {
      const lower = term.toLowerCase();
      setFiltered(
        list.filter(
          (i) =>
            i.customerName.toLowerCase().includes(lower) ||
            i.id.toLowerCase().includes(lower),
        ),
      );
    }
  }

  function handleSearch(text: string) {
    setSearch(text);
    applySearch(invoices, text);
  }

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [user]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  }

  async function handleDelete(reason: string) {
    if (!deleteTarget || !user) return;
    const updated = invoices.filter((i) => i.id !== deleteTarget.id);
    await saveInvoices(updated);
    await addToSyncQueue({
      id: generateId(),
      operation: 'delete',
      collection: 'invoices',
      documentId: deleteTarget.id,
      data: {},
      timestamp: new Date(),
      retries: 0,
    });
    await saveDeletionLog({
      id: generateId(),
      deletedBy: user.uid,
      entityType: 'invoice',
      entityId: deleteTarget.id,
      reason,
      timestamp: new Date(),
      marketId: user.marketId,
    });
    setDeleteTarget(null);
    await loadInvoices();
  }

  function renderItem({ item }: { item: Invoice }) {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.invoiceId}>#{item.id.slice(-8).toUpperCase()}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.amount}>{formatCurrency(item.grandTotal)}</Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => setDeleteTarget(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        {item.items.length > 0 && (
          <Text style={styles.itemCount}>{item.items.length} item(s)</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={handleSearch}
          placeholder="Search invoices..."
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('InvoiceForm')}
        >
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#5D3A1A"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyText}>
              {search ? 'No invoices match your search' : 'No invoices yet.\nTap "+ New" to create one.'}
            </Text>
          </View>
        }
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        title="Delete Invoice"
        description={`Delete invoice #${deleteTarget?.id.slice(-8).toUpperCase()} for ${deleteTarget?.customerName}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  header: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#FDF6EE',
  },
  list: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  card: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  invoiceId: { fontSize: 12, color: '#888', fontWeight: '600', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  customerName: { fontSize: 16, fontWeight: '700', color: '#2C1810', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#888' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amount: { fontSize: 17, fontWeight: '800', color: '#5D3A1A' },
  deleteBtn: { padding: 4 },
  itemCount: { fontSize: 12, color: '#D4A96A', marginTop: 6, fontWeight: '500' },
  addBtn: {
    backgroundColor: '#5D3A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
});

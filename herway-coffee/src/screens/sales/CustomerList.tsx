import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import SearchBar from '../../components/SearchBar';
import DeleteConfirmModal from '../shared/DeleteConfirmModal';
import { getCustomers as getLocalCustomers, saveCustomers, addToSyncQueue, saveDeletionLog } from '../../services/storageService';
import { deleteCustomer } from '../../services/firestoreService';
import { Customer } from '../../types';
import { formatDate, generateId } from '../../utils/helpers';

export default function CustomerList({ navigation }: any) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  async function loadCustomers() {
    const all = await getLocalCustomers();
    const mine = user?.role === 'admin'
      ? all
      : all.filter((c) => c.marketId === user?.marketId);
    setCustomers(mine);
    applySearch(mine, search);
  }

  function applySearch(list: Customer[], term: string) {
    if (!term.trim()) {
      setFiltered(list);
    } else {
      const lower = term.toLowerCase();
      setFiltered(
        list.filter(
          (c) =>
            c.name.toLowerCase().includes(lower) ||
            c.phone.includes(lower) ||
            c.address.toLowerCase().includes(lower),
        ),
      );
    }
  }

  function handleSearch(text: string) {
    setSearch(text);
    applySearch(customers, text);
  }

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [user]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  }

  async function handleDelete(reason: string) {
    if (!deleteTarget || !user) return;
    const updatedList = customers.filter((c) => c.id !== deleteTarget.id);
    await saveCustomers(updatedList);
    await addToSyncQueue({
      id: generateId(),
      operation: 'delete',
      collection: 'customers',
      documentId: deleteTarget.id,
      data: {},
      timestamp: new Date(),
      retries: 0,
    });
    await saveDeletionLog({
      id: generateId(),
      deletedBy: user.uid,
      entityType: 'customer',
      entityId: deleteTarget.id,
      reason,
      timestamp: new Date(),
      marketId: user.marketId,
    });
    setDeleteTarget(null);
    await loadCustomers();
  }

  function renderItem({ item }: { item: Customer }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CustomerForm', { customer: item })}
        activeOpacity={0.75}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>📞 {item.phone}</Text>
          <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setDeleteTarget(item)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={handleSearch}
          placeholder="Search customers..."
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CustomerForm')}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5D3A1A" />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyText}>
              {search ? 'No customers match your search' : 'No customers yet.\nTap "+ Add" to get started.'}
            </Text>
          </View>
        }
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5D3A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#2C1810' },
  phone: { fontSize: 13, color: '#666', marginTop: 3 },
  address: { fontSize: 12, color: '#999', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 20 },
  addBtn: {
    backgroundColor: '#5D3A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
});

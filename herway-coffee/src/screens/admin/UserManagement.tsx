import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUsers, getMarkets, deleteUser, updateUser } from '../../services/firestoreService';
import { createUser } from '../../services/authService';
import { AppUser, Market } from '../../types';
import DeleteConfirmModal from '../shared/DeleteConfirmModal';
import SearchBar from '../../components/SearchBar';

export default function UserManagement({ navigation }: any) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filtered, setFiltered] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  async function loadData() {
    try {
      const [u, m] = await Promise.all([getUsers(), getMarkets()]);
      setUsers(u);
      setMarkets(m);
      applySearch(u, search);
    } catch (err) {
      console.warn('UserManagement load error:', err);
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

  function applySearch(list: AppUser[], term: string) {
    if (!term.trim()) {
      setFiltered(list);
    } else {
      const lower = term.toLowerCase();
      setFiltered(list.filter((u) =>
        u.displayName.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower),
      ));
    }
  }

  function handleSearch(text: string) {
    setSearch(text);
    applySearch(users, text);
  }

  async function handleDelete(reason: string) {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.uid);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to delete user');
    }
  }

  function getMarketName(marketId: string) {
    return markets.find((m) => m.id === marketId)?.name ?? marketId;
  }

  function renderItem({ item }: { item: AppUser }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, item.role === 'admin' && styles.adminAvatar]}>
            <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.displayName}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={styles.meta}>
              <View style={[styles.roleBadge, item.role === 'admin' && styles.adminBadge]}>
                <Text style={[styles.roleText, item.role === 'admin' && styles.adminRoleText]}>
                  {item.role.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.market}>{getMarketName(item.marketId)}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteTarget(item)}>
          <Text>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5D3A1A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={handleSearch} placeholder="Search users..." />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.uid}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5D3A1A" />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👤</Text>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        title="Delete User"
        description={`Delete account for "${deleteTarget?.displayName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6EE' },
  header: { padding: 16, paddingBottom: 8 },
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
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4A96A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminAvatar: { backgroundColor: '#5D3A1A' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#2C1810' },
  email: { fontSize: 13, color: '#888', marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#D4A96A20',
  },
  adminBadge: { backgroundColor: '#5D3A1A20' },
  roleText: { fontSize: 10, fontWeight: '800', color: '#D4A96A', letterSpacing: 0.5 },
  adminRoleText: { color: '#5D3A1A' },
  market: { fontSize: 12, color: '#888' },
  deleteBtn: { padding: 8 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#888' },
});

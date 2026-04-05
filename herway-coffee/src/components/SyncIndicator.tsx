import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

type SyncStatus = 'online' | 'syncing' | 'offline' | 'error';

interface SyncIndicatorProps {
  status: SyncStatus;
  pendingCount?: number;
}

const STATUS_CONFIG: Record<SyncStatus, { color: string; label: string }> = {
  online: { color: '#27AE60', label: 'Synced' },
  syncing: { color: '#F39C12', label: 'Syncing...' },
  offline: { color: '#E74C3C', label: 'Offline' },
  error: { color: '#E74C3C', label: 'Sync Error' },
};

export default function SyncIndicator({ status, pendingCount = 0 }: SyncIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const label =
    status === 'online' && pendingCount === 0
      ? 'Synced'
      : pendingCount > 0
        ? `${pendingCount} pending`
        : config.label;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  getCustomers as getLocalCustomers,
  saveCustomers,
  addToSyncQueue,
} from '../../services/storageService';
import { Customer } from '../../types';
import { generateId } from '../../utils/helpers';

interface Props {
  navigation: any;
  route: any;
}

export default function CustomerForm({ navigation, route }: Props) {
  const { user } = useAuth();
  const existing: Customer | undefined = route.params?.customer;

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!phone.trim()) newErrors.phone = 'Phone is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (email.trim() && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate() || !user) return;
    setLoading(true);
    try {
      const allCustomers = await getLocalCustomers();
      const now = new Date();

      if (existing) {
        const updated: Customer = {
          ...existing,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: email.trim() || undefined,
          updatedAt: now,
        };
        const newList = allCustomers.map((c) => (c.id === existing.id ? updated : c));
        await saveCustomers(newList);
        await addToSyncQueue({
          id: generateId(),
          operation: 'update',
          collection: 'customers',
          documentId: existing.id,
          data: updated,
          timestamp: now,
          retries: 0,
        });
      } else {
        const newCustomer: Customer = {
          id: generateId(),
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: email.trim() || undefined,
          marketId: user.marketId,
          createdBy: user.uid,
          createdAt: now,
          updatedAt: now,
        };
        await saveCustomers([...allCustomers, newCustomer]);
        await addToSyncQueue({
          id: generateId(),
          operation: 'create',
          collection: 'customers',
          documentId: newCustomer.id,
          data: newCustomer,
          timestamp: now,
          retries: 0,
        });
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Field
            label="Customer Name *"
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            error={errors.name}
          />
          <Field
            label="Phone Number *"
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 234 567 8901"
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <Field
            label="Address *"
            value={address}
            onChangeText={setAddress}
            placeholder="Street, City, Country"
            multiline
            error={errors.address}
          />
          <Field
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            placeholder="customer@email.com"
            keyboardType="email-address"
            error={errors.email}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.disabledBtn]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {existing ? '✅ Update Customer' : '✅ Save Customer'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  error?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#5D3A1A', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E8D5C0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C1810',
    backgroundColor: '#FDF6EE',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: '#E74C3C' },
  errorText: { color: '#E74C3C', fontSize: 12, marginTop: 4 },
  saveBtn: {
    backgroundColor: '#5D3A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  getCustomers as getLocalCustomers,
  getInvoices as getLocalInvoices,
  saveInvoices,
  addToSyncQueue,
} from '../../services/storageService';
import { Customer, Invoice, InvoiceItem } from '../../types';
import { generateId, formatCurrency } from '../../utils/helpers';
import { sendInvoiceViaWhatsApp } from '../../utils/whatsapp';

interface Props {
  navigation: any;
  route: any;
}

interface LineItem {
  id: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  margin: string;
}

function emptyLine(): LineItem {
  return { id: generateId(), productName: '', quantity: '1', unitPrice: '0', discount: '0', margin: '0' };
}

function calcItem(line: LineItem): InvoiceItem {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unitPrice) || 0;
  const discount = parseFloat(line.discount) || 0;
  const margin = parseFloat(line.margin) || 0;
  const subtotal = qty * price;
  const discountAmt = subtotal * (discount / 100);
  const total = subtotal - discountAmt;
  return {
    productId: line.id,
    productName: line.productName,
    quantity: qty,
    unitPrice: price,
    discount,
    margin,
    total,
  };
}

export default function InvoiceForm({ navigation, route }: Props) {
  const { user } = useAuth();
  const existingId: string | undefined = route.params?.invoiceId;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Invoice['status']>('draft');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const all = await getLocalCustomers();
      const mine =
        user?.role === 'admin'
          ? all
          : all.filter((c) => c.marketId === user?.marketId);
      setCustomers(mine);

      if (existingId) {
        const allInvoices = await getLocalInvoices();
        const existing = allInvoices.find((i) => i.id === existingId);
        if (existing) {
          const cust = mine.find((c) => c.id === existing.customerId) ?? null;
          setSelectedCustomer(cust);
          setNotes(existing.notes ?? '');
          setStatus(existing.status);
          setLines(
            existing.items.map((item) => ({
              id: item.productId,
              productName: item.productName,
              quantity: String(item.quantity),
              unitPrice: String(item.unitPrice),
              discount: String(item.discount),
              margin: String(item.margin),
            })),
          );
        }
      }
      setInitLoading(false);
    }
    init();
  }, [user, existingId]);

  function handleSelectCustomer(cust: Customer) {
    setSelectedCustomer(cust);
    // Auto-apply last discount to first line
    if (cust.lastDiscount !== undefined && lines.length > 0) {
      setLines((prev) =>
        prev.map((line, idx) =>
          idx === 0 ? { ...line, discount: String(cust.lastDiscount) } : line,
        ),
      );
    }
    setShowCustomerPicker(false);
    setCustomerSearch('');
  }

  function updateLine(id: string, field: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    const newLine = emptyLine();
    // Auto-apply customer margin for new lines if available
    if (selectedCustomer?.lastDiscount !== undefined) {
      newLine.discount = String(selectedCustomer.lastDiscount);
    }
    setLines((prev) => [...prev, newLine]);
  }

  function removeLine(id: string) {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const calcItems = lines.map(calcItem);
  const subtotal = calcItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalDiscount = calcItems.reduce(
    (s, i) => s + i.quantity * i.unitPrice * (i.discount / 100),
    0,
  );
  const grandTotal = calcItems.reduce((s, i) => s + i.total, 0);

  async function handleSave() {
    if (!selectedCustomer) {
      Alert.alert('Validation', 'Please select a customer');
      return;
    }
    if (calcItems.some((i) => !i.productName)) {
      Alert.alert('Validation', 'All items must have a product name');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const allInvoices = await getLocalInvoices();
      const now = new Date();

      if (existingId) {
        const updated: Invoice = {
          id: existingId,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          marketId: user.marketId,
          createdBy: user.uid,
          createdAt: allInvoices.find((i) => i.id === existingId)?.createdAt ?? now,
          updatedAt: now,
          items: calcItems,
          subtotal,
          totalDiscount,
          grandTotal,
          status,
          whatsappSent: false,
          notes: notes.trim() || undefined,
        };
        const newList = allInvoices.map((i) => (i.id === existingId ? updated : i));
        await saveInvoices(newList);
        await addToSyncQueue({
          id: generateId(),
          operation: 'update',
          collection: 'invoices',
          documentId: existingId,
          data: updated,
          timestamp: now,
          retries: 0,
        });
      } else {
        const invoice: Invoice = {
          id: generateId(),
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          marketId: user.marketId,
          createdBy: user.uid,
          createdAt: now,
          updatedAt: now,
          items: calcItems,
          subtotal,
          totalDiscount,
          grandTotal,
          status,
          whatsappSent: false,
          notes: notes.trim() || undefined,
        };
        await saveInvoices([...allInvoices, invoice]);
        await addToSyncQueue({
          id: generateId(),
          operation: 'create',
          collection: 'invoices',
          documentId: invoice.id,
          data: invoice,
          timestamp: now,
          retries: 0,
        });

        // Update customer's lastDiscount
        const { getCustomers: getLocal, saveCustomers } = await import('../../services/storageService');
        const allCustomers = await getLocal();
        const avgDiscount =
          calcItems.reduce((s, i) => s + i.discount, 0) / calcItems.length;
        const updCustomers = allCustomers.map((c) =>
          c.id === selectedCustomer.id ? { ...c, lastDiscount: avgDiscount, updatedAt: now } : c,
        );
        await saveCustomers(updCustomers);
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  }

  async function handleWhatsApp() {
    if (!selectedCustomer?.phone) {
      Alert.alert('Error', 'Customer has no phone number');
      return;
    }
    const tempInvoice: Invoice = {
      id: existingId ?? generateId(),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      marketId: user?.marketId ?? '',
      createdBy: user?.uid ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: calcItems,
      subtotal,
      totalDiscount,
      grandTotal,
      status,
      whatsappSent: true,
    };
    await sendInvoiceViaWhatsApp(tempInvoice, selectedCustomer.phone);
  }

  const filteredCustomers = customerSearch
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  if (initLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5D3A1A" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <TouchableOpacity style={styles.customerPicker} onPress={() => setShowCustomerPicker(true)}>
            {selectedCustomer ? (
              <View>
                <Text style={styles.selectedCustomer}>{selectedCustomer.name}</Text>
                <Text style={styles.selectedCustomerSub}>{selectedCustomer.phone}</Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Tap to select customer →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {lines.map((line, index) => (
            <LineItemRow
              key={line.id}
              line={line}
              index={index}
              total={calcItem(line).total}
              onChange={(field, value) => updateLine(line.id, field, value)}
              onRemove={() => removeLine(line.id)}
              canRemove={lines.length > 1}
            />
          ))}
          <TouchableOpacity style={styles.addLineBtn} onPress={addLine}>
            <Text style={styles.addLineBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Totals */}
        <View style={styles.totalsCard}>
          <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />
          <TotalRow label="Total Discount" value={`-${formatCurrency(totalDiscount)}`} valueColor="#E74C3C" />
          <View style={styles.totalDivider} />
          <TotalRow label="Grand Total" value={formatCurrency(grandTotal)} large />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes..."
            placeholderTextColor="#bbb"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            {(['draft', 'sent', 'confirmed'] as Invoice['status'][]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusBtn, status === s && styles.statusBtnActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
            <Text style={styles.whatsappBtnText}>💬 WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.disabledBtn]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Save</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => { setShowCustomerPicker(false); setCustomerSearch(''); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.modalSearch}
            value={customerSearch}
            onChangeText={setCustomerSearch}
            placeholder="Search..."
            placeholderTextColor="#bbb"
            autoFocus
          />
          <FlatList
            data={filteredCustomers}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.customerRow} onPress={() => handleSelectCustomer(item)}>
                <View style={styles.customerRowAvatar}>
                  <Text style={styles.customerRowAvatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.customerRowName}>{item.name}</Text>
                  <Text style={styles.customerRowPhone}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No customers found</Text>
            }
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function LineItemRow({ line, index, total, onChange, onRemove, canRemove }: {
  line: LineItem;
  index: number;
  total: number;
  onChange: (field: keyof LineItem, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <View style={liStyles.container}>
      <View style={liStyles.headerRow}>
        <Text style={liStyles.itemNum}>Item {index + 1}</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove}>
            <Text style={liStyles.remove}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={liStyles.nameInput}
        value={line.productName}
        onChangeText={(v) => onChange('productName', v)}
        placeholder="Product name"
        placeholderTextColor="#bbb"
      />
      <View style={liStyles.row}>
        <MiniField label="Qty" value={line.quantity} onChange={(v) => onChange('quantity', v)} keyboardType="numeric" />
        <MiniField label="Unit Price" value={line.unitPrice} onChange={(v) => onChange('unitPrice', v)} keyboardType="decimal-pad" />
        <MiniField label="Discount %" value={line.discount} onChange={(v) => onChange('discount', v)} keyboardType="decimal-pad" />
        <MiniField label="Margin %" value={line.margin} onChange={(v) => onChange('margin', v)} keyboardType="decimal-pad" />
      </View>
      <Text style={liStyles.total}>Total: {formatCurrency(total)}</Text>
    </View>
  );
}

function MiniField({ label, value, onChange, keyboardType }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: any;
}) {
  return (
    <View style={liStyles.miniField}>
      <Text style={liStyles.miniLabel}>{label}</Text>
      <TextInput
        style={liStyles.miniInput}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        selectTextOnFocus
      />
    </View>
  );
}

function TotalRow({ label, value, valueColor, large }: {
  label: string;
  value: string;
  valueColor?: string;
  large?: boolean;
}) {
  return (
    <View style={totStyles.row}>
      <Text style={[totStyles.label, large && totStyles.largeLabel]}>{label}</Text>
      <Text style={[totStyles.value, large && totStyles.largeValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

const liStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FDF6EE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8D5C0',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemNum: { fontSize: 13, fontWeight: '600', color: '#5D3A1A' },
  remove: { fontSize: 16, color: '#E74C3C', fontWeight: '700' },
  nameInput: {
    borderWidth: 1,
    borderColor: '#E8D5C0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2C1810',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  total: { fontSize: 13, fontWeight: '700', color: '#5D3A1A', marginTop: 8, textAlign: 'right' },
  miniField: { flex: 1 },
  miniLabel: { fontSize: 10, color: '#888', marginBottom: 4, fontWeight: '600' },
  miniInput: {
    borderWidth: 1,
    borderColor: '#E8D5C0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: '#2C1810',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
});

const totStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, fontWeight: '600', color: '#2C1810' },
  largeLabel: { fontSize: 17, fontWeight: '700', color: '#2C1810' },
  largeValue: { fontSize: 20, fontWeight: '800', color: '#5D3A1A' },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6EE' },
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2C1810', marginBottom: 10 },
  customerPicker: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8D5C0',
    minHeight: 56,
    justifyContent: 'center',
  },
  selectedCustomer: { fontSize: 16, fontWeight: '600', color: '#2C1810' },
  selectedCustomerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  pickerPlaceholder: { fontSize: 15, color: '#bbb' },
  addLineBtn: {
    borderWidth: 1.5,
    borderColor: '#D4A96A',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addLineBtnText: { color: '#D4A96A', fontWeight: '700', fontSize: 14 },
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  totalDivider: { height: 1, backgroundColor: '#f0e8e0', marginVertical: 8 },
  notesInput: {
    borderWidth: 1.5,
    borderColor: '#E8D5C0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2C1810',
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8D5C0',
    alignItems: 'center',
  },
  statusBtnActive: { borderColor: '#5D3A1A', backgroundColor: '#5D3A1A' },
  statusBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  statusBtnTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 12 },
  whatsappBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#25D366',
    alignItems: 'center',
  },
  whatsappBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#5D3A1A',
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e8e0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2C1810' },
  modalClose: { fontSize: 18, color: '#888', fontWeight: '700' },
  modalSearch: {
    margin: 16,
    borderWidth: 1.5,
    borderColor: '#E8D5C0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C1810',
    backgroundColor: '#FDF6EE',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f0e8',
    gap: 12,
  },
  customerRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5D3A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerRowAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  customerRowName: { fontSize: 15, fontWeight: '600', color: '#2C1810' },
  customerRowPhone: { fontSize: 13, color: '#888' },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 15, marginTop: 40 },
});

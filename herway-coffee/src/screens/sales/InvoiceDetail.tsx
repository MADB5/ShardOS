import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { getInvoices as getLocalInvoices, getCustomers as getLocalCustomers } from '../../services/storageService';
import { generateInvoicePdf, shareInvoicePdf } from '../../services/pdfService';
import { sendInvoiceViaWhatsApp } from '../../utils/whatsapp';
import { Invoice, Customer } from '../../types';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';

export default function InvoiceDetail({ navigation, route }: any) {
  const { invoiceId } = route.params as { invoiceId: string };
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [invoices, customers] = await Promise.all([
        getLocalInvoices(),
        getLocalCustomers(),
      ]);
      const found = invoices.find((i) => i.id === invoiceId) ?? null;
      setInvoice(found);
      if (found) {
        setCustomer(customers.find((c) => c.id === found.customerId) ?? null);
      }
      setLoading(false);
    }
    load();
  }, [invoiceId]);

  async function handleSharePdf() {
    if (!invoice) return;
    setPdfLoading(true);
    try {
      await shareInvoicePdf(invoice);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleWhatsApp() {
    if (!invoice || !customer?.phone) {
      Alert.alert('Error', 'Customer phone number not available');
      return;
    }
    await sendInvoiceViaWhatsApp(invoice, customer.phone);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5D3A1A" />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Invoice not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(invoice.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.brandText}>☕ HERWAY COFFEE</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{invoice.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.invoiceId}>Invoice #{invoice.id.slice(-8).toUpperCase()}</Text>
        <Text style={styles.invoiceDate}>{formatDate(invoice.createdAt)}</Text>
      </View>

      {/* Customer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bill To</Text>
        <View style={styles.infoCard}>
          <Text style={styles.customerName}>{invoice.customerName}</Text>
          {customer?.phone && <Text style={styles.infoText}>📞 {customer.phone}</Text>}
          {customer?.address && <Text style={styles.infoText}>📍 {customer.address}</Text>}
          {customer?.email && <Text style={styles.infoText}>✉️ {customer.email}</Text>}
        </View>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Product</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Price</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <View style={{ flex: 2 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                {item.discount > 0 && (
                  <Text style={styles.itemDiscount}>{item.discount}% off</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.itemTotal, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totalsCard}>
        <TotalRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
        <TotalRow label="Discount" value={`-${formatCurrency(invoice.totalDiscount)}`} valueColor="#E74C3C" />
        <View style={styles.totalDivider} />
        <TotalRow label="Grand Total" value={formatCurrency(invoice.grandTotal)} large />
      </View>

      {/* Notes */}
      {invoice.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('InvoiceForm', { invoiceId: invoice.id })}
        >
          <Text style={styles.editBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
          <Text style={styles.whatsappBtnText}>💬 WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pdfBtn, pdfLoading && styles.disabledBtn]}
          onPress={handleSharePdf}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.pdfBtnText}>📄 PDF</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function TotalRow({ label, value, valueColor, large }: {
  label: string;
  value: string;
  valueColor?: string;
  large?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={[{ fontSize: 14, color: '#666' }, large && { fontSize: 17, fontWeight: '700', color: '#2C1810' }]}>{label}</Text>
      <Text style={[{ fontSize: 14, fontWeight: '600', color: '#2C1810' }, large && { fontSize: 20, fontWeight: '800', color: '#5D3A1A' }, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6EE' },
  notFound: { fontSize: 16, color: '#888' },
  headerCard: {
    backgroundColor: '#5D3A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandText: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  invoiceId: { fontSize: 22, fontWeight: '700', color: '#D4A96A' },
  invoiceDate: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2C1810', marginBottom: 10 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  customerName: { fontSize: 18, fontWeight: '700', color: '#2C1810', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#666', marginTop: 4 },
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#5D3A1A',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableHeaderText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#FDF6EE' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#2C1810' },
  itemDiscount: { fontSize: 11, color: '#E74C3C', marginTop: 2 },
  tableCell: { fontSize: 14, color: '#2C1810' },
  itemTotal: { fontWeight: '700', color: '#5D3A1A' },
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
  totalDivider: { height: 1, backgroundColor: '#f0e8e0', marginVertical: 6 },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#D4A96A',
  },
  notesText: { fontSize: 14, color: '#5D3A1A', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#5D3A1A',
    alignItems: 'center',
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#5D3A1A' },
  whatsappBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#25D366',
    alignItems: 'center',
  },
  whatsappBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pdfBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#5D3A1A',
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.7 },
  pdfBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

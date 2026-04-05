import { Invoice } from '../types';
import { format } from 'date-fns';
import { Linking } from 'react-native';

export function buildWhatsAppMessage(invoice: Invoice): string {
  const date = format(invoice.createdAt, 'MMM dd, yyyy');
  const itemLines = invoice.items
    .map(
      (item) =>
        `  • ${item.productName} x${item.quantity} @ $${item.unitPrice.toFixed(2)} (${item.discount}% off) = $${item.total.toFixed(2)}`,
    )
    .join('\n');

  return (
    `☕ *HERWAY COFFEE* — Invoice #${invoice.id.slice(-8).toUpperCase()}\n` +
    `📅 Date: ${date}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `Subtotal: $${invoice.subtotal.toFixed(2)}\n` +
    `Discount: -$${invoice.totalDiscount.toFixed(2)}\n` +
    `*Grand Total: $${invoice.grandTotal.toFixed(2)}*\n\n` +
    `Thank you for your business! 🙏`
  );
}

export async function sendInvoiceViaWhatsApp(
  invoice: Invoice,
  phone: string,
): Promise<void> {
  const message = buildWhatsAppMessage(invoice);
  const sanitizedPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
  }
}

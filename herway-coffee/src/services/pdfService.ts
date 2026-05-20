import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { Invoice } from '../types';

function buildInvoiceHtml(invoice: Invoice): string {
  const date = format(invoice.createdAt, 'MMMM dd, yyyy');
  const itemsHtml = invoice.items
    .map(
      (item) => `
      <tr>
        <td>${item.productName}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">$${item.unitPrice.toFixed(2)}</td>
        <td style="text-align:center">${item.discount}%</td>
        <td style="text-align:right">$${item.total.toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2C1810; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #5D3A1A; padding-bottom: 20px; }
    .brand { font-size: 28px; font-weight: 900; color: #5D3A1A; }
    .brand .sub { font-size: 12px; color: #D4A96A; font-weight: 400; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 24px; color: #5D3A1A; font-weight: 700; }
    .invoice-meta p { font-size: 13px; color: #666; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
    .badge.draft { background: #f5f5f5; color: #666; }
    .badge.sent { background: #fff3cd; color: #856404; }
    .badge.confirmed { background: #d4edda; color: #155724; }
    .info-section { display: flex; gap: 40px; margin-bottom: 30px; }
    .info-block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4A96A; margin-bottom: 8px; }
    .info-block p { font-size: 14px; color: #2C1810; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #5D3A1A; color: #fff; }
    thead th { padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    tbody tr { border-bottom: 1px solid #f0e8e0; }
    tbody tr:nth-child(even) { background: #fdf6ee; }
    tbody td { padding: 12px 16px; font-size: 13px; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f0e8e0; }
    .totals-row.grand { font-size: 18px; font-weight: 700; color: #5D3A1A; border-top: 2px solid #5D3A1A; border-bottom: none; padding-top: 12px; }
    .notes { margin-top: 30px; padding: 16px; background: #fdf6ee; border-left: 4px solid #D4A96A; border-radius: 4px; }
    .notes h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4A96A; margin-bottom: 6px; }
    .notes p { font-size: 13px; color: #5D3A1A; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #f0e8e0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ☕ HERWAY COFFEE
      <div class="sub">Sales Invoice</div>
    </div>
    <div class="invoice-meta">
      <h2>Invoice #${invoice.id.slice(-8).toUpperCase()}</h2>
      <p>Date: ${date}</p>
      <p>Status: <span class="badge ${invoice.status}">${invoice.status}</span></p>
    </div>
  </div>

  <div class="info-section">
    <div class="info-block">
      <h4>Bill To</h4>
      <p><strong>${invoice.customerName}</strong></p>
    </div>
    <div class="info-block">
      <h4>From</h4>
      <p><strong>Herway Coffee</strong></p>
      <p>Market ID: ${invoice.marketId}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Product</th>
        <th style="text-align:center">Quantity</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:center">Discount</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>$${invoice.subtotal.toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>Total Discount</span>
      <span style="color:#E74C3C">-$${invoice.totalDiscount.toFixed(2)}</span>
    </div>
    <div class="totals-row grand">
      <span>Grand Total</span>
      <span>$${invoice.grandTotal.toFixed(2)}</span>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes"><h4>Notes</h4><p>${invoice.notes}</p></div>` : ''}

  <div class="footer">
    <p>☕ Herway Coffee — Thank you for your business!</p>
    <p>Generated on ${format(new Date(), 'PPPp')}</p>
  </div>
</body>
</html>`;
}

export async function generateInvoicePdf(invoice: Invoice): Promise<string> {
  const html = buildInvoiceHtml(invoice);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

export async function shareInvoicePdf(invoice: Invoice): Promise<void> {
  const uri = await generateInvoicePdf(invoice);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice #${invoice.id.slice(-8).toUpperCase()}`,
    });
  }
}

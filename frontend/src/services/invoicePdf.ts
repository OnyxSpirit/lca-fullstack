import { apiDownload } from './apiClient';
async function invoicePdfBlob(invoiceId: string): Promise<Blob> {
  return apiDownload(`/invoices/${encodeURIComponent(invoiceId)}/pdf`);
}
export async function downloadInvoicePdf(invoiceId: string, invoiceNumber: string) {
  const url = URL.createObjectURL(await invoicePdfBlob(invoiceId));
  const link = document.createElement('a'); link.href = url; link.download = `facture-${invoiceNumber}.pdf`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function printInvoicePdf(invoiceId: string) {
  const url = URL.createObjectURL(await invoicePdfBlob(invoiceId));
  const frame = document.createElement('iframe'); frame.style.display = 'none'; frame.src = url;
  frame.onload = () => frame.contentWindow?.print(); document.body.appendChild(frame);
  setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60_000);
}

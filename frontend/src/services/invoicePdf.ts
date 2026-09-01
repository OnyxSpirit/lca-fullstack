const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
async function invoicePdfBlob(invoiceId: string): Promise<Blob> {
  const token = localStorage.getItem('lca-access-token');
  const response = await fetch(`${API_URL}/invoices/${invoiceId}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error('Impossible de générer la facture PDF');
  return response.blob();
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

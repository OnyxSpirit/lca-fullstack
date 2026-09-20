/** PDFKit's built-in Helvetica does not reliably render fr-FR narrow spaces. */
export function formatDocumentAmount(value: unknown, currency: string): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) throw new Error('Montant documentaire invalide');
  const normalized = Math.round(amount * 100) / 100;
  const fixed = normalized.toFixed(Number.isInteger(normalized) ? 0 : 2);
  const [integer, fraction] = fixed.split('.');
  const grouped = (integer ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${grouped}${fraction === undefined ? '' : `,${fraction}`} ${currency}`;
}

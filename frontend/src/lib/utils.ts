/**
 * Utility helper functions shared across frontend features.
 */

/**
 * Formats a numeric value into Indonesian Rupiah currency format.
 * Example: 1500000 -> "Rp 1.500.000"
 */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

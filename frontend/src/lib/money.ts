const grouping = new Intl.NumberFormat('en-US')

const AMOUNT_PATTERN = /^\d{1,6}(\.\d{1,2})?$/

/** Returns an error message for an amount string, or null when valid (0.01..999999.99, max 2 decimals). */
export function validateAmount(raw: string): string | null {
  const value = raw.trim()
  if (value === '') return 'Amount is required.'
  if (!AMOUNT_PATTERN.test(value)) {
    return 'Enter a positive amount with at most 6 digits and 2 decimals, e.g. 12.50.'
  }
  if (!/[1-9]/.test(value)) return 'Amount must be at least 0.01.'
  return null
}

/** Converts a valid decimal string to integer cents without floats. */
export function toCents(amount: string): bigint {
  const [whole = '0', fraction = ''] = amount.split('.')
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) return 0n
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
}

/** Formats a decimal string such as "1234.5" as "1,234.50" without converting to a float. */
export function formatMoney(amount: string): string {
  const [whole = '0', fraction = ''] = amount.split('.')
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) return amount
  return `${grouping.format(BigInt(whole))}.${fraction.padEnd(2, '0').slice(0, 2)}`
}

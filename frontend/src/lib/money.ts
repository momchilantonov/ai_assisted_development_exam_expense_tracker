const grouping = new Intl.NumberFormat('en-US')

/** Formats a decimal string such as "1234.5" as "1,234.50" without converting to a float. */
export function formatMoney(amount: string): string {
  const [whole = '0', fraction = ''] = amount.split('.')
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) return amount
  return `${grouping.format(BigInt(whole))}.${fraction.padEnd(2, '0').slice(0, 2)}`
}

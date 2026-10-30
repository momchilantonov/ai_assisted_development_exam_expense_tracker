import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('pads to two decimals and groups thousands without floats', () => {
    expect(formatMoney('12.5')).toBe('12.50')
    expect(formatMoney('1234567')).toBe('1,234,567.00')
    expect(formatMoney('999999.99')).toBe('999,999.99')
    expect(formatMoney('0.10')).toBe('0.10')
  })

  it('returns unexpected input unchanged', () => {
    expect(formatMoney('abc')).toBe('abc')
  })
})

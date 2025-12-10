import { describe, expect, it } from 'vitest'
import { formatApiResponse, bigIntReplacer } from '../utils'

describe('Utils', () => {
  describe('formatApiResponse', () => {
    it('wraps response, status, and metadata', () => {
      const result = formatApiResponse({
        response: { ok: true },
        status: 201,
        metadata: { id: 'test', extra: 1 },
      })

      expect(result).toEqual({
        status: 201,
        response: { ok: true },
        id: 'test',
        extra: 1,
      })
    })
  })

  describe('bigIntReplacer', () => {
    it('stringifies bigint values', () => {
      expect(bigIntReplacer('k', 123n)).toBe('123')
    })

    it('stringifies ethers BigNumber-like values', () => {
      const mockBn = { _isBigNumber: true, toString: () => '456' }
      expect(bigIntReplacer('k', mockBn)).toBe('456')
    })

    it('stringifies serialized BigNumber objects', () => {
      const serialized = { type: 'BigNumber', hex: '0x10' }
      expect(bigIntReplacer('k', serialized)).toBe('16')
    })

    it('returns hex string when BigNumber hex is not parseable', () => {
      const badSerialized = { type: 'BigNumber', hex: 'not-a-hex' }
      expect(bigIntReplacer('k', badSerialized)).toBe('not-a-hex')
    })

    it('passes through other values', () => {
      const obj = { foo: 'bar' }
      expect(bigIntReplacer('k', obj)).toBe(obj)
    })
  })
})

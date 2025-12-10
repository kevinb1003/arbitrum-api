import { ApiResponseReturn, ApiResponseOptions } from './types/api'

export const formatApiResponse = <T = unknown>({
  response,
  status,
  metadata = {},
}: ApiResponseOptions<T>): ApiResponseReturn<T> => ({
  ...metadata,
  status,
  response,
})

export const bigIntReplacer = (key: string, value: unknown): unknown => {
  if (typeof value === 'bigint') return value.toString()

  if (isEthersBigNumber(value)) {
    return value.toString()
  }

  // Ethers BigNumber from some libs serialize as { type: 'BigNumber', hex: '0x...' }
  if (isSerializedBigNumber(value)) {
    try {
      return BigInt(value.hex).toString()
    } catch {
      return value.hex
    }
  }
  return value
}

type MaybeBigNumberLike = { toString(): string; _isBigNumber?: boolean }
const isObject = (input: unknown): input is Record<string, unknown> =>
  Boolean(input) && typeof input === 'object'

const isEthersBigNumber = (value: unknown): value is MaybeBigNumberLike =>
  isObject(value) &&
  '_isBigNumber' in value &&
  typeof (value as MaybeBigNumberLike).toString === 'function'

type SerializedBigNumber = { type: 'BigNumber'; hex: string }
const isSerializedBigNumber = (value: unknown): value is SerializedBigNumber =>
  isObject(value) && value.type === 'BigNumber' && typeof value.hex === 'string'

import { refine, string } from 'superstruct'
import { utils } from 'ethers'

export const HexAddress = refine(
  string(),
  'Address',
  (value) => utils.isAddress(value) || 'Invalid address format'
)

export const WeiAmount = refine(string(), 'WeiAmountString', (value) => {
  try {
    return BigInt(value) > 0n || 'Amount must be a positive integer string'
  } catch (_) {
    return 'Amount must be a positive integer string'
  }
})

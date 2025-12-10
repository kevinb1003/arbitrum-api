import { number, object, optional } from 'superstruct'
import { HexAddress, WeiAmount } from './shared'

export const BridgeRequestSchema = object({
  amount: WeiAmount,
  sender: HexAddress,
  recipient: optional(HexAddress),
  sourceChainId: number(),
  destinationChainId: number(),
  tokenAddress: HexAddress,
})

export const ApproveTokenRequestSchema = object({
  tokenAddress: HexAddress,
  sender: HexAddress,
  sourceChainId: number(),
})

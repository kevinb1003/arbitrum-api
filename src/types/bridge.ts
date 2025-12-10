import type { providers, BigNumber } from 'ethers'
import { Address } from './web3'

export const BridgeDirection = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
} as const

export type BridgeDirection =
  (typeof BridgeDirection)[keyof typeof BridgeDirection]

export const BridgeType = {
  ETH: 'eth',
  ERC20: 'erc20',
} as const

export type BridgeType = (typeof BridgeType)[keyof typeof BridgeType]

export type BridgeRequest = {
  amount: string
  sender: Address
  recipient?: Address
  sourceChainId: number
  destinationChainId: number
  tokenAddress: Address
}

type TxRequest = {
  to: Address
  data: string
  value: string
}

export interface BridgePayload {
  txRequest: TxRequest
  retryableData?: unknown
  childNetwork: unknown
}

type CommonBridgeParams = {
  amount: BigNumber
  from: Address
  destinationAddress?: Address
}

type ProviderPair = {
  parentProvider: providers.Provider
  childProvider: providers.Provider
}

type Erc20Base = CommonBridgeParams & {
  erc20ParentAddress: Address
}

export type EthBridgeParams = CommonBridgeParams & ProviderPair

export type Erc20DepositParams = Erc20Base & ProviderPair

export type Erc20WithdrawalParams = Erc20Base & {
  destinationAddress: Address
}

export type BridgeParams =
  | EthBridgeParams
  | Erc20DepositParams
  | Erc20WithdrawalParams
export type BridgeDepositParams = EthBridgeParams | Erc20DepositParams
export type BridgeWithdrawalParams = EthBridgeParams | Erc20WithdrawalParams

export type BridgerWithMethods<
  TDeposit extends BridgeParams = BridgeDepositParams,
  TWithdrawal extends BridgeParams = BridgeWithdrawalParams,
> = {
  getDepositRequest: (p: TDeposit) => Promise<BridgeResponse>
  getWithdrawalRequest: (p: TWithdrawal) => Promise<BridgeResponse>
}

export type BridgeTxRequest = {
  to: Address
  data: string
  value?: bigint | string | number | null | undefined
}

export type BridgeResponse = {
  txRequest: BridgeTxRequest
  retryableData?: unknown
}

export type ApproveTokenRequest = {
  tokenAddress: Address
  sender: Address
  sourceChainId: number
}

export type ApprovalPayload = {
  txRequest: TxRequest
}

import { EthBridger, Erc20Bridger, getArbitrumNetwork } from '@arbitrum/sdk'
import {
  BridgeDirection,
  BridgeTxRequest,
  BridgeType,
} from '../../../types/bridge'
import { childChain } from '../../../lib/web3/ethers'
import { SDKError } from '../../../lib/errors'
import { ErrorCode } from '../../../types/api'

const bridgerCache = new Map<BridgeType, Promise<EthBridger | Erc20Bridger>>()

export const getBridger = async (type: BridgeType = BridgeType.ETH) => {
  const existing = bridgerCache.get(type)
  if (existing) return existing

  const created = (async () => {
    const childNetwork = await getArbitrumNetwork(childChain.id)
    return type === BridgeType.ERC20
      ? new Erc20Bridger(childNetwork)
      : new EthBridger(childNetwork)
  })()

  bridgerCache.set(type, created)
  return created
}

export const getDirection = (
  bridger: Erc20Bridger | EthBridger,
  sourceChainId: number,
  destinationChainId: number
): BridgeDirection => {
  const { chainId: child, parentChainId: parent } = bridger.childNetwork

  if (sourceChainId === parent && destinationChainId === child)
    return BridgeDirection.DEPOSIT
  if (sourceChainId === child && destinationChainId === parent)
    return BridgeDirection.WITHDRAWAL

  throw new SDKError(
    ErrorCode.INVALID_CHAIN_PAIR,
    `Unsupported chain pair: ${sourceChainId} -> ${destinationChainId}. Expected ${parent} -> ${child} (deposit) or ${child} -> ${parent} (withdrawal).`,
    {
      sourceChainId,
      destinationChainId,
      expectedParent: parent,
      expectedChild: child,
    }
  )
}

export const formatTxRequest = (txRequest: BridgeTxRequest) => ({
  txRequest: {
    to: txRequest.to,
    data: txRequest.data,
    value: txRequest.value?.toString() ?? '0',
  },
})

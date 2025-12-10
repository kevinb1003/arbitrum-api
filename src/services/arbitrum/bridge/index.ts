import createLogger from '../../../lib/logger'
import { makeProvider } from '../../../lib/web3/ethers'
import { cache } from '../../../lib/cache'
import { BridgeDirection } from '../../../types/bridge'
import type {
  BridgePayload,
  BridgeRequest,
  BridgeParams,
  BridgeResponse,
  ApprovalPayload,
  ApproveTokenRequest,
  BridgeDepositParams,
  BridgeWithdrawalParams,
  BridgerWithMethods,
  BridgeTxRequest,
} from '../../../types/bridge'
import { bigIntReplacer } from '../../../utils'
import { formatTxRequest } from './utils'
import type { providers } from 'ethers'
import { BigNumber } from 'ethers'
import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'
import {
  BRIDGE_TX_CACHE_TTL_MS,
  APPROVAL_CACHE_TTL_MS,
} from '../../../constants'

const logger = createLogger('arbitrum-sdk-bridge')

export const getBridgeTransactionRequest = async (
  direction: BridgeDirection,
  request: BridgeRequest,
  bridgerInstance: Erc20Bridger | EthBridger,
  isERC20: boolean,
  parentProvider: providers.Provider,
  childProvider: providers.Provider
): Promise<BridgePayload> => {
  const {
    sourceChainId,
    destinationChainId,
    tokenAddress,
    sender: from,
    recipient,
  } = request
  const amount = BigNumber.from(request.amount)
  const destinationAddress = recipient ?? request.sender

  const loadPayload = async (): Promise<BridgePayload> => {
    logger.debug(`Creating ${direction} payload`, { amount, isERC20 })

    const baseParams = {
      amount,
      from,
      destinationAddress,
      parentProvider,
      childProvider,
    }

    let params: BridgeParams = baseParams

    if (isERC20) {
      params =
        direction === BridgeDirection.DEPOSIT
          ? {
              ...baseParams,
              erc20ParentAddress: tokenAddress,
              parentProvider,
              childProvider,
            }
          : {
              amount,
              from,
              destinationAddress: destinationAddress ?? from,
              erc20ParentAddress: tokenAddress,
            }
    }

    let txRequest: BridgeResponse['txRequest'],
      retryableData: BridgeResponse['retryableData']

    const bridger = bridgerInstance as BridgerWithMethods<
      BridgeDepositParams,
      BridgeWithdrawalParams
    >

    if (direction === BridgeDirection.DEPOSIT) {
      ;({ txRequest, retryableData } = await bridger.getDepositRequest(
        params as BridgeDepositParams
      ))
    } else {
      ;({ txRequest } = await bridger.getWithdrawalRequest(
        params as BridgeWithdrawalParams
      ))
    }

    return {
      ...formatTxRequest(txRequest),
      retryableData: retryableData
        ? JSON.parse(JSON.stringify(retryableData, bigIntReplacer))
        : undefined,
      childNetwork: bridgerInstance?.childNetwork,
    }
  }

  const cacheKey = [
    'bridgePayload',
    direction,
    isERC20,
    sourceChainId,
    destinationChainId,
    tokenAddress.toLowerCase(),
    from.toLowerCase(),
    (destinationAddress ?? '').toLowerCase(),
    amount.toString(),
  ]

  return cache(cacheKey, BRIDGE_TX_CACHE_TTL_MS, loadPayload)
}

export const getTokenApprovalRequest = async (
  params: ApproveTokenRequest,
  bridgerInstance: Erc20Bridger,
  parentProvider: ReturnType<typeof makeProvider>
): Promise<ApprovalPayload> => {
  const { tokenAddress, sender, sourceChainId } = params

  const loadPayload = async (): Promise<ApprovalPayload> => {
    const txRequest = (await bridgerInstance.getApproveTokenRequest({
      erc20ParentAddress: tokenAddress,
      parentProvider,
    })) as BridgeTxRequest

    return formatTxRequest(txRequest)
  }

  const cacheKey = [
    'approvePayload',
    tokenAddress.toLowerCase(),
    sender.toLowerCase(),
    sourceChainId,
  ]
  return cache(cacheKey, APPROVAL_CACHE_TTL_MS, loadPayload)
}

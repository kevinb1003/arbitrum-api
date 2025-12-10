import { Request, Response } from 'express'
import {
  getBridgeTransactionRequest,
  getTokenApprovalRequest,
} from '../services/arbitrum/bridge'
import {
  BridgeDirection,
  BridgeType,
  type BridgeRequest,
  type ApproveTokenRequest,
} from '../types/bridge'
import {
  BridgeRequestSchema,
  ApproveTokenRequestSchema,
} from '../validation/bridge'
import { getBridger, getDirection } from '../services/arbitrum/bridge/utils'
import {
  getCachedContract,
  isAddressEqual,
  parentChain,
  parentProvider,
  childProvider,
  zeroAddress,
} from '../lib/web3/ethers'
import { cache } from '../lib/cache'
import { SDKError } from '../lib/errors'
import { ErrorCode } from '../types/api'
import erc20Contract from '../lib/web3/contracts/erc20.json'
import { Erc20Bridger } from '@arbitrum/sdk'
import { BRIDGE_GETTER_CACHE_TTL_MS } from '../constants'
import { Address } from '../types/web3'
import { validate } from '../validation/utils'
import createLogger from '../lib/logger'

const logger = createLogger('handlers:bridge')

export const handleBridgeTransaction = async (req: Request, res: Response) => {
  const {
    amount,
    recipient,
    sender,
    sourceChainId,
    destinationChainId,
    tokenAddress,
  } = validate(BridgeRequestSchema, req.body) as BridgeRequest

  const isERC20 = !isAddressEqual(tokenAddress, zeroAddress)
  logger.debug('bridge request received', {
    sourceChainId,
    destinationChainId,
    tokenAddress,
    sender,
    recipient,
    isERC20,
  })

  const bridger = await getBridger(isERC20 ? BridgeType.ERC20 : BridgeType.ETH)
  const direction = getDirection(bridger, sourceChainId, destinationChainId)
  logger.debug('bridge direction resolved', { direction })

  if (isERC20 && direction === BridgeDirection.DEPOSIT) {
    const cacheKeyPrefix = tokenAddress.toLowerCase()
    const erc20Bridger = bridger as Erc20Bridger

    const [disabled, registered, gatewayRaw] = await Promise.all([
      cache(
        `token:${cacheKeyPrefix}:depositDisabled`,
        BRIDGE_GETTER_CACHE_TTL_MS,
        () => erc20Bridger.isDepositDisabled(tokenAddress, parentProvider)
      ),
      cache(
        `token:${cacheKeyPrefix}:isRegistered`,
        BRIDGE_GETTER_CACHE_TTL_MS,
        () =>
          erc20Bridger.isRegistered({
            erc20ParentAddress: tokenAddress,
            parentProvider,
            childProvider,
          })
      ),
      cache(`token:${cacheKeyPrefix}:gateway`, BRIDGE_GETTER_CACHE_TTL_MS, () =>
        erc20Bridger.getParentGatewayAddress(tokenAddress, parentProvider)
      ),
    ])
    logger.debug('token checks complete', {
      tokenAddress,
      disabled,
      registered,
      gateway: gatewayRaw,
    })

    if (disabled) {
      throw new SDKError(
        ErrorCode.TOKEN_DEPOSIT_DISABLED,
        `Token ${tokenAddress} deposits are disabled on the router`,
        { tokenAddress }
      )
    }

    if (!registered) {
      throw new SDKError(
        ErrorCode.TOKEN_NOT_REGISTERED,
        `Token ${tokenAddress} is not registered on the token bridge gateways`,
        { tokenAddress }
      )
    }

    const erc20 = getCachedContract(
      tokenAddress,
      erc20Contract.abi,
      parentProvider
    )
    const gatewayAddress = gatewayRaw as Address
    const allowance = await erc20.allowance(sender, gatewayAddress)
    logger.debug('allowance fetched', {
      tokenAddress,
      sender,
      gatewayAddress,
      allowance: allowance.toString(),
      requiredAmount: amount.toString(),
    })

    if (allowance.lt(amount)) {
      throw new SDKError(
        ErrorCode.TOKEN_NOT_APPROVED,
        `Token not approved for gateway. Approve before depositing.`,
        {
          tokenAddress,
          gatewayAddress,
          requiredAmount: amount,
          currentAllowance: allowance.toString(),
        }
      )
    }
  }

  const payload = await getBridgeTransactionRequest(
    direction,
    {
      amount,
      recipient,
      sender,
      sourceChainId,
      destinationChainId,
      tokenAddress,
    } as BridgeRequest,
    bridger,
    isERC20,
    parentProvider,
    childProvider
  )

  return res.api(payload)
}

export const handleTokenApproval = async (req: Request, res: Response) => {
  const { tokenAddress, sender, sourceChainId } = validate(
    ApproveTokenRequestSchema,
    req.body
  ) as ApproveTokenRequest
  logger.debug('token approval request received', {
    tokenAddress,
    sender,
    sourceChainId,
  })

  if (sourceChainId !== parentChain.id) {
    throw new SDKError(
      ErrorCode.INVALID_CHAIN_PAIR,
      `Token approval must be requested from L1.`,
      { sourceChainId, expected: parentChain.id }
    )
  }

  const bridger = (await getBridger(BridgeType.ERC20)) as Erc20Bridger
  const payload = await getTokenApprovalRequest(
    { tokenAddress, sender, sourceChainId },
    bridger,
    parentProvider
  )

  logger.debug('token approval request complete', {
    tokenAddress,
    sender,
    sourceChainId,
    payload,
  })

  return res.api(payload)
}

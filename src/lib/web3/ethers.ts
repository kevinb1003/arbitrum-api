import {
  constants,
  providers,
  utils,
  Contract,
  type ContractInterface,
} from 'ethers'
import { L1_RPC_URL, L2_RPC_URL, NETWORK_MODE } from '../../constants'
import { Address, NetworkKey } from '../../types/web3'

const parentChildByMode: Record<
  NetworkKey,
  { parent: { id: number; name: string }; child: { id: number; name: string } }
> = {
  mainnet: {
    parent: { id: 1, name: 'Ethereum' },
    child: { id: 42161, name: 'Arbitrum One' },
  },
  sepolia: {
    parent: { id: 11155111, name: 'Sepolia' },
    child: { id: 421614, name: 'Arbitrum Sepolia' },
  },
}

const mode: NetworkKey = (
  NETWORK_MODE in parentChildByMode ? NETWORK_MODE : 'sepolia'
) as NetworkKey
const { parent: parentChain, child: childChain } = parentChildByMode[mode]
export { parentChain, childChain }

export const makeProvider = (
  chainId: number,
  chainName: string,
  url?: string
): providers.Provider =>
  new providers.JsonRpcProvider(url, {
    chainId,
    name: chainName,
  })

export const parentProvider = makeProvider(
  parentChain.id,
  parentChain.name,
  L1_RPC_URL
)

export const childProvider = makeProvider(
  childChain.id,
  childChain.name,
  L2_RPC_URL
)

const contractCache = new Map<string, Contract>()

export const getCachedContract = (
  address: Address,
  abi: ContractInterface,
  provider: providers.Provider
) => {
  const maybeJsonRpc = provider as providers.JsonRpcProvider
  const chainId =
    maybeJsonRpc?._network?.chainId ??
    maybeJsonRpc.network?.chainId ??
    'unknown'
  const key = `${address.toLowerCase()}:${chainId}`
  const existing = contractCache.get(key)
  if (existing) return existing

  const instance = new Contract(address, abi, provider)
  contractCache.set(key, instance)

  return instance
}

export const zeroAddress = constants.AddressZero

export const isAddressEqual = (a?: Address, b?: Address): boolean => {
  if (!a || !b) return false

  try {
    return utils.getAddress(a) === utils.getAddress(b)
  } catch {
    return false
  }
}

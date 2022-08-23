
// Type Imports:
import type { ethers } from 'ethers';
import type { Address, Chain } from 'weaverfi/dist/types';

/* ========================================================================================================================================================================= */

// Files Type:
export type Files = 'deposits' | 'withdrawals' | 'claims' | 'balances' | 'yield' | 'supply' | 'delegationsCreated' | 'delegationsFunded' | 'delegationsUpdated' | 'delegationsWithdrawn' | 'wallets' | 'stats';

// Transaction Type:
export type TX = DepositTX | WithdrawalTX | ClaimTX | DelegationCreatedTX | DelegationFundedTX | DelegationUpdatedTX | DelegationWithdrawnTX;

// Chain Data Type:
export type ChainData = [Chain, File | undefined, File | undefined, File | undefined, File | undefined, File | undefined, File | undefined, File | undefined, File | undefined, number];

/* ========================================================================================================================================================================= */

// File Interface:
export interface File {
  lastQueriedBlock: number
  timestamp?: number
  data: any[]
}

// Paginated File Interface:
export interface PaginatedFile {
  lastQueriedBlock: number
  timestamp?: number
  page: number
  hasNextPage: boolean
  data: any[]
}

// Chain Info Interface:
export interface ChainInfo {
  provider: ethers.providers.StaticJsonRpcProvider
  rpcLimit: number
  prizePool: Address
  prizeDistributor: Address
  delegator: Address
  ticket: Address
  flush: Address
  aaveUSDC: Address
  yieldSource: Address
  timestamps: { block: number, timestamp: number }[]
}

// Deposit Interface:
export interface Deposit {
  txHash: string
  block: number
  timestamp: number | undefined
  wallet: Address
  amount: number
}

// Withdrawal Interface:
export interface Withdrawal {
  txHash: string
  block: number
  timestamp: number | undefined
  wallet: Address
  amount: number
}

// Claim Interface:
export interface Claim {
  txHash: string
  block: number
  timestamp: number | undefined
  wallet: Address
  prizes: number[]
}

// Balance Interface:
export interface Balance {
  wallet: Address
  balance: number
}

// Yield Capture Interface:
export interface YieldCapture {
  txHash: string
  block: number
  timestamp: number | undefined
  amount: number
}

// Supply Interface:
export interface Supply {
  block: number
  timestamp: number | undefined
  aave: number
  tickets: number
}

// Delegation Created Interface:
export interface DelegationCreated {
  txHash: string
  block: number
  timestamp: number | undefined
  delegator: Address
  delegatee: Address
}

// Delegation Funded Interface:
export interface DelegationFunded {
  txHash: string
  block: number
  timestamp: number | undefined
  delegator: Address
  amount: number
}

// Delegation Updated Interface:
export interface DelegationUpdated {
  txHash: string
  block: number
  timestamp: number | undefined
  delegator: Address
  newDelegatee: Address
}

// Delegation Withdrawn Interface:
export interface DelegationWithdrawn {
  txHash: string
  block: number
  timestamp: number | undefined
  delegator: Address
  amount: number
}

// Wallet Data Interface:
export interface WalletData {
  txs: TX[]
  currentBalance: number
}

// Player Data Interface:
export interface PlayerData {
  txs: TX[]
  timestamps: number[]
  depositsOverTime: number[]
  claimsOverTime: number[]
  withdrawalsOverTime: number[]
  balancesOverTime: number[]
  balances: { eth: number, poly: number, avax: number, op: number }
}

// Transaction Interfaces:
export interface DepositTX {
  chain?: Chain
  type: 'deposit'
  data: Deposit
}
export interface WithdrawalTX {
  chain?: Chain
  type: 'withdrawal'
  data: Withdrawal
}
export interface ClaimTX {
  chain?: Chain
  type: 'claim'
  data: Claim
}
export interface DelegationCreatedTX {
  chain?: Chain
  type: 'delegationCreated'
  data: DelegationCreated
}
export interface DelegationFundedTX {
  chain?: Chain
  type: 'delegationFunded'
  data: DelegationFunded
}
export interface DelegationUpdatedTX {
  chain?: Chain
  type: 'delegationUpdated'
  data: DelegationUpdated
}
export interface DelegationWithdrawnTX {
  chain?: Chain
  type: 'delegationWithdrawn'
  data: DelegationWithdrawn
}

// Chain Stats Interface:
export interface ChainStats {
  minTimestamp: number
  maxTimestamp: number
  depositsOverTime: DepositsOverTime
  withdrawalsOverTime: WithdrawalsOverTime
  claimsOverTime: ClaimsOverTime
  tvlOverTime: TVLOverTime
  delegationsOverTime: DelegationsOverTime
  yieldOverTime: YieldOverTime
  winlessWithdrawals: WinlessWithdrawals[]
  tvlDistribution: TVLDistribution
  currentUsers: Address[]
}

// Over Time Interfaces:
export interface DepositsOverTime {
  timestamps: number[]
  depositAmounts: number[]
  depositCounts: number[]
  uniqueWallets: number[]
  distributions: DepositDistribution
  avgDepositAmounts: number[]
  cumulativeDepositAmounts: number[]
  cumulativeDepositCounts: number[]
  cumulativeUniqueWallets: number[]
  cumulativeDistributions: DepositDistribution
}
export interface WithdrawalsOverTime {
  timestamps: number[]
  withdrawalAmounts: number[]
  withdrawalCounts: number[]
  uniqueWallets: number[]
  avgWithdrawalAmounts: number[]
  cumulativeWithdrawalAmounts: number[]
  cumulativeWithdrawalCounts: number[]
  cumulativeUniqueWallets: number[]
}
export interface ClaimsOverTime {
  timestamps: number[]
  claimAmounts: number[]
  claimCounts: number[]
  prizeCounts: number[]
  uniqueWallets: number[]
  distributions: ClaimDistribution
  avgClaimAmounts: number[]
  cumulativeClaimAmounts: number[]
  cumulativeClaimCounts: number[]
  cumulativePrizeCounts: number[]
  cumulativeUniqueWallets: number[]
  cumulativeDistributions: ClaimDistribution
}
export interface TVLOverTime {
  timestamps: number[]
  tvls: number[]
}
export interface DelegationsOverTime {
  timestamps: number[]
  delegationAmounts: number[]
  delegationCounts: number[]
  delegationWithdrawalAmounts: number[]
  delegationWithdrawalCounts: number[]
  uniqueWallets: number[]
  avgDelegationAmounts: number[]
  cumulativeDelegationAmounts: number[]
  cumulativeDelegationCounts: number[]
  cumulativeDelegationWithdrawalAmounts: number[]
  cumulativeDelegationWithdrawalCounts: number[]
  cumulativeUniqueWallets: number[]
  tvls: number[]
}
export interface YieldOverTime {
  timestamps: number[]
  yieldAmounts: number[]
  yieldCounts: number[]
  cumulativeYieldAmounts: number[]
  cumulativeYieldCounts: number[]
}

// Distribution Interfaces:
export interface DepositDistribution {
  1: number[]
  10: number[]
  100: number[]
  1000: number[]
  10000: number[]
  100000: number[]
}
export interface ClaimDistribution {
  1: number[]
  5: number[]
  10: number[]
  50: number[]
  100: number[]
  500: number[]
  1000: number[]
}
export interface MultichainDistribution {
  totalUsers: number
  oneChain: number
  twoChains: number
  threeChains: number
  fourChains: number
}
export interface TVLDistribution {
  1: { amount: number, count: number }
  10: { amount: number, count: number }
  100: { amount: number, count: number }
  1000: { amount: number, count: number }
  10000: { amount: number, count: number }
  100000: { amount: number, count: number }
  1000000: { amount: number, count: number }
}

// Winless Withdrawals Interface:
export interface WinlessWithdrawals {
  wallet: Address
  maxBalance: number
  firstDepositTimestamp: number
  lastWithdrawalTimestamp: number
}
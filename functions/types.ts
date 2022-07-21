
// Type Imports:
import type { ethers } from 'ethers';
import type { Address } from 'weaverfi/dist/types';

/* ========================================================================================================================================================================= */

// Files Type:
export type Files = 'deposits' | 'withdrawals' | 'claims' | 'yield' | 'supply' | 'delegationsCreated' | 'delegationsFunded' | 'delegationsUpdated' | 'delegationsWithdrawn';

/* ========================================================================================================================================================================= */

// File Interface:
export interface File {
  lastQueriedBlock: number
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
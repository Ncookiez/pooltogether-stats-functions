
// Imports:
import { getBlockTimestamp } from './queries';

// Type Imports:
import type { Chain, Address } from 'weaverfi/dist/types';
import type { File, TX, Deposit, Withdrawal, Claim, Balance, YieldCapture, DelegationCreated, DelegationFunded, DelegationWithdrawn, ChainStats, DepositsOverTime, WithdrawalsOverTime, ClaimsOverTime, TVLOverTime, DelegationsOverTime, YieldOverTime, TVLDistribution } from './types';

// Stats Settings:
const minTimestamp = 1_634_270_000;
const ticks = 50;
const zeros: number[] = new Array(ticks).fill(0);

/* ========================================================================================================================================================================= */

// Function to get aggregated chain stats:
export const getStats = async (chain: Chain, deposits: File | undefined, withdrawals: File | undefined, claims: File | undefined, balances: File | undefined, delegationsCreated: File | undefined, delegationsFunded: File | undefined, delegationsUpdated: File | undefined, delegationsWithdrawn: File | undefined, yields: File | undefined, wallets: File | undefined) => {
  if(deposits && withdrawals && claims && balances && delegationsCreated && delegationsFunded && delegationsUpdated && delegationsWithdrawn && yields && wallets) {
    const file: File = { lastQueriedBlock: deposits.lastQueriedBlock, data: [] };
    const maxTimestamp = (await getBlockTimestamp(chain, deposits.lastQueriedBlock)) as number;
    const timestamps = getRangeArray(minTimestamp, maxTimestamp);
    console.log(`${chain.toUpperCase()}: Calculating deposits over time...`);
    const depositsOverTime = getDepositsOverTime(deposits.data, timestamps);
    console.log(`${chain.toUpperCase()}: Calculating withdrawals over time...`);
    const withdrawalsOverTime = getWithdrawalsOverTime(withdrawals.data, timestamps);
    console.log(`${chain.toUpperCase()}: Calculating claims over time...`);
    const claimsOverTime = getClaimsOverTime(claims.data, timestamps);
    console.log(`${chain.toUpperCase()}: Calculating TVL over time...`);
    const tvlOverTime = getTVLOverTime(depositsOverTime, withdrawalsOverTime, claimsOverTime);
    console.log(`${chain.toUpperCase()}: Calculating delegations over time...`);
    const delegationsOverTime = getDelegationsOverTime(delegationsCreated.data, delegationsFunded.data, delegationsWithdrawn.data, timestamps);
    console.log(`${chain.toUpperCase()}: Calculating yield over time...`);
    const yieldOverTime = getYieldOverTime(yields.data, timestamps);
    console.log(`${chain.toUpperCase()}: Calculating TVL distribution...`);
    const tvlDistribution = getTVLDistribution(balances.data);
    console.log(`${chain.toUpperCase()}: Filtering user balances...`);
    const currentUsers = (balances.data as Balance[]).filter(entry => entry.balance > 0).map(entry => entry.wallet);
    const topWhales = (balances.data as Balance[]).slice(0, 10);
    const stats: ChainStats = { minTimestamp, maxTimestamp, depositsOverTime, withdrawalsOverTime, claimsOverTime, tvlOverTime, delegationsOverTime, yieldOverTime, tvlDistribution, currentUsers, topWhales };
    file.data.push(stats);
    console.info(`${chain.toUpperCase()}: Calculated all stats.`);
    return file;
  }
}

/* ========================================================================================================================================================================= */

// Function to get deposits over time:
const getDepositsOverTime = (deposits: Deposit[], timestamps: number[]) => {

  // Initializations:
  const depositsOverTime: DepositsOverTime = {
    timestamps: timestamps,
    depositAmounts: [...zeros],
    depositCounts: [...zeros],
    uniqueWallets: [...zeros],
    distributions: { 1: [...zeros], 10: [...zeros], 100: [...zeros], 1000: [...zeros], 10000: [...zeros], 100000: [...zeros] },
    avgDepositAmounts: [...zeros],
    cumulativeDepositAmounts: [...zeros],
    cumulativeDepositCounts: [...zeros],
    cumulativeUniqueWallets: [...zeros],
    cumulativeDistributions: { 1: [...zeros], 10: [...zeros], 100: [...zeros], 1000: [...zeros], 10000: [...zeros], 100000: [...zeros] }
  }
  const cumulativeUniqueWallets: Address[] = [];
  const cumulativeDistributions = { 1: 0, 10: 0, 100: 0, 1000: 0, 10000: 0, 100000: 0 };
  let cumulativeDepositAmount: number = 0;
  let cumulativeDepositCount: number = 0;

  // Filtering Data:
  deposits.forEach(deposit => {
    if(deposit.timestamp) {
      for(let i = 0; i < ticks; i++) {
        if(deposit.timestamp <= timestamps[i]) {
          depositsOverTime.depositAmounts[i] += deposit.amount;
          depositsOverTime.depositCounts[i]++;
          cumulativeDepositAmount += deposit.amount;
          cumulativeDepositCount++;
          if(!cumulativeUniqueWallets.includes(deposit.wallet)) {
            cumulativeUniqueWallets.push(deposit.wallet);
            depositsOverTime.uniqueWallets[i]++;
          }
          if(deposit.amount >= 1) {
            if(deposit.amount >= 10) {
              if(deposit.amount >= 100) {
                if(deposit.amount >= 1_000) {
                  if(deposit.amount >= 10_000) {
                    if(deposit.amount >= 100_000) {
                      depositsOverTime.distributions[100_000][i]++;
                      cumulativeDistributions[100_000]++;
                    } else {
                      depositsOverTime.distributions[10_000][i]++;
                      cumulativeDistributions[10_000]++;
                    }
                  } else {
                    depositsOverTime.distributions[1_000][i]++;
                    cumulativeDistributions[1_000]++;
                  }
                } else {
                  depositsOverTime.distributions[100][i]++;
                  cumulativeDistributions[100]++;
                }
              } else {
                depositsOverTime.distributions[10][i]++;
                cumulativeDistributions[10]++;
              }
            } else {
              depositsOverTime.distributions[1][i]++;
              cumulativeDistributions[1]++;
            }
          }
          depositsOverTime.cumulativeDepositAmounts[i] = cumulativeDepositAmount;
          depositsOverTime.cumulativeDepositCounts[i] = cumulativeDepositCount;
          depositsOverTime.cumulativeDistributions[1][i] = cumulativeDistributions[1];
          depositsOverTime.cumulativeDistributions[10][i] = cumulativeDistributions[10];
          depositsOverTime.cumulativeDistributions[100][i] = cumulativeDistributions[100];
          depositsOverTime.cumulativeDistributions[1_000][i] = cumulativeDistributions[1_000];
          depositsOverTime.cumulativeDistributions[10_000][i] = cumulativeDistributions[10_000];
          depositsOverTime.cumulativeDistributions[100_000][i] = cumulativeDistributions[100_000];
          depositsOverTime.avgDepositAmounts[i] = depositsOverTime.depositAmounts[i] / depositsOverTime.depositCounts[i];
          depositsOverTime.cumulativeUniqueWallets[i] = cumulativeUniqueWallets.length;
          break;
        }
      }
    }
  });

  return depositsOverTime;
}

// Function to get withdrawals over time:
const getWithdrawalsOverTime = (withdrawals: Withdrawal[], timestamps: number[]) => {

  // Initializations:
  const withdrawalsOverTime: WithdrawalsOverTime = {
    timestamps: timestamps,
    withdrawalAmounts: [...zeros],
    withdrawalCounts: [...zeros],
    uniqueWallets: [...zeros],
    avgWithdrawalAmounts: [...zeros],
    cumulativeWithdrawalAmounts: [...zeros],
    cumulativeWithdrawalCounts: [...zeros],
    cumulativeUniqueWallets: [...zeros]
  }
  const cumulativeUniqueWallets: Address[] = [];
  let cumulativeWithdrawalAmount: number = 0;
  let cumulativeWithdrawalCount: number = 0;

  // Filtering Data:
  withdrawals.forEach(withdrawal => {
    if(withdrawal.timestamp) {
      for(let i = 0; i < ticks; i++) {
        if(withdrawal.timestamp <= timestamps[i]) {
          withdrawalsOverTime.withdrawalAmounts[i] += withdrawal.amount;
          withdrawalsOverTime.withdrawalCounts[i]++;
          cumulativeWithdrawalAmount += withdrawal.amount;
          cumulativeWithdrawalCount++;
          if(!cumulativeUniqueWallets.includes(withdrawal.wallet)) {
            cumulativeUniqueWallets.push(withdrawal.wallet);
            withdrawalsOverTime.uniqueWallets[i]++;
          }
          withdrawalsOverTime.cumulativeWithdrawalAmounts[i] = cumulativeWithdrawalAmount;
          withdrawalsOverTime.cumulativeWithdrawalCounts[i] = cumulativeWithdrawalCount;
          withdrawalsOverTime.avgWithdrawalAmounts[i] = withdrawalsOverTime.withdrawalAmounts[i] / withdrawalsOverTime.withdrawalCounts[i];
          withdrawalsOverTime.cumulativeUniqueWallets[i] = cumulativeUniqueWallets.length;
          break;
        }
      }
    }
  });

  return withdrawalsOverTime;
}

// Function to get claims over time:
const getClaimsOverTime = (claims: Claim[], timestamps: number[]) => {

  // Initializations:
  const claimsOverTime: ClaimsOverTime = {
    timestamps: timestamps,
    claimAmounts: [],
    claimCounts: [],
    prizeCounts: [],
    uniqueWallets: [],
    distributions: { 1: [], 5: [], 10: [], 50: [], 100: [], 500: [], 1000: [] },
    avgClaimAmounts: [],
    cumulativeClaimAmounts: [],
    cumulativeClaimCounts: [],
    cumulativePrizeCounts: [],
    cumulativeUniqueWallets: [],
    cumulativeDistributions: { 1: [], 5: [], 10: [], 50: [], 100: [], 500: [], 1000: [] }
  }
  const cumulativeUniqueWallets: Address[] = [];
  const cumulativeDistributions = { 1: 0, 5: 0, 10: 0, 50: 0, 100: 0, 500: 0, 1000: 0 };
  let cumulativeClaimAmount: number = 0;
  let cumulativeClaimCount: number = 0;
  let cumulativePrizeCount: number = 0;

  // Filtering Data:
  claims.forEach(claim => {
    if(claim.timestamp) {
      for(let i = 0; i < ticks; i++) {
        if(claim.timestamp <= timestamps[i]) {
          const totalAmountClaimed = claim.prizes.reduce((a, b) => a + b, 0);
          claimsOverTime.claimAmounts[i] += totalAmountClaimed;
          claimsOverTime.claimCounts[i]++;
          claimsOverTime.prizeCounts[i] += claim.prizes.length;
          cumulativeClaimAmount += totalAmountClaimed;
          cumulativeClaimCount++;
          cumulativePrizeCount += claim.prizes.length;
          if(!cumulativeUniqueWallets.includes(claim.wallet)) {
            cumulativeUniqueWallets.push(claim.wallet);
            claimsOverTime.uniqueWallets[i]++;
          }
          if(totalAmountClaimed >= 1) {
            if(totalAmountClaimed >= 5) {
              if(totalAmountClaimed >= 10) {
                if(totalAmountClaimed >= 50) {
                  if(totalAmountClaimed >= 100) {
                    if(totalAmountClaimed >= 500) {
                      if(totalAmountClaimed >= 1_000) {
                        claimsOverTime.distributions[1_000][i]++;
                        cumulativeDistributions[1_000]++;
                      } else {
                        claimsOverTime.distributions[500][i]++;
                        cumulativeDistributions[500]++;
                      }
                    } else {
                      claimsOverTime.distributions[100][i]++;
                      cumulativeDistributions[100]++;
                    }
                  } else {
                    claimsOverTime.distributions[50][i]++;
                    cumulativeDistributions[50]++;
                  }
                } else {
                  claimsOverTime.distributions[10][i]++;
                  cumulativeDistributions[10]++;
                }
              } else {
                claimsOverTime.distributions[5][i]++;
                cumulativeDistributions[5]++;
              }
            } else {
              claimsOverTime.distributions[1][i]++;
              cumulativeDistributions[1]++;
            }
          }
          claimsOverTime.cumulativeClaimAmounts[i] = cumulativeClaimAmount;
          claimsOverTime.cumulativeClaimCounts[i] = cumulativeClaimCount;
          claimsOverTime.cumulativePrizeCounts[i] = cumulativePrizeCount;
          claimsOverTime.cumulativeDistributions[1][i] = cumulativeDistributions[1];
          claimsOverTime.cumulativeDistributions[5][i] = cumulativeDistributions[5];
          claimsOverTime.cumulativeDistributions[10][i] = cumulativeDistributions[10];
          claimsOverTime.cumulativeDistributions[50][i] = cumulativeDistributions[50];
          claimsOverTime.cumulativeDistributions[100][i] = cumulativeDistributions[100];
          claimsOverTime.cumulativeDistributions[1_000][i] = cumulativeDistributions[1_000];
          claimsOverTime.avgClaimAmounts[i] = claimsOverTime.claimAmounts[i] / claimsOverTime.claimCounts[i];
          claimsOverTime.cumulativeUniqueWallets[i] = cumulativeUniqueWallets.length;
          break;
        }
      }
    }
  });

  return claimsOverTime;
}

// Function to get TVL over time:
const getTVLOverTime = (depositsOverTime: DepositsOverTime, withdrawalsOverTime: WithdrawalsOverTime, claimsOverTime: ClaimsOverTime) => {

  // Initializations:
  const tvlOverTime: TVLOverTime = {
    timestamps: depositsOverTime.timestamps,
    tvls: []
  }

  // Calculating TVL Over Time:
  for(let i = 0; i < tvlOverTime.timestamps.length; i++) {
    const tvl = depositsOverTime.cumulativeDepositAmounts[i] + claimsOverTime.cumulativeClaimAmounts[i] - withdrawalsOverTime.cumulativeWithdrawalAmounts[i];
    tvlOverTime.tvls.push(tvl);
  }

  return tvlOverTime;
}

// Function to get delegations over time:
const getDelegationsOverTime = (delegationsCreated: DelegationCreated[], delegationsFunded: DelegationFunded[], delegationsWithdrawn: DelegationWithdrawn[], timestamps: number[]) => {

  // Initializations:
  const delegationsOverTime: DelegationsOverTime = {
    timestamps: timestamps,
    delegationAmounts: [],
    delegationCounts: [],
    delegationWithdrawalAmounts: [],
    delegationWithdrawalCounts: [],
    uniqueWallets: [],
    avgDelegationAmounts: [],
    cumulativeDelegationAmounts: [],
    cumulativeDelegationCounts: [],
    cumulativeDelegationWithdrawalAmounts: [],
    cumulativeDelegationWithdrawalCounts: [],
    cumulativeUniqueWallets: [],
    tvls: []
  }
  let cumulativeDelegationAmount = 0;
  let cumulativeDelegationCount = 0;
  let cumulativeDelegationWithdrawalAmount = 0;
  let cumulativeDelegationWithdrawalCount = 0;
  let cumulativeUniqueWallets: Address[] = [];
  
  // Filtering Data:
  for(let i = 0; i < ticks; i++) {
    let delegationAmount = 0;
    let delegationCount = 0;
    let delegationWithdrawalAmount = 0;
    let delegationWithdrawalCount = 0;
    let newWallets = 0;
    delegationsCreated.forEach(delegation => {
      if(delegation.timestamp && delegation.timestamp <= delegationsOverTime.timestamps[i]) {
        if((i > 0 && delegation.timestamp > delegationsOverTime.timestamps[i - 1]) || i === 0) {
          delegationCount++;
          if(!cumulativeUniqueWallets.includes(delegation.delegator)) {
            cumulativeUniqueWallets.push(delegation.delegator);
            newWallets++;
          }
        }
      }
    });
    delegationsFunded.forEach(delegation => {
      if(delegation.timestamp && delegation.timestamp <= delegationsOverTime.timestamps[i]) {
        if((i > 0 && delegation.timestamp > delegationsOverTime.timestamps[i - 1]) || i === 0) {
          delegationAmount += delegation.amount;
        }
      }
    });
    delegationsWithdrawn.forEach(delegation => {
      if(delegation.timestamp && delegation.timestamp <= delegationsOverTime.timestamps[i]) {
        if((i > 0 && delegation.timestamp > delegationsOverTime.timestamps[i - 1]) || i === 0) {
          delegationWithdrawalAmount += delegation.amount;
          delegationWithdrawalCount++;
        }
      }
    });
    cumulativeDelegationAmount += delegationAmount;
    cumulativeDelegationCount += delegationCount;
    cumulativeDelegationWithdrawalAmount += delegationWithdrawalAmount;
    cumulativeDelegationWithdrawalCount += delegationWithdrawalCount;
    delegationsOverTime.delegationAmounts.push(Math.floor(delegationAmount));
    delegationsOverTime.delegationCounts.push(delegationCount);
    delegationsOverTime.delegationWithdrawalAmounts.push(Math.floor(delegationWithdrawalAmount));
    delegationsOverTime.delegationWithdrawalCounts.push(delegationWithdrawalCount);
    delegationsOverTime.uniqueWallets.push(newWallets);
    delegationsOverTime.avgDelegationAmounts.push(delegationCount > 0 ? Math.floor(delegationAmount / delegationCount) : 0);
    delegationsOverTime.cumulativeDelegationAmounts.push(Math.floor(cumulativeDelegationAmount));
    delegationsOverTime.cumulativeDelegationCounts.push(cumulativeDelegationCount);
    delegationsOverTime.cumulativeDelegationWithdrawalAmounts.push(Math.floor(cumulativeDelegationWithdrawalAmount));
    delegationsOverTime.cumulativeDelegationWithdrawalCounts.push(cumulativeDelegationWithdrawalCount);
    delegationsOverTime.cumulativeUniqueWallets.push(cumulativeUniqueWallets.length);
    delegationsOverTime.tvls.push(Math.floor(cumulativeDelegationAmount - cumulativeDelegationWithdrawalAmount));
  }

  return delegationsOverTime;
}

// Function to get yield over time:
const getYieldOverTime = (yields: YieldCapture[], timestamps: number[]) => {

  // Initializations:
  const yieldOverTime: YieldOverTime = {
    timestamps: timestamps,
    yieldAmounts: [],
    yieldCounts: [],
    cumulativeYieldAmounts: [],
    cumulativeYieldCounts: []
  }
  let cumulativeYieldAmount = 0;
  let cumulativeYieldCount = 0;
  
  // Filtering Data:
  for(let i = 0; i < ticks; i++) {
    let yieldAmount = 0;
    let yieldCount = 0;
    yields.forEach(yieldTX => {
      if(yieldTX.timestamp && yieldTX.timestamp <= yieldOverTime.timestamps[i]) {
        if((i > 0 && yieldTX.timestamp > yieldOverTime.timestamps[i - 1]) || i === 0) {
          yieldAmount += yieldTX.amount;
          yieldCount++;
        }
      }
    });
    cumulativeYieldAmount += yieldAmount;
    cumulativeYieldCount += yieldCount;
    yieldOverTime.yieldAmounts.push(Math.floor(yieldAmount));
    yieldOverTime.yieldCounts.push(yieldCount);
    yieldOverTime.cumulativeYieldAmounts.push(Math.floor(cumulativeYieldAmount));
    yieldOverTime.cumulativeYieldCounts.push(cumulativeYieldCount);
  }

  return yieldOverTime;
}

// Function to get deposits over time:
const getTVLDistribution = (balances: Balance[]) => {

  // Initializations:
  const tvlDistribution: TVLDistribution = {
    1: { amount: 0, count: 0 },
    10: { amount: 0, count: 0 },
    100: { amount: 0, count: 0 },
    1000: { amount: 0, count: 0 },
    10000: { amount: 0, count: 0 },
    100000: { amount: 0, count: 0 },
    1000000: { amount: 0, count: 0 }
  };

  // Filtering Balances:
  balances.forEach(entry => {
    if(entry.balance >= 1) {
      if(entry.balance >= 10) {
        if(entry.balance >= 100) {
          if(entry.balance >= 1000) {
            if(entry.balance >= 10000) {
              if(entry.balance >= 100000) {
                if(entry.balance >= 1000000) {
                  tvlDistribution[1000000].amount += entry.balance;
                  tvlDistribution[1000000].count++;
                } else {
                  tvlDistribution[100000].amount += entry.balance;
                  tvlDistribution[100000].count++;
                }
              } else {
                tvlDistribution[10000].amount += entry.balance;
                tvlDistribution[10000].count++;
              }
            } else {
              tvlDistribution[1000].amount += entry.balance;
              tvlDistribution[1000].count++;
            }
          } else {
            tvlDistribution[100].amount += entry.balance;
            tvlDistribution[100].count++;
          }
        } else {
          tvlDistribution[10].amount += entry.balance;
          tvlDistribution[10].count++;
        }
      } else {
        tvlDistribution[1].amount += entry.balance;
        tvlDistribution[1].count++;
      }
    }
  });

  return tvlDistribution;
}

/* ========================================================================================================================================================================= */

// Function to get player data over time:
export const getPlayerDataOverTime = (txs: TX[]) => {

  // Initializations:
  const depositsOverTime: number[] = [];
  const claimsOverTime: number[] = [];
  const withdrawalsOverTime: number[] = [];
  const balancesOverTime: number[] = [];
  let cumulativeDepositAmount = 0;
  let cumulativeClaimAmount = 0;
  let cumulativeWithdrawalAmount = 0;

  // Getting Timestamps:
  txs.sort((a, b) => (a.data.timestamp as number) - (b.data.timestamp as number));
  const firstTimestamp = txs[0].data.timestamp as number;
  const lastTimestamp = txs[txs.length - 1].data.timestamp as number;
  const timestamps = getRangeArray(firstTimestamp, lastTimestamp, true);

  // Getting Data Over Time:
  for(let i = 0; i < ticks; i++) {
    let depositAmount = 0;
    let claimAmount = 0;
    let withdrawalAmount = 0;
    txs.forEach(tx => {
      if(tx.data.timestamp && tx.data.timestamp <= timestamps[i]) {
        if((1 > 0 && tx.data.timestamp > timestamps[i - 1]) || i === 0) {
          if(tx.type === 'deposit') {
            depositAmount += tx.data.amount;
          } else if(tx.type === 'claim') {
            claimAmount += tx.data.prizes.reduce((a, b) => a + b, 0);
          } else if(tx.type === 'withdrawal') {
            withdrawalAmount += tx.data.amount;
          }
        }
      }
    });
    cumulativeDepositAmount += depositAmount;
    cumulativeClaimAmount += claimAmount;
    cumulativeWithdrawalAmount += withdrawalAmount;
    depositsOverTime.push(Math.floor(cumulativeDepositAmount));
    claimsOverTime.push(Math.floor(cumulativeClaimAmount));
    withdrawalsOverTime.push(Math.floor(cumulativeWithdrawalAmount));
    balancesOverTime.push(Math.floor(cumulativeDepositAmount + cumulativeClaimAmount - cumulativeWithdrawalAmount));
  }
  
  return [timestamps, depositsOverTime, claimsOverTime, withdrawalsOverTime, balancesOverTime];
}

/* ========================================================================================================================================================================= */

// Helper function to get array of numbers:
export const getRangeArray = (start: number, end: number, includeFirstValue?: boolean) => {
  const range: number[] = [];
  const timespan = end - start;
  const tick = includeFirstValue ? (timespan / ticks) + (timespan / ticks / ticks) : timespan / ticks;
  if(includeFirstValue) { range.push(Math.ceil(start)); };
  let value = start;
  while(Math.ceil(value) < end) {
    value += tick;
    range.push(Math.ceil(value));
  }
  return range;
}
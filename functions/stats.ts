
// Imports:
import { getBlockTimestamp } from './queries';

// Type Imports:
import type { Chain, Address } from 'weaverfi/dist/types';
import type { File, TX, Deposit, Withdrawal, Claim, Balance, YieldCapture, DelegationCreated, DelegationFunded, DelegationWithdrawn, WalletData, ChainStats, DepositsOverTime, WithdrawalsOverTime, ClaimsOverTime, TVLOverTime, DelegationsOverTime, YieldOverTime, WinlessWithdrawals, TVLDistribution } from './types';

// Stats Settings:
const minTimestamp = 1634270000;
const ticks = 50;

/* ========================================================================================================================================================================= */

// Function to get aggregated chain stats:
export const getStats = async (chain: Chain, deposits: File | undefined, withdrawals: File | undefined, claims: File | undefined, balances: File | undefined, delegationsCreated: File | undefined, delegationsFunded: File | undefined, delegationsUpdated: File | undefined, delegationsWithdrawn: File | undefined, currentBlock: number, yields: File | undefined, wallets: File | undefined) => {
  if(deposits && withdrawals && claims && balances && delegationsCreated && delegationsFunded && delegationsUpdated && delegationsWithdrawn && yields && wallets) {
    const file: File = { lastQueriedBlock: currentBlock, data: [] };
    const maxTimestamp = (await getBlockTimestamp(chain, currentBlock)) as number;
    const timestamps = getRangeArray(minTimestamp, maxTimestamp);
    const depositsOverTime = getDepositsOverTime(deposits.data, timestamps);
    const withdrawalsOverTime = getWithdrawalsOverTime(withdrawals.data, timestamps);
    const claimsOverTime = getClaimsOverTime(claims.data, timestamps);
    const tvlOverTime = getTVLOverTime(depositsOverTime, withdrawalsOverTime, claimsOverTime);
    const delegationsOverTime = getDelegationsOverTime(delegationsCreated.data, delegationsFunded.data, delegationsWithdrawn.data, timestamps);
    const yieldOverTime = getYieldOverTime(yields.data, timestamps);
    const winlessWithdrawals = getWinlessWithdrawals(wallets.data);
    const tvlDistribution = getTVLDistribution(balances.data);
    const stats: ChainStats = { minTimestamp, maxTimestamp, depositsOverTime, withdrawalsOverTime, claimsOverTime, tvlOverTime, delegationsOverTime, yieldOverTime, winlessWithdrawals, tvlDistribution };
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
    depositAmounts: [],
    depositCounts: [],
    uniqueWallets: [],
    distributions: { 1: [], 10: [], 100: [], 1000: [], 10000: [], 100000: [] },
    avgDepositAmounts: [],
    cumulativeDepositAmounts: [],
    cumulativeDepositCounts: [],
    cumulativeUniqueWallets: [],
    cumulativeDistributions: { 1: [], 10: [], 100: [], 1000: [], 10000: [], 100000: [] }
  }
  let cumulativeDepositAmount = 0;
  let cumulativeDepositCount = 0;
  let cumulativeUniqueWallets: Address[] = [];
  let cumulativeDistributions = { 1: 0, 10: 0, 100: 0, 1000: 0, 10000: 0, 100000: 0 };
  
  // Filtering Data:
  for(let i = 0; i < ticks; i++) {
    let depositAmount = 0;
    let depositCount = 0;
    let newWallets = 0;
    let distributions = { 1: 0, 10: 0, 100: 0, 1000: 0, 10000: 0, 100000: 0 };
    deposits.forEach(deposit => {
      if(deposit.timestamp && deposit.timestamp <= depositsOverTime.timestamps[i]) {
        if((i > 0 && deposit.timestamp > depositsOverTime.timestamps[i - 1]) || i === 0) {
          depositAmount += deposit.amount;
          depositCount++;
          if(!cumulativeUniqueWallets.includes(deposit.wallet)) {
            cumulativeUniqueWallets.push(deposit.wallet);
            newWallets++;
          }
          if(deposit.amount >= 1) {
            if(deposit.amount >= 10) {
              if(deposit.amount >= 100) {
                if(deposit.amount >= 1000) {
                  if(deposit.amount >= 10000) {
                    if(deposit.amount >= 100000) {
                      distributions[100000]++;
                    } else {
                      distributions[10000]++;
                    }
                  } else {
                    distributions[1000]++;
                  }
                } else {
                  distributions[100]++;
                }
              } else {
                distributions[10]++;
              }
            } else {
              distributions[1]++;
            }
          }
        }
      }
    });
    cumulativeDepositAmount += depositAmount;
    cumulativeDepositCount += depositCount;
    cumulativeDistributions[1] += distributions[1];
    cumulativeDistributions[10] += distributions[10];
    cumulativeDistributions[100] += distributions[100];
    cumulativeDistributions[1000] += distributions[1000];
    cumulativeDistributions[10000] += distributions[10000];
    cumulativeDistributions[100000] += distributions[100000];
    depositsOverTime.depositAmounts.push(Math.floor(depositAmount));
    depositsOverTime.depositCounts.push(depositCount);
    depositsOverTime.uniqueWallets.push(newWallets);
    depositsOverTime.distributions[1].push(distributions[1]);
    depositsOverTime.distributions[10].push(distributions[10]);
    depositsOverTime.distributions[100].push(distributions[100]);
    depositsOverTime.distributions[1000].push(distributions[1000]);
    depositsOverTime.distributions[10000].push(distributions[10000]);
    depositsOverTime.distributions[100000].push(distributions[100000]);
    depositsOverTime.avgDepositAmounts.push(depositCount > 0 ? Math.floor(depositAmount / depositCount) : 0);
    depositsOverTime.cumulativeDepositAmounts.push(Math.floor(cumulativeDepositAmount));
    depositsOverTime.cumulativeDepositCounts.push(cumulativeDepositCount);
    depositsOverTime.cumulativeUniqueWallets.push(cumulativeUniqueWallets.length);
    depositsOverTime.cumulativeDistributions[1].push(cumulativeDistributions[1]);
    depositsOverTime.cumulativeDistributions[10].push(cumulativeDistributions[10]);
    depositsOverTime.cumulativeDistributions[100].push(cumulativeDistributions[100]);
    depositsOverTime.cumulativeDistributions[1000].push(cumulativeDistributions[1000]);
    depositsOverTime.cumulativeDistributions[10000].push(cumulativeDistributions[10000]);
    depositsOverTime.cumulativeDistributions[100000].push(cumulativeDistributions[100000]);
  }

  return depositsOverTime;
}

// Function to get withdrawals over time:
const getWithdrawalsOverTime = (withdrawals: Withdrawal[], timestamps: number[]) => {

  // Initializations:
  const withdrawalsOverTime: WithdrawalsOverTime = {
    timestamps: timestamps,
    withdrawalAmounts: [],
    withdrawalCounts: [],
    uniqueWallets: [],
    avgWithdrawalAmounts: [],
    cumulativeWithdrawalAmounts: [],
    cumulativeWithdrawalCounts: [],
    cumulativeUniqueWallets: []
  }
  let cumulativeWithdrawalAmount = 0;
  let cumulativeWithdrawalCount = 0;
  let cumulativeUniqueWallets: Address[] = [];
  
  // Filtering Data:
  for(let i = 0; i < ticks; i++) {
    let withdrawalAmount = 0;
    let withdrawalCount = 0;
    let newWallets = 0;
    withdrawals.forEach(withdrawal => {
      if(withdrawal.timestamp && withdrawal.timestamp <= withdrawalsOverTime.timestamps[i]) {
        if((i > 0 && withdrawal.timestamp > withdrawalsOverTime.timestamps[i - 1]) || i === 0) {
          withdrawalAmount += withdrawal.amount;
          withdrawalCount++;
          if(!cumulativeUniqueWallets.includes(withdrawal.wallet)) {
            cumulativeUniqueWallets.push(withdrawal.wallet);
            newWallets++;
          }
        }
      }
    });
    cumulativeWithdrawalAmount += withdrawalAmount;
    cumulativeWithdrawalCount += withdrawalCount;
    withdrawalsOverTime.withdrawalAmounts.push(Math.floor(withdrawalAmount));
    withdrawalsOverTime.withdrawalCounts.push(withdrawalCount);
    withdrawalsOverTime.uniqueWallets.push(newWallets);
    withdrawalsOverTime.avgWithdrawalAmounts.push(withdrawalCount > 0 ? Math.floor(withdrawalAmount / withdrawalCount) : 0);
    withdrawalsOverTime.cumulativeWithdrawalAmounts.push(Math.floor(cumulativeWithdrawalAmount));
    withdrawalsOverTime.cumulativeWithdrawalCounts.push(cumulativeWithdrawalCount);
    withdrawalsOverTime.cumulativeUniqueWallets.push(cumulativeUniqueWallets.length);
  }

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
  let cumulativeClaimAmount = 0;
  let cumulativeClaimCount = 0;
  let cumulativePrizeCount = 0;
  let cumulativeUniqueWallets: Address[] = [];
  let cumulativeDistributions = { 1: 0, 5: 0, 10: 0, 50: 0, 100: 0, 500: 0, 1000: 0 };
  
  // Filtering Data:
  for(let i = 0; i < ticks; i++) {
    let claimAmount = 0;
    let claimCount = 0;
    let prizeCount = 0;
    let newWallets = 0;
    let distributions = { 1: 0, 5: 0, 10: 0, 50: 0, 100: 0, 500: 0, 1000: 0 };
    claims.forEach(claim => {
      if(claim.timestamp && claim.timestamp <= claimsOverTime.timestamps[i]) {
        if((i > 0 && claim.timestamp > claimsOverTime.timestamps[i - 1]) || i === 0) {
          const totalAmountClaimed = claim.prizes.reduce((a, b) => a + b, 0);
          claimAmount += totalAmountClaimed;
          claimCount++;
          prizeCount += claim.prizes.length;
          if(!cumulativeUniqueWallets.includes(claim.wallet)) {
            cumulativeUniqueWallets.push(claim.wallet);
            newWallets++;
          }
          if(totalAmountClaimed >= 1) {
            if(totalAmountClaimed >= 5) {
              if(totalAmountClaimed >= 10) {
                if(totalAmountClaimed >= 50) {
                  if(totalAmountClaimed >= 100) {
                    if(totalAmountClaimed >= 500) {
                      if(totalAmountClaimed >= 1000) {
                        distributions[1000]++;
                      } else {
                        distributions[500]++;
                      }
                    } else {
                      distributions[100]++;
                    }
                  } else {
                    distributions[50]++;
                  }
                } else {
                  distributions[10]++;
                }
              } else {
                distributions[5]++;
              }
            } else {
              distributions[1]++;
            }
          }
        }
      }
    });
    cumulativeClaimAmount += claimAmount;
    cumulativeClaimCount += claimCount;
    cumulativePrizeCount += prizeCount;
    cumulativeDistributions[1] += distributions[1];
    cumulativeDistributions[5] += distributions[5];
    cumulativeDistributions[10] += distributions[10];
    cumulativeDistributions[50] += distributions[50];
    cumulativeDistributions[100] += distributions[100];
    cumulativeDistributions[500] += distributions[500];
    cumulativeDistributions[1000] += distributions[1000];
    claimsOverTime.claimAmounts.push(Math.floor(claimAmount));
    claimsOverTime.claimCounts.push(claimCount);
    claimsOverTime.prizeCounts.push(prizeCount);
    claimsOverTime.uniqueWallets.push(newWallets);
    claimsOverTime.distributions[1].push(distributions[1]);
    claimsOverTime.distributions[5].push(distributions[5]);
    claimsOverTime.distributions[10].push(distributions[10]);
    claimsOverTime.distributions[50].push(distributions[50]);
    claimsOverTime.distributions[100].push(distributions[100]);
    claimsOverTime.distributions[500].push(distributions[500]);
    claimsOverTime.distributions[1000].push(distributions[1000]);
    claimsOverTime.avgClaimAmounts.push(claimCount > 0 ? Math.floor(claimAmount / claimCount) : 0);
    claimsOverTime.cumulativeClaimAmounts.push(Math.floor(cumulativeClaimAmount));
    claimsOverTime.cumulativeClaimCounts.push(cumulativeClaimCount);
    claimsOverTime.cumulativePrizeCounts.push(cumulativePrizeCount);
    claimsOverTime.cumulativeUniqueWallets.push(cumulativeUniqueWallets.length);
    claimsOverTime.cumulativeDistributions[1].push(cumulativeDistributions[1]);
    claimsOverTime.cumulativeDistributions[5].push(cumulativeDistributions[5]);
    claimsOverTime.cumulativeDistributions[10].push(cumulativeDistributions[10]);
    claimsOverTime.cumulativeDistributions[50].push(cumulativeDistributions[50]);
    claimsOverTime.cumulativeDistributions[100].push(cumulativeDistributions[100]);
    claimsOverTime.cumulativeDistributions[500].push(cumulativeDistributions[500]);
    claimsOverTime.cumulativeDistributions[1000].push(cumulativeDistributions[1000]);
  }

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

// Function to get winless withdrawals:
const getWinlessWithdrawals = (wallets: { wallet: Address, data: WalletData }[]) => {

  // Initializations:
  const winlessWithdrawals: WinlessWithdrawals[] = [];

  // Filtering Wallets:
  wallets.forEach(entry => {
    if(entry.data.currentBalance === 0) {
      const claimTXs = entry.data.txs.filter(tx => tx.type === 'claim');
      if(claimTXs.length === 0) {
        let virtualBalance = 0;
        let maxVirtualBalance = 0;
        let firstDepositTimestamp = 0;
        let lastWithdrawalTimestamp = 0;
        entry.data.txs.forEach(tx => {
          if(tx.type === 'deposit') {
            virtualBalance += tx.data.amount;
            if(virtualBalance > maxVirtualBalance) {
              maxVirtualBalance = virtualBalance;
            }
            if(firstDepositTimestamp === 0 && tx.data.timestamp) {
              firstDepositTimestamp = tx.data.timestamp;
            }
          } else if(tx.type === 'withdrawal') {
            virtualBalance -= tx.data.amount;
            if(tx.data.timestamp) {
              lastWithdrawalTimestamp = tx.data.timestamp;
            }
          }
        });
        if(virtualBalance <= 0 && firstDepositTimestamp > 0 && lastWithdrawalTimestamp > 0) {
          winlessWithdrawals.push({ wallet: entry.wallet, maxBalance: maxVirtualBalance, firstDepositTimestamp, lastWithdrawalTimestamp });
        }
      }
    }
  });

  return winlessWithdrawals;
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
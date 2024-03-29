
// Imports:
import { ethers } from 'ethers';
import { getStats } from './stats';
import { query, parseBN, multicallOneContractQuery } from 'weaverfi/dist/functions';
import { prizePoolABI, prizeDistributorABI, ticketABI, flushABI, aaveUSDCABI, twabDelegatorABI } from './ABIs';

// Type Imports:
import type { Event } from 'ethers';
import type { Chain, Address, CallContext, ABI } from 'weaverfi/dist/types';
import type { ChainInfo, ChainData, Files, File, Deposit, Withdrawal, Claim, Balance, YieldCapture, Supply, DelegationCreated, DelegationFunded, DelegationUpdated, DelegationWithdrawn, WalletData } from './types';

// Last TXs Settings:
const numTXs = 1000;

/* ========================================================================================================================================================================= */

// Chain Info:
const chains: Partial<Record<Chain, ChainInfo>> = {
  eth: {
    provider: new ethers.providers.StaticJsonRpcProvider('https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'),
    rpcLimit: 100_000,
    maxBlocksPerRuntime: 100_000,
    prizePool: '0xd89a09084555a7D0ABe7B111b1f78DFEdDd638Be',
    prizeDistributor: '0xb9a179DcA5a7bf5f8B9E088437B3A85ebB495eFe',
    delegator: '0x5cFbEE38362B9A60be276763753f64245EA990F7',
    ticket: '0xdd4d117723C257CEe402285D3aCF218E9A8236E1',
    flush: '0x2193b28b2BdfBf805506C9D91Ed2021bA6fBc888',
    aaveUSDC: '0xBcca60bB61934080951369a648Fb03DF4F96263C',
    yieldSource: '0x32e8D4c9d1B711BC958d0Ce8D14b41F77Bb03a64',
    timestamps: []
  },
  poly: {
    provider: new ethers.providers.StaticJsonRpcProvider('https://polygon-rpc.com'),
    rpcLimit: 2_048,
    maxBlocksPerRuntime: 50_000,
    prizePool: '0x19DE635fb3678D8B8154E37d8C9Cdf182Fe84E60',
    prizeDistributor: '0x8141BcFBcEE654c5dE17C4e2B2AF26B67f9B9056',
    delegator: '0x89Ee77Ce3F4C1b0346FF96E3004ff7C9f972dEF8',
    ticket: '0x6a304dFdb9f808741244b6bfEe65ca7B3b3A6076',
    flush: '0xA2342489470474536F04cd4DdA2e8658303b305d',
    aaveUSDC: '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F',
    yieldSource: '0xD4F6d570133401079D213EcF4A14FA0B4bfB5b9C',
    timestamps: []
  },
  avax: {
    provider: new ethers.providers.StaticJsonRpcProvider('https://avax-mainnet.gateway.pokt.network/v1/lb/605238bf6b986eea7cf36d5e/ext/bc/C/rpc'),
    rpcLimit: 100_000,
    maxBlocksPerRuntime: 100_000,
    prizePool: '0xF830F5Cb2422d555EC34178E27094a816c8F95EC',
    prizeDistributor: '0x83332F908f403ce795D90f677cE3f382FE73f3D1',
    delegator: '0xd23723fef8A16B77eaDc1fC822aE4170bA9d4009',
    ticket: '0xB27f379C050f6eD0973A01667458af6eCeBc1d90',
    flush: '0x1B20994C3894EcC862e26A9F4EC626A8489DD051',
    aaveUSDC: '0x46A51127C3ce23fb7AB1DE06226147F446e4a857',
    yieldSource: '0x7437db21A0dEB844Fa64223e2d6Db569De9648Ff',
    timestamps: []
  },
  op: {
    provider: new ethers.providers.StaticJsonRpcProvider('https://rpc.ankr.com/optimism'),
    rpcLimit: 3_000,
    maxBlocksPerRuntime: 50_000,
    prizePool: '0x79Bc8bD53244bC8a9C8c27509a2d573650A83373',
    prizeDistributor: '0x722e9BFC008358aC2d445a8d892cF7b62B550F3F',
    delegator: '0x469C6F4c1AdA45EB2E251685aC2bf05aEd591E70',
    ticket: '0x62BB4fc73094c83B5e952C2180B23fA7054954c4',
    flush: '0x4c65F496B78b7E81c15723f56a43925E5dc3a0e1',
    aaveUSDC: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
    yieldSource: '0x4ecB5300D9ec6BCA09d66bfd8Dcb532e3192dDA1',
    timestamps: []
  }
}

/* ========================================================================================================================================================================= */

// Function to query all data from a specific chain:
export const queryData = async (chain: Chain, files: Record<Files, File | undefined>) => {
  let currentBlock = await getCurrentBlock(chain);
  if(currentBlock) {
    files.deposits = await queryDeposits(chain, files.deposits, currentBlock);
    files.withdrawals = await queryWithdrawals(chain, files.withdrawals, currentBlock);
    files.claims = await queryClaims(chain, files.claims, currentBlock);
    files.yield = await queryYield(chain, files.yield, currentBlock);
    files.supply = await querySupply(chain, files.supply, currentBlock);
    files.delegationsCreated = await queryDelegationsCreated(chain, files.delegationsCreated, currentBlock);
    files.delegationsFunded = await queryDelegationsFunded(chain, files.delegationsFunded, currentBlock);
    files.delegationsUpdated = await queryDelegationsUpdated(chain, files.delegationsUpdated, currentBlock);
    files.delegationsWithdrawn = await queryDelegationsWithdrawn(chain, files.delegationsWithdrawn, currentBlock);
    files.lastDeposits = getLastDeposits(files.deposits);
    files.lastDelegations = getLastDelegations(files.delegationsFunded);
  }
  return files;
}

// Function to query extra stats from a specific chain:
export const queryStats = async (chain: Chain, files: Record<Files, File | undefined>) => {
  files.balances = await queryBalances(chain, files.balances, files.deposits, files.withdrawals, files.claims);
  const chainData: ChainData = [chain, files.deposits, files.withdrawals, files.claims, files.balances, files.delegationsCreated, files.delegationsFunded, files.delegationsUpdated, files.delegationsWithdrawn];
  files.wallets = getWalletData(...chainData);
  files.stats = await getStats(...chainData, files.yield, files.wallets);
  return files;
}

/* ========================================================================================================================================================================= */

// Function to query deposits:
const queryDeposits = async (chain: Chain, file: File | undefined, endBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(endBlock > maxBlockForThisRuntime) {
      endBlock = maxBlockForThisRuntime;
    }
    console.log(`${chain.toUpperCase()}: Querying deposits until block ${endBlock.toLocaleString()}...`);
    const depositEvents = await queryBlocks(chain, chainInfo.prizePool, prizePoolABI, 'Deposited', chainInfo.rpcLimit, [], { startBlock: file.lastQueriedBlock, endBlock });
    if(depositEvents.length > 0) {
      console.info(`${chain.toUpperCase()}: Found ${depositEvents.length.toLocaleString(undefined)} new deposit events.`);
      for(let event of depositEvents) {
        if(event.args) {
          const deposit: Deposit = {
            txHash: event.transactionHash,
            block: event.blockNumber,
            timestamp: await getEventTimestamp(chain, event),
            wallet: event.args.operator,
            amount: parseBN(event.args.amount) / (10 ** 6)
          }
          file.data.push(deposit);
        }
      }
    }
    file.lastQueriedBlock = endBlock;
  }
  return file;
}

// Function to query withdrawals:
const queryWithdrawals = async (chain: Chain, file: File | undefined, endBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(endBlock > maxBlockForThisRuntime) {
      endBlock = maxBlockForThisRuntime;
    }
    console.log(`${chain.toUpperCase()}: Querying withdrawals until block ${endBlock.toLocaleString()}...`);
    const withdrawalEvents = await queryBlocks(chain, chainInfo.prizePool, prizePoolABI, 'Withdrawal', chainInfo.rpcLimit, [], { startBlock: file.lastQueriedBlock, endBlock });
    if(withdrawalEvents.length > 0) {
      console.info(`${chain.toUpperCase()}: Found ${withdrawalEvents.length.toLocaleString(undefined)} new withdrawal events.`);
      for(let event of withdrawalEvents) {
        if(event.args) {
          const withdrawal: Withdrawal = {
            txHash: event.transactionHash,
            block: event.blockNumber,
            timestamp: await getEventTimestamp(chain, event),
            wallet: event.args.operator,
            amount: parseBN(event.args.amount) / (10 ** 6)
          }
          file.data.push(withdrawal);
        }
      }
    }
    file.lastQueriedBlock = endBlock;
  }
  return file;
}

// Function to query claims:
const queryClaims = async (chain: Chain, file: File | undefined, endBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(endBlock > maxBlockForThisRuntime) {
      endBlock = maxBlockForThisRuntime;
    }
    console.log(`${chain.toUpperCase()}: Querying claims until block ${endBlock.toLocaleString()}...`);
    const claimEvents = await queryBlocks(chain, chainInfo.prizeDistributor, prizeDistributorABI, 'ClaimedDraw', chainInfo.rpcLimit, [], { startBlock: file.lastQueriedBlock, endBlock });
    if(claimEvents.length > 0) {
      console.info(`${chain.toUpperCase()}: Found ${claimEvents.length.toLocaleString(undefined)} new claim events.`);
      for(let event of claimEvents) {
        if(event.args) {
          const prize = Math.ceil(parseBN(event.args.payout) / (10 ** 6));
          let existingTX = file.data.map(tx => tx.txHash).indexOf(event.transactionHash);
          if(existingTX === -1) {
            const claim: Claim = {
              txHash: event.transactionHash,
              block: event.blockNumber,
              timestamp: await getEventTimestamp(chain, event),
              wallet: event.args.user,
              prizes: [prize]
            }
            file.data.push(claim);
          } else {
            file.data[existingTX].prizes.push(prize);
          }
        }
      }
    }
    file.lastQueriedBlock = endBlock;
  }
  return file;
}

// Function to query wallet balances:
const queryBalances = async (chain: Chain, balances: File | undefined, deposits: File | undefined, withdrawals: File | undefined, claims: File | undefined) => {
  const chainInfo = chains[chain];
  if(chainInfo && deposits && withdrawals && claims) {
    const wallets: Address[] = [];
    const newBalanceData: Balance[] = [];
    const balanceCalls: CallContext[] = [];
    const callsBatchSize = 500;
    const customTimeAgoInSeconds: number | undefined = 3_196_800;
    const lastTimestamp = await getBlockTimestamp(chain, deposits.lastQueriedBlock);
    let balanceCallsMade = 0;
    deposits.data.forEach((entry: Deposit) => {
      if(!wallets.includes(entry.wallet) && isRecentEvent(entry, lastTimestamp, { timeAgoInSeconds: customTimeAgoInSeconds })) {
        wallets.push(entry.wallet);
      }
    });
    withdrawals.data.forEach((entry: Withdrawal) => {
      if(!wallets.includes(entry.wallet) && isRecentEvent(entry, lastTimestamp, { timeAgoInSeconds: customTimeAgoInSeconds })) {
        wallets.push(entry.wallet);
      }
    });
    claims.data.forEach((entry: Claim) => {
      if(!wallets.includes(entry.wallet) && isRecentEvent(entry, lastTimestamp, { timeAgoInSeconds: customTimeAgoInSeconds })) {
        wallets.push(entry.wallet);
      }
    });
    wallets.forEach(wallet => {
      balanceCalls.push({ reference: wallet, methodName: 'balanceOf', methodParameters: [wallet] });
    });
    console.info(`${chain.toUpperCase()}: Querying ${wallets.length.toLocaleString(undefined)} wallet balances...`);
    while(balanceCallsMade < balanceCalls.length) {
      let lastCallIndex = Math.min(balanceCallsMade + callsBatchSize,  balanceCalls.length);
      let multicallResults = await multicallOneContractQuery(chain, chainInfo.ticket, ticketABI, balanceCalls.slice(balanceCallsMade, lastCallIndex));
      balanceCallsMade = lastCallIndex;
      for(let stringWallet in multicallResults) {
        let wallet = stringWallet as Address;
        let balance = parseBN(multicallResults[stringWallet][0]) / (10 ** 6);
        newBalanceData.push({ wallet, balance });
      }
    }
    if(balances) {
      balances.lastQueriedBlock = deposits.lastQueriedBlock;
      balances.timestamp = lastTimestamp;
      newBalanceData.forEach(entry => {
        if(balances) {
          const foundEntryIndex = balances.data.findIndex((oldEntry: Balance) => oldEntry.wallet === entry.wallet);
          if(foundEntryIndex !== undefined && foundEntryIndex !== -1) {
            balances.data[foundEntryIndex].balance = entry.balance;
          } else {
            balances.data.push({ wallet: entry.wallet, balance: entry.balance });
          }
        }
      });
      balances.data.sort((a, b) => b.balance - a.balance);
    } else {
      balances = {
        lastQueriedBlock: deposits.lastQueriedBlock,
        timestamp: lastTimestamp,
        data: newBalanceData.sort((a, b) => b.balance - a.balance)
      }
    }
  }
  return balances;
}

// Function to query yield:
const queryYield = async (chain: Chain, file: File | undefined, endBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(endBlock > maxBlockForThisRuntime) {
      endBlock = maxBlockForThisRuntime;
    }
    console.log(`${chain.toUpperCase()}: Querying yield until block ${endBlock.toLocaleString()}...`);
    const flushEvents = await queryBlocks(chain, chainInfo.flush, flushABI, 'Flushed', chainInfo.rpcLimit, [], { startBlock: file.lastQueriedBlock, endBlock });
    if(flushEvents.length > 0) {
      console.info(`${chain.toUpperCase()}: Found ${flushEvents.length.toLocaleString(undefined)} new flush events.`);
      for(let event of flushEvents) {
        if(event.args) {
          const yieldCapture: YieldCapture = {
            txHash: event.transactionHash,
            block: event.blockNumber,
            timestamp: await getEventTimestamp(chain, event),
            amount: parseBN(event.args.amount) / (10 ** 6)
          }
          file.data.push(yieldCapture);
        }
      }
    }
    file.lastQueriedBlock = endBlock;
  }
  return file;
}

// Function to query supply:
const querySupply = async (chain: Chain, file: File | undefined, block: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(block > maxBlockForThisRuntime) {
      block = maxBlockForThisRuntime;
    }
    const supply: Supply = {
      block: block,
      timestamp: await getBlockTimestamp(chain, block),
      aave: parseInt(await query(chain, chainInfo.aaveUSDC, aaveUSDCABI, 'balanceOf', [chainInfo.yieldSource], block)) / (10 ** 6),
      tickets: parseInt(await query(chain, chainInfo.ticket, ticketABI, 'totalSupply', [], block)) / (10 ** 6)
    }
    console.info(`${chain.toUpperCase()}: Queried token supplies.`);
    file.data.push(supply);
    file.lastQueriedBlock = block;
  }
  return file;
}

// Function to query delegations created:
const queryDelegationsCreated = async (chain: Chain, file: File | undefined, endBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(endBlock > maxBlockForThisRuntime) {
      endBlock = maxBlockForThisRuntime;
    }
    console.log(`${chain.toUpperCase()}: Querying delegations created until block ${endBlock.toLocaleString()}...`);
    const delegationCreationEvents = await queryBlocks(chain, chainInfo.delegator, twabDelegatorABI, 'DelegationCreated', chainInfo.rpcLimit, [], { startBlock: file.lastQueriedBlock, endBlock });
    if(delegationCreationEvents.length > 0) {
      console.info(`${chain.toUpperCase()}: Found ${delegationCreationEvents.length.toLocaleString(undefined)} new delegation creation events.`);
      for(let event of delegationCreationEvents) {
        if(event.args) {
          const delegationCreated: DelegationCreated = {
            txHash: event.transactionHash,
            block: event.blockNumber,
            timestamp: await getEventTimestamp(chain, event),
            delegator: event.args.delegator,
            delegatee: event.args.delegatee
          }
          file.data.push(delegationCreated);
        }
      }
    }
    file.lastQueriedBlock = endBlock;
  }
  return file;
}

// Function to query delegations funded:
const queryDelegationsFunded = async (chain: Chain, file: File | undefined, endBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(endBlock > maxBlockForThisRuntime) {
      endBlock = maxBlockForThisRuntime;
    }
    console.log(`${chain.toUpperCase()}: Querying delegations funded until block ${endBlock.toLocaleString()}...`);
    const delegationFundingEvents = await queryBlocks(chain, chainInfo.delegator, twabDelegatorABI, 'DelegationFunded', chainInfo.rpcLimit, [], { startBlock: file.lastQueriedBlock, endBlock });
    if(delegationFundingEvents.length > 0) {
      console.info(`${chain.toUpperCase()}: Found ${delegationFundingEvents.length.toLocaleString(undefined)} new delegation funding events.`);
      for(let event of delegationFundingEvents) {
        if(event.args) {
          const delegationFunded: DelegationFunded = {
            txHash: event.transactionHash,
            block: event.blockNumber,
            timestamp: await getEventTimestamp(chain, event),
            delegator: event.args.delegator,
            amount: parseBN(event.args.amount) / (10 ** 6)
          }
          file.data.push(delegationFunded);
        }
      }
    }
    file.lastQueriedBlock = endBlock;
  }
  return file;
}

// Function to query delegations updated:
const queryDelegationsUpdated = async (chain: Chain, file: File | undefined, endBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(endBlock > maxBlockForThisRuntime) {
      endBlock = maxBlockForThisRuntime;
    }
    console.log(`${chain.toUpperCase()}: Querying delegations updated until block ${endBlock.toLocaleString()}...`);
    const delegationUpdateEvents = await queryBlocks(chain, chainInfo.delegator, twabDelegatorABI, 'DelegateeUpdated', chainInfo.rpcLimit, [], { startBlock: file.lastQueriedBlock, endBlock });
    if(delegationUpdateEvents.length > 0) {
      console.info(`${chain.toUpperCase()}: Found ${delegationUpdateEvents.length.toLocaleString(undefined)} new delegation update events.`);
      for(let event of delegationUpdateEvents) {
        if(event.args) {
          const delegationUpdated: DelegationUpdated = {
            txHash: event.transactionHash,
            block: event.blockNumber,
            timestamp: await getEventTimestamp(chain, event),
            delegator: event.args.delegator,
            newDelegatee: event.args.delegatee
          }
          file.data.push(delegationUpdated);
        }
      }
    }
    file.lastQueriedBlock = endBlock;
  }
  return file;
}

// Function to query delegations withdrawn:
const queryDelegationsWithdrawn = async (chain: Chain, file: File | undefined, endBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const maxBlockForThisRuntime = file.lastQueriedBlock + chainInfo.maxBlocksPerRuntime;
    if(endBlock > maxBlockForThisRuntime) {
      endBlock = maxBlockForThisRuntime;
    }
    console.log(`${chain.toUpperCase()}: Querying delegations withdrawn until block ${endBlock.toLocaleString()}...`);
    const delegationWithdrawalEvents = await queryBlocks(chain, chainInfo.delegator, twabDelegatorABI, 'TransferredDelegation', chainInfo.rpcLimit, [], { startBlock: file.lastQueriedBlock, endBlock });
    if(delegationWithdrawalEvents.length > 0) {
      console.info(`${chain.toUpperCase()}: Found ${delegationWithdrawalEvents.length.toLocaleString(undefined)} new delegation withdrawal events.`);
      for(let event of delegationWithdrawalEvents) {
        if(event.args) {
          const delegationWithdrawn: DelegationWithdrawn = {
            txHash: event.transactionHash,
            block: event.blockNumber,
            timestamp: await getEventTimestamp(chain, event),
            delegator: event.args.delegator,
            amount: parseBN(event.args.amount) / (10 ** 6)
          }
          file.data.push(delegationWithdrawn);
        }
      }
    }
    file.lastQueriedBlock = endBlock;
  }
  return file;
}

/* ========================================================================================================================================================================= */

// Function to get aggregated wallet data:
const getWalletData = (chain: Chain, deposits: File | undefined, withdrawals: File | undefined, claims: File | undefined, balances: File | undefined, delegationsCreated: File | undefined, delegationsFunded: File | undefined, delegationsUpdated: File | undefined, delegationsWithdrawn: File | undefined) => {
  if(deposits && withdrawals && claims && balances && delegationsCreated && delegationsFunded && delegationsUpdated && delegationsWithdrawn) {
    const file: File = { lastQueriedBlock: deposits.lastQueriedBlock, data: [] };
    const wallets: Record<Address, WalletData> = {};
    console.info(`${chain.toUpperCase()}: Filtering through wallet data...`);
    (balances.data as Balance[]).forEach(entry => {
      wallets[entry.wallet] = { txs: [], currentBalance: entry.balance };
    });
    (deposits.data as Deposit[]).forEach(deposit => {
      if(deposit.timestamp) {
        wallets[deposit.wallet].txs.push({ type: 'deposit', data: deposit });
      }
    });
    (withdrawals.data as Withdrawal[]).forEach(withdrawal => {
      if(withdrawal.timestamp) {
        wallets[withdrawal.wallet].txs.push({ type: 'withdrawal', data: withdrawal });
      }
    });
    (claims.data as Claim[]).forEach(claim => {
      if(claim.timestamp) {
        wallets[claim.wallet].txs.push({ type: 'claim', data: claim });
      }
    });
    (delegationsCreated.data as DelegationCreated[]).forEach(delegation => {
      if(wallets[delegation.delegator] && delegation.timestamp) {
        wallets[delegation.delegator].txs.push({ type: 'delegationCreated', data: delegation });
      }
    });
    (delegationsFunded.data as DelegationFunded[]).forEach(delegation => {
      if(wallets[delegation.delegator] && delegation.timestamp) {
        wallets[delegation.delegator].txs.push({ type: 'delegationFunded', data: delegation });
      }
    });
    (delegationsUpdated.data as DelegationUpdated[]).forEach(delegation => {
      if(wallets[delegation.delegator] && delegation.timestamp) {
        wallets[delegation.delegator].txs.push({ type: 'delegationUpdated', data: delegation });
      }
    });
    (delegationsWithdrawn.data as DelegationWithdrawn[]).forEach(delegation => {
      if(wallets[delegation.delegator] && delegation.timestamp) {
        wallets[delegation.delegator].txs.push({ type: 'delegationWithdrawn', data: delegation });
      }
    });
    for(let stringWallet in wallets) {
      const wallet = stringWallet as Address;
      wallets[wallet].txs.sort((a, b) => (a.data.timestamp as number) - (b.data.timestamp as number));
      file.data.push({ wallet: wallet, data: wallets[wallet] });
    }
    return file;
  }
}

// Function to get last deposits:
const getLastDeposits = (deposits: File | undefined) => {
  if(deposits) {
    const lastDepositsData = deposits.data.slice().reverse().slice(0, numTXs);
    const lastDeposits: File = { lastQueriedBlock: deposits.lastQueriedBlock, data: lastDepositsData };
    return lastDeposits;
  }
}

// Function to get last delegations funded:
const getLastDelegations = (delegationsFunded: File | undefined) => {
  if(delegationsFunded) {
    const lastDelegationsData = delegationsFunded.data.slice().reverse().slice(0, numTXs);
    const lastDelegations: File = { lastQueriedBlock: delegationsFunded.lastQueriedBlock, data: lastDelegationsData };
    return lastDelegations;
  }
}

/* ========================================================================================================================================================================= */

// Function to query blocks (slightly edited from the WeaverFi SDK's implementation):
const queryBlocks = async (chain: Chain, address: Address, abi: ABI, event: string, querySize: number, args: any[], options: { startBlock: number, endBlock: number, logs?: boolean }) => {
  const results: ethers.Event[] = [];
  const chainInfo = chains[chain];
  if(chainInfo && options.endBlock > options.startBlock) {
    let lastQueriedBlock = options.startBlock;
    while(++lastQueriedBlock < options.endBlock) {
      let targetBlock = Math.min(lastQueriedBlock + querySize, options.endBlock);
      let result: ethers.Event[] | undefined = undefined;
      let errors = 0;
      options.logs && console.info(`Querying ${event} events on blocks ${lastQueriedBlock} to ${targetBlock}...`);
      while(result === undefined) {
        try {
          let contract = new ethers.Contract(address, abi, chainInfo.provider);
          let eventFilter = contract.filters[event](...args);
          result = await contract.queryFilter(eventFilter, lastQueriedBlock, targetBlock);
          options.logs && result.length > 0 && console.info(`Found ${result.length} ${event} events.`);
        } catch(err) {
          if(++errors >= 3) {
            options.logs && console.error(err);
            throw new Error(`Querying blocks ${lastQueriedBlock} to ${targetBlock} for events on ${address}`);
          }
          options.logs && console.info(`Retrying query...`);
        }
      }
      results.push(...result);
      lastQueriedBlock = targetBlock;
    }
  }
  return results;
}

/* ========================================================================================================================================================================= */

// Helper function to get current block:
const getCurrentBlock = async (chain: Chain) => {
  const chainInfo = chains[chain];
  if(chainInfo) {
    const block = await chainInfo.provider.getBlockNumber();
    return block;
  }
}

/* ========================================================================================================================================================================= */

// Helper function to query event timestamp:
const getEventTimestamp = async (chain: Chain, event: Event) => {
  const chainInfo = chains[chain];
  if(chainInfo) {
    const block = event.blockNumber;
    let foundEntry = chainInfo.timestamps.find(entry => entry.block === block);
    if(foundEntry) {
      return foundEntry.timestamp;
    } else {
      try {
        const timestamp = (await event.getBlock()).timestamp;
        chainInfo.timestamps.push({ block, timestamp });
        return timestamp;
      } catch {
        try {
          const timestamp = (await event.getBlock()).timestamp;
          chainInfo.timestamps.push({ block, timestamp });
          return timestamp;
        } catch {
          console.warn(`Skipping timestamp query for block ${block.toLocaleString(undefined)}`);
        }
      }
    }
  }
  return undefined;
}

// Helper function to query block timestamp:
export const getBlockTimestamp = async (chain: Chain, block: number) => {
  const chainInfo = chains[chain];
  if(chainInfo) {
    let foundEntry = chainInfo.timestamps.find(entry => entry.block === block);
    if(foundEntry) {
      return foundEntry.timestamp;
    } else {
      try {
        const timestamp = (await chainInfo.provider.getBlock(block)).timestamp;
        chainInfo.timestamps.push({ block, timestamp });
        return timestamp;
      } catch {
        try {
          const timestamp = (await chainInfo.provider.getBlock(block)).timestamp;
          chainInfo.timestamps.push({ block, timestamp });
          return timestamp;
        } catch {
          console.warn(`Skipping timestamp query for block ${block.toLocaleString(undefined)}`);
        }
      }
    }
  }
  return undefined;
}

// Helper function to determine if event has taken place in the last week or custom timespan:
const isRecentEvent = (event: Deposit | Withdrawal | Claim, timestamp: number | undefined, options?: { timeAgoInSeconds?: number }) => {
  if(event.timestamp && timestamp) {
    const lookBackTimeInSeconds = options?.timeAgoInSeconds || 604_800;
    return event.timestamp > (timestamp - lookBackTimeInSeconds);
  }
}
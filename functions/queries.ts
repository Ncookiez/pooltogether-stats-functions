
// Imports:
import ethers from 'ethers';
import { query, queryBlocks, parseBN } from 'weaverfi/dist/functions';
import { prizePoolABI, prizeDistributorABI, ticketABI, flushABI, aaveUSDCABI, twabDelegatorABI } from './ABIs.js';

// Type Imports:
import type { Chain } from 'weaverfi/dist/types';
import type { ChainInfo, Files, File, Deposit, Withdrawal, Claim, YieldCapture, Supply, DelegationCreated, DelegationFunded, DelegationUpdated, DelegationWithdrawn } from './types';

/* ========================================================================================================================================================================= */

// Chain Info:
const chains: Partial<Record<Chain, ChainInfo>> = {
  eth: {
    provider: new ethers.providers.StaticJsonRpcProvider('https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'),
    rpcLimit: 100000,
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
    rpcLimit: 2048,
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
    rpcLimit: 100000,
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
    provider: new ethers.providers.StaticJsonRpcProvider('https://mainnet.optimism.io'),
    rpcLimit: 100000,
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
export const queryData = async (chain: Chain, files: Files) => {
  const chainInfo = chains[chain];
  if(chainInfo) {
    const currentBlock = await chainInfo.provider.getBlockNumber();
    files.deposits = await queryDeposits(chain, files.deposits, currentBlock);
    files.withdrawals = await queryWithdrawals(chain, files.withdrawals, currentBlock);
    files.claims = await queryClaims(chain, files.claims, currentBlock);
    files.yield = await queryYield(chain, files.yield, currentBlock);
    files.supply = await querySupply(chain, files.supply, currentBlock);
    files.delegationsCreated = await queryDelegationsCreated(chain, files.delegationsCreated, currentBlock);
    files.delegationsFunded = await queryDelegationsFunded(chain, files.delegationsFunded, currentBlock);
    files.delegationsUpdated = await queryDelegationsUpdated(chain, files.delegationsUpdated, currentBlock);
    files.delegationsWithdrawn = await queryDelegationsWithdrawn(chain, files.delegationsWithdrawn, currentBlock);
  }
  return files;
}

/* ========================================================================================================================================================================= */

// Function to query deposits:
const queryDeposits = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const depositEvents = await queryBlocks(chain, chainInfo.prizePool, prizePoolABI, 'Deposited', chainInfo.rpcLimit, [], file.lastQueriedBlock, currentBlock);
    if(depositEvents.length > 0) {
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
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

// Function to query withdrawals:
const queryWithdrawals = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const withdrawalEvents = await queryBlocks(chain, chainInfo.prizePool, prizePoolABI, 'Withdrawal', chainInfo.rpcLimit, [], file.lastQueriedBlock, currentBlock);
    if(withdrawalEvents.length > 0) {
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
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

// Function to query claims:
const queryClaims = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const claimEvents = await queryBlocks(chain, chainInfo.prizeDistributor, prizeDistributorABI, 'ClaimedDraw', chainInfo.rpcLimit, [], file.lastQueriedBlock, currentBlock);
    if(claimEvents.length > 0) {
      for(let event of claimEvents) {
        if(event.args) {
          const prize = Math.ceil(parseBN(event.args.payout) / (10 ** 6));
          let existingTX = file.data.map(tx => tx.txHash).indexOf(event.transactionHash);
          if(existingTX === -1) {
            const claim: Claim = {
              txHash: event.transactionHash,
              block: event.blockNumber,
              timestamp: await getEventTimestamp(chain, event),
              wallet: event.args.operator,
              prizes: [prize]
            }
            file.data.push(claim);
          } else {
            file.data[existingTX].prizes.push(prize);
          }
        }
      }
    }
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

// Function to query yield:
const queryYield = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const flushEvents = await queryBlocks(chain, chainInfo.flush, flushABI, 'Flushed', chainInfo.rpcLimit, [], file.lastQueriedBlock, currentBlock);
    if(flushEvents.length > 0) {
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
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

// Function to query supply:
const querySupply = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const supply: Supply = {
      block: currentBlock,
      timestamp: await getBlockTimestamp(chain, currentBlock),
      aave: parseInt(await query(chain, chainInfo.aaveUSDC, aaveUSDCABI, 'balanceOf', [chainInfo.yieldSource], currentBlock)) / (10 ** 6),
      tickets: parseInt(await query(chain, chainInfo.ticket, ticketABI, 'totalSupply', [], currentBlock)) / (10 ** 6)
    }
    file.data.push(supply);
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

// Function to query delegations created:
const queryDelegationsCreated = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const delegationCreationEvents = await queryBlocks(chain, chainInfo.delegator, twabDelegatorABI, 'DelegationCreated', chainInfo.rpcLimit, [], file.lastQueriedBlock, currentBlock);
    if(delegationCreationEvents.length > 0) {
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
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

// Function to query delegations funded:
const queryDelegationsFunded = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const delegationFundingEvents = await queryBlocks(chain, chainInfo.delegator, twabDelegatorABI, 'DelegationFunded', chainInfo.rpcLimit, [], file.lastQueriedBlock, currentBlock);
    if(delegationFundingEvents.length > 0) {
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
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

// Function to query delegations updated:
const queryDelegationsUpdated = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const delegationUpdateEvents = await queryBlocks(chain, chainInfo.delegator, twabDelegatorABI, 'DelegateeUpdated', chainInfo.rpcLimit, [], file.lastQueriedBlock, currentBlock);
    if(delegationUpdateEvents.length > 0) {
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
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

// Function to query delegations withdrawn:
const queryDelegationsWithdrawn = async (chain: Chain, file: File | undefined, currentBlock: number) => {
  const chainInfo = chains[chain];
  if(file && chainInfo) {
    const delegationWithdrawalEvents = await queryBlocks(chain, chainInfo.delegator, twabDelegatorABI, 'TransferredDelegation', chainInfo.rpcLimit, [], file.lastQueriedBlock, currentBlock);
    if(delegationWithdrawalEvents.length > 0) {
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
    file.lastQueriedBlock = currentBlock;
  }
  return file;
}

/* ========================================================================================================================================================================= */

// Function to query event timestamp:
const getEventTimestamp = async (chain: Chain, event: ethers.Event) => {
  const chainInfo = chains[chain];
  if(chainInfo) {
    const block = event.blockNumber;
    let foundEntry = chainInfo.timestamps.find(entry => entry.block === block);
    if(foundEntry) {
      return foundEntry.timestamp;
    } else {
      const timestamp = (await event.getTransaction()).timestamp;
      if(timestamp) {
        chainInfo.timestamps.push({ block, timestamp });
      }
      return timestamp;
    }
  } else {
    return undefined;
  }
}

// Function to query block timestamp:
const getBlockTimestamp = async (chain: Chain, block: number) => {
  const chainInfo = chains[chain];
  if(chainInfo) {
    let foundEntry = chainInfo.timestamps.find(entry => entry.block === block);
    if(foundEntry) {
      return foundEntry.timestamp;
    } else {
      const timestamp = (await chainInfo.provider.getBlock(block)).timestamp;
      chainInfo.timestamps.push({ block, timestamp });
      return timestamp;
    }
  } else {
    return undefined;
  }
}
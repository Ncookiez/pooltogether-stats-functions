
// Required Packages:
const cors = require('cors');
const express = require('express');
const admin = require('firebase-admin');
const swagger = require('swagger-ui-express');
const functions = require('firebase-functions');

// Imports:
import { utils } from 'ethers';
import { queryData } from './queries';
import { getPlayerDataOverTime } from './stats';

// Type Imports:
import type { Chain, Address } from 'weaverfi/dist/types';
import type { Application, Request, Response } from 'express';
import type { Files, File, PaginatedFile, WalletData, PlayerData } from './types';

// Fetching Firebase Logger Compatibility Patch:
require("firebase-functions/lib/logger/compat");

// Initializing Firebase App:
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Initializing Express Server:
const api: Application = express();
api.use(cors());
api.use(express.static('functions/static'));

// Fetching Swagger Docs:
const swaggerDocs = require('../static/swagger.json');

/* ========================================================================================================================================================================= */

// General Settings:
const storageBucketName: string = 'pooltogether-data';
const chains: Chain[] = ['eth', 'poly', 'avax', 'op'];
const fileNames: Files[] = ['deposits', 'withdrawals', 'claims', 'balances', 'yield', 'supply', 'delegationsCreated', 'delegationsFunded', 'delegationsUpdated', 'delegationsWithdrawn', 'stats'];
const noPagination: Files[] = ['stats'];

// Query Settings:
const querySchedule: string = '0 0,3,6,9,12,15,18,21 * * *';
const queryMemory: string = '2GB';
const queryTimeoutInSeconds: number = 540;

// Player Data Settings:
const playerDataSchedule: string = '10 0,3,6,9,12,15,18,21 * * *';
const playerDataMemory: string = '2GB';
const playerDataTimeoutInSeconds: number = 540;
const playerDataCollectionName: string = 'players';
const defaultPlayerData: PlayerData = { txs: [], timestamps: [], depositsOverTime: [], claimsOverTime: [], withdrawalsOverTime: [], balancesOverTime: [], balances: { eth: 0, poly: 0, avax: 0, op: 0 } };

// API Settings:
const apiMemory: string = '256MB';
const apiTimeoutInSeconds: number = 120;
const apiMaxInstances: number = 100;
const defaultPageSize: number = 1000;
const cacheTimeAliveInSeconds: number = 10800;

/* ========================================================================================================================================================================= */

// Function to fetch file from storage bucket:
const fetchFile = async (fileName: string) => {
  const storageBucket = storage.bucket(storageBucketName);
  const fileExists: boolean = (await storageBucket.file(fileName).exists())[0];
  if(fileExists) {
    try {
      const rawFile = await storageBucket.file(fileName).download();
      const file: File = JSON.parse(rawFile.toString());
      console.info(`Fetched ${fileName} from storage bucket.`);
      return file;
    } catch(err) {
      console.error(`Failed to fetch ${fileName} from storage bucket: ${err}`);
    }
  } else {
    console.warn(`Could not find ${fileName} in storage bucket.`);
  }
  return undefined;
}

// Function to save file to storage bucket:
const saveFile = async (fileName: string, file: File) => {
  const storageBucket = storage.bucket(storageBucketName);
  try {
    await storageBucket.file(fileName).save(JSON.stringify(file, null, ' '));
    console.info(`Uploaded ${fileName} to storage bucket.`);
  } catch(err) {
    console.error(`Failed to upload ${fileName} to storage bucket: ${err}`);
  }
}

// Function to fetch all files of a specific chain from storage bucket:
const fetchAllFiles = async (chain: Chain) => {
  const files: Record<Files, File | undefined> = {
    deposits: await fetchFile(`${chain}/deposits.json`),
    withdrawals: await fetchFile(`${chain}/withdrawals.json`),
    claims: await fetchFile(`${chain}/claims.json`),
    balances: await fetchFile(`${chain}/balances.json`),
    yield: await fetchFile(`${chain}/yield.json`),
    supply: await fetchFile(`${chain}/supply.json`),
    delegationsCreated: await fetchFile(`${chain}/delegationsCreated.json`),
    delegationsFunded: await fetchFile(`${chain}/delegationsFunded.json`),
    delegationsUpdated: await fetchFile(`${chain}/delegationsUpdated.json`),
    delegationsWithdrawn: await fetchFile(`${chain}/delegationsWithdrawn.json`),
    wallets: undefined,
    stats: undefined
  }
  return files;
}

// Function to save all files of a specific chain to storage bucket:
const saveAllFiles = async (chain: Chain, files: Record<Files, File | undefined>) => {
  for(let fileName in files) {
    let file = files[fileName as Files];
    if(file) {
      await saveFile(`${chain}/${fileName}.json`, file);
    }
  }
}

/* ========================================================================================================================================================================= */

// Ethereum Query Function:
exports.ethDataQueries = functions.runWith({ memory: queryMemory, timeoutSeconds: queryTimeoutInSeconds }).pubsub.schedule(querySchedule).onRun(async () => {
  const chain: Chain = 'eth';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

// Polygon Query Function:
exports.polyDataQueries = functions.runWith({ memory: queryMemory, timeoutSeconds: queryTimeoutInSeconds }).pubsub.schedule(querySchedule).onRun(async () => {
  const chain: Chain = 'poly';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

// Avalanche Query Function:
exports.avaxDataQueries = functions.runWith({ memory: queryMemory, timeoutSeconds: queryTimeoutInSeconds }).pubsub.schedule(querySchedule).onRun(async () => {
  const chain: Chain = 'avax';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

// Optimism Query Function:
exports.opDataQueries = functions.runWith({ memory: queryMemory, timeoutSeconds: queryTimeoutInSeconds }).pubsub.schedule(querySchedule).onRun(async () => {
  const chain: Chain = 'op';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

/* ========================================================================================================================================================================= */

// Player Data Function:
exports.playerDataFilter = functions.runWith({ memory: playerDataMemory, timeoutSeconds: playerDataTimeoutInSeconds }).pubsub.schedule(playerDataSchedule).onRun(async () => {

  // Initializations:
  const allPlayerData: Record<Address, PlayerData> = {};
  const playersRef = db.collection(playerDataCollectionName);
  const batchArray = [db.batch()];
  let batchSize = 0;
  let batchIndex = 0;

  // Fetching Wallets' Files:
  const ethWallets = await fetchFile(`eth/wallets.json`);
  const polyWallets = await fetchFile(`poly/wallets.json`);
  const avaxWallets = await fetchFile(`avax/wallets.json`);
  const opWallets = await fetchFile(`op/wallets.json`);

  // Adding Player Data From Each Chain:
  chains.forEach(chain => {

    // Initializing Proper Wallets File:
    let walletsFile: File | undefined;
    if(chain === 'eth') {
      walletsFile = ethWallets;
    } else if(chain === 'poly') {
      walletsFile = polyWallets;
    } else if(chain === 'avax') {
      walletsFile = avaxWallets;
    } else if(chain === 'op') {
      walletsFile = opWallets;
    }
    if(walletsFile) {

      // Filtering Through Wallets:
      const wallets = walletsFile.data as { wallet: Address, data: WalletData }[];
      wallets.forEach(entry => {
        entry.data.txs.forEach(tx => tx.chain = chain);
        if(!allPlayerData[entry.wallet]) {
          allPlayerData[entry.wallet] = JSON.parse(JSON.stringify(defaultPlayerData));
        }
        allPlayerData[entry.wallet].balances[chain as 'eth' | 'poly' | 'avax' | 'op'] = entry.data.currentBalance;
        entry.data.txs.forEach(tx => {
          allPlayerData[entry.wallet].txs.push(tx);
          if(tx.type === 'delegationCreated' && tx.data.delegatee !== entry.wallet) {
            if(!allPlayerData[tx.data.delegatee]) {
              allPlayerData[tx.data.delegatee] = JSON.parse(JSON.stringify(defaultPlayerData));
            }
            allPlayerData[tx.data.delegatee].txs.push({ chain: chain, type: 'delegationCreated', data: tx.data });
          } else if(tx.type === 'delegationUpdated' && tx.data.newDelegatee !== entry.wallet) {
            if(!allPlayerData[tx.data.newDelegatee]) {
              allPlayerData[tx.data.newDelegatee] = JSON.parse(JSON.stringify(defaultPlayerData));
            }
            allPlayerData[tx.data.newDelegatee].txs.push({ chain: chain, type: 'delegationUpdated', data: tx.data });
          }
        });
      });
    }
  });
  console.info(`Filtered basic data for ${Object.keys(allPlayerData).length.toLocaleString(undefined)} players.`);

  // Finding Player Data Over Time:
  for(let playerString in allPlayerData) {
    const player = playerString as Address;
    const playerData = allPlayerData[player];
    if(playerData.txs.length > 0) {
      [playerData.timestamps, playerData.depositsOverTime, playerData.claimsOverTime, playerData.withdrawalsOverTime, playerData.balancesOverTime] = getPlayerDataOverTime(playerData.txs);
      playerData.txs.sort((a, b) => (b.data.timestamp as number) - (a.data.timestamp as number));
    }
  }
  console.info(`Calculated data over time for ${Object.keys(allPlayerData).length.toLocaleString(undefined)} players.`);

  // Updating Firestore:
  for(let playerString in allPlayerData) {
    const player = playerString as Address;
    const playerRef = playersRef.doc(player);
    const playerData = allPlayerData[player];
    batchArray[batchIndex].set(playerRef, playerData);
    if(++batchSize === 499) {
      batchArray.push(db.batch());
      batchIndex++;
      batchSize = 0;
    }
  }
  for(const batch of batchArray) {
    await batch.commit();
  }
  console.info(`Updated ${playerDataCollectionName} collection with ${batchIndex.toLocaleString(undefined)} batches (${((499 * batchIndex) + batchSize).toLocaleString(undefined)} docs).`);

  return null;
});

/* ========================================================================================================================================================================= */

// Root Response:
api.get(`/`, (req: Request, res: Response) => {
  res.status(200).end(`<title>PoolTogether Stats API</title><p>Check out our OpenAPI docs <a href="/docs">here</a>.</p>`);
});

// OpenAPI Docs:
api.use('/docs', swagger.serve, swagger.setup(swaggerDocs));

// File Endpoints:
chains.forEach(chain => {
  fileNames.forEach(fileName => {
    api.get(`/${chain}/${fileName}`, async (req: Request, res: Response) => {
      const file = await fetchFile(`${chain}/${fileName}.json`);
      if(file) {
        if(!noPagination.includes(fileName)) {
          const page = req.query.page != undefined ? parseInt(req.query.page as string) : 0;
          const pageSize = req.query.pageSize != undefined ? parseInt(req.query.pageSize as string) : defaultPageSize;
          const paginationStart = page * pageSize;
          const paginationEnd = paginationStart + pageSize;
          const paginatedFile: PaginatedFile = {
            lastQueriedBlock: file.lastQueriedBlock,
            page: page,
            hasNextPage: file.data.length > paginationEnd,
            data: file.data.slice(paginationStart, paginationEnd)
          };
          if(file.timestamp) {
            paginatedFile.timestamp = file.timestamp;
          }
          res.set('Cache-control', `public, max-age=${cacheTimeAliveInSeconds}`);
          res.status(200).end(JSON.stringify(paginatedFile, null, ' '));
        } else {
          res.set('Cache-control', `public, max-age=${cacheTimeAliveInSeconds}`);
          res.status(200).end(JSON.stringify(file, null, ' '));
        }
      } else {
        res.status(500).end('Internal API error.');
      }
    });
  });
});

// Wallet Endpoint:
api.get(`/wallet`, async (req: Request, res: Response) => {
  if(req.query.address != undefined) {
    const uncheckedWallet = req.query.address as string;
    if(uncheckedWallet.startsWith('0x') && uncheckedWallet.length === 42) {
      const wallet = utils.getAddress(uncheckedWallet) as Address;
      const playersRef = db.collection(playerDataCollectionName);
      const playerDoc = await playersRef.doc(wallet).get();
      if(playerDoc.exists) {
        res.status(200).end(JSON.stringify(playerDoc.data(), null, ' '));
      } else {
        res.status(200).end(JSON.stringify(defaultPlayerData, null, ' '));
      }
    } else {
      res.status(400).end('Invalid wallet address provided.');
    }
  } else {
    res.status(400).end('No wallet address provided.');
  }
});

// Teapot Response:
api.get(`/teapot`, (req: Request, res: Response) => {
  res.status(418).end(`             ;,'\n     _o_    ;:;'\n ,-.'---\`.__ ;\n((j\`=====',-'\n \`-\\     /\n    \`-=-'`);
});

// Error Response:
api.all('*', (req: Request, res: Response) => {
  res.status(400).end('Invalid route.');
});

// API Function:
exports.api = functions.runWith({ memory: apiMemory, timeoutSeconds: apiTimeoutInSeconds, maxInstances: apiMaxInstances }).https.onRequest(api);
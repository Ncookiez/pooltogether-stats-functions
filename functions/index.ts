
// Required Packages:
const cors = require('cors');
const express = require('express');
const admin = require('firebase-admin');
const swagger = require('swagger-ui-express');
const functions = require('firebase-functions');

// Importing Data Query Functions:
import { queryData } from './queries';

// Type Imports:
import type { Chain } from 'weaverfi/dist/types';
import type { Files, File, PaginatedFile } from './types';
import type { Application, Request, Response } from 'express';

// Fetching Firebase Logger Compatibility Patch:
require("firebase-functions/lib/logger/compat");

// Initializing Firebase App:
admin.initializeApp();
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
const fileNames: Files[] = ['deposits', 'withdrawals', 'claims', 'balances', 'yield', 'supply', 'delegationsCreated', 'delegationsFunded', 'delegationsUpdated', 'delegationsWithdrawn'];

// Query Settings:
const queryFrequencyInHours: number = 3;
const queryMemory: string = '512MB';
const queryTimeoutInSeconds: number = 540;

// API Settings:
const apiMemory: string = '256MB';
const apiTimeoutInSeconds: number = 120;
const apiMaxInstances: number = 100;
const defaultPageSize: number = 1000;
const cacheTimeAliveInSeconds: number = 3600;

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
    delegationsWithdrawn: await fetchFile(`${chain}/delegationsWithdrawn.json`)
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
exports.ethDataQueries = functions.runWith({ memory: queryMemory, timeoutSeconds: queryTimeoutInSeconds }).pubsub.schedule(`every ${queryFrequencyInHours} hours`).onRun(async () => {
  const chain: Chain = 'eth';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

// Polygon Query Function:
exports.polyDataQueries = functions.runWith({ memory: queryMemory, timeoutSeconds: queryTimeoutInSeconds }).pubsub.schedule(`every ${queryFrequencyInHours} hours`).onRun(async () => {
  const chain: Chain = 'poly';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

// Avalanche Query Function:
exports.avaxDataQueries = functions.runWith({ memory: queryMemory, timeoutSeconds: queryTimeoutInSeconds }).pubsub.schedule(`every ${queryFrequencyInHours} hours`).onRun(async () => {
  const chain: Chain = 'avax';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

// Optimism Query Function:
exports.opDataQueries = functions.runWith({ memory: queryMemory, timeoutSeconds: queryTimeoutInSeconds }).pubsub.schedule(`every ${queryFrequencyInHours} hours`).onRun(async () => {
  const chain: Chain = 'op';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
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
        res.status(500).end('Internal API error.');
      }
    });
  });
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
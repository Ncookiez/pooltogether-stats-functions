
// Required Packages:
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Importing Data Query Functions:
import { queryData } from './queries';

// Type Imports:
import type { Files, File } from './types';
import type { Chain } from 'weaverfi/dist/types';

// Fetching Firebase Logger Compatibility Patch:
require("firebase-functions/lib/logger/compat");

// Initializing Firebase App:
admin.initializeApp();
const storage = admin.storage();

/* ========================================================================================================================================================================= */

// Settings:
const storageBucketName: string = 'pooltogether-data';
const queryFrequencyInHours: number = 6;
const queryTimeout: number = 540;

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
  const files: Files = {
    deposits: await fetchFile(`${chain}/deposits.json`),
    withdrawals: await fetchFile(`${chain}/withdrawals.json`),
    claims: await fetchFile(`${chain}/claims.json`),
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
const saveAllFiles = async (chain: Chain, files: Files) => {
  for(let fileName in files) {
    let file = files[fileName as keyof Files];
    if(file) {
      await saveFile(`${chain}/${fileName}.json`, file);
    }
  }
}

/* ========================================================================================================================================================================= */

// Ethereum Query Function:
exports.ethDataQueries = functions.runWith({ timeoutSeconds: queryTimeout }).pubsub.schedule(`every ${queryFrequencyInHours} hours`).onRun(async () => {
  const chain: Chain = 'eth';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

// Polygon Query Function:
// exports.polyDataQueries = functions.runWith({ timeoutSeconds: queryTimeout }).pubsub.schedule(`every ${queryFrequencyInHours} hours`).onRun(async () => {
//   const chain: Chain = 'poly';
//   const files = await fetchAllFiles(chain);
//   const newFiles = await queryData(chain, files);
//   await saveAllFiles(chain, newFiles);
//   return null;
// });

// Avalanche Query Function:
exports.avaxDataQueries = functions.runWith({ timeoutSeconds: queryTimeout }).pubsub.schedule(`every ${queryFrequencyInHours} hours`).onRun(async () => {
  const chain: Chain = 'avax';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

// Optimism Query Function:
exports.opDataQueries = functions.runWith({ timeoutSeconds: queryTimeout }).pubsub.schedule(`every ${queryFrequencyInHours} hours`).onRun(async () => {
  const chain: Chain = 'op';
  const files = await fetchAllFiles(chain);
  const newFiles = await queryData(chain, files);
  await saveAllFiles(chain, newFiles);
  return null;
});

/* ========================================================================================================================================================================= */

// API Function:
// <TODO>
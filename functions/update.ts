
// Imports:
import fs from 'fs';
import { queryData } from './queries';

// Type Imports:
import type { Files, File } from './types';
import type { Chain } from 'weaverfi/dist/types';

// Initializations:
const chain: Chain = 'poly';
const dataFilesLocation = 'data/';

/* ========================================================================================================================================================================= */

// Function to run manual updates to given data:
const runManualUpdates = async () => {
  const files = readAllFiles();
  const newFiles = await queryData(chain, files);
  writeAllFiles(newFiles);
}

/* ========================================================================================================================================================================= */

// Function to read all JSON files:
const readAllFiles = () => {
  const files: Record<Files, File | undefined> = {
    deposits: readJSON('deposits'),
    withdrawals: readJSON('withdrawals'),
    claims: readJSON('claims'),
    balances: readJSON('balances'),
    yield: readJSON('yield'),
    supply: readJSON('supply'),
    delegationsCreated: readJSON('delegationsCreated'),
    delegationsFunded: readJSON('delegationsFunded'),
    delegationsUpdated: readJSON('delegationsUpdated'),
    delegationsWithdrawn: readJSON('delegationsWithdrawn'),
    wallets: undefined,
    stats: undefined
  }
  return files;
}

// Function to write to all JSON files:
const writeAllFiles = async (files: Record<Files, File | undefined>) => {
  for(let stringFileName in files) {
    const fileName = stringFileName as Files;
    let file = files[fileName];
    if(file) {
      writeJSON(file, fileName);
    }
  }
}

/* ========================================================================================================================================================================= */

// Function to read JSON files:
const readJSON = (fileName: Files) => {
  try {
    const rawData = fs.readFileSync(`${dataFilesLocation}${fileName}.json`, { encoding: 'utf8' });
    const data = JSON.parse(rawData);
    return data;
  } catch {
    console.warn(`READ ERROR: Could not read ${fileName}.json`);
  }
}

// Function to write to JSON files:
const writeJSON = (data: any, fileName: Files) => {
  try {
    fs.writeFileSync(`${dataFilesLocation}${fileName}.json`, JSON.stringify(data, null, ' '), 'utf8');
  } catch {
    console.warn(`WRITE ERROR: Could not write to ${fileName}.json`);
  }
}

/* ========================================================================================================================================================================= */

runManualUpdates();
import axios from 'axios';
import csv from 'csv-parser';
import fs from 'fs/promises';
import path from 'path';
import {opt_expiries} from '../../common/constants.mjs';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const FIELD_MAP = {
  pSymbol:      'symbol',
  pGroup:       'group',
  pExchSeg:     'exchangeSegment',
  pInstType:    'instrumentType',
  pSymbolName:  'underlying',
  pTrdSymbol:   'tradingSymbol',
  pOptionType:  'optionType',
  pScripRefKey: 'scripReferenceKey',
  pISIN:        'isin',
  pAssetCode:   'assetCode',
  lLotSize:     'lotSize',
  dStrikePrice: 'strikePrice',
  pExchange:    'exchange',
  pInstName:    'instrumentName',
  pExpiryDate:  'expiryDate'
};

const ALLOWED_ORIGINAL_KEYS = new Set(Object.keys(FIELD_MAP));

// Cache configuration constants
const CACHE_PREFIX = 'scrips_cache_';
const CACHE_EXTENSION = '.json';

// ============================================================================
// 2. PRIVATE DATA STORE STATE
// ============================================================================
let _inMemoryStore = []; 
let _isLoaded = false;    

// ============================================================================
// 3. CORE PROCESSING & UTILITY ENGINE
// ============================================================================

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCacheFilePath() {
  const todayStr = getTodayDateString();
  return path.join(__dirname, `${CACHE_PREFIX}${todayStr}${CACHE_EXTENSION}`);
}

function getUpdatedUrls(filePaths) {
  const todayStr = getTodayDateString();
  const dateRegex = /\d{4}-\d{2}-\d{2}/; 
  return filePaths.map(url => url.replace(dateRegex, todayStr));
}

function matchesCriteria(cleanRow, criteria) {
  for (const [cleanKey, allowedValues] of Object.entries(criteria)) {
    if (allowedValues.length > 0 && !allowedValues.includes(cleanRow[cleanKey])) {
      return false;
    }
  }
  return true;
}

function translateRowToFriendlyNames(rawRow) {
  const cleanRow = {};
  for (const [rawKey, cleanKey] of Object.entries(FIELD_MAP)) {
    cleanRow[cleanKey] = rawRow[rawKey];
  }
  return cleanRow;
}

/**
 * Scans the target directory and purges any historical stale scrip cache files.
 */
async function clearStaleCacheFiles() {
  console.log('Running background garbage collection on stale disk caches...');
  const todayStr = getTodayDateString();
  const currentCacheFileName = `${CACHE_PREFIX}${todayStr}${CACHE_EXTENSION}`;

  try {
    const files = await fs.readdir(__dirname);
    
    for (const file of files) {
      // Target files that start with our prefix, end with .json, but do NOT match today
      if (file.startsWith(CACHE_PREFIX) && file.endsWith(CACHE_EXTENSION) && file !== currentCacheFileName) {
        const fullPathToPurge = path.join(__dirname, file);
        await fs.unlink(fullPathToPurge);
        console.log(`[GC] Deleted stale cache file from disk: ${file}`);
      }
    }
    console.log('Garbage collection run successfully complete.');
  } catch (error) {
    console.error('Garbage collection warning:', error.message);
    // Non-blocking error: we do not crash the app if a file fails to delete
  }
}

function processSingleFile(url, userFilterCriteria) {
  return new Promise((resolve) => {
    axios({ method: 'get', url: url, responseType: 'stream' })
      .then(response => {
        response.data
          .pipe(csv({
            mapHeaders: ({ header }) => ALLOWED_ORIGINAL_KEYS.has(header) ? header : null
          }))
          .on('data', (rawRow) => {
            const friendlyRow = translateRowToFriendlyNames(rawRow);
            if (matchesCriteria(friendlyRow, userFilterCriteria)) {
              _inMemoryStore.push(friendlyRow); 
            }
          })
          .on('end', () => resolve())
          .on('error', (err) => {
            console.error(`Parsing error on URL ${url}:`, err.message);
            resolve(); 
          });
      })
      .catch(err => {
        console.error(`Network download failure for URL ${url}:`, err.message);
        resolve(); 
      });
  });
}

// ============================================================================
// 4. PUBLIC ACCESS API
// ============================================================================

async function initStore(payload, userFilterCriteria) {
  const cachePath = getCacheFilePath();

  // Trigger background garbage collection immediately on bootup
  await clearStaleCacheFiles();

  try {
    console.log('Checking for local persistent file cache...');
    const rawData = await fs.readFile(cachePath, 'utf-8'); 
    _inMemoryStore = JSON.parse(rawData);
    _isLoaded = true;
    console.log(`--- [CACHE HIT] Loaded ${_inMemoryStore.length} records directly from disk persistence. ---`);
    return _inMemoryStore.length;
  } catch (error) {
    console.log('[CACHE MISS] No valid local file found for today. Streaming from internet...');
    
    _inMemoryStore = []; 
    _isLoaded = false;
    const freshUrls = getUpdatedUrls(payload.data.filesPaths);

    for (const url of freshUrls) {
      await processSingleFile(url, userFilterCriteria);
    }

    try {
      await fs.writeFile(cachePath, JSON.stringify(_inMemoryStore, null, 2), 'utf-8'); 
      console.log(`Persistent disk cache written to: ${cachePath}`);
    } catch (writeError) {
      console.error('Failed to write persistent cache file to disk:', writeError.message);
    }

    _isLoaded = true;
    console.log(`--- Store Ready. ${_inMemoryStore.length} records cached in RAM. ---`);
    return _inMemoryStore.length;
  }
}

function getAllScrips() { return _inMemoryStore; }
function findScripByKey(columnName, value) { return _inMemoryStore.find(row => row[columnName] === value) || null; }
function queryStore(filterFn) { return _inMemoryStore.filter(filterFn); }
function getStoreStatus() { return { loaded: _isLoaded, totalRecords: _inMemoryStore.length }; }

export default {
  start,
  getAllScrips,
  findScripByKey,
  queryStore,
  getStoreStatus
};

// ============================================================================
// 5. BOOTSTRAP Scrip Service
// ============================================================================
async function start(expiryDates) {
  const incomingPayload = {
    "data": {
      "baseFolder": "https://kotaksecurities.com",
      "filesPaths": [
        "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-06-02/transformed/nse_fo.csv",
      ]
    }
  };
  
  //"https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-06-02/transformed-v1/nse_cm-v1.csv",      
  //"https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-06-02/transformed/mcx_fo.csv"
  
  const filters = {
    exchangeSegment: ['nse_fo'],
    expiryDate: [opt_expiries[underlying][first], opt_expiries[underlying][second]], 
    underlying: ['NIFTY'],
    exchange: [],
    instrumentType: ['OPTIDX']
  };
  //filters.expiryDate = expiryDates;
  await initStore(incomingPayload, filters);
}
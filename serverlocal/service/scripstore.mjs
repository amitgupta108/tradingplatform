import axios from 'axios';
import csv from 'csv-parser';
import fs from 'fs/promises';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIELD_MAP = {
	pSymbol:      'token',
	pExchSeg:     'exchangeSegment',
	pInstType:    'instrumentType',
	pSymbolName:  'underlying',
	pTrdSymbol:   'tradingSymbol',
	pScripRefKey: 'scripReferenceKey',
	pExpiryDate:  'expiryDate'
};

const ALLOWED_ORIGINAL_KEYS = new Set(Object.keys(FIELD_MAP));

const incomingPayload = {
	"data": {
		"baseFolder": "https://kotaksecurities.com",
		"filesPaths": [
			"https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-18/transformed/nse_fo.csv",
			"https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-18/transformed/mcx_fo.csv",
		]
	}
};

const filters = {
	exchangeSegment: [],
	expiryDate: ['1472135400', '1472740200', '1789689599'],
	underlying: ['NIFTY', 'CRUDEOIL'],
	instrumentType: []
};

const CACHE_PREFIX = 'scrips_cache_';
const CACHE_EXTENSION = '.json';

function getTodayDateString() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function getCacheFilePath() {
	const todayStr = getTodayDateString();
	return path.join(__dirname, '..', 'config', `${CACHE_PREFIX}${todayStr}${CACHE_EXTENSION}`);
}

function getUpdatedUrls(filePaths) {
	const todayStr = getTodayDateString();
	const dateRegex = /\d{4}-\d{2}-\d{2}/; 
	return filePaths.map(url => url.replace(dateRegex, todayStr));
}

/**
 * Scans the target directory and purges any historical stale scrip cache files.
 */
async function clearStaleCacheFiles() {
	console.log('Running background garbage collection on stale disk caches...');
	const todayStr = getTodayDateString();
	const currentCacheFileName = `${CACHE_PREFIX}${todayStr}${CACHE_EXTENSION}`;

	try {
		const files = await fs.readdir(path.join(__dirname, '..', 'config'));
		
		for (const file of files) {
			// Target files that start with our prefix, end with .json, but do NOT match today
			if (file.startsWith(CACHE_PREFIX) && file.endsWith(CACHE_EXTENSION) && file !== currentCacheFileName) {
				const fullPathToPurge = path.join(__dirname, '..', 'config', file);
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
class ScripStore 
{
	constructor()
	{
		this.name = 'SCRIPSTORE';
		this.initialized = false;
		this._inMemoryStore = new Map();
		this._isLoaded = false;    
	}

	async init() 
	{
		await this.load(incomingPayload, filters, true);
		this.initialized = true;
		return {status: 'initialized'};
	}

	async load(incomingPayload, filters, reload = false) 
	{
		const cachePath = getCacheFilePath();

		// Trigger background garbage collection immediately on bootup
		await clearStaleCacheFiles();
		if (this._isLoaded && !reload)
			return 0;

		try 
		{
			console.log('Checking for local persistent file cache...');
			const rawData = await fs.readFile(cachePath, 'utf-8');
			const scrips = JSON.parse(rawData);
			scrips.forEach((s) => {
				this._inMemoryStore.set(s.scripReferenceKey, s);
			});
			this._isLoaded = true;
			console.log(`--- [CACHE HIT] Loaded ${this._inMemoryStore.size} records directly from disk persistence. ---`);
			return this._inMemoryStore.size;
		} 
		catch (error) 
		{
			console.log('[CACHE MISS] No valid local file found for today. Streaming from internet...');

			this._inMemoryStore = new Map();
			this._isLoaded = false;
			const freshUrls = getUpdatedUrls(incomingPayload.data.filesPaths);

			for (const url of freshUrls) {
				await this.processSingleFile(url, filters);
			}

			try {
				await fs.writeFile(cachePath, JSON.stringify(Array.from(this._inMemoryStore.values()), null, 2), 'utf-8');
				console.log(`Persistent disk cache written to: ${cachePath}`);
			} catch (writeError) {
				console.error('Failed to write persistent cache file to disk:', writeError.message);
			}

			this._isLoaded = true;
			console.log(`--- Store Ready. ${this._inMemoryStore.size} records cached in RAM. ---`);
			return this._inMemoryStore.size;
		}
	}

	matchesCriteria(cleanRow, criteria) 
	{
		for (const [cleanKey, allowedValues] of Object.entries(criteria)) {
			if (allowedValues.length > 0 && !allowedValues.includes(cleanRow[cleanKey])) {
				return false;
			}
		}
		return true;
	}

	translateRowToFriendlyNames(rawRow) 
	{
		const cleanRow = {};
		for (const [rawKey, cleanKey] of Object.entries(FIELD_MAP)) {
			if (rawKey === 'pScripRefKey')
				cleanRow[cleanKey] = rawRow[rawKey] !== '' ? rawRow[rawKey].replaceAll('.00', '') : rawRow['pTrdSymbol'];
			else
				cleanRow[cleanKey] = rawRow[rawKey];
		}
		return cleanRow;
	}

	processSingleFile(url, userFilterCriteria) 
	{
		return new Promise((resolve) => {
			axios({ method: 'get', url: url, responseType: 'stream' })
				.then(response => {
					response.data
						.pipe(csv({
							mapHeaders: ({ header }) => ALLOWED_ORIGINAL_KEYS.has(header) ? header : null
						}))
						.on('data', (rawRow) => {
							const friendlyRow = this.translateRowToFriendlyNames(rawRow);
							if (this.matchesCriteria(friendlyRow, userFilterCriteria)) {
								this._inMemoryStore.set(friendlyRow.scripReferenceKey, friendlyRow);
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

	getAllScrips() { return Array.from(this._inMemoryStore.values()); }
	findScripByKey(columnName, value) { return Array.from(this._inMemoryStore.values()).find(row => row[columnName] === value) || null; }
	findScripByRefKey(key) { return this._inMemoryStore.get(key); }
	queryStore(filterFn) { return Array.from(this._inMemoryStore.values()).filter(filterFn); }
	getStoreStatus() { return { loaded: this._isLoaded, totalRecords: this._inMemoryStore.size }; }
}

export const scripstore = new ScripStore();

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import readline from 'node:readline';
import csvParser from 'csv-parser';
import utils from '../../common/utils.mjs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const FIELD_MAP = {
	pSymbol:      'token',
	pExchSeg:     'exchangeSegment',
	pInstType:    'instrumentType',
	pSymbolName:  'underlying',
	pTrdSymbol:   'tradingSymbol',
	pScripRefKey: 'scripReferenceKey',
	pExpiryDate:  'expiryDate'
};
const keys_kept = new Set(Object.keys(FIELD_MAP));
const filePaths = [{
		segement: 'nse_fo', 
		url: 'https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-09-03/transformed/nse_fo.csv',
	},
	{
		segement: 'mcx_fo',
		url: 'https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-09-03/transformed/mcx_fo.csv',
	}];

const filters = {
	expiryDate: ['1473345000', '1473949800', '1475159400'],
	underlying: ['NIFTY']
};

const todayStr = new Date().toISOString().split('T')[0];
const wd = path.join(utils.getWSfolder(), 'serverlocal', 'config');
const PREFIX = 'scrips_';
const EXTENSION = '.ndjson';
const cacheFilePath = path.join(wd, `${PREFIX}${todayStr}${EXTENSION}`);

function getUpdatedUrl(url) 
{
	const dateRegex = /\d{4}-\d{2}-\d{2}/; 
	return url.replace(dateRegex, todayStr);
}

async function clearStaleCacheFiles() 
{
	console.log('Running background garbage collection on stale disk caches...');

	try {
		const files = await fsp.readdir(wd);
		
		for (const file of files) {
			if (file.endsWith(EXTENSION) && !file.includes(todayStr)) {
				await fsp.unlink(path.join(wd, file));
				console.log(`[GC] Deleted stale cache file from disk: ${file}`);
			}
		}
		console.log('Garbage collection run successfully complete.');
	} catch (error) {
		console.error('Garbage collection warning:', error.message);
	}
}

class ScripStore 
{
	constructor()
	{
		this.name = 'SCRIPSTORE';
		this.initialized = false;
		this.isLoaded = false;    
		this.inMemoryStore = new Map();
	}

	init() 
	{		
		return this.load(filters)
		.then(() => {
			this.initialized = true;
			return { status: 'initialized' };
		})
		.catch ((error) => {
			return {status: 'error', reason: error.message};
		});
	}

	async load(filters) 
	{
		clearStaleCacheFiles();
		console.log('Checking for local persistent file cache...');
		if (fs.existsSync(cacheFilePath)) 
		{
			const jsonfile = fs.createReadStream(cacheFilePath, { encoding: 'utf8' });

			const rl = readline.createInterface({
				input: jsonfile,
				crlfDelay: Infinity // Recognizes both \r\n and \n correctly
			});

			rl.on('line', (line) => {
				if (line.trim()) {
					const s = JSON.parse(line);
					this.inMemoryStore.set(s.scripReferenceKey, s);
				}
			});

			rl.on('close', () => {
				this.isLoaded = true;
				console.log(`--- [CACHE HIT] Loaded ${this.inMemoryStore.size} records directly from disk persistence. ---`);
			});
		} 
		else
		{
			console.log('[CACHE MISS] No valid local file found for today.');

			for (const f of filePaths) {
				await this.processSingleFile(f, filters, this.inMemoryStore);
			}

			this.isLoaded = true;
			console.log(`--- Store Ready. ${this.inMemoryStore.size} records cached in RAM. ---`);
		}
	}

	async processSingleFile(filePath, filters, store) 
	{
		try
		{
			const response = await fetch(getUpdatedUrl(filePath.url));

			if (!response.ok) {
				throw new Error(`Failed to fetch ${getUpdatedUrl(filePath.url)}: ${response.statusText}`);
			}

			const nodeStream = Readable.fromWeb(response.body);

			await pipeline(
				nodeStream,
				csvParser({
					mapHeaders: ({ header }) => keys_kept.has(header) ? header : null
				}), 
				async function* (data) 
				{
					for await (const rawRow of data) 
					{
						const cleanRow = {};
						for (const [rawKey, cleanKey] of Object.entries(FIELD_MAP)) {
							cleanRow[cleanKey] = rawKey === 'pScripRefKey' ?
								rawRow[rawKey] !== '' ? rawRow[rawKey].replaceAll('.00', '') : rawRow['pTrdSymbol'] :
								rawRow[rawKey];
						}

						let included = true;
						for (const [cleanKey, allowedValues] of Object.entries(filters)) {
							if (!allowedValues.includes(cleanRow[cleanKey])) 
								included = false;
						}
						if(included) {
							store.set(cleanRow.scripReferenceKey, cleanRow);
							yield (JSON.stringify(cleanRow) + '\n').toString();
						}
					}
				},
				fs.createWriteStream(cacheFilePath, { flags: 'a', encoding: 'utf8' })
			);
		} catch(error){
			console.error(error);
		}			
	}
	
	getAllScrips() { return Array.from(this.inMemoryStore.values()); }
	findScripByKey(columnName, value) { return Array.from(this.inMemoryStore.values()).find(row => row[columnName] === value) || null; }
	findScripByRefKey(key) { return this.inMemoryStore.get(key); }
	queryStore(filterFn) { return Array.from(this.inMemoryStore.values()).filter(filterFn); }
	getStoreStatus() { return { loaded: this.isLoaded, totalRecords: this.inMemoryStore.size }; }
}

export const scripstore = new ScripStore();
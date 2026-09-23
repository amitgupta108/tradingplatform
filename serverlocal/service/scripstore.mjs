import os from 'os';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import readline from 'node:readline';
import csvParser from 'csv-parser';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { ConfigService } from './.config/configservice.mjs';
import { eventservice } from './eventservice.mjs';
import { filePaths, filters, tp_filters } from '../utils/constants.mjs';

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
const todayStr = new Date().toISOString().split('T')[0];
const homedir = os.homedir();
const wd = path.join(homedir, process.env.workspace_location, process.env.static_data_location);
const PREFIX = 'scrips_';
const EXTENSION = '.ndjson';
const cacheFilePath = path.join(wd, `${PREFIX}${todayStr}${EXTENSION}`);

function getUpdatedUrl(url) 
{
	const dateRegex = /\d{4}-\d{2}-\d{2}/; 
	return url.replace(dateRegex, todayStr);
}

const filterfn = (record, filters) => {
	let included = true;
	for (const [cleanKey, allowedValues] of Object.entries(filters)) {
		if (!allowedValues.includes(record[cleanKey]))
			included = false;
	}

	return included;
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
		if(!this.initialized)
		{			
			let p;
			if (process.env.PASSTHROUGH === 'Y')
				p = this.remoteLoad(tp_filters);
	
			else
				p = this.load(filters);

			return p.then((response) => {
				this.initialized = true;
				return { status: response };
			})
			.catch ((error) => {
				return {status: 'error', reason: error.message};
			});
		}
	}

	async remoteLoad(filters)
	{
		return await new Promise((resolve, reject) => {
			eventservice.addListener('scrips', (scrips) => {
				scrips.forEach((s) => {
					this.inMemoryStore.set(s.scripReferenceKey, s);
				});
				console.log('scrips remote load, size ' + this.inMemoryStore.size);
				resolve('initialized');
			});

			this.tpsocket = ConfigService.getSocketClient('TPCLIENT');
			this.tpsocket.getScrips(filters);			
		});
	}

	async load(filters, reload = false) 
	{
		clearStaleCacheFiles();
		console.log('Checking for local persistent file cache...');
		this.addIndicesToStore(['NIFTY']);
		if (fs.existsSync(cacheFilePath) || reload === true) 
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

	addIndicesToStore(indices)
	{
		for (const index of indices) 
		{
			if(index === 'NIFTY') 
			{
				this.inMemoryStore.set('NIFTY', {
					token: '26000',
					exchangeSegment: 'nse_cm',
					instrumentType: 'index',
					scripReferenceKey: 'NIFTY'
				});
			}
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

						let included = filterfn(cleanRow, filters);
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
	getScrips(filters) { return Array.from(this.inMemoryStore.values()).filter((r) => filterfn(r, filters)); }
	getStoreStatus() { return { loaded: this.isLoaded, totalRecords: this.inMemoryStore.size }; }
}

export const scripstore = new ScripStore();
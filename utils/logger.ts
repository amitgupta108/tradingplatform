import util from 'util';
import fs from 'node:fs';
import path from 'node:path';

const getTimestamp = (): string => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `[${h}:${m}:${s}:${ms}]`;
};
const logstream = fs.createWriteStream(path.join(process.env.LOG_DIR ?? "", 'log.txt'), { flags: 'a' });
const errorstream = fs.createWriteStream(path.join(process.env.LOG_DIR ?? "", 'error.txt'), { flags: 'a' });

logstream.on("error", (err) => {
    console.error("Failed to write to log stream", err);
});

errorstream.on("error", (err) => {
    console.error("Failed to write to error stream", err);
});

export class Logger {
    constructor() { }

    static log(message?: any, ...optionalParams: any[]) {
        const formattedMessage = util.format(message, ...optionalParams);
        logstream.write(`${getTimestamp()} ${formattedMessage}\n`);
    }

    static error(message?: any, ...optionalParams: any[]) {
        const formattedMessage = util.format(message, ...optionalParams);
        errorstream.write(`${getTimestamp()} ${formattedMessage}\n`);
    }
}
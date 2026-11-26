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

export class FileLogger {

    static log(message?: any, ...optionalParams: any[]) {
        const formattedMessage = util.format(message, ...optionalParams);
        logstream.write(`${getTimestamp()} ${formattedMessage}\n`);
    }

    static error(message?: any, ...optionalParams: any[]) {
        const formattedMessage = util.format(message, ...optionalParams);
        errorstream.write(`${getTimestamp()} ${formattedMessage}\n`);
    }
}

const methods = ["log", "error", "warn", "info", "debug"];

methods.forEach((method) => {
    // Capture the native machine logging method
    const original = console[method];

    console[method] = (message?: any, ...optionalParams: any[]) => {
        // 1. Format arguments exactly like standard Node.js console.log
        const formattedMessage = util.format(message, ...optionalParams);

        // 2. Prepend the simple H:M:S:ms timestamp
        const timestamp = getTimestamp();

        // 3. Send it out to the raw stream, preserving actual \n line breaks
        original.apply(console, [timestamp, formattedMessage]);
    };
});

export class Logger {

    static log(...args: string[]) {
        console.log(...args);
    }

    static error(...args: string[]) {
        console.error(...args);
    }
}
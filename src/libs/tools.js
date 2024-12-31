import path from 'path';
import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import 'colors';

export const getTempPath = (hash, suffix) => {
    if (hash) {
        return path.join(os.tmpdir(), '.ebook-reader-cli', hash);
    }
    if (hash && suffix) {
        return path.join(os.tmpdir(), '.ebook-reader-cli', hash, suffix);
    }
    return path.join(os.tmpdir(), '.ebook-reader-cli');
};
export const getHash = (filePath) => {
    return new Promise((resolve) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => {
            hash.update(chunk);
        });
        stream.on('end', () => {
            const fileHash = hash.digest('hex');
            resolve(fileHash);
        });
    });
};
export const clearScreen = () => {
    process.stdout.write(
        process.platform === 'win32' ? '\x1Bc' : '\x1B[2J\x1B[3J\x1B[H'
    );
};

export const cleanText = (text) => {
    return text.replace(/[\s?\x00-\x1F\x7F]/g, '');
};

export const colorText = (text, colorCode) => {
    return `\x1b[${colorCode}m${cleanText(text)}\x1b[0m`;
};

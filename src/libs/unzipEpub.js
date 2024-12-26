import unzipper from 'unzipper';
import fs from 'fs';
import { DOMParser } from 'xmldom';
import path from 'path';
import os from 'os';

export const unzipEpub = (filePath, tempPath) => {
    return new Promise(async (resolve) => {
        const buffer = fs.readFileSync(filePath);
        const directory = await unzipper.Open.buffer(buffer);
        await directory.extract({ path: tempPath });
        resolve();
    });
};

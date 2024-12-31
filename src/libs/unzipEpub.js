import unzipper from 'unzipper';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { getTempPath, getHash } from './tools.js';

export const unzipEpub = async (filePath) => {
    const hash = await getHash(filePath);
    const tempPath = getTempPath(hash);

    return new Promise(async (resolve) => {
        if (fs.existsSync(tempPath)) {
            resolve();
        } else {
            const buffer = fs.readFileSync(filePath);
            const directory = await unzipper.Open.buffer(buffer);
            await directory.extract({ path: tempPath });
            resolve();
        }
    });
};

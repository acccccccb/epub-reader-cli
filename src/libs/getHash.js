import fs from 'fs';
import crypto from 'crypto';

const getHash = (filePath) => {
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

export default getHash;

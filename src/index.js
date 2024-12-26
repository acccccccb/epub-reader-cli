#!/usr/bin/env node
import os from 'os';
import fs from 'fs';
import path from 'path';
import { DOMParser } from 'xmldom';
import metaReader from './libs/metaReader.js';
import chapterReader from './libs/chapterReader.js';
import 'colors';
import { Command } from 'commander';
import { unzipEpub } from './libs/unzipEpub.js';
import getHash from './libs/getHash.js';
import { readRecord } from './libs/record.js';
const currentDir = path.dirname(new URL(import.meta.url).pathname);
const pkgPath = path.join(currentDir, '../package.json').replace('\\', '');
const pkgData = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgData);
const programName = pkg.name;
const version = `v${pkg.version}`;
const description = pkg.description;
const author = pkg.author;
const program = new Command();
const string = 'Hello, World!';

const tempDir = path.join(os.tmpdir(), '.ebook-reader-cli');
try {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
} catch (err) {
    console.error('创建目录失败:', err);
}

program.name('ebook-reader-cli');
program.name('erc');
program.version(version);
program.description(description);
program.showHelpAfterError('错误');
program.configureOutput({
    // Visibly override write routines as example!
    writeOut: (str) => process.stdout.write(`${str}`),
    writeErr: (str) => process.stdout.write(`[ERR] ${str}`),
    // Highlight errors in color.
    outputError: (str, write) => process.stdout.write(`[ERR] ${str}`),
});
program
    .description('输出一条问候消息')
    .argument('<filePath>', 'epub文件路径')
    .action(async (filePath) => {
        const hash = await getHash(filePath);
        const tempPath = path.join(os.tmpdir(), '.ebook-reader-cli', `${hash}`);
        const encode = 'utf-8';
        await unzipEpub(filePath, tempPath);
        metaReader({
            tempPath,
            encode,
        }).then((meta) => {
            // console.log(meta);
            chapterReader({
                hash,
                tempPath,
                encode,
            });
        });

        process.on('exit', (code) => {
            try {
                fs.rmSync(`${tempPath}`, { recursive: true, force: true });
            } catch (err) {
                console.error('Error while deleting folder:', err);
            }
        });
        process.on('SIGINT', () => {
            process.exit(0); // 必须调用 `process.exit()` 结束进程
        });
    });
program.parse();

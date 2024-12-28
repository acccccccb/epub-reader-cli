#!/usr/bin/env node
import os from 'os';
import fs from 'fs';
import path from 'path';
import metaReader from './libs/metaReader.js';
import chapterReader from './libs/chapterReader.js';
import getBookList from './libs/getBookList.js';
import 'colors';
import { Command } from 'commander';
import { unzipEpub } from './libs/unzipEpub.js';
import inquirer from 'inquirer';
import { clearRecord } from './libs/record.js';
import { clearScreen, getHash, getTempPath } from './libs/tools.js';
const currentDir = path.dirname(new URL(import.meta.url).pathname);
const pkgPath = path.join(currentDir, '../package.json').replace('\\', '');
const pkgData = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgData);
const programName = pkg.name;
const version = `v${pkg.version}`;
const description = pkg.description;
const program = new Command();

const tempDir = getTempPath();
try {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
} catch (err) {
    console.error('创建目录失败:', err);
    process.exit(0);
}

program.name(programName);
program.version(version);
program.description(`${description}`.blue);

program.usage('erc <epub_file_path>');
program.helpOption('-h, --help', 'read more information');
program.showHelpAfterError('错误');
program.configureOutput({
    // Visibly override write routines as example!
    writeOut: (str) => process.stdout.write(`${str}`),
    writeErr: (str) => process.stdout.write(`[ERR] ${str}`),
    // Highlight errors in color.
    outputError: (str) => process.stdout.write(`[ERR] ${str}`),
});
process.setMaxListeners(10);
const openBook = async (filePath) => {
    const hash = await getHash(filePath);
    const encode = 'utf-8';
    await unzipEpub(filePath);

    metaReader({
        hash,
        encode,
    }).then((meta) => {
        chapterReader({
            hash,
            encode,
        });
    });
};
program
    .command('clear-cache')
    .description('清除缓存')
    .action(() => {
        inquirer
            .prompt([
                {
                    name: 'confirm',
                    message: `是否要清除所有阅读记录和缓存？`.red,
                    type: 'confirm',
                },
            ])
            .then(async ({ confirm }) => {
                if (confirm) {
                    await clearRecord();
                    console.log('清除成功'.green);
                }
                process.exit(0);
            })
            .catch(() => {
                clearScreen();
                console.log('取消操作');
                process.exit(0);
            });
    });
program.argument('[filePath]', 'epub文件路径').action(async (filePath) => {
    if (!filePath) {
        const bookList = getBookList();
        if (bookList.length === 0) {
            clearScreen();
            console.log('没有找到epub文件'.red);
            process.exit(0);
        }
        inquirer
            .prompt([
                {
                    name: 'filePath',
                    message: '选择文件'.blue,
                    type: 'list',
                    choices: bookList,
                },
            ])
            .then(({ filePath }) => {
                openBook(filePath);
            })
            .catch((e) => {
                clearScreen();
                process.exit(0);
            });
        return;
    }
    if (!filePath.match(/.epub$/)) {
        clearScreen();
        console.log('仅支持epub文件'.red);
        process.exit(0);
    }

    await openBook(filePath);

    process.on('SIGINT', () => {
        clearScreen();
        process.exit(0); // 必须调用 `process.exit()` 结束进程
    });
});
program.parse();

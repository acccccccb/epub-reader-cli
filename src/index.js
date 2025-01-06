#!/usr/bin/env node
import os from 'os';
import fs from 'fs';
import path from 'path';
import metaReader from './libs/metaReader.js';
import chapterReader from './libs/chapterReader.js';
import 'colors';
import { Command } from 'commander';
import { unzipEpub } from './libs/unzipEpub.js';
import inquirer from 'inquirer';
import { clearCacheByHash, clearRecord } from './libs/record.js';
import {
    clearScreen,
    getHash,
    getTempPath,
    getBookList,
    getCacheBookList,
} from './libs/tools.js';
import { Store } from './store/index.js';
global.$store = new Store();
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

const getBooksListHash = async (list) => {
    return new Promise((resolve) => {
        const promises = list.map(async (item) => {
            const hash = await getHash(item);
            await unzipEpub(item);
            return hash;
        });
        Promise.all(promises).then(resolve); // 等待所有异步操作完成后再 resolve
    });
};

const getBookListInfoByHash = async (list) => {
    const getBookName = (meta) => {
        return (
            `[${meta?.epubVersion}]` +
            (meta?.title.length > 16
                ? meta?.title.substring(0, 16) + '...'
                : meta?.title) +
            ``
        );
    };
    return new Promise((resolve) => {
        const promises = list
            .filter((item) => {
                const tempPath = getTempPath(item);
                const fileExist = fs.existsSync(
                    `${tempPath}/META-INF/container.xml`
                );
                if (!fileExist) {
                    clearCacheByHash(item, true);
                }
                return fileExist;
            })
            .map(async (item) => {
                const meta = await metaReader({
                    hash: item,
                });
                return {
                    name: getBookName(meta),
                    value: item,
                };
            });
        Promise.all(promises).then(resolve); // 等待所有异步操作完成后再 resolve
    });
};

const openBook = async (cfg) => {
    const hash = cfg.hash || (await getHash(cfg.filePath));
    const encode = global.$store.get('encode');
    if (cfg.filePath) {
        await unzipEpub(cfg.filePath);
    }

    metaReader({
        hash,
    }).then((meta) => {
        chapterReader({
            hash,
        });
    });
};
program
    .command('clear-cache')
    .alias('cc')
    .option('-a, --all', '列出缓存列表', false)
    .description('清除缓存')
    .action(async (options) => {
        const { all } = options;
        if (!all) {
            const cacheList = await getBookListInfoByHash(getCacheBookList());
            if (cacheList.length === 0) {
                console.log('缓存列表为空'.green);
                process.exit(0);
            }
            inquirer
                .prompt([
                    {
                        type: 'checkbox',
                        name: 'options',
                        message: '使用空格勾选要删除的项目：',
                        choices: cacheList, // 可选项
                    },
                ])
                .then((answers) => {
                    if (
                        Array.isArray(answers.options) &&
                        answers.options.length > 0
                    ) {
                        inquirer
                            .prompt([
                                {
                                    name: 'confirm',
                                    message: `是否要清除选中的阅读记录和缓存？`
                                        .red,
                                    type: 'confirm',
                                },
                            ])
                            .then(async ({ confirm }) => {
                                if (confirm) {
                                    answers.options.forEach(async (item) => {
                                        await clearCacheByHash(item);
                                    });
                                    console.log('清除成功'.green);
                                }
                                process.exit(0);
                            })
                            .catch(() => {
                                clearScreen();
                                console.log('取消操作');
                                process.exit(0);
                            });
                    } else {
                        process.exit();
                    }
                })
                .catch((e) => {
                    process.exit(0);
                });
        } else {
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
        }
    });

program
    .argument('[filePath]', 'epub文件路径')
    .option('-c, --cache', '从缓存读取书籍列表', false)
    .option('-d, --deep <deep>', '设置深度级别', 0)
    .action(async (filePath, options) => {
        if (!filePath) {
            const { cache, deep } = options;
            let bookList = [];
            if (cache) {
                bookList = await getBookListInfoByHash(getCacheBookList());
            } else {
                bookList = await getBookListInfoByHash(
                    await getBooksListHash(getBookList(deep))
                );
            }
            if (bookList.length === 0) {
                clearScreen();
                console.log('暂无书籍'.red);
                process.exit();
            }
            inquirer
                .prompt([
                    {
                        name: 'hash',
                        message: '选择文件'.blue,
                        type: 'list',
                        choices: bookList,
                        loop: false,
                    },
                ])
                .then(async ({ hash }) => {
                    await openBook({ hash });
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
        await openBook({ filePath });

        process.on('SIGINT', () => {
            clearScreen();
            process.exit(0); // 必须调用 `process.exit()` 结束进程
        });
    });
program.parse();

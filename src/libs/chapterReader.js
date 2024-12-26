import unzipper from 'unzipper';
import os from 'os';
import fs from 'fs';
import path from 'path';
import contentReader from './contentReader.js';
import { DOMParser } from 'xmldom';
import inquirer from 'inquirer';
import pager from './pager.js';
import colors from 'colors';
import { exec } from 'child_process';
import iconv from 'iconv-lite';
import buffer from 'buffer';
import { clearRecord, readRecord } from './record.js';

const chapterReader = async (
    cfg = {
        hash: '',
        tempPath: '',
        encode: 'utf-8',
    }
) => {
    const { hash, tempPath, encode } = cfg;

    if (!tempPath) process.exit(0);
    const containerPath = `${tempPath}/META-INF/container.xml`;
    // 读取container文件
    const containerXml = fs.readFileSync(`${containerPath}`, cfg.encode);
    const containerXmlNode = new DOMParser().parseFromString(
        containerXml,
        'text/xml'
    );
    // 读取opf文件
    const opfPath = containerXmlNode
        .getElementsByTagName('rootfile')[0]
        ?.getAttribute('full-path')
        ?.replace('content.opf', '');
    const tocNcx = fs.readFileSync(
        `${tempPath}/${opfPath}/toc.ncx`,
        cfg.encode
    );

    const nodeFilter = (nodeList, nodeType = 1) => {
        const list = [];
        for (let i = 0; i < nodeList.length; i++) {
            if (nodeList[i].nodeType === nodeType) {
                list.push(nodeList[i]);
            }
        }
        return list;
    };

    const tocNcxNode = new DOMParser().parseFromString(tocNcx, 'text/xml');
    const navPointList = nodeFilter(
        tocNcxNode.getElementsByTagName('navMap')[0].childNodes
    );
    const chapter = [];

    const parsingNavPoint = (navPoint, pid) => {
        const id = navPoint?.getAttribute('id');
        const stuck = nodeFilter(navPoint.childNodes);
        // do while
        const obj = { id, pid };
        do {
            const node = stuck.shift();
            if (node.nodeType === 1) {
                if (node.tagName === 'navLabel') {
                    const text = nodeFilter(
                        node.childNodes[1].childNodes,
                        3
                    )[0];
                    obj.title = text?.data;
                }
                if (node.tagName === 'content') {
                    obj.src = node?.getAttribute('src');
                    if (pid === 0) {
                        chapter.push(obj);
                    } else {
                        chapter.forEach((item) => {
                            if (item.id === pid) {
                                item.children = item.children || [];
                                item.children.push(obj);
                            }
                        });
                    }
                }

                if (node.tagName === 'navPoint') {
                    parsingNavPoint(node, id);
                }
            }
        } while (stuck.length !== 0);
    };

    for (let i = 0; i < navPointList.length; i++) {
        parsingNavPoint(navPointList[i], 0);
    }

    const arr = [];
    const loop = (list, level = 0) => {
        list.forEach((item) => {
            let tab = '';
            for (let i = 0; i < level; i++) {
                tab += '  ';
            }
            arr.push({
                name: tab + item.title['green'],
                value: item.src,
            });
            if (item.children) {
                loop(item.children, level + 1);
            }
        });
    };
    loop(chapter);

    // fs.writeFileSync(`${tempPath}/chapter.json`, JSON.stringify(arr, null, 4));

    const readContent = (src, jumpTo = undefined, jumpType = 1) => {
        contentReader({
            tempPath: cfg.tempPath,
            encode: cfg.encode,
            chapter_src: src,
        }).then((content) => {
            const index = arr.findIndex((item) => item.value === src) || 0;
            const prev_chapter_src = arr[index - 1]?.value;
            const current_chapter_src = arr[index]?.value;
            const next_chapter_src = arr[index + 1]?.value;
            pager({
                tempPath,
                hash: cfg.hash,
                chapterSrc: src,
                content,
                prev: () => {
                    if (prev_chapter_src) {
                        readContent(prev_chapter_src, 'end');
                    } else {
                        console.log('is start');
                        process.exit();
                    }
                },
                next: () => {
                    if (next_chapter_src) {
                        readContent(prev_chapter_src, 'end');
                    } else {
                        console.log('is end');
                        process.exit();
                    }
                },
                jumpTo,
                jumpType,
            });
        });
    };
    const record = await readRecord(tempPath, hash);

    const startNewReading = () => {
        inquirer
            .prompt([
                {
                    name: 'chapter_src',
                    message: '选择章节'.blue,
                    type: 'list',
                    choices: arr,
                },
            ])
            .then(({ chapter_src }) => {
                readContent(chapter_src, chapter_src.split('#')[1], 2);
            })
            .catch((error) => {
                process.stdout.write(
                    process.platform === 'win32'
                        ? '\x1Bc'
                        : '\x1B[2J\x1B[3J\x1B[H'
                );
            });
    };
    if (!record) {
        startNewReading();
    } else {
        inquirer
            .prompt([
                {
                    name: 'confirm',
                    message: `是否从上次中断的地方继续阅读？`.blue,
                    type: 'confirm',
                },
            ])
            .then(async ({ confirm }) => {
                if (confirm) {
                    readContent(record.lastPage, record.pageText, 2);
                } else {
                    await clearRecord(tempPath, hash);
                    startNewReading();
                }
            })
            .catch((error) => {
                console.log(error.toString());
            });
    }
};

export default chapterReader;

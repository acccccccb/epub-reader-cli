import fs from 'fs';
import contentReader from './contentReader.js';
import { DOMParser } from 'xmldom';
import inquirer from 'inquirer';
import pager from './pager.js';
import { clearRecord, readRecord } from './record.js';
import { clearScreen, getTempPath } from './tools.js';

const encode = 'utf-8';

const chapterReader = async (
    cfg = {
        hash: '',
        jumpOver,
    }
) => {
    const { jumpOver } = cfg;
    if (!cfg.hash) {
        console.error('hash can not empty');
        process.exit(0);
    }
    const { hash } = cfg;
    const tempPath = getTempPath(cfg.hash);
    const containerPath = `${tempPath}/META-INF/container.xml`;
    // 读取container文件
    const containerXml = fs.readFileSync(`${containerPath}`, encode);
    const containerXmlNode = new DOMParser().parseFromString(
        containerXml,
        'text/xml'
    );
    // 读取opf文件
    const opfPath = containerXmlNode
        .getElementsByTagName('rootfile')[0]
        ?.getAttribute('full-path')
        ?.replace('content.opf', '');
    const tocNcx = fs.readFileSync(`${tempPath}/${opfPath}/toc.ncx`, encode);

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
                    const text = nodeFilter(node.childNodes, 1)[0].firstChild;

                    obj.title = text?.data;
                    if (!obj.title) {
                        console.log(obj);
                        process.exit(0);
                    }
                }
                if (node.tagName === 'content') {
                    obj.src = node?.getAttribute('src');
                    if (!obj.src) {
                        console.log(obj);
                        process.exit(0);
                    }
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
                id: item.id,
                name: tab + item.title,
                value: item.id,
                src: item.src,
            });
            if (item.children) {
                loop(item.children, level + 1);
            }
        });
    };
    loop(chapter);

    // fs.writeFileSync(`${tempPath}/chapter.json`, JSON.stringify(arr, null, 4));

    const readContent = (chapter_id, jumpTo = undefined, jumpType = 1) => {
        if (!chapter_id) {
            console.log(`缺少chapter_id ${chapter_id}`);
            process.exit(0);
        }
        const index = arr.findIndex((item) => item.id === chapter_id) || 0;
        global.current_capter = {
            index,
            total: arr.length,
            ...arr.find((item) => item.id === chapter_id),
        };
        if (index >= 0) {
            if (!arr[index]) {
                console.log('章节不存在', chapter_id);
                process.exit(0);
            }
            const prev_chapter_id = arr[index - 1]?.id;
            const current_chapter_id = arr[index]?.id;
            const next_chapter_id = arr[index + 1]?.id;
            contentReader({
                hash: cfg.hash,
                encode: encode,
                chapter_src: arr[index].src,
            }).then((content) => {
                pager({
                    hash: cfg.hash,
                    chapterSrc: arr[index].src,
                    content,
                    prev: () => {
                        if (prev_chapter_id) {
                            readContent(prev_chapter_id, 'end');
                        } else {
                            readContent(current_chapter_id, 'start');
                        }
                    },
                    next: () => {
                        if (next_chapter_id) {
                            const next_chapter_src = arr[index + 1]?.src;
                            readContent(
                                next_chapter_id,
                                next_chapter_src.split('#')[1]
                            );
                        } else {
                            readContent(current_chapter_id, 'end');
                        }
                    },
                    jumpTo,
                    jumpType,
                });
            });
        } else {
            console.log('章节不存在', chapter_id, index);
            process.exit(0);
        }
    };
    const record = await readRecord(hash);

    const startNewReading = () => {
        inquirer
            .prompt([
                {
                    name: 'chapter_id',
                    message: '选择章节'.blue,
                    type: 'list',
                    choices: arr,
                },
            ])
            .then(({ chapter_id }) => {
                const chapter_src = arr.find(
                    (item) => item.id === chapter_id
                )?.src;
                readContent(chapter_id, chapter_src.split('#')[1], 1);
            })
            .catch((err) => {
                clearScreen();
                process.exit(0);
            });
    };
    if (!record || jumpOver) {
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
                    readContent(record.lastPageId, record.pageText, 2);
                } else {
                    await clearRecord(hash);
                    startNewReading();
                }
            })
            .catch((error) => {
                process.exit(0);
            });
    }
};

export default chapterReader;

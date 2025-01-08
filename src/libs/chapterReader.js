import fs from 'fs';
import contentReader from './contentReader.js';
import { DOMParser } from 'xmldom';
import inquirer from 'inquirer';
import pager from './pager.js';
import { clearRecord, readRecord } from './record.js';
import {
    clearScreen,
    getTempPath,
    getOpfPath,
    parserContentOpf,
} from './tools.js';

const chapterReader = async (
    cfg = {
        hash: '',
        jumpOver,
    }
) => {
    const encode = global.$store.get('encode');

    const { jumpOver } = cfg;
    if (!cfg.hash) {
        console.error('hash can not empty');
        process.exit(0);
    }
    const { hash } = cfg;
    const tempPath = getTempPath(cfg.hash);
    // 读取opf文件
    const opfPath = getOpfPath(cfg.hash);

    const ncxPath =
        global.$store.get('manifest').find((item) => item.id === 'ncx')?.src ||
        'toc.ncx';
    const tocNcx = fs.readFileSync(`${tempPath}/${opfPath}/${ncxPath}`, encode);
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
    let chapter = [];

    const parsingNavPoint = (navPoint, pid) => {
        const id = navPoint?.getAttribute('id');
        const playOrder = Number(navPoint?.getAttribute('playOrder'));
        const stuck = nodeFilter(navPoint.childNodes);
        // do while
        const obj = { id, pid, value: id, playOrder };
        do {
            const node = stuck.shift();
            if (node.nodeType === 1) {
                if (node.tagName === 'navLabel') {
                    const text = nodeFilter(node.childNodes, 1)[0].firstChild;

                    obj.name = text?.data;
                    if (!obj.name) {
                        console.log(obj);
                        process.exit(0);
                    }
                }
                if (node.tagName === 'content') {
                    obj.src = node?.getAttribute('src');
                    if (!obj.src) {
                        console.log('parsingNavPoint', obj);
                        process.exit(0);
                    }
                    const finder = chapter.find(
                        (findItem) => findItem.id === id
                    );
                    if (!finder) {
                        chapter.push(obj);
                    }
                    for (
                        let j = 0;
                        j < node.parentNode.childNodes.length;
                        j++
                    ) {
                        const childItem = node.parentNode.childNodes[j];
                        if (childItem.tagName === 'navPoint') {
                            parsingNavPoint(childItem, id);
                        }
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

    chapter.forEach((item) => {
        if (item.pid === 0) {
            item.level = 0;
            item.name = `【${item.name}】`;
        } else {
            item.level =
                chapter.find((item2) => item2.id === item.pid).level + 1;
            item.name = `${' '.repeat(item.level)} ${item.name}`;
        }
    });

    // fs.writeFileSync(
    //     `${tempPath}/chapter.json`,
    //     JSON.stringify(chapter, null, 4)
    // );

    const readContent = (chapter_id, jumpTo = undefined, jumpType = 1) => {
        if (!chapter_id) {
            console.log(`缺少chapter_id ${chapter_id}`);
            process.exit(0);
        }
        const index = chapter.findIndex((item) => item.id === chapter_id) || 0;

        global.$store.set('current_capter', {
            index,
            total: chapter.length,
            ...chapter.find((item) => item.id === chapter_id),
        });
        if (index >= 0) {
            if (!chapter[index]) {
                console.log('章节不存在', chapter_id);
                process.exit(0);
            }
            const prev_chapter_id = chapter[index - 1]?.id;
            const current_chapter_id = chapter[index]?.id;
            const next_chapter_id = chapter[index + 1]?.id;

            contentReader({
                hash: cfg.hash,
                encode: encode,
                chapter_src: chapter[index].src,
            }).then((content) => {
                pager({
                    hash: cfg.hash,
                    chapterSrc: chapter[index].src,
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
                            const next_chapter_src = chapter[index + 1]?.src;
                            readContent(
                                next_chapter_id,
                                next_chapter_src.split('#')[1]
                            );
                        } else {
                            readContent(current_chapter_id, 'end');
                            console.log('end');
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
    // 将chapter写入文件
    // fs.writeFileSync(`${tempPath}/chapter.json`, JSON.stringify(chapter, null, 4));
    const { spine } = parserContentOpf(cfg.hash);

    global.$store.set('chapter', chapter);

    const startNewReading = () => {
        inquirer
            .prompt([
                {
                    name: 'chapter_id',
                    message: '选择章节'.blue,
                    type: 'list',
                    choices: chapter,
                    loop: false,
                },
            ])
            .then(({ chapter_id }) => {
                const chapter_src = chapter.find(
                    (item) =>
                        item.id === chapter_id || item.value === chapter_id
                )?.value;
                readContent(chapter_id, chapter_src.split('#')[1], 1);
            })
            .catch((err) => {
                clearScreen();
                // console.log(err.toString());
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
                    startNewReading();
                }
            })
            .catch((error) => {
                clearScreen();
                process.exit(0);
            });
    }
};

export default chapterReader;

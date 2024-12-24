import unzipper from 'unzipper';
import fs from 'fs';
import contentReader from './contentReader.js';
import { DOMParser } from 'xmldom';
import inquirer from 'inquirer';
// import pager from 'node-pager';
import pager from './pager.js';
import colors from 'colors';
import { exec } from 'child_process';
import iconv from 'iconv-lite';
import buffer from 'buffer';

const chapterReader = (cfg={
    filePath: '',
    encode: 'utf-8',
}) => {
    const tempPath = `${cfg.filePath}.tmp`;
    const containerPath = `${cfg.filePath}.tmp/META-INF/container.xml`;
    // 读取container文件
    const containerXml = fs.readFileSync(`${containerPath}`, cfg.encode);
    const containerXmlNode = new DOMParser().parseFromString(containerXml, 'text/xml');
// 读取opf文件
    const opfPath = containerXmlNode.getElementsByTagName('rootfile')[0]?.getAttribute('full-path')?.replace('content.opf', '');
    const tocNcx = fs.readFileSync(`${tempPath}/${opfPath}/toc.ncx`, cfg.encode);

    const nodeFilter = (nodeList, nodeType=1) => {
        const list = [];
        for(let i = 0; i < nodeList.length; i++) {
            if(nodeList[i].nodeType === nodeType) {
                list.push(nodeList[i]);
            }
        }
        return list;
    }

    const tocNcxNode = new DOMParser().parseFromString(tocNcx, 'text/xml');
    const navPointList = nodeFilter(tocNcxNode.getElementsByTagName('navMap')[0].childNodes);
    const chapter = [];

    const parsingNavPoint = (navPoint, pid) => {
        const id = navPoint?.getAttribute('id');
        const stuck = nodeFilter(navPoint.childNodes);
        // do while
        const obj = {id, pid};
        do  {
            const node = stuck.shift();
            if(node.nodeType === 1) {
                if(node.tagName === 'navLabel') {
                    const text = nodeFilter(node.childNodes[1].childNodes, 3)[0];
                    obj.title = text?.data;
                }
                if(node.tagName === 'content') {
                    obj.src = node?.getAttribute('src');
                    if(pid === 0) {
                        chapter.push(obj);
                    } else {
                        chapter.forEach(item => {
                            if(item.id === pid) {
                                item.children = item.children || [];
                                item.children.push(obj);
                            }
                        })
                    }
                }

                if(node.tagName === 'navPoint') {
                    parsingNavPoint(node, id);
                }
            }
        } while(stuck.length !== 0)
    }

    for(let i=0;i<navPointList.length;i++) {
        parsingNavPoint(navPointList[i], 0);
    }
// 储存json字符串到文件
    fs.writeFileSync(`${tempPath}/chapter.json`, JSON.stringify(chapter, null, 4));

    const arr = [];
    const loop = (list, level=0) => {
        list.forEach(item => {
            let tab = '';
            for(let i=0;i<level;i++) {
                tab+='  '
            }
            arr.push({
                name: tab + item.title['green'],
                value: item.src.split('#')[0],
            })
            if(item.children) {
                loop(item.children, level + 1);
            }
        })
    }
    loop(chapter);
    inquirer
        .prompt([
            {
                name: 'chapter_src',
                message: '选择章节'.blue,
                type: 'rawlist',
                choices: arr,
            },
        ])
        .then(({chapter_src}) => {
            const readContent = (src) => {
                contentReader({
                    filePath: cfg.filePath,
                    encode: cfg.encode,
                    chapter_src: src,
                }).then(content => {
                    pager(content, (res) => {
                        if(res) {
                            for (let i=0;i<=arr.length;i++) {
                                if(arr[i]?.value === src && arr[i + 1]) {
                                    readContent(arr[i + 1].value);
                                    break;
                                }
                            }
                        } else {
                            for (let i=0;i<=arr.length;i++) {
                                if(arr[i]?.value === src && arr[i - 1]) {
                                    readContent(arr[i - 1].value);
                                    break;
                                }
                            }
                        }
                    });
                })
            }
            readContent(chapter_src);
        })
        .catch((error) => {
            console.log(error.toString());
        });

    return chapter;
}

export default chapterReader;

import os from 'os';
import fs from 'fs';
import path from 'path';
import { WritableStream } from 'htmlparser2/lib/WritableStream';
import { spawn } from 'child_process';
import { DOMParser } from 'xmldom';

const contentReader = async (
    cfg = {
        tempPath: '',
        encode: 'utf-8',
        chapter_src: '',
    }
) => {
    if (!cfg.tempPath) process.exit(0);
    process.stdout.write('加载中...');
    // 读取 HTML 文件
    const tempPath = cfg.tempPath;
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

    let isInBody = false;
    let textContent = '';

    const chapter_src = cfg.chapter_src.split('#')[0];
    const chapter_id = cfg.chapter_src.split('#')[1];

    return new Promise((resolve, reject) => {
        const parser = new WritableStream({
            onopentag(name, attributes) {
                if (name === 'body') isInBody = true;
            },
            onattribute(name, value) {
                if (name === 'id' && isInBody) {
                    textContent += `\r\n[#${value}/#]\r\n`;
                }
            },
            ontext(text) {
                if (isInBody) {
                    textContent += text.replace(/\s+/g, '');
                }
            },
            onclosetag(name) {
                if (name === 'body') isInBody = false; // 退出 <body> 标签
                if (['p', 'h1', 'h2', 'h3', 'h4', 'h5'].includes(name))
                    textContent += '\r\n';
            },
        });
        const htmlStream = fs
            .createReadStream(`${tempPath}/${opfPath}/${chapter_src}`, {
                encoding: cfg.encode,
            })
            .pipe(parser)
            .on('finish', () => {
                // fs.writeFileSync(`${tempPath}/reader.tmp`, textContent);
                // resolve(`${tempPath}/reader.tmp`);
                resolve(`${textContent}`);
            });
    });
};
export default contentReader;

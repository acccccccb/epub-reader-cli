import fs from 'fs';
import { WritableStream } from 'htmlparser2/lib/WritableStream';
import { DOMParser } from 'xmldom';
import { getTempPath } from './tools.js';

const encode = 'utf-8';
const contentReader = async (
    cfg = {
        hash: '',
        chapter_src: '',
    }
) => {
    if (!cfg.hash) {
        console.log('hash can not empty');
        process.exit(0);
    }
    process.stdout.write('加载中...');
    // 读取 HTML 文件
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

    let isInBody = false;
    let textContent = '';

    if (!cfg.chapter_src) {
        console.log('chapter_src can not empty');
        process.exit(0);
    }
    const chapter_src = cfg.chapter_src.split('#')[0];

    const chapter_id = cfg.chapter_src.split('#')[1];

    return new Promise((resolve) => {
        const parser = new WritableStream({
            onopentag(name, attributes) {
                if (name === 'body') isInBody = true;
                if (name === 'img' && isInBody) {
                    textContent += `\r\n图片(${attributes.src})`;
                }
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
                if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'img'].includes(name))
                    textContent += '\r\n';
            },
        });

        fs.createReadStream(`${tempPath}/${opfPath}/${chapter_src}`, {
            encoding: encode,
        })
            .pipe(parser)
            .on('finish', () => {
                // fs.writeFileSync(`${tempPath}/reader.tmp`, textContent);
                // resolve(`${tempPath}/reader.tmp`);
                if (!chapter_id) {
                    resolve(`${textContent}`);
                } else {
                    const startIndex = textContent.indexOf(
                        `[#${chapter_id}/#]`
                    );
                    // 提取id之后的字符串
                    if (startIndex !== -1) {
                        let result = textContent.substring(startIndex);

                        // 从下一个id截断
                        const regex = /\[#([\w_]+)\/#]/g;
                        const start = 0;
                        let end = -1;
                        for (const match of result.matchAll(regex)) {
                            end = match.index;
                            if (end !== start && end !== 0) {
                                break;
                            }
                        }
                        if (end > 0) {
                            result = result.substring(0, end || undefined);
                        }
                        resolve(`${result}`);
                    } else {
                        resolve(`${textContent}`);
                    }
                }
            });
    });
};
export default contentReader;

import fs from 'fs';
import path from 'path';
import { WritableStream } from 'htmlparser2/lib/WritableStream';
import { DOMParser } from 'xmldom';
import { cleanText, getOpfPath, getTempPath } from './tools.js';
const contentReader = async (
    cfg = {
        hash: '',
        chapter_src: '',
    }
) => {
    const encode = global.$store.get('encode');

    if (!cfg.hash) {
        console.log('hash can not empty');
        process.exit(0);
    }
    process.stdout.write('加载中...');
    // 读取 HTML 文件
    const tempPath = getTempPath(cfg.hash);
    // 读取opf文件
    const opfPath = getOpfPath(cfg.hash);
    let isInBody = false;
    let textContent = '';

    if (!cfg.chapter_src) {
        console.log('chapter_src can not empty');
        process.exit(0);
    }
    const chapter_src = cfg.chapter_src.split('#')[0];

    const chapter_id = cfg.chapter_src.split('#')[1];

    return new Promise((resolve) => {
        const chapterPath = path.normalize(
            `${tempPath}/${opfPath}/${chapter_src}`
        );

        // 判断chapter_src是否存在
        if (!fs.existsSync(chapterPath)) {
            resolve('内容为空');
            return;
        }

        const parser = new WritableStream({
            async onopentag(name, attributes) {
                if (name === 'body') isInBody = true;
                if (name === 'img' && isInBody) {
                    textContent += `\r\n图片(${attributes.src})`;
                }
                if (name === 'svg' && isInBody) {
                    textContent += `\r\n[svg]`;
                }
            },
            onattribute(name, value) {
                if (name === 'id' && isInBody) {
                    // 判断id是否出现在目录中
                    const chapter = global.$store.get('chapter');

                    const finder = chapter.find((item) =>
                        item.src.includes(value)
                    );
                    if (finder) {
                        textContent += `\r\n[#${value}/#]\r\n`;
                    }
                }
            },
            ontext(text) {
                if (isInBody) {
                    textContent += text.trimEnd();
                }
            },
            onclosetag(name) {
                if (name === 'body') isInBody = false; // 退出 <body> 标签
                if (
                    [
                        'p',
                        'h1',
                        'h2',
                        'h3',
                        'h4',
                        'h5',
                        'div',
                        'img',
                        'svg',
                    ].includes(name)
                )
                    textContent += '\r\n';
            },
        });

        fs.createReadStream(chapterPath, {
            encoding: encode,
        })
            .pipe(parser)
            .on('finish', () => {
                // fs.writeFileSync(
                //     `${tempPath}/reader.tmp`,
                //     textContent.trimStart()
                // );
                // resolve(`${tempPath}/reader.tmp`);
                if (!chapter_id) {
                    const regex = /\[#([\w_]+)\/#\]/; // 匹配 [#.../#] 模式，其中 ... 是动态内容
                    const match = textContent.trimStart().match(regex);
                    if (match) {
                        const text = textContent.substring(0, match.index);
                        resolve(`${textContent.substring(0, match.index)}`);
                    } else {
                        resolve(textContent);
                    }
                } else {
                    const startIndex = textContent.indexOf(
                        `[#${chapter_id}/#]`
                    );
                    // 提取id之后的字符串
                    if (startIndex !== -1) {
                        let result = textContent.substring(startIndex);

                        // 从下一个id截断
                        const regex = /\[#([\w_]+)\/#\]/g;
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

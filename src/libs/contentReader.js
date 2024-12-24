import fs from 'fs';
import path from 'path';
import {WritableStream} from 'htmlparser2/lib/WritableStream';
import { spawn } from 'child_process'
import {DOMParser} from "xmldom";

const contentReader = async (cfg = {
    filePath: '',
    encode: 'utf-8',
    chapter_src: ''
}) => {
    // 读取 HTML 文件
    const tempPath = `${cfg.filePath}.tmp`;
    const containerPath = `${cfg.filePath}.tmp/META-INF/container.xml`;
    // 读取container文件
    const containerXml = fs.readFileSync(`${containerPath}`, cfg.encode);
    const containerXmlNode = new DOMParser().parseFromString(containerXml, 'text/xml');
// 读取opf文件
    const opfPath = containerXmlNode.getElementsByTagName('rootfile')[0]?.getAttribute('full-path')?.replace('content.opf', '');

    let isInBody = false;
    let textContent = "";


    const chapter_src = cfg.chapter_src.split('#')[0];

    return new Promise((resolve, reject) => {
        const parser = new WritableStream({
            onopentag(name) {
                if (name === "body") isInBody = true; // 进入 <body> 标签
            },
            ontext(text) {
                if (isInBody) textContent += text.replace(/\s+/g, "").trim();
            },
            onclosetag(name) {
                if (name === "body") isInBody = false; // 退出 <body> 标签
                if (['p','h1','h2','h3','h4','h5'].includes(name)) textContent += '\r\n';
            },
        });
        const htmlStream = fs.createReadStream(`${tempPath}/${opfPath}/${chapter_src}`, { encoding: cfg.encode }).pipe(parser)
            .on("finish", () => {
                fs.writeFileSync(`${tempPath}/reader.tmp`, textContent);
                // resolve(`${tempPath}/reader.tmp`);
                resolve(`${textContent}`);
            });
    })
}
export default contentReader;

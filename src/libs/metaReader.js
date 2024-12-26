import unzipper from 'unzipper';
import fs from 'fs';
import { DOMParser } from 'xmldom';
import path from 'path';
import os from 'os';

// 元数据解析器
const metaReader = async (
    cfg = {
        tempPath: null,
        encode: 'utf-8',
    }
) => {
    if (!cfg.tempPath) process.exit(0);
    const tempPath = cfg.tempPath;
    const containerPath = `${tempPath}/META-INF/container.xml`;
    const meta = {};

    // 读取container文件
    const containerXml = fs.readFileSync(`${containerPath}`, cfg.encode);
    const containerXmlNode = new DOMParser().parseFromString(
        containerXml,
        'text/xml'
    );
    // 读取opf文件
    const opfPath = containerXmlNode
        .getElementsByTagName('rootfile')[0]
        ?.getAttribute('full-path');

    const contentOpf = fs.readFileSync(`${tempPath}/${opfPath}`, cfg.encode);
    // 解析opf文件
    const contentOpfXml = new DOMParser().parseFromString(
        contentOpf,
        'text/xml'
    );
    const metadatas = contentOpfXml.getElementsByTagName('metadata');

    if (metadatas.length > 0) {
        for (let i = 0; i < metadatas[0].childNodes.length; i++) {
            const node = metadatas[0].childNodes[i];
            const nodeName = node.nodeName;
            switch (nodeName) {
                case 'dc:contributor':
                    meta.contributor = node.firstChild.nodeValue;
                    break;
                case 'dc:creator':
                    meta.creator = node.firstChild.nodeValue;
                    break;
                case 'dc:publisher':
                    meta.publisher = node.firstChild.nodeValue;
                    break;
                case 'dc:title':
                    meta.title = node.firstChild.nodeValue;
                    break;
                case 'dc:language':
                    meta.language = node.firstChild.nodeValue;
                    break;
                case 'dc:date':
                    meta.date = node.firstChild.nodeValue;
                    break;
                default:
                    break;
            }
        }
    }
    return meta;
};
export default metaReader;

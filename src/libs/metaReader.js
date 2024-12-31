import fs from 'fs';
import { DOMParser } from 'xmldom';
import { getTempPath } from './tools.js';

const encode = 'utf-8';
// 元数据解析器
const metaReader = async (
    cfg = {
        hash: null,
    }
) => {
    if (!cfg.hash) {
        console.log('hash can not empty');
        process.exit(0);
    }
    const tempPath = getTempPath(cfg.hash);
    const containerPath = `${tempPath}/META-INF/container.xml`;
    const meta = {};

    // 读取container文件
    const containerXml = fs.readFileSync(`${containerPath}`, encode);
    const containerXmlNode = new DOMParser().parseFromString(
        containerXml,
        'text/xml'
    );
    // 读取opf文件
    const opfPath = containerXmlNode
        .getElementsByTagName('rootfile')[0]
        ?.getAttribute('full-path');
    global.opfPath = opfPath;
    const contentOpf = fs.readFileSync(`${tempPath}/${opfPath}`, encode);
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
    global.meta = meta;
    return meta;
};
export default metaReader;

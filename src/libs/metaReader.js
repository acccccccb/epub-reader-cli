import unzipper from 'unzipper';
import fs from 'fs';
import { DOMParser } from 'xmldom';

// 元数据解析器
const metaReader = async (cfg={
    filePath: null,
    encode: 'utf-8',
}) => {
    const tempPath = `${cfg.filePath}.tmp`;
    const containerPath = `${cfg.filePath}.tmp/META-INF/container.xml`;
    const meta = {};

    const buffer = fs.readFileSync(cfg.filePath);
    const directory = await unzipper.Open.buffer(buffer);
    await directory.extract({path: tempPath});

    process.on('exit', (code) => {
        try {
            fs.rmSync(`${tempPath}`, { recursive: true, force: true });
        } catch (err) {
            console.error('Error while deleting folder:', err);
        }
    });
    process.on('SIGINT', () => {
        process.exit(0); // 必须调用 `process.exit()` 结束进程
    });

// 读取container文件
    const containerXml = fs.readFileSync(`${containerPath}`, cfg.encode);
    const containerXmlNode = new DOMParser().parseFromString(containerXml, 'text/xml');
// 读取opf文件
    const opfPath = containerXmlNode.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
    const contentOpf = fs.readFileSync(`${tempPath}/${opfPath}`, cfg.encode);
// 解析opf文件
    const contentOpfXml = new DOMParser().parseFromString(contentOpf, 'text/xml');
    const metadatas = contentOpfXml.getElementsByTagName('metadata');

    if(metadatas.length > 0) {
        for(let i=0; i<metadatas[0].childNodes.length; i++) {
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
}
export default metaReader;

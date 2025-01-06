import path from 'path';
import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import 'colors';
import { DOMParser } from 'xmldom';

export const getTempPath = (hash, suffix) => {
    if (hash) {
        return path.join(os.tmpdir(), '.epub-reader-cli', hash);
    }
    if (hash && suffix) {
        return path.join(os.tmpdir(), '.epub-reader-cli', hash, suffix);
    }
    return path.join(os.tmpdir(), '.epub-reader-cli');
};
export const getHash = (filePath) => {
    return new Promise((resolve) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => {
            hash.update(chunk);
        });
        stream.on('end', () => {
            const fileHash = hash.digest('hex');
            resolve(fileHash);
        });
    });
};
export const clearScreen = () => {
    process.stdout.write(
        process.platform === 'win32' ? '\x1Bc' : '\x1B[2J\x1B[3J\x1B[H'
    );
};

export const cleanText = (text) => {
    return text.replace(/[\x00-\x1F\x7F]/g, '');
};

export const colorText = (text, colorCode) => {
    return `\x1b[${colorCode}m${cleanText(text)}\x1b[0m`;
};

export const getOpfPath = (hash) => {
    const tempPath = getTempPath(hash);
    const containerPath = `${tempPath}/META-INF/container.xml`;
    // 读取container文件
    const containerXml = fs.readFileSync(`${containerPath}`, 'utf-8');
    const containerXmlNode = new DOMParser().parseFromString(
        containerXml,
        'text/xml'
    );
    // 读取opf文件
    const opfPath = containerXmlNode
        .getElementsByTagName('rootfile')[0]
        ?.getAttribute('full-path')
        ?.replace('content.opf', '');
    global.$store.set('opfPath', opfPath);
    return opfPath;
};

export const parserContentOpf = (hash) => {
    const tempPath = getTempPath(hash);
    const meta = {};
    const opfPath = getOpfPath(hash);
    global.$store.set('opfPath', opfPath);
    const contentOpf = fs.readFileSync(
        `${tempPath}/${opfPath}/content.opf`,
        'utf-8'
    );
    // 解析opf文件
    const contentOpfXml = new DOMParser().parseFromString(
        contentOpf,
        'text/xml'
    );

    const epubVersion = contentOpfXml
        .getElementsByTagName('package')[0]
        ?.getAttribute('version');
    meta.epubVersion = epubVersion;

    const metadatas = contentOpfXml.getElementsByTagName('metadata');

    if (metadatas.length > 0) {
        for (let i = 0; i < metadatas[0].childNodes.length; i++) {
            const node = metadatas[0].childNodes[i];
            const nodeName = node.nodeName;
            switch (nodeName) {
                case 'dc:contributor':
                    meta.contributor = node.firstChild.nodeValue;
                    break;
                case 'dc:description':
                    meta.description = node.firstChild.nodeValue
                        .replace(/<\/?[^>]+(>|$)/g, '')
                        .replace(/\s+/g, '');
                    break;
                case 'dc:creator':
                    const creator = meta.creator || [];
                    creator.push(node.firstChild.nodeValue);
                    meta.creator = creator;
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
                case 'dc:subject':
                    const subject = meta.subject || [];
                    subject.push(node.firstChild.nodeValue);
                    meta.subject = subject;
                    break;
                case 'dc:identifier':
                    const identifier = meta.identifier || [];
                    const scheme = node.getAttribute('opf:scheme');
                    identifier.push({
                        scheme,
                        content: node.firstChild.nodeValue,
                    });
                    meta.identifier = identifier;
                    break;
                default:
                    break;
            }
        }
    }

    const manifestData = contentOpfXml.getElementsByTagName('manifest');
    const manifest = [];
    for (let i = 0; i < manifestData.length; i++) {
        const item = manifestData[i];
        for (let j = 0; j < item.childNodes.length; j++) {
            const node = item.childNodes[j];
            if (node.nodeType === 1) {
                const mediaType = node.getAttribute('media-type');
                const id = node.getAttribute('id');
                const src = node.getAttribute('href');
                manifest.push({ id, src, mediaType });
            }
        }
    }

    const spineData = contentOpfXml.getElementsByTagName('spine');
    const spine = [];
    for (let i = 0; i < spineData.length; i++) {
        const item = spineData[i];
        for (let j = 0; j < item.childNodes.length; j++) {
            const node = item.childNodes[j];
            if (node.nodeType === 1) {
                const idref = node.getAttribute('idref');
                const spineItem = manifest.find((item) => item.id === idref);
                if (spineItem) {
                    spine.push(spineItem);
                }
            }
        }
    }
    const guideData = contentOpfXml.getElementsByTagName('guide');
    const guide = [];
    for (let i = 0; i < guideData.length; i++) {
        const item = guideData[i];
        for (let j = 0; j < item.childNodes.length; j++) {
            const node = item.childNodes[j];
            if (node.nodeType === 1) {
                const src = node.getAttribute('href');
                const type = node.getAttribute('type');
                guide.push({
                    manifest_id: manifest.find(
                        (findItem) => findItem.src === src
                    )?.manifest_id,
                    src,
                    type,
                });
            }
        }
    }

    // fs.writeFileSync(
    //     `${tempPath}/manifest.json`,
    //     JSON.stringify(manifest, null, 4)
    // );
    // fs.writeFileSync(`${tempPath}/spine.json`, JSON.stringify(spine, null, 4));
    // fs.writeFileSync(`${tempPath}/guide.json`, JSON.stringify(guide, null, 4));
    //
    global.$store.set('meta', meta);
    global.$store.set('manifest', manifest);
    global.$store.set('spine', spine);
    global.$store.set('guide', guide);
    global.$store.set('epubVersion', epubVersion);
    return {
        meta,
        manifest,
        spine,
        guide,
    };
};

export const getBookList = (deep = 0) => {
    const files = [];

    const readDir = (filePath, level) => {
        const arr = fs.readdirSync(filePath);
        const dirs = [];
        arr.forEach((item) => {
            const itemPath = path.resolve(filePath, item);
            if (fs.existsSync(itemPath)) {
                const stats = fs.statSync(itemPath);
                if (stats.isDirectory()) {
                    dirs.push(itemPath);
                } else {
                    if (itemPath.match(/.epub$/) && stats.isFile()) {
                        files.push(itemPath);
                    }
                }
            }
        });
        if (dirs.length > 0 && level < deep) {
            dirs.forEach((item) => {
                readDir(path.resolve(item), level + 1);
            });
        }
    };
    readDir('./', 0);
    return files;
};

export const getCacheBookList = () => {
    const tempPath = getTempPath();
    const arr = fs.readdirSync(getTempPath());
    return arr.filter((item) => {
        const itemPath = path.resolve(tempPath, item);
        // 判断是文件还是文件夹
        const stats = fs.statSync(itemPath);
        return stats.isDirectory();
    });
};

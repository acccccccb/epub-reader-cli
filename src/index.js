import unzipper from 'unzipper';
import fs from 'fs';
import path from 'path';
import { DOMParser } from 'xmldom';
import metaReader from './libs/metaReader.js';
import chapterReader from './libs/chapterReader.js';
import contentReader from './libs/contentReader.js';


const rootPath = path.resolve() + '/src/books';
// const ebookPath = 'The Gods Themselves.epub';
// const ebookPath = 'WuDuGuEr.epub';
const ebookPath = 'Bing Yu Huo Zhi Ge 1-5Juan (Quan 15Ce ) - Qiao Zhi  R_R_Ma Ding (Martin.G.R.R.).epub';
// 匹配反斜杠替换为正斜杠

const filePath = `${rootPath}/${ebookPath}`.replace(/\\/g, '/');
const encode = 'utf-8';

metaReader({
    filePath,
    encode,
}).then(meta => {
    console.table(meta);
    const chapter = chapterReader({
        filePath,
        encode,
    });
})


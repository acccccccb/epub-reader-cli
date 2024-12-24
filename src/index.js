import unzipper from 'unzipper';
import fs from 'fs';
import path from 'path';
import { DOMParser } from 'xmldom';
import metaReader from './libs/metaReader.js';
import chapterReader from './libs/chapterReader.js';
import contentReader from './libs/contentReader.js';
import pager from './libs/pager.js';


const rootPath = path.resolve() + '/src/books';
// const ebookPath = 'The Gods Themselves.epub';
// const ebookPath = 'WuDuGuEr.epub';
// const ebookPath = 'Bing Yu Huo Zhi Ge 1-5Juan (Quan 15Ce ) - Qiao Zhi  R_R_Ma Ding (Martin.G.R.R.).epub';
// const ebookPath = '2001：太空漫游 (阿瑟·克拉克) (Z-Library).epub';
const ebookPath = '魔法学徒 (蓝晶) (Z-Library).epub';
// 匹配反斜杠替换为正斜杠

const filePath = `${rootPath}/${ebookPath}`.replace(/\\/g, '/');
const encode = 'utf-8';
//
metaReader({
    filePath,
    encode,
}).then(meta => {
    // console.table(meta);
    const chapter = chapterReader({
        filePath,
        encode,
    });
})


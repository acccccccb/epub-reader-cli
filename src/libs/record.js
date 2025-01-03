import fs from 'fs';
import path from 'path';
import os from 'os';
import { getTempPath } from './tools.js';
const tempPath = getTempPath();

export const writeRecord = (cfg) => {
    const { hash, chapterSrc, pageText } = cfg;
    const current_capter = global.$store.get('current_capter');
    if (!current_capter) {
        console.log('current_capter', current_capter);
    } else {
        const newRecord = {
            hash,
            pageText: pageText
                .replace(/\x1b\[[\d;]*m/g, '')
                .replace(/[\x00-\x1F\x7F]/g, '')
                .replace(/\s+/g, '')
                .trim(),
            lastPage: chapterSrc,
            lastPageId: current_capter.id,
            lastReadTime: new Date().getTime(),
        };
        global.$store.set('newRecord', newRecord);
        fs.writeFileSync(
            path.join(tempPath, `${hash}.reading`),
            JSON.stringify(newRecord, null, 4)
        );
    }
};
export const readRecord = (hash) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(tempPath, `${hash}.reading`);

        try {
            // 检查文件是否存在
            if (fs.existsSync(filePath)) {
                // 读取文件内容
                const data = fs.readFileSync(filePath, 'utf8');

                // 解析文件内容
                const record = JSON.parse(data);

                // 返回解析后的数据
                return resolve(record);
            } else {
                // 如果文件不存在，返回 null
                resolve();
            }
        } catch (error) {
            console.error('读取记录时发生错误:', error);
            reject();
        }
    });
};

export const clearRecord = (hash) => {
    return new Promise((resolve) => {
        if (hash) {
            const filePath = path.join(tempPath, `${hash}.reading`);
            // 删除文件
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath, { recursive: true, force: true });
            }
            resolve();
        } else {
            const files = fs.readdirSync(tempPath);
            files.forEach((item) => {
                const delPath = path.join(tempPath, item);
                if (fs.existsSync(delPath)) {
                    try {
                        fs.rmSync(delPath, { recursive: true, force: true });
                    } catch (e) {
                        console.log(e?.toString());
                    }
                } else {
                    console.log('文件不存在', delPath);
                }
            });
            resolve();
        }
    });
};

export const clearCacheByHash = (hash) => {
    return new Promise((resolve) => {
        if (hash) {
            const filePath = path.join(tempPath, `${hash}.reading`);
            const bookPath = path.join(tempPath, `${hash}`);
            // 删除文件
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath, { recursive: true, force: true });
            }
            if (fs.existsSync(bookPath)) {
                fs.rmSync(bookPath, { recursive: true, force: true });
            }
        }
        resolve();
    });
};

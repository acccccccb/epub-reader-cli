import fs from 'fs';
import path from 'path';

export const writeRecord = (cfg) => {
    const { tempPath, hash, chapterSrc, pageText } = cfg;
    fs.writeFileSync(
        path.join(path.resolve(tempPath, '../'), `${hash}.reading`),
        JSON.stringify(
            {
                hash,
                pageText: pageText
                    .replace(/\x1b\[[0-9;]*m/g, '')
                    .replace(/[\x00-\x1F\x7F]/g, '')
                    .replace(/\s+/g, '')
                    .trim(),
                lastPage: chapterSrc,
                lastReadTime: new Date().getTime(),
            },
            null,
            4
        )
    );
};
export const readRecord = (tempPath, hash) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(
            path.resolve(tempPath, '../'),
            `${hash}.reading`
        );

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

export const clearRecord = (tempPath, hash) => {
    return new Promise((resolve) => {
        if (!tempPath) process.exit(0);
        const filePath = path.join(
            path.resolve(tempPath, '../'),
            `${hash}.reading`
        );
        // 删除文件
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        resolve();
    });
};

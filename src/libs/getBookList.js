import fs from 'fs';
import path from 'path';

export default (deep = 0) => {
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

    // return files.filter((item) => {
    //     // 判断是文件还是文件夹
    //     const stats = fs.statSync(item);
    //     return item.match(/.epub$/);
    // });
};

import fs from 'fs';
import { DOMParser } from 'xmldom';
import { getOpfPath, getTempPath, parserContentOpf } from './tools.js';

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
    const { meta } = parserContentOpf(cfg.hash);
    // 将meta写入meta.json
    // fs.writeFileSync(
    //     `${getTempPath(cfg.hash)}/meta.json`,
    //     JSON.stringify(meta, null, 4)
    // );
    return meta;
};
export default metaReader;

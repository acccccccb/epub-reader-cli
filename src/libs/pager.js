import stringWidth from 'string-width';
import terminalSize from 'terminal-size';
import { closest } from 'fastest-levenshtein';
import { writeRecord } from './record.js';
import { clearScreen, cleanText, colorText } from './tools.js';
import readline from 'readline';

// content: string; // 定义为 string 类型
// prev?: () => void; // 定义为函数类型，无参数，无返回值
// next?: () => void; // 定义为函数类型，无参数，无返回值

const pager = (cfg) => {
    const { content, prev, next, jumpTo, hash, chapterSrc, jumpType } = cfg;
    // process.exit(0);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true); // 开启原始模式
        process.stdin.resume();
    }
    let binaryEncoding = 'binary';
    // let encoding = 'cp936';
    let encoding = 'utf8';
    let options = {
        encoding: binaryEncoding,
        windowsHide: false,
    };

    let start = 0;
    const { columns, rows } = terminalSize();
    const pageSize = rows - 1;
    const lines = [];
    let line = '';
    for (let i = 0; i <= content.length; i++) {
        const char = content[i];
        if (i === content.length) {
            line = cleanText(line);
            line && lines.push(line);
            line = '';
        }
        if (char === '\r\n' || char === '\n' || char === '\r') {
            line = cleanText(line);
            line && lines.push(line);
            line = '';
        } else {
            line += char;
        }
        if (stringWidth(line) >= columns - 2) {
            line = cleanText(line);
            line && lines.push(line);
            line = '';
        }
    }
    switch (jumpTo) {
        case 'start':
            start = 0;
            break;
        case 'end':
            start = lines.length - pageSize;
            if (start < 0) {
                start = 0;
            }
            break;
        default:
            if (jumpTo) {
                if (jumpType === 1) {
                    start = 0;
                } else {
                    const maxMatch = closest(jumpTo, lines);
                    start = lines.indexOf(maxMatch) || 0;
                }
            }
            break;
    }

    const total = Math.ceil(lines.length / pageSize);

    const getPageText = (index) => {
        let arr = lines.slice(index, index + pageSize);
        if (arr.length < pageSize) {
            while (arr.length < pageSize) {
                arr.push('');
            }
        }
        return arr
            .map((item) => {
                const regex = /\[#.+?\/#]/;
                if (item.match(regex)) {
                    return colorText('', 32);
                } else {
                    return item;
                }
            })
            .join('\r\n');
    };
    const onKeyPress = (str, key) => {
        if (key.sequence === 'q') {
            clearScreen();
            process.stdin.off('keypress', onKeyPress);
            process.stdout.write('\x1b[?25h');
            process.exit(0);
        }
        // 上一页
        if (key.sequence === '\u001b[5~' || key.sequence === 'z') {
            clearScreen();
            if (start === 0) {
                process.stdin.off('keypress', onKeyPress);
                cfg.prev?.();
            } else {
                start = start - pageSize;
                if (start < 0) {
                    start = 0;
                }
                reader(start);
            }
        }
        // 下一页
        if (key.sequence === '\u001b[6~' || key.sequence === 'x') {
            clearScreen();
            if (start + pageSize <= lines.length - 1) {
                start = start + pageSize;
                reader(start);
            } else {
                process.stdin.off('keypress', onKeyPress);
                cfg.next?.();
            }
        }
    };
    process.stdin.on('keypress', onKeyPress);
    readline.emitKeypressEvents(process.stdin);

    const reader = () => {
        clearScreen();
        const page = Math.ceil(start / pageSize) + 1;
        const pageText = getPageText(start);
        // const current_index = global.current_capter?.index;
        const current_capter_name = global.current_capter?.name;
        const total_capter = global.current_capter?.total;
        const pageInfo = colorText(
            `${current_capter_name} (${page}/${total}) `,
            '32'
        );
        const helpText = colorText(
            ' [上页：PageUp 下页：PageDown 退出：q] ',
            '33'
        );
        // let present = Number(((start + pageSize) / lines.length) * 100).toFixed(
        //     1
        // );
        // if (present > 100) {
        //     present = 100;
        // }
        // present += '%';

        writeRecord({
            hash: cfg.hash,
            chapterSrc: cfg.chapterSrc,
            pageText: pageText,
        });
        process.stdout.write(`${pageInfo}\r\n${pageText}`);
        // process.stdout.write(`${pageText}\r\n${pageInfo} ${present}`);
        // process.stdout.write(`${helpText}${pageInfo}`);
        // console.log(start);
        // console.log(pageSize);
        // console.log(lines.length);
    };
    reader();
};
export default pager;

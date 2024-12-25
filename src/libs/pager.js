import { exec, spawn } from 'child_process';
import iconv from 'iconv-lite';
import buffer from 'buffer';
import stringWidth from 'string-width';
import terminalSize from 'terminal-size';
import colors from 'colors';

import readline from 'readline';

// content: string; // 定义为 string 类型
// prev?: () => void; // 定义为函数类型，无参数，无返回值
// next?: () => void; // 定义为函数类型，无参数，无返回值

const pager = (cfg) => {
    const { content, prev, next, jumpTo } = cfg;
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

    const clearScreen = () => {
        process.stdout.write(process.platform === 'win32' ? '\x1Bc' : '\x1B[2J\x1B[3J\x1B[H');
    }

    const cleanText = (text) => {
        return text.replace(/[\s\x00-\x1F\x7F]/g, '')
    }

    const colorText = (text, colorCode) => `\x1b[${colorCode}m${text}\x1b[0m`;

    let start = 0;
    const {columns, rows} = terminalSize();
    const pageSize = rows - 1;
    const lines = [];
    let line = '';
    for(let i = 0; i<=content.length; i++) {
        const char = content[i];
        if(i === content.length) {
            line = cleanText(line);
            line && lines.push(line);
            line = '';
        }
        if(char === '\r\n' || char === '\n' || char === '\r') {
            line = cleanText(line);
            line && lines.push(line);
            line = '';
        } else  {
            line += char;
        }
        if((stringWidth(line) >= columns - 2)) {
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
            if(start < 0) {
                start = 0;
            }
            break;
        default:
            if(jumpTo) {
                lines.forEach(item => {
                    if(item.indexOf(jumpTo) > -1) {
                        start = lines.indexOf(item) + 1;
                    }
                })
            }
            break;
    }

    const total = Math.ceil(lines.length / pageSize);

    const getPageText = (index) => {
        let arr = lines.slice(index, index + pageSize);
        if(arr.length < pageSize) {
            while(arr.length < pageSize) {
                arr.push('');
            }
        }
        return arr.map(item => {
            const regex = /\[#.+?\/#\]/;
            if(item.match(regex)) {
                return colorText('(章节完)', 32);
            } else {
                return item;
            }
        }).join('\r\n');
    }
    const onKeyPress = (str, key) => {
        if (key.sequence === 'q') {
            clearScreen();
            process.stdin.off('keypress', onKeyPress);
            process.stdout.write('\x1b[?25h');
            process.exit();
        }
        // 上一页
        if (key.sequence === '\u001b[5~') {
            clearScreen();
            start = start - pageSize;
            if(start < 0) {
                process.stdin.off('keypress', onKeyPress);
                cfg.prev?.();
            } else {
                reader(start);
            }
        }
        // 下一页
        if (key.sequence === '\u001b[6~') {
            clearScreen();
            start = start + pageSize;
            if(start > lines.length - 1) {
                process.stdin.off('keypress', onKeyPress);
                cfg.next?.();
            } else {
                reader(start);
            }
        }
    };
    process.stdin.on('keypress', onKeyPress);
    readline.emitKeypressEvents(process.stdin);

    const reader = () => {
        clearScreen();
        const page = Math.ceil((start + 1) / pageSize);
        const pageText = getPageText(start);
        const pageInfo = colorText(` (${page}/${total}) `, '32');
        const helpText = colorText(' [上页：PageUp 下页：PageDown 退出：q] ', '33');
        process.stdout.write(`${pageText}\r\n${pageInfo}`);
        // process.stdout.write(`${helpText}${pageInfo}`);
        // console.log(start);
        // console.log(pageSize);
        // console.log(lines.length);
    }
    reader();
}
export default pager;

import fs from 'fs';

export default () => {
    const files = fs.readdirSync('./');
    return files.filter((item) => {
        return item.match(/.epub$/);
    });
};

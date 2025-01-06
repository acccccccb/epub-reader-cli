# epub-reader-cli

> 在命令行中读取 epub 文件

## 使用方法

### 安装

```bash
npm i -g epub-reader-cli
```

### 调试

```bash
npm i -g https://github.com/acccccccb/epub-reader-cli.git
cd epub-reader-cli
npm link
```

### 列出当前目录下的 epub 文件

```bash
erc
```

### 列出当前目录下的 epub 文件，并递归查找子目录下的 epub 文件 [level] 递归层级

```bash
erc -d 1
erc --deep 1
```

### 列出缓存目录下的 epub 文件

```bash
erc -c
erc --cache
```

### 打开指定的 epub 文件

```bash
erc <epub_file_path>
```

### 清除指定阅读进度和缓存

```bash
erc clear-cache
erc cc
```

### 清除所有阅读进度和缓存

```bash
erc clear-cache --all
erc cc -a
```

### 阅读快捷键

-   翻页：`PageUp`/`PageDown` `z`/`x`
-   上一章/下一章：`,`/`.`
-   返回目录：`b`
-   回到章节开始：`home`
-   回到章节末尾：`end`
-   关闭书籍并删除缓存和阅读记录：`delete`
-   退出：`q` / `ctrl+c`

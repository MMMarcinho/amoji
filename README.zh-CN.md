![Amoji README 头图](assets/readme-header.png)

# amoji

面向 AI agents 的 emoji / 表情包管理器：收集、创建并搜索保存在本地的自定义贴纸。

[English](README.md)

## 安装

### 全局安装（推荐用于 CLI）

```bash
npm install -g amoji
```

安装后，可以在任意位置使用 `amoji` 命令：

```bash
amoji list
amoji search "happy"
```

### 本地安装（作为库使用）

```bash
npm install amoji
```

```js
const { getStickers, searchStickers } = require("amoji");
```

### 环境要求

Node.js >= 20，支持常见平台（Windows / macOS / Linux，x64 或 arm64）。  
`better-sqlite3` 会为所有受支持的 Node 版本提供预构建二进制文件，正常使用时不需要本地编译工具链。

如果你使用不常见的 CPU 架构，或使用从源码构建的 Node，原生模块可能会回退到本地编译：

| 平台 | 回退编译要求 |
|---|---|
| **Windows** | 安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)，并选择 "Desktop development with C++" 工作负载 |
| **macOS** | Xcode Command Line Tools：`xcode-select --install` |
| **Linux** | `build-essential` + `python3`：`sudo apt install build-essential python3` |

### 开发环境

```bash
git clone https://github.com/MMMarcinho/amoji.git
cd amoji
npm install
npm run build
npm link          # 从源码把 `amoji` 链接为全局命令
```

也可以不安装，直接运行源码：

```bash
npx tsx src/index.ts <command>
```

贴纸会存放在 `~/.amoji/`：图片位于 `~/.amoji/images/`，ASCII art 位于 `~/.amoji/ascii/`，数据库位于 `~/.amoji/stickers.db`。

---

## 命令

### 添加贴纸

**添加图片文件：**

```bash
amoji add <name> <file> [-k keywords] [-d description]

amoji add thumbsup ~/Downloads/thumbsup.png -k "approve,yes,good" -d "strong approval"
```

**交互式创建 ASCII art：**

```bash
amoji ascii <name> [-k keywords] [-d description] [-r rows] [-c cols]

amoji ascii shrug -k "whatever,meh" -d "indifferent shrug"
```

使用方向键移动光标，Space/Enter 绘制，`1`–`9`/`0` 选择块字符，`C` 清空当前单元格，`X` 清空全部，`S` 保存，`Q` 不保存退出。

**从文本文件导入 ASCII art：**

```bash
amoji ascii shrug -f path/to/art.txt -k "whatever,meh"
```

---

### 查找贴纸

**搜索** 名称、关键词或描述：

```bash
amoji search <query>

amoji search "happy"
amoji search "approve good"
```

**列出所有贴纸**，也可以按类型过滤：

```bash
amoji list
amoji list --type ascii
amoji list --type image
```

**列出所有关键词** 及其使用次数：

```bash
amoji keywords
```

**最近使用：**

```bash
amoji recent [-n limit]     # 默认 10
```

**最常使用：**

```bash
amoji popular [-n limit]    # 默认 10
```

---

### 使用贴纸

**展示贴纸内容**，并标记为已使用：

```bash
amoji show <name|id>
```

ASCII 贴纸会把内容打印到 stdout。图片贴纸会打印图片文件的绝对路径。

**仅展示元数据**，不会增加使用次数：

```bash
amoji info <name|id>
```

**标记为已使用，并获取结构化输出：**

```bash
amoji use <name|id>            # 文件路径 + 元数据
amoji use <name|id> --base64   # 同时返回 base64 data URI（仅图片）
```

输出为结构化的 `key:value` 行：

- `file:<absolute-path>` — 始终存在
- `type:image|ascii` — 始终存在
- `name:<name>` — 始终存在
- `count:<n>` — 标记使用后的使用次数
- `base64:<data-uri>` — 仅在图片贴纸使用 `--base64` 时出现
- `───` 分隔线，后面跟原始 ASCII art（仅 ASCII）

---

### 编辑贴纸

**设置或替换关键词：**

```bash
amoji tag <name|id> <keywords>

amoji tag thumbsup "approve,yes,great"
```

**追加关键词：**

```bash
amoji tag thumbsup "perfect,nice" --append
```

**设置描述：**

```bash
amoji desc <name|id> <text>

amoji desc thumbsup "enthusiastic approval or agreement"
```

---

### 删除贴纸

```bash
amoji delete <name|id>
```

会同时删除 `~/.amoji/` 中的文件和数据库记录。

---

## 贴纸 ID

每个贴纸都有一个数字 ID。大多数命令都接受名称或 ID：

```bash
amoji show 3
amoji info thumbsup
amoji delete 7
```

---

## 使用提示

- 名称必须唯一。如果添加同名贴纸，会自动在名称后追加时间戳。
- `search` 使用 FTS（全文搜索）。如果没有结果，会自动回退到 `LIKE` 搜索。
- `show` 和 `use` 都会增加使用次数；`info` 不会。
- `use --base64` 会即时编码图片文件并输出 data URI，适合嵌入 HTML/Markdown，而不需要额外的文件服务。

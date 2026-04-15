# @yugu/dev-kit

一个面向 Codex 与 Claude 的开发工具箱仓库。

它不是 `skills.sh` 风格的纯 skill 仓库，而是一个统一分发源，
用来管理并安装以下三类资产：

- `skills/`
- `commands/`
- `rules/`

仓库内置一个 `dev-kit` CLI，可以把这些资产安装到全局目录，
也可以安装到当前项目目录。

## 适用场景

这个仓库主要解决两类问题：

1. 把当前包内置的 `skills / commands / rules` 安装到 Codex 或 Claude
2. 从 Git 仓库的 `tree` 目录链接中安装单个资产目录

如果你只是想把当前包里的内容装上，直接用默认安装命令即可。
如果你要安装某个 Git 仓库里的单独 skill、rule 或 command，
使用 `--git <tree-url>`。

## 当前内容

目前仓库里已经包含：

- `skills/git`
- `skills/git-commit`
- `skills/shadcn-vue`
- `skills/export-rules`
- `skills/file-naming`
- `skills/import-rules`
- `skills/scss-nesting`
- `skills/vue-page-structure`
- `skills/vue3-vue-file-template`
- `commands/git`

## 环境要求

- Node.js `>= 20`
- `pnpm dlx`

## 快速开始

安装当前包里的全部资产：

```bash
pnpm dlx @yugu/dev-kit install
```

如果你想直接进入交互式安装，推荐这样用：

```bash
pnpm dlx @yugu/dev-kit
```

也支持显式写出 `install`：

```bash
pnpm dlx @yugu/dev-kit install
```

如果是在终端里手动执行，且没有传显式参数，CLI 会默认进入交互式安装。
交互模式下可以直接回车使用默认值，也可以在过程中选择 Git 来源并填入 Git tree 链接。

## 安装行为

默认安装行为如下：

- 同时安装到 `codex` 和 `claude`
- 默认安装到全局目录
- 默认安装全部资产类型：`skills + commands + rules`
- 默认使用软链接模式
- 目标已存在时直接覆盖

## 常用命令

安装当前包里的全部资产到全局：

```bash
pnpm dlx @yugu/dev-kit install
```

直接进入交互式安装：

```bash
pnpm dlx @yugu/dev-kit
```

只安装某一类资产：

```bash
pnpm dlx @yugu/dev-kit install --types skills
```

只安装到 Codex：

```bash
pnpm dlx @yugu/dev-kit install --agent codex
```

只安装到 Claude：

```bash
pnpm dlx @yugu/dev-kit install --agent claude
```

安装到当前项目：

```bash
pnpm dlx @yugu/dev-kit install --scope project
```

使用复制模式而不是软链接：

```bash
pnpm dlx @yugu/dev-kit install --mode copy
```

强制使用当前安装包内容作为来源：

```bash
pnpm dlx @yugu/dev-kit install --source package
```

## 从 Git 安装

### Git 目录安装

从 Git tree 链接安装单个目录资产：

```bash
pnpm dlx @yugu/dev-kit install --git \
  https://git.newcapec.cn/02-newcapec/ai/UIService/helper/dev-kit/-/tree/main/skills/export-rules
```

如果你希望通过交互式填写 Git 链接，也可以直接执行：

```bash
pnpm dlx @yugu/dev-kit
```

然后在交互中选择：

1. 来源策略：`git`
2. 输入 Git tree 链接

上面的命令会自动识别出这是一个 `skills/export-rules` 目录，
然后只安装这个 skill。

也支持安装 `rules/...` 或 `commands/...` 目录。
资产类型会从链接路径自动推导，不需要手写 `--types`。

### Git 安装示例

安装一个 skill：

```bash
pnpm dlx @yugu/dev-kit install --git \
  https://git.newcapec.cn/02-newcapec/ai/UIService/helper/dev-kit/-/tree/main/skills/export-rules
```

安装一个 rule 目录：

```bash
pnpm dlx @yugu/dev-kit install --git \
  https://git.newcapec.cn/02-newcapec/ai/UIService/helper/dev-kit/-/tree/main/rules/frontend
```

只安装到 Codex：

```bash
pnpm dlx @yugu/dev-kit install \
  --agent codex \
  --git https://git.newcapec.cn/02-newcapec/ai/UIService/helper/dev-kit/-/tree/main/skills/export-rules
```

安装到当前项目：

```bash
pnpm dlx @yugu/dev-kit install \
  --scope project \
  --git https://git.newcapec.cn/02-newcapec/ai/UIService/helper/dev-kit/-/tree/main/rules/frontend
```

## 参数说明

`install` 命令当前支持以下参数：

- `--agent <all|codex|claude|codex,claude>`
- `--scope <global|project>`
- `--types <skills,commands,rules>`
- `--mode <symlink|copy>`
- `--source <auto|package|git>`
- `--git <tree-url>`

### source 的语义

`--source` 现在只有三种有效值：

- `auto`
  - 默认值
  - 如果传了 `--git`，自动切到 Git 来源
  - 否则使用当前安装包内容
- `package`
  - 强制使用当前安装包内容
- `git`
  - 强制使用 Git 来源
  - 必须搭配 `--git <tree-url>`

### 参数组合规则

以下规则会被严格校验：

- 传入 `--git` 后，不允许再显式传 `--types`
- `--source git` 必须搭配 `--git <tree-url>`
- `--git` 只能和 `--source auto` 或 `--source git` 搭配使用
- `--source package` 不能和 `--git` 同时使用

## Git 链接规则

当前只支持两类 Git tree 链接：

- GitLab：`/-/tree/<ref>/<path>`
- GitHub：`/tree/<ref>/<path>`

链接中的路径必须位于以下目录之一：

- `skills/...`
- `commands/...`
- `rules/...`

资产校验规则如下：

- `skills` 目录下必须存在 `SKILL.md`
- `commands` 目录下必须至少存在一个可分发的 `.md` 文件
- `rules` 目录下必须至少存在一个可分发的 `.md` 文件

如果链接格式不正确、目录不存在，或者目录内容不满足安装条件，
CLI 会直接失败，不会做隐式兜底。

## 安装目标目录

### 全局安装

Codex：

- `~/.codex/skills`
- `~/.codex/commands`
- `~/.codex/rules`

Claude：

- `~/.claude/skills`
- `~/.claude/commands`
- `~/.claude/rules`

### 项目安装

Codex：

- `.agents/skills`
- `.codex/commands`
- `rules`

Claude：

- `.claude/skills`
- `.claude/commands`
- `rules`

## 仓库结构

```text
.
├── bin/          # CLI 入口
├── src/          # 安装器实现
├── skills/       # 可分发 skill 资产
├── commands/     # 可分发 command 资产
├── rules/        # 可分发 rule 资产
└── tests/        # 内置测试
```

## 开发

运行测试：

```bash
pnpm test
```

如果你要本地调试 CLI，直接在仓库根目录执行：

```bash
node ./bin/dev-kit.js install --help
```

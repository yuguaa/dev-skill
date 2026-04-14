# Dev Kit

一个面向 Codex 与 Claude 的开发工具箱仓库。

它不是 `skills.sh` 风格的纯 skill 仓库，而是一个统一分发源，后续可以同时承载：

- `skills/`
- `commands/`
- `rules/`

并通过自带 CLI 安装到不同宿主目录。

## 当前内容

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

## Skill 定位

### git

适合所有泛 Git 场景，偏“总入口”：

- 分支策略
- rebase / stash / undo / conflict
- 常见 Git 命令速查
- Git 提交规范入口

如果你不确定该用哪个 Git skill，默认用 `git`。

### git-commit

适合单一高频场景，偏“专精工具”：

- 根据当前改动生成提交信息
- 输出中文 Conventional Commits 标题
- 在需要时补充 2 到 5 条中文变更说明

如果用户明确是在问“帮我写 commit message”，优先用 `git-commit`。

## 安装

主入口：

```bash
pnpm dlx dev-kit install
```

也支持从 Git 直接执行，只要包入口能被 `pnpm dlx` 拉起即可。

## 安装行为

默认行为：

- 同时安装到 `codex` 和 `claude`
- 默认安装到全局目录
- 默认安装 `skills + commands + rules`
- 默认使用软链接
- 目标已存在时直接覆盖

## 常用命令

安装全部内容到全局：

```bash
pnpm dlx dev-kit install
```

只安装 skills：

```bash
pnpm dlx dev-kit install --types skills
```

只安装到 Codex：

```bash
pnpm dlx dev-kit install --agent codex
```

安装到当前项目：

```bash
pnpm dlx dev-kit install --scope project
```

强制复制而不是软链接：

```bash
pnpm dlx dev-kit install --mode copy
```

## 目标目录

全局安装：

- Codex
  - `~/.codex/skills`
  - `~/.codex/commands`
  - `~/.codex/rules`
- Claude
  - `~/.claude/skills`
  - `~/.claude/commands`
  - `~/.claude/rules`

项目安装：

- Codex
  - `.agents/skills`
  - `.codex/commands`
  - `rules`
- Claude
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

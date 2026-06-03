# dev-skill

一个面向 Codex 与 Claude 的 skills-native 开发工具箱。

这个仓库只分发 `skills/` 目录下的 Skill，不再维护自研安装器、
commands 或 rules 分发逻辑。安装、列出和同步都交给 `skills` CLI。

## 当前 Skill

目前仓库包含：

- `code-convergence-and-abstraction-boundary`
- `export-rules`
- `file-naming`
- `git`
- `git-commit`
- `import-rules`
- `less-nesting`
- `review-code-quality`
- `scss-nesting`
- `shadcn-vue`
- `vue-page-structure`
- `vue3-vue-file-template`

## 安装

安装全部 Skill：

```bash
npx skills add https://github.com/yuguaa/dev-skill.git --all
```

只安装到 Codex：

```bash
npx skills add https://github.com/yuguaa/dev-skill.git --skill '*' --agent codex -y
```

只安装某一个 Skill：

```bash
npx skills add https://github.com/yuguaa/dev-skill.git --skill review-code-quality --agent codex -y
```

使用复制模式安装：

```bash
npx skills add https://github.com/yuguaa/dev-skill.git --skill '*' --agent codex --copy -y
```

## 本地验证

列出当前仓库可安装的 Skill：

```bash
npx skills add . --list --full-depth
```

安装当前本地仓库的全部 Skill：

```bash
npx skills add . --skill '*' --agent codex --copy -y --full-depth
```

安装单个本地 Skill：

```bash
npx skills add . --skill review-code-quality --agent codex --copy -y --full-depth
```

## 仓库结构

```text
.
├── README.md
├── package.json
└── skills/
    ├── git/
    ├── git-commit/
    ├── review-code-quality/
    └── ...
```

每个 `skills/<name>` 目录必须至少包含一个 `SKILL.md`。
如果 Skill 需要额外上下文，可以在同目录下放置 `references/`、
`agents/` 或其他由该 Skill 自己引用的资源。

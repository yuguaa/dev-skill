import { createInterface } from "node:readline/promises";
import { getDefaultTypesOption, hasAssetKind, listAssetKindNames } from "./asset-kinds.js";

const AGENT_CHOICES = [
  { value: "all", label: "同时安装到 Codex 和 Claude" },
  { value: "codex", label: "只安装到 Codex" },
  { value: "claude", label: "只安装到 Claude" },
];

const SCOPE_CHOICES = [
  { value: "global", label: "安装到全局目录" },
  { value: "project", label: "安装到当前项目" },
];

const MODE_CHOICES = [
  { value: "symlink", label: "使用软链接" },
  { value: "copy", label: "直接复制文件" },
];

const SOURCE_CHOICES = [
  { value: "auto", label: "自动选择来源" },
  { value: "package", label: "使用当前安装包内容" },
  { value: "git", label: "使用 Git tree 链接" },
];

const TYPE_CHOICES = [
  { value: getDefaultTypesOption(), label: "安装全部内容" },
  ...listAssetKindNames().map((kindName) => ({
    value: kindName,
    label: `只安装 ${kindName}`,
  })),
  { value: "custom", label: "自定义组合" },
];

function renderChoices(choices, defaultValue) {
  return choices
    .map((choice, index) => {
      const suffix = choice.value === defaultValue ? "（默认）" : "";
      return `  ${index + 1}. ${choice.label} [${choice.value}]${suffix}`;
    })
    .join("\n");
}

async function promptChoice({ rl, output, title, choices, defaultValue }) {
  while (true) {
    output.write(`\n${title}\n${renderChoices(choices, defaultValue)}\n`);
    const answer = (await rl.question("> ")).trim();

    if (!answer) {
      return defaultValue;
    }

    const numericChoice = Number(answer);

    if (Number.isInteger(numericChoice) && numericChoice >= 1 && numericChoice <= choices.length) {
      return choices[numericChoice - 1].value;
    }

    const matchedChoice = choices.find((choice) => choice.value === answer);

    if (matchedChoice) {
      return matchedChoice.value;
    }

    output.write("输入无效，请重新选择编号或直接输入值。\n");
  }
}

function normalizeTypes(rawValue) {
  const types = rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (types.length === 0 || types.some((item) => !hasAssetKind(item))) {
    return null;
  }

  return [...new Set(types)].join(",");
}

async function promptTypes({ rl, output, defaultValue }) {
  const selected = await promptChoice({
    rl,
    output,
    title: "请选择安装内容",
    choices: TYPE_CHOICES,
    defaultValue,
  });

  if (selected !== "custom") {
    return selected;
  }

  while (true) {
    output.write(
      `\n请输入自定义类型，使用逗号分隔，可选值：${listAssetKindNames().join(", ")}\n默认值：${defaultValue}\n`,
    );
    const answer = (await rl.question("> ")).trim() || defaultValue;
    const normalized = normalizeTypes(answer);

    if (normalized) {
      return normalized;
    }

    output.write("输入无效，请按 skills,commands,rules 这种格式重新输入。\n");
  }
}

async function promptGitUrl({ rl, output, defaultValue }) {
  while (true) {
    output.write("\n请输入 Git tree 链接\n");
    const answer = (await rl.question("> ")).trim() || defaultValue;

    if (answer) {
      return answer;
    }

    output.write("Git tree 链接不能为空。\n");
  }
}

export async function promptInstallOptions({
  defaults,
  input,
  output,
  createPromptInterface = createInterface,
}) {
  const rl = createPromptInterface({ input, output });

  try {
    output.write("@yugu/dev-kit 交互安装\n直接回车即可使用默认值。\n");

    const agent = await promptChoice({
      rl,
      output,
      title: "请选择安装目标 Agent",
      choices: AGENT_CHOICES,
      defaultValue: defaults.agent,
    });
    const scope = await promptChoice({
      rl,
      output,
      title: "请选择安装范围",
      choices: SCOPE_CHOICES,
      defaultValue: defaults.scope,
    });
    const source = await promptChoice({
      rl,
      output,
      title: "请选择来源策略",
      choices: SOURCE_CHOICES,
      defaultValue: defaults.source,
    });
    const git = source === "git" ? await promptGitUrl({ rl, output, defaultValue: defaults.git }) : undefined;
    const types =
      source === "git"
        ? getDefaultTypesOption()
        : await promptTypes({
            rl,
            output,
            defaultValue: defaults.types,
          });
    const mode = await promptChoice({
      rl,
      output,
      title: "请选择安装方式",
      choices: MODE_CHOICES,
      defaultValue: defaults.mode,
    });

    return {
      ...defaults,
      agent,
      scope,
      types,
      mode,
      source,
      git,
    };
  } finally {
    rl.close();
  }
}

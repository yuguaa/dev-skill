import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDefaultTypesOption, hasAssetKind, listAssetKindNames } from "./asset-kinds.js";
import { runInstall } from "./installer.js";
import { promptInstallOptions } from "./prompts.js";
import { resolveInstallSource } from "./source-resolver.js";

const VALID_AGENTS = new Set(["codex", "claude"]);
const VALID_SCOPES = new Set(["global", "project"]);
const VALID_MODES = new Set(["symlink", "copy"]);
const VALID_SOURCES = new Set(["auto", "package", "git"]);
const SUPPORTED_OPTIONS = new Set(["agent", "scope", "types", "mode", "source", "git"]);

function packageRootFromModule() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "..");
}

function writeLine(output, message = "") {
  output.write(`${message}\n`);
}

function isInteractiveTerminal(input, output) {
  return Boolean(input?.isTTY && output?.isTTY);
}

function printHelp(output) {
  const assetKinds = listAssetKindNames().join(",");
  writeLine(
    output,
    `@yugu/dev-kit

Usage:
  pnpm dlx @yugu/dev-kit install [options]
  dev-kit install [options]

Interactive:
  dev-kit install              # TTY 下默认进入交互式安装

Options:
  --agent <all|codex|claude|codex,claude>
  --scope <global|project>
  --types <${assetKinds}>
  --mode <symlink|copy>
  --source <auto|package|git>
  --git <tree-url>
  --help
`,
  );
}

function parseArgs(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  const options = {
    agent: "all",
    scope: "global",
    types: getDefaultTypesOption(),
    mode: "symlink",
    source: "auto",
    git: undefined,
  };
  let hasExplicitOptions = false;
  const explicitOptions = new Set();

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    const value = rest[index + 1];

    if (token === "--help" || token === "-h") {
      return { command: "help" };
    }

    if (!token.startsWith("--")) {
      throw new Error(`Unsupported argument: ${token}`);
    }

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}`);
    }

    const optionName = token.slice(2);

    if (!SUPPORTED_OPTIONS.has(optionName)) {
      throw new Error(`Unsupported option: ${token}`);
    }

    options[optionName] = value;
    hasExplicitOptions = true;
    explicitOptions.add(optionName);
    index += 1;
  }

  return { command, options, hasExplicitOptions, explicitOptions };
}

function validateOptions(options, explicitOptions = new Set()) {
  const agents =
    options.agent === "all"
      ? ["codex", "claude"]
      : options.agent.split(",").map((item) => item.trim()).filter(Boolean);

  if (agents.length === 0 || agents.some((item) => !VALID_AGENTS.has(item))) {
    throw new Error(`Invalid --agent: ${options.agent}`);
  }

  if (!VALID_SCOPES.has(options.scope)) {
    throw new Error(`Invalid --scope: ${options.scope}`);
  }

  if (!VALID_MODES.has(options.mode)) {
    throw new Error(`Invalid --mode: ${options.mode}`);
  }

  const types = options.types.split(",").map((item) => item.trim()).filter(Boolean);

  if (types.length === 0 || types.some((item) => !hasAssetKind(item))) {
    throw new Error(`Invalid --types: ${options.types}`);
  }

  if (!VALID_SOURCES.has(options.source)) {
    throw new Error(`Invalid --source: ${options.source}`);
  }

  if (options.git && explicitOptions.has("types")) {
    throw new Error(`--git cannot be combined with --types, asset kind is derived from the Git path`);
  }

  if (options.git && explicitOptions.has("source") && !["auto", "git"].includes(options.source)) {
    throw new Error(`--git cannot be combined with --source ${options.source}`);
  }

  if (options.source === "git" && !options.git) {
    throw new Error(`--source git requires --git <tree-url>`);
  }

  if (options.source === "package" && options.git) {
    throw new Error(`--source package cannot be combined with --git`);
  }
}

function printSummary(result, output) {
  const countsByAgent = Object.entries(result.summary.agents).map(([agent, counts]) => {
    const details = listAssetKindNames()
      .map((kindName) => `${kindName}(${counts[kindName] ?? 0})`)
      .join(", ");
    return `- ${agent}: ${details}`;
  });

  writeLine(
    output,
    `Install completed
Scope: ${result.summary.scope}
Mode: ${result.summary.mode}`,
  );

  for (const line of countsByAgent) {
    writeLine(output, line);
  }
}

export async function main(argv, context = {}) {
  const parsed = parseArgs(argv);
  const input = context.stdin ?? process.stdin;
  const output = context.stdout ?? process.stdout;
  const install = context.runInstall ?? runInstall;
  const prompt = context.promptInstallOptions ?? promptInstallOptions;
  const resolveSource = context.resolveInstallSource ?? resolveInstallSource;
  const sourceRoot = context.sourceRoot ?? packageRootFromModule();
  const projectRoot = context.projectRoot ?? process.cwd();

  if (parsed.command === "help") {
    printHelp(output);
    return;
  }

  if (parsed.command !== "install") {
    throw new Error(`Unsupported command: ${parsed.command}`);
  }

  const options =
    !parsed.hasExplicitOptions && isInteractiveTerminal(input, output)
      ? await prompt({ defaults: parsed.options, input, output })
      : parsed.options;

  validateOptions(options, parsed.explicitOptions);

  const resolvedSource = await resolveSource(options, {
    defaultSourceRoot: sourceRoot,
  });

  try {
    const result = await install({
      ...resolvedSource.resolvedOptions,
      sourceRoot: resolvedSource.sourceRoot,
      projectRoot,
    });

    printSummary(result, output);
  } finally {
    await resolvedSource.cleanup();
  }
}

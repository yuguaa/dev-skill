import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInstall } from "./installer.js";

const VALID_AGENTS = new Set(["codex", "claude"]);
const VALID_SCOPES = new Set(["global", "project"]);
const VALID_MODES = new Set(["symlink", "copy"]);
const VALID_TYPES = new Set(["skills", "commands", "rules"]);
const VALID_SOURCES = new Set(["auto", "local", "git", "npm"]);
const SUPPORTED_OPTIONS = new Set(["agent", "scope", "types", "mode", "source"]);

function packageRootFromModule() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "..");
}

function printHelp() {
  console.log(`dev-kit

Usage:
  dev-kit install [options]

Options:
  --agent <all|codex|claude|codex,claude>
  --scope <global|project>
  --types <skills,commands,rules>
  --mode <symlink|copy>
  --source <auto|local|git|npm>
  --help
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  const options = {
    agent: "all",
    scope: "global",
    types: "skills,commands,rules",
    mode: "symlink",
    source: "auto",
  };

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
    index += 1;
  }

  return { command, options };
}

function validateOptions(options) {
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

  if (types.length === 0 || types.some((item) => !VALID_TYPES.has(item))) {
    throw new Error(`Invalid --types: ${options.types}`);
  }

  if (!VALID_SOURCES.has(options.source)) {
    throw new Error(`Invalid --source: ${options.source}`);
  }
}

function printSummary(result) {
  console.log(`Install completed
Scope: ${result.summary.scope}
Mode: ${result.summary.mode}`);

  for (const [agent, counts] of Object.entries(result.summary.agents)) {
    console.log(
      `- ${agent}: skills(${counts.skills}), commands(${counts.commands}), rules(${counts.rules})`,
    );
  }
}

export async function main(argv) {
  const parsed = parseArgs(argv);

  if (parsed.command === "help") {
    printHelp();
    return;
  }

  if (parsed.command !== "install") {
    throw new Error(`Unsupported command: ${parsed.command}`);
  }

  validateOptions(parsed.options);

  const sourceRoot = packageRootFromModule();
  const projectRoot = process.cwd();
  const result = await runInstall({
    ...parsed.options,
    sourceRoot,
    projectRoot,
  });

  printSummary(result);
}

import os from "node:os";
import path from "node:path";

const GLOBAL_TARGETS = {
  codex: {
    skills: path.join(os.homedir(), ".codex", "skills"),
    commands: path.join(os.homedir(), ".codex", "commands"),
    rules: path.join(os.homedir(), ".codex", "rules"),
  },
  claude: {
    skills: path.join(os.homedir(), ".claude", "skills"),
    commands: path.join(os.homedir(), ".claude", "commands"),
    rules: path.join(os.homedir(), ".claude", "rules"),
  },
};

export function resolveAgents(agentOption) {
  if (agentOption === "all") {
    return ["codex", "claude"];
  }

  return [...new Set(agentOption.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function resolveTargetRoots({ agent, scope, projectRoot }) {
  if (scope === "global") {
    return GLOBAL_TARGETS[agent];
  }

  if (agent === "codex") {
    return {
      skills: path.join(projectRoot, ".agents", "skills"),
      commands: path.join(projectRoot, ".codex", "commands"),
      rules: path.join(projectRoot, "rules"),
    };
  }

  return {
    skills: path.join(projectRoot, ".claude", "skills"),
    commands: path.join(projectRoot, ".claude", "commands"),
    rules: path.join(projectRoot, "rules"),
  };
}

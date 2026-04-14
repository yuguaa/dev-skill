import os from "node:os";
import path from "node:path";
import { listAssetKinds } from "./asset-kinds.js";

export function resolveAgents(agentOption) {
  if (agentOption === "all") {
    return ["codex", "claude"];
  }

  return [...new Set(agentOption.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function resolveTargetRoots({ agent, scope, projectRoot }) {
  return Object.fromEntries(
    listAssetKinds().map((kind) => {
      const segments = kind.targets[scope][agent];
      const rootPath =
        scope === "global" ? path.join(os.homedir(), ...segments) : path.join(projectRoot, ...segments);
      return [kind.name, rootPath];
    }),
  );
}

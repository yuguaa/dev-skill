import fs from "node:fs/promises";
import path from "node:path";
import { listAssetKindNames } from "./asset-kinds.js";
import { buildManifest } from "./manifest.js";
import { resolveAgents, resolveTargetRoots } from "./targets.js";

function parseCsvOption(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function ensureParent(targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
}

async function removeTarget(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function copyDirectory(sourcePath, targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const nextSource = path.join(sourcePath, entry.name);
    const nextTarget = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(nextSource, nextTarget);
      continue;
    }

    await ensureParent(nextTarget);
    await fs.copyFile(nextSource, nextTarget);
  }
}

async function installEntry({ entry, targetPath, mode }) {
  await removeTarget(targetPath);

  if (mode === "symlink") {
    await ensureParent(targetPath);
    await fs.symlink(entry.sourcePath, targetPath);
    return;
  }

  const stat = await fs.lstat(entry.sourcePath);

  if (stat.isDirectory()) {
    await copyDirectory(entry.sourcePath, targetPath);
    return;
  }

  await ensureParent(targetPath);
  await fs.copyFile(entry.sourcePath, targetPath);
}

function buildInstallPlan({ manifest, agents, scope, projectRoot, types }) {
  const selectedTypes = new Set(types);
  const plan = [];

  for (const agent of agents) {
    const targetRoots = resolveTargetRoots({ agent, scope, projectRoot });

    for (const type of selectedTypes) {
      const entries = manifest[type] ?? [];

      for (const entry of entries) {
        plan.push({
          agent,
          type,
          entry,
          targetPath: path.join(targetRoots[type], entry.relativePath),
        });
      }
    }
  }

  return plan;
}

function createSummary(operations, mode, scope, agents) {
  const summary = new Map();
  const assetKinds = listAssetKindNames();

  for (const agent of agents) {
    summary.set(agent, Object.fromEntries(assetKinds.map((kind) => [kind, 0])));
  }

  for (const operation of operations) {
    const agentSummary = summary.get(operation.agent);

    agentSummary[operation.type] += 1;
    summary.set(operation.agent, agentSummary);
  }

  return {
    mode,
    scope,
    agents: Object.fromEntries(summary),
  };
}

export async function runInstall(options) {
  const agents = resolveAgents(options.agent);
  const types = parseCsvOption(options.types);
  const manifest = await buildManifest(options.sourceRoot);
  const operations = buildInstallPlan({
    manifest,
    agents,
    scope: options.scope,
    projectRoot: options.projectRoot,
    types,
  });

  for (const operation of operations) {
    await installEntry({
      entry: operation.entry,
      targetPath: operation.targetPath,
      mode: options.mode,
    });
  }

  return {
    manifest,
    operations,
    summary: createSummary(operations, options.mode, options.scope, agents),
  };
}

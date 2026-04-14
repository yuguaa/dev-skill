import fs from "node:fs/promises";
import path from "node:path";

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdownFiles(rootPath) {
  const results = [];

  if (!(await exists(rootPath))) {
    return results;
  }

  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await walkMarkdownFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(absolutePath);
    }
  }

  return results;
}

export async function buildManifest(sourceRoot) {
  const manifest = {
    skills: [],
    commands: [],
    rules: [],
  };

  const skillsRoot = path.join(sourceRoot, "skills");

  if (await exists(skillsRoot)) {
    const skillEntries = await fs.readdir(skillsRoot, { withFileTypes: true });

    for (const entry of skillEntries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillPath = path.join(skillsRoot, entry.name);
      const skillDefinition = path.join(skillPath, "SKILL.md");

      if (!(await exists(skillDefinition))) {
        continue;
      }

      manifest.skills.push({
        name: entry.name,
        type: "skills",
        sourcePath: skillPath,
        relativePath: entry.name,
      });
    }
  }

  const commandsRoot = path.join(sourceRoot, "commands");
  const commandFiles = await walkMarkdownFiles(commandsRoot);
  manifest.commands = commandFiles.map((filePath) => ({
    name: path.basename(filePath, ".md"),
    type: "commands",
    sourcePath: filePath,
    relativePath: path.relative(commandsRoot, filePath),
  }));

  const rulesRoot = path.join(sourceRoot, "rules");
  const ruleFiles = await walkMarkdownFiles(rulesRoot);
  manifest.rules = ruleFiles.map((filePath) => ({
    name: path.basename(filePath, ".md"),
    type: "rules",
    sourcePath: filePath,
    relativePath: path.relative(rulesRoot, filePath),
  }));

  return manifest;
}

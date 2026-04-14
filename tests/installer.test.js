import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runInstall } from "../src/installer.js";

async function withTempDir(callback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dev-kit-install-"));

  try {
    await callback(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("runInstall copies selected assets into project targets", async () => {
  await withTempDir(async (tempDir) => {
    const sourceRoot = path.join(tempDir, "source");
    const projectRoot = path.join(tempDir, "target");

    await fs.mkdir(path.join(sourceRoot, "skills", "git", "references"), { recursive: true });
    await fs.mkdir(path.join(sourceRoot, "commands", "git"), { recursive: true });
    await fs.mkdir(path.join(sourceRoot, "rules", "git"), { recursive: true });
    await fs.mkdir(projectRoot, { recursive: true });

    await fs.writeFile(path.join(sourceRoot, "skills", "git", "SKILL.md"), "# git");
    await fs.writeFile(path.join(sourceRoot, "commands", "git", "git-log.md"), "# log");
    await fs.writeFile(path.join(sourceRoot, "rules", "git", "workflow.md"), "# workflow");

    const result = await runInstall({
      agent: "codex",
      scope: "project",
      types: "skills,commands,rules",
      mode: "copy",
      sourceRoot,
      projectRoot,
    });

    const skillStat = await fs.lstat(path.join(projectRoot, ".agents", "skills", "git"));
    const commandContent = await fs.readFile(
      path.join(projectRoot, ".codex", "commands", "git", "git-log.md"),
      "utf8",
    );
    const ruleContent = await fs.readFile(path.join(projectRoot, "rules", "git", "workflow.md"), "utf8");

    assert.equal(skillStat.isDirectory(), true);
    assert.equal(commandContent, "# log");
    assert.equal(ruleContent, "# workflow");
    assert.equal(result.summary.agents.codex.commands, 1);
  });
});

test("runInstall creates symlink targets by default mode", async () => {
  await withTempDir(async (tempDir) => {
    const sourceRoot = path.join(tempDir, "source");
    const projectRoot = path.join(tempDir, "target");

    await fs.mkdir(path.join(sourceRoot, "skills", "git"), { recursive: true });
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(path.join(sourceRoot, "skills", "git", "SKILL.md"), "# git");

    await runInstall({
      agent: "claude",
      scope: "project",
      types: "skills",
      mode: "symlink",
      sourceRoot,
      projectRoot,
    });

    const stat = await fs.lstat(path.join(projectRoot, ".claude", "skills", "git"));
    assert.equal(stat.isSymbolicLink(), true);
  });
});

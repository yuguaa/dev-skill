import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildManifest } from "../src/manifest.js";

async function withTempDir(callback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dev-kit-manifest-"));

  try {
    await callback(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("buildManifest scans skills, commands and rules", async () => {
  await withTempDir(async (tempDir) => {
    await fs.mkdir(path.join(tempDir, "skills", "git", "references"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "commands", "git"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "rules", "frontend"), { recursive: true });

    await fs.writeFile(path.join(tempDir, "skills", "git", "SKILL.md"), "# git");
    await fs.writeFile(path.join(tempDir, "commands", "git", "git-commit.md"), "# commit");
    await fs.writeFile(path.join(tempDir, "rules", "frontend", "spacing.md"), "# spacing");

    const manifest = await buildManifest(tempDir);

    assert.equal(manifest.skills.length, 1);
    assert.equal(manifest.skills[0].relativePath, "git");

    assert.equal(manifest.commands.length, 1);
    assert.equal(manifest.commands[0].relativePath, path.join("git", "git-commit.md"));

    assert.equal(manifest.rules.length, 1);
    assert.equal(manifest.rules[0].relativePath, path.join("frontend", "spacing.md"));
  });
});

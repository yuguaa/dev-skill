import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getDefaultTypesOption } from "../src/asset-kinds.js";
import { buildManifest } from "../src/manifest.js";
import { parseGitTreeUrl, resolveInstallSource } from "../src/source-resolver.js";

async function withTempDir(callback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dev-kit-source-resolver-"));

  try {
    await callback(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("parseGitTreeUrl parses GitLab tree URLs", () => {
  const result = parseGitTreeUrl(
    "https://git.newcapec.cn/02-newcapec/ai/UIService/helper/dev-kit/-/tree/main/skills/export-rules",
  );

  assert.equal(result.repositoryUrl, "https://git.newcapec.cn/02-newcapec/ai/UIService/helper/dev-kit.git");
  assert.equal(result.ref, "main");
  assert.equal(result.assetPath, "skills/export-rules");
  assert.equal(result.kind.name, "skills");
});

test("parseGitTreeUrl parses GitHub tree URLs with slash refs", () => {
  const result = parseGitTreeUrl("https://github.com/example/dev-kit/tree/feature/ui/rules/frontend");

  assert.equal(result.repositoryUrl, "https://github.com/example/dev-kit.git");
  assert.equal(result.ref, "feature/ui");
  assert.equal(result.assetPath, "rules/frontend");
  assert.equal(result.kind.name, "rules");
});

test("resolveInstallSource stages a selected Git skill directory", async () => {
  await withTempDir(async (tempDir) => {
    const repositoryRoot = path.join(tempDir, "repository");
    await fs.mkdir(path.join(repositoryRoot, "skills", "export-rules"), { recursive: true });
    await fs.writeFile(path.join(repositoryRoot, "skills", "export-rules", "SKILL.md"), "# export-rules");
    await fs.writeFile(path.join(repositoryRoot, "skills", "export-rules", "guide.md"), "# guide");
    await fs.mkdir(path.join(repositoryRoot, "rules", "frontend"), { recursive: true });
    await fs.writeFile(path.join(repositoryRoot, "rules", "frontend", "spacing.md"), "# spacing");

    const result = await resolveInstallSource(
      {
        agent: "codex",
        scope: "project",
        types: "skills,commands,rules",
        mode: "copy",
        source: "auto",
        git: "https://git.newcapec.cn/group/dev-kit/-/tree/main/skills/export-rules",
      },
      {
        defaultSourceRoot: "/unused",
        execFileImpl: async (_command, args) => {
          const targetPath = args.at(-1);
          await fs.cp(repositoryRoot, targetPath, { recursive: true });
        },
      },
    );

    try {
      const manifest = await buildManifest(result.sourceRoot);
      assert.equal(result.resolvedOptions.source, "git");
      assert.equal(result.resolvedOptions.types, "skills");
      assert.equal(manifest.skills.length, 1);
      assert.equal(manifest.skills[0].relativePath, "export-rules");
      await assert.rejects(fs.access(path.join(result.sourceRoot, "rules")), /ENOENT/);
    } finally {
      await result.cleanup();
    }
  });
});

test("resolveInstallSource normalizes default package source", async () => {
  const result = await resolveInstallSource(
    {
      agent: "codex",
      scope: "project",
      types: getDefaultTypesOption(),
      mode: "copy",
      source: "auto",
      git: undefined,
    },
    {
      defaultSourceRoot: "/package/source",
    },
  );

  assert.equal(result.sourceRoot, "/package/source");
  assert.equal(result.resolvedOptions.source, "package");
  assert.equal(result.resolvedOptions.git, undefined);
});

test("resolveInstallSource stages nested rule directories from Git", async () => {
  await withTempDir(async (tempDir) => {
    const repositoryRoot = path.join(tempDir, "repository");
    await fs.mkdir(path.join(repositoryRoot, "rules", "frontend"), { recursive: true });
    await fs.writeFile(path.join(repositoryRoot, "rules", "frontend", "spacing.md"), "# spacing");

    const result = await resolveInstallSource(
      {
        agent: "codex",
        scope: "project",
        types: getDefaultTypesOption(),
        mode: "copy",
        source: "auto",
        git: "https://github.com/example/dev-kit/tree/main/rules/frontend",
      },
      {
        defaultSourceRoot: "/unused",
        execFileImpl: async (_command, args) => {
          const targetPath = args.at(-1);
          await fs.cp(repositoryRoot, targetPath, { recursive: true });
        },
      },
    );

    try {
      const manifest = await buildManifest(result.sourceRoot);
      assert.equal(result.resolvedOptions.types, "rules");
      assert.equal(manifest.rules.length, 1);
      assert.equal(manifest.rules[0].relativePath, path.join("frontend", "spacing.md"));
    } finally {
      await result.cleanup();
    }
  });
});

test("resolveInstallSource fails fast when the Git directory is not installable", async () => {
  await withTempDir(async (tempDir) => {
    const repositoryRoot = path.join(tempDir, "repository");
    await fs.mkdir(path.join(repositoryRoot, "skills", "broken"), { recursive: true });

    await assert.rejects(
      () =>
        resolveInstallSource(
          {
            agent: "codex",
            scope: "project",
            types: getDefaultTypesOption(),
            mode: "copy",
            source: "auto",
            git: "https://git.newcapec.cn/group/dev-kit/-/tree/main/skills/broken",
          },
          {
            defaultSourceRoot: "/unused",
            execFileImpl: async (_command, args) => {
              const targetPath = args.at(-1);
              await fs.cp(repositoryRoot, targetPath, { recursive: true });
            },
          },
        ),
      /No installable skills assets found/,
    );
  });
});

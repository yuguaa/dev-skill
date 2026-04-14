import fs from "node:fs/promises";
import path from "node:path";
import { listAssetKinds } from "./asset-kinds.js";

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
  const manifest = Object.fromEntries(listAssetKinds().map((kind) => [kind.name, []]));

  for (const kind of listAssetKinds()) {
    const assetRoot = path.join(sourceRoot, kind.sourceDir);

    if (kind.entryStrategy === "directory-with-marker") {
      if (!(await exists(assetRoot))) {
        continue;
      }

      const entries = await fs.readdir(assetRoot, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const entryPath = path.join(assetRoot, entry.name);
        const markerPath = path.join(entryPath, kind.markerFile);

        if (!(await exists(markerPath))) {
          continue;
        }

        manifest[kind.name].push({
          name: entry.name,
          type: kind.name,
          sourcePath: entryPath,
          relativePath: entry.name,
        });
      }

      continue;
    }

    const markdownFiles = await walkMarkdownFiles(assetRoot);
    manifest[kind.name] = markdownFiles.map((filePath) => ({
      name: path.basename(filePath, ".md"),
      type: kind.name,
      sourcePath: filePath,
      relativePath: path.relative(assetRoot, filePath),
    }));
  }

  return manifest;
}

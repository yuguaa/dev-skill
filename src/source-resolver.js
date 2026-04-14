import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildManifest } from "./manifest.js";
import { getAssetKind, hasAssetKind } from "./asset-kinds.js";

const execFileAsync = promisify(execFile);

function decodeUrlSegment(value) {
  return decodeURIComponent(value);
}

function splitUrlPathname(pathname) {
  return pathname.split("/").filter(Boolean).map(decodeUrlSegment);
}

function ensureSafeSegments(segments, rawUrl) {
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Git tree URL contains unsupported path traversal segments: ${rawUrl}`);
  }
}

function buildRepositoryUrl(url, repoSegments) {
  const repositoryUrl = new URL(url.origin);
  repositoryUrl.pathname = `/${repoSegments.join("/")}.git`;
  return repositoryUrl.toString();
}

function parseGitHubTreeUrl(url) {
  const segments = splitUrlPathname(url.pathname);

  if (segments.length < 4 || segments[2] !== "tree") {
    throw new Error(`Unsupported Git tree URL: ${url.toString()}`);
  }

  const repoSegments = segments.slice(0, 2);
  const treeSegments = segments.slice(3);
  return {
    repositoryUrl: buildRepositoryUrl(url, repoSegments),
    treeSegments,
  };
}

function parseGitLabTreeUrl(url) {
  const segments = splitUrlPathname(url.pathname);
  const markerIndex = segments.indexOf("-");

  if (markerIndex < 1 || segments[markerIndex + 1] !== "tree") {
    throw new Error(`Unsupported Git tree URL: ${url.toString()}`);
  }

  const repoSegments = segments.slice(0, markerIndex);
  const treeSegments = segments.slice(markerIndex + 2);
  return {
    repositoryUrl: buildRepositoryUrl(url, repoSegments),
    treeSegments,
  };
}

function parseTreeSegments(treeSegments, rawUrl) {
  ensureSafeSegments(treeSegments, rawUrl);
  const assetKindIndex = treeSegments.findIndex((segment) => hasAssetKind(segment));

  if (assetKindIndex < 1) {
    throw new Error(`Git tree URL must point inside skills, commands, or rules: ${rawUrl}`);
  }

  const ref = treeSegments.slice(0, assetKindIndex).join("/");
  const assetPath = treeSegments.slice(assetKindIndex).join("/");
  const kindName = treeSegments[assetKindIndex];

  if (!ref || !assetPath) {
    throw new Error(`Git tree URL is missing ref or asset path: ${rawUrl}`);
  }

  return {
    ref,
    assetPath,
    kind: getAssetKind(kindName),
  };
}

function resolveInside(rootPath, relativePath) {
  const resolvedPath = path.resolve(rootPath, relativePath);

  if (resolvedPath !== rootPath && !resolvedPath.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error(`Resolved path escapes repository root: ${relativePath}`);
  }

  return resolvedPath;
}

async function cloneRepository({ repositoryUrl, ref, targetPath, execFileImpl }) {
  try {
    await execFileImpl("git", ["clone", "--depth", "1", "--branch", ref, repositoryUrl, targetPath]);
  } catch (error) {
    const reason =
      error instanceof Error && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr.trim()
        : error instanceof Error
          ? error.message
          : String(error);
    throw new Error(`Failed to clone ${repositoryUrl}#${ref}: ${reason}`);
  }
}

async function ensureDirectory(sourcePath, assetPath) {
  let stat;

  try {
    stat = await fs.lstat(sourcePath);
  } catch {
    throw new Error(`Git tree path does not exist: ${assetPath}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`Git tree path must be a directory: ${assetPath}`);
  }
}

async function ensureInstallableAsset(sourceRoot, kind, assetPath) {
  const manifest = await buildManifest(sourceRoot);

  if ((manifest[kind.name] ?? []).length === 0) {
    throw new Error(`No installable ${kind.name} assets found in ${assetPath}`);
  }
}

export function parseGitTreeUrl(rawUrl) {
  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid --git URL: ${rawUrl}`);
  }

  const parsed =
    url.pathname.includes("/-/tree/") ? parseGitLabTreeUrl(url) : parseGitHubTreeUrl(url);

  return {
    ...parsed,
    ...parseTreeSegments(parsed.treeSegments, rawUrl),
  };
}

export async function resolveInstallSource(
  options,
  { defaultSourceRoot, execFileImpl = execFileAsync } = {},
) {
  const effectiveSource = options.git ? (options.source === "package" ? "package" : "git") : "package";

  if (effectiveSource === "package") {
    return {
      sourceRoot: defaultSourceRoot,
      resolvedOptions: {
        ...options,
        source: "package",
        git: undefined,
      },
      cleanup: async () => {},
    };
  }

  const parsed = parseGitTreeUrl(options.git);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dev-kit-git-source-"));
  const checkoutRoot = path.join(tempRoot, "repo");
  const sourceRoot = path.join(tempRoot, "source");

  try {
    await cloneRepository({
      repositoryUrl: parsed.repositoryUrl,
      ref: parsed.ref,
      targetPath: checkoutRoot,
      execFileImpl,
    });

    const selectedPath = resolveInside(checkoutRoot, parsed.assetPath);
    const stagedPath = resolveInside(sourceRoot, parsed.assetPath);
    await ensureDirectory(selectedPath, parsed.assetPath);
    await fs.mkdir(path.dirname(stagedPath), { recursive: true });
    await fs.cp(selectedPath, stagedPath, { recursive: true });
    await ensureInstallableAsset(sourceRoot, parsed.kind, parsed.assetPath);

    return {
      sourceRoot,
      resolvedOptions: {
        ...options,
        source: "git",
        types: parsed.kind.name,
      },
      cleanup: async () => {
        await fs.rm(tempRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await fs.rm(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

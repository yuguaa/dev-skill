const ASSET_KINDS = Object.freeze({
  skills: {
    name: "skills",
    sourceDir: "skills",
    entryStrategy: "directory-with-marker",
    markerFile: "SKILL.md",
    targets: {
      global: {
        codex: [".codex", "skills"],
        claude: [".claude", "skills"],
      },
      project: {
        codex: [".agents", "skills"],
        claude: [".claude", "skills"],
      },
    },
  },
  commands: {
    name: "commands",
    sourceDir: "commands",
    entryStrategy: "markdown-tree",
    targets: {
      global: {
        codex: [".codex", "commands"],
        claude: [".claude", "commands"],
      },
      project: {
        codex: [".codex", "commands"],
        claude: [".claude", "commands"],
      },
    },
  },
  rules: {
    name: "rules",
    sourceDir: "rules",
    entryStrategy: "markdown-tree",
    targets: {
      global: {
        codex: [".codex", "rules"],
        claude: [".claude", "rules"],
      },
      project: {
        codex: ["rules"],
        claude: ["rules"],
      },
    },
  },
});

const ORDERED_ASSET_KINDS = Object.freeze(Object.values(ASSET_KINDS));

export function listAssetKinds() {
  return ORDERED_ASSET_KINDS;
}

export function listAssetKindNames() {
  return ORDERED_ASSET_KINDS.map((item) => item.name);
}

export function getDefaultTypesOption() {
  return listAssetKindNames().join(",");
}

export function hasAssetKind(kindName) {
  return Object.hasOwn(ASSET_KINDS, kindName);
}

export function getAssetKind(kindName) {
  const kind = ASSET_KINDS[kindName];

  if (!kind) {
    throw new Error(`Unsupported asset kind: ${kindName}`);
  }

  return kind;
}

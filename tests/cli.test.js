import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { getDefaultTypesOption } from "../src/asset-kinds.js";
import { main } from "../src/cli.js";
import { promptInstallOptions } from "../src/prompts.js";

function createTtyInput(text = "") {
  const stream = new PassThrough();
  stream.isTTY = true;
  stream.end(text);
  return stream;
}

function createTtyOutput() {
  const stream = new PassThrough();
  stream.isTTY = true;
  return stream;
}

async function readStream(stream) {
  let result = "";

  for await (const chunk of stream) {
    result += chunk.toString();
  }

  return result;
}

test("main enters interactive mode for install without explicit options in TTY", async () => {
  const input = createTtyInput();
  const output = createTtyOutput();
  let promptCalled = false;
  let receivedOptions;

  await main(["install"], {
    stdin: input,
    stdout: output,
    sourceRoot: "/virtual/source",
    projectRoot: "/virtual/project",
    promptInstallOptions: async ({ defaults }) => {
      promptCalled = true;
      assert.equal(defaults.agent, "all");
      return {
        ...defaults,
        agent: "codex",
        scope: "project",
      };
    },
    runInstall: async (options) => {
      receivedOptions = options;
      return {
        summary: {
          scope: options.scope,
          mode: options.mode,
          agents: {
            codex: {
              skills: 1,
              commands: 2,
              rules: 3,
            },
          },
        },
      };
    },
  });

  output.end();
  const content = await readStream(output);

  assert.equal(promptCalled, true);
  assert.equal(receivedOptions.agent, "codex");
  assert.equal(receivedOptions.scope, "project");
  assert.match(content, /Install completed/);
});

test("main enters interactive mode in TTY when install command is omitted", async () => {
  const input = createTtyInput();
  const output = createTtyOutput();
  let promptCalled = false;
  let receivedOptions;

  await main([], {
    stdin: input,
    stdout: output,
    sourceRoot: "/virtual/source",
    projectRoot: "/virtual/project",
    promptInstallOptions: async ({ defaults }) => {
      promptCalled = true;
      assert.equal(defaults.agent, "all");
      return {
        ...defaults,
        agent: "claude",
        scope: "project",
      };
    },
    runInstall: async (options) => {
      receivedOptions = options;
      return {
        summary: {
          scope: options.scope,
          mode: options.mode,
          agents: {
            claude: {
              skills: 1,
              commands: 1,
              rules: 1,
            },
          },
        },
      };
    },
  });

  assert.equal(promptCalled, true);
  assert.equal(receivedOptions.agent, "claude");
  assert.equal(receivedOptions.scope, "project");
});

test("main skips interactive mode when install has explicit options", async () => {
  const input = createTtyInput();
  const output = createTtyOutput();
  let receivedOptions;

  await main(["install", "--agent", "claude", "--types", "skills"], {
    stdin: input,
    stdout: output,
    sourceRoot: "/virtual/source",
    projectRoot: "/virtual/project",
    promptInstallOptions: async () => {
      throw new Error("prompt should not be called");
    },
    runInstall: async (options) => {
      receivedOptions = options;
      return {
        summary: {
          scope: options.scope,
          mode: options.mode,
          agents: {
            claude: {
              skills: 1,
              commands: 0,
              rules: 0,
            },
          },
        },
      };
    },
  });

  assert.equal(receivedOptions.agent, "claude");
  assert.equal(receivedOptions.types, "skills");
});

test("main keeps non-interactive install behavior outside TTY", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let receivedOptions;

  await main(["install"], {
    stdin: input,
    stdout: output,
    sourceRoot: "/virtual/source",
    projectRoot: "/virtual/project",
    promptInstallOptions: async () => {
      throw new Error("prompt should not be called");
    },
    runInstall: async (options) => {
      receivedOptions = options;
      return {
        summary: {
          scope: options.scope,
          mode: options.mode,
          agents: {
            codex: {
              skills: 1,
              commands: 1,
              rules: 1,
            },
            claude: {
              skills: 1,
              commands: 1,
              rules: 1,
            },
          },
        },
      };
    },
  });

  assert.equal(receivedOptions.agent, "all");
  assert.equal(receivedOptions.scope, "global");
});

test("main prints help when command is omitted outside TTY", async () => {
  const input = new PassThrough();
  const output = new PassThrough();

  await main([], {
    stdin: input,
    stdout: output,
    promptInstallOptions: async () => {
      throw new Error("prompt should not be called");
    },
    runInstall: async () => {
      throw new Error("install should not run");
    },
  });

  output.end();
  const content = await readStream(output);

  assert.match(content, /Usage:/);
  assert.match(content, /pnpm dlx @yugu\/dev-kit install \[options\]/);
});

test("promptInstallOptions supports interactive selections and custom types", async () => {
  const answers = ["2", "2", "1", "5", "skills,rules", "2"];
  let index = 0;
  const input = createTtyInput();
  const output = createTtyOutput();
  const result = await promptInstallOptions({
    defaults: {
      agent: "all",
      scope: "global",
      types: "skills,commands,rules",
      mode: "symlink",
      source: "auto",
      git: undefined,
    },
    input,
    output,
    createPromptInterface: () => ({
      question: async () => answers[index++] ?? "",
      close: () => {},
    }),
  });

  assert.deepEqual(result, {
    agent: "codex",
    scope: "project",
    git: undefined,
    types: "skills,rules",
    mode: "copy",
    source: "auto",
  });
});

test("promptInstallOptions collects git tree URL and skips manual types", async () => {
  const answers = [
    "2",
    "2",
    "3",
    "https://git.newcapec.cn/group/repo/-/tree/main/rules/frontend",
    "2",
  ];
  let index = 0;
  const input = createTtyInput();
  const output = createTtyOutput();
  const result = await promptInstallOptions({
    defaults: {
      agent: "all",
      scope: "global",
      types: getDefaultTypesOption(),
      mode: "symlink",
      source: "auto",
      git: undefined,
    },
    input,
    output,
    createPromptInterface: () => ({
      question: async () => answers[index++] ?? "",
      close: () => {},
    }),
  });

  assert.deepEqual(result, {
    agent: "codex",
    scope: "project",
    git: "https://git.newcapec.cn/group/repo/-/tree/main/rules/frontend",
    types: getDefaultTypesOption(),
    mode: "copy",
    source: "git",
  });
});

test("main resolves git source and derives asset kind from the Git path", async () => {
  const input = createTtyInput();
  const output = createTtyOutput();
  let resolvedOptions;
  let installOptions;

  await main(["install", "--git", "https://git.newcapec.cn/group/repo/-/tree/main/rules/frontend"], {
    stdin: input,
    stdout: output,
    projectRoot: "/virtual/project",
    resolveInstallSource: async (options, context) => {
      resolvedOptions = options;
      assert.equal(context.defaultSourceRoot, "/virtual/source");
      return {
        sourceRoot: "/resolved/source",
        resolvedOptions: {
          ...options,
          source: "git",
          types: "rules",
        },
        cleanup: async () => {},
      };
    },
    sourceRoot: "/virtual/source",
    runInstall: async (options) => {
      installOptions = options;
      return {
        summary: {
          scope: options.scope,
          mode: options.mode,
          agents: {
            codex: {
              skills: 0,
              commands: 0,
              rules: 1,
            },
            claude: {
              skills: 0,
              commands: 0,
              rules: 1,
            },
          },
        },
      };
    },
  });

  assert.equal(resolvedOptions.git, "https://git.newcapec.cn/group/repo/-/tree/main/rules/frontend");
  assert.equal(installOptions.types, "rules");
  assert.equal(installOptions.sourceRoot, "/resolved/source");
});

test("main accepts install options without explicit install command", async () => {
  const input = createTtyInput();
  const output = createTtyOutput();
  let resolvedOptions;

  await main(["--git", "https://git.newcapec.cn/group/repo/-/tree/main/rules/frontend"], {
    stdin: input,
    stdout: output,
    sourceRoot: "/virtual/source",
    projectRoot: "/virtual/project",
    resolveInstallSource: async (options) => {
      resolvedOptions = options;
      return {
        sourceRoot: "/resolved/source",
        resolvedOptions: {
          ...options,
          source: "git",
          types: "rules",
        },
        cleanup: async () => {},
      };
    },
    runInstall: async (options) => ({
      summary: {
        scope: options.scope,
        mode: options.mode,
        agents: {
          codex: {
            skills: 0,
            commands: 0,
            rules: 1,
          },
          claude: {
            skills: 0,
            commands: 0,
            rules: 1,
          },
        },
      },
    }),
  });

  assert.equal(resolvedOptions.git, "https://git.newcapec.cn/group/repo/-/tree/main/rules/frontend");
});

test("main rejects --git combined with explicit --types", async () => {
  await assert.rejects(
    () =>
      main(["install", "--git", "https://git.newcapec.cn/group/repo/-/tree/main/skills/export-rules", "--types", "skills"], {
        stdin: createTtyInput(),
        stdout: createTtyOutput(),
      }),
    /--git cannot be combined with --types/,
  );
});

test("main rejects --git combined with --source package", async () => {
  await assert.rejects(
    () =>
      main(
        [
          "install",
          "--git",
          "https://git.newcapec.cn/group/repo/-/tree/main/skills/export-rules",
          "--source",
          "package",
        ],
        {
          stdin: createTtyInput(),
          stdout: createTtyOutput(),
        },
      ),
    /--git cannot be combined with --source package/,
  );
});

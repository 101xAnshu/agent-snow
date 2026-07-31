import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Mode } from "shared";
import { executeLocalTool } from "./local-tools.js";

let root: string;
let cwd: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "snow-agent-test-"));
  cwd = join(root, "repo");
  mkdirSync(join(cwd, "src"), { recursive: true });
  mkdirSync(join(cwd, "nested", "deep"), { recursive: true });
  writeFileSync(join(cwd, "src", "index.ts"), "export const answer = 42;\n");
  writeFileSync(
    join(cwd, "src", "helper.ts"),
    "export function helper() { return 'ok'; }\n",
  );
  writeFileSync(join(cwd, "README.md"), "# Hello\nsnowflake is here\n");
  writeFileSync(join(cwd, "nested", "deep", "data.txt"), "deep snow\n");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("path safety", () => {
  test("rejects traversal outside cwd", () => {
    expect(
      executeLocalTool("readFile", { filePath: "../../etc/passwd" }, Mode.BUILD, cwd),
    ).rejects.toThrow("Path traversal detected");
  });

  test("rejects sibling directory with similar prefix", () => {
    const sibling = join(root, "repo-other");
    mkdirSync(sibling, { recursive: true });
    writeFileSync(join(sibling, "secret.txt"), "secret");
    expect(
      executeLocalTool("readFile", { filePath: "../repo-other/secret.txt" }, Mode.BUILD, cwd),
    ).rejects.toThrow("Path traversal detected");
  });

  test("rejects writes outside cwd", () => {
    expect(
      executeLocalTool(
        "writeFile",
        { filePath: "../evil.txt", content: "x" },
        Mode.BUILD,
        cwd,
      ),
    ).rejects.toThrow("Path traversal detected");
  });

  test("allows reads inside cwd", async () => {
    const out = await executeLocalTool("readFile", { filePath: "src/index.ts" }, Mode.BUILD, cwd);
    expect(out).toContain("answer");
  });
});

describe("cwd parameter", () => {
  test("tools operate on the passed cwd, not process.cwd()", async () => {
    const out = await executeLocalTool("readFile", { filePath: "src/index.ts" }, Mode.BUILD, cwd);
    expect(out).toContain("export const answer = 42");
  });

  test("writes land inside the passed cwd", async () => {
    await executeLocalTool("writeFile", { filePath: "new.txt", content: "fresh" }, Mode.BUILD, cwd);
    expect(readFileSync(join(cwd, "new.txt"), "utf-8")).toBe("fresh");
  });
});

describe("readFile", () => {
  test("returns full content", async () => {
    const out = await executeLocalTool("readFile", { filePath: "README.md" }, Mode.BUILD, cwd);
    expect(out).toContain("snowflake");
  });

  test("honors offset and limit", async () => {
    const out = await executeLocalTool(
      "readFile",
      { filePath: "README.md", offset: 2, limit: 1 },
      Mode.BUILD,
      cwd,
    );
    expect(out.trim()).toBe("snowflake is here");
  });
});

describe("listDirectory", () => {
  test("marks directories with trailing slash", async () => {
    const out = await executeLocalTool("listDirectory", { path: "." }, Mode.BUILD, cwd);
    expect(out).toContain("src/");
    expect(out).toContain("README.md");
  });
});

describe("glob", () => {
  test("finds files by pattern", async () => {
    const out = await executeLocalTool("glob", { pattern: "**/*.ts" }, Mode.BUILD, cwd);
    expect(out).toContain("index.ts");
    expect(out).toContain("helper.ts");
  });
});

describe("grep", () => {
  test("finds matching lines with line numbers", async () => {
    const out = await executeLocalTool("grep", { pattern: "snowflake" }, Mode.BUILD, cwd);
    expect(out).toContain("README.md:2");
  });

  test("respects include filter", async () => {
    const out = await executeLocalTool(
      "grep",
      { pattern: "snow", include: "*.txt" },
      Mode.BUILD,
      cwd,
    );
    expect(out).toContain("data.txt");
  });
});

describe("editFile", () => {
  test("replaces a unique occurrence", async () => {
    const out = await executeLocalTool(
      "editFile",
      { filePath: "README.md", oldString: "snowflake is here", newString: "snowflake was here" },
      Mode.BUILD,
      cwd,
    );
    expect(out).toContain("Edited");
    expect(readFileSync(join(cwd, "README.md"), "utf-8")).toContain("snowflake was here");
  });

  test("throws when oldString is missing", () => {
    expect(
      executeLocalTool(
        "editFile",
        { filePath: "README.md", oldString: "does not exist", newString: "x" },
        Mode.BUILD,
        cwd,
      ),
    ).rejects.toThrow("Could not find oldString");
  });

  test("throws when oldString is ambiguous", () => {
    writeFileSync(join(cwd, "dup.txt"), "foo foo\n");
    expect(
      executeLocalTool(
        "editFile",
        { filePath: "dup.txt", oldString: "foo", newString: "bar" },
        Mode.BUILD,
        cwd,
      ),
    ).rejects.toThrow("multiple occurrences");
  });
});

describe("PLAN mode", () => {
  const mutations = [
    ["writeFile", { filePath: "x.txt", content: "x" }],
    ["editFile", { filePath: "README.md", oldString: "a", newString: "b" }],
    ["bash", { command: "echo hi" }],
  ] as const;

  for (const [toolName, args] of mutations) {
    test(`blocks ${toolName}`, () => {
      expect(executeLocalTool(toolName, args, Mode.PLAN, cwd)).rejects.toThrow(
        "not available in PLAN mode",
      );
    });
  }

  test("allows read-only tools", async () => {
    const out = await executeLocalTool("readFile", { filePath: "README.md" }, Mode.PLAN, cwd);
    expect(out).toContain("Hello");
    const globbed = await executeLocalTool("glob", { pattern: "*.md" }, Mode.PLAN, cwd);
    expect(globbed).toContain("README.md");
  });

  test("PLAN mode never modifies the filesystem", async () => {
    const before = readFileSync(join(cwd, "README.md"), "utf-8");
    await expect(
      executeLocalTool("writeFile", { filePath: "plan.txt", content: "x" }, Mode.PLAN, cwd),
    ).rejects.toThrow("not available in PLAN mode");
    expect(readFileSync(join(cwd, "README.md"), "utf-8")).toBe(before);
  });
});

describe("bash", () => {
  test("returns stdout on success", async () => {
    const out = await executeLocalTool("bash", { command: "echo hello-from-snow" }, Mode.BUILD, cwd);
    expect(out.trim()).toBe("hello-from-snow");
  });

  test("throws with exit code on failure", () => {
    expect(
      executeLocalTool("bash", { command: 'node -e "process.exit(3)"' }, Mode.BUILD, cwd),
    ).rejects.toThrow("Exit code 3");
  });

  test("preserves exit code for quoted commands with parens", () => {
    expect(
      executeLocalTool("bash", { command: 'node -e "process.exit(7)"' }, Mode.BUILD, cwd),
    ).rejects.toThrow("Exit code 7");
  });
});

describe("dispatcher", () => {
  test("throws for unknown tool", () => {
    expect(executeLocalTool("nonexistent", {}, Mode.BUILD, cwd)).rejects.toThrow(
      "Unknown tool",
    );
  });
});

import { z } from "zod";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { spawn } from "child_process";

function truncate(str: string, max = 50): string {
  if (!str || str.length <= max) return str;
  return str.substring(0, max) + "...";
}

export const tools = {
  listDirectory: {
    description: "List files in a directory",
    inputSchema: z.object({
      path: z.string().describe("Directory path to list"),
    }),
    execute: async ({ path }: { path: string }) => {
      console.log(`[TOOL] listDirectory(path="${path}")`);
      const files = readdirSync(path);
      return files.join("\n");
    },
  },
  readFile: {
    description: "Read contents of a file",
    inputSchema: z.object({
      path: z.string().describe("File path to read"),
    }),
    execute: async ({ path }: { path: string }) => {
      console.log(`[TOOL] readFile(path="${path}")`);
      const content = readFileSync(path, "utf-8");
      return content;
    },
  },
  createFile: {
    description: "Create a new file with content",
    inputSchema: z.object({
      path: z.string().describe("File path to create"),
      content: z.string().describe("Content to write"),
    }),
    execute: async ({ path, content }: { path: string; content: string }) => {
      console.log(`[TOOL] createFile(path="${path}", content="${truncate(content)}")`);
      writeFileSync(path, content, "utf-8");
      return `File created: ${path}`;
    },
  },
  editFile: {
    description: "Edit an existing file by replacing old content with new content",
    inputSchema: z.object({
      path: z.string().describe("File path to edit"),
      oldContent: z.string().describe("Content to replace"),
      newContent: z.string().describe("New content"),
    }),
    execute: async ({ path, oldContent, newContent }: { path: string; oldContent: string; newContent: string }) => {
      console.log(`[TOOL] editFile(path="${path}", old="${truncate(oldContent)}", new="${truncate(newContent)}")`);
      const content = readFileSync(path, "utf-8");
      const updated = content.replace(oldContent, newContent);
      writeFileSync(path, updated, "utf-8");
      return `File edited: ${path}`;
    },
  },
  bash: {
    description: "Execute a bash command and return stdout, stderr, and exit code. Use this to run tests, builds, git commands, or verify results.",
    inputSchema: z.object({
      command: z.string().describe("The bash command to execute"),
      cwd: z.string().optional().describe("Working directory (defaults to current directory)"),
      timeout: z.number().optional().describe("Timeout in milliseconds (defaults to 30000)"),
    }),
    execute: async ({
      command,
      cwd,
      timeout = 30000,
    }: {
      command: string;
      cwd?: string;
      timeout?: number;
    }) => {
      console.log(`[TOOL] bash(command="${truncate(command, 80)}", cwd="${cwd || process.cwd()}")`);

      return new Promise<string>((resolve) => {
        const workingDir = cwd || process.cwd();

        const child = spawn(command, {
          shell: true,
          cwd: workingDir,
          timeout,
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("close", (exitCode) => {
          const result = {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: exitCode ?? 1,
            success: exitCode === 0,
          };

          console.log(`[TOOL] bash completed: exitCode=${result.exitCode}, success=${result.success}`);

          resolve(
            `Exit Code: ${result.exitCode}\n` +
            `Success: ${result.success}\n` +
            `--- STDOUT ---\n${result.stdout || "(empty)"}\n` +
            `--- STDERR ---\n${result.stderr || "(empty)"}`
          );
        });

        child.on("error", (error) => {
          console.log(`[TOOL] bash error: ${error.message}`);
          resolve(
            `Exit Code: 1\n` +
            `Success: false\n` +
            `--- STDOUT ---\n(empty)\n` +
            `--- STDERR ---\n${error.message}`
          );
        });
      });
    },
  },
};

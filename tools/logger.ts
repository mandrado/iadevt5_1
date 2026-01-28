import { writeFileSync, appendFileSync } from "fs";
import { randomUUID } from "crypto";

const LOG_FILE = "context.log";
const sessionId = randomUUID();

function logToFile(content: string) {
  appendFileSync(LOG_FILE, content);
}

function logContextWindow(messages: any[], systemPrompt?: string, tools?: any[]) {
  const separator = "=".repeat(80);
  const timestamp = new Date().toISOString();
  const totalMessages = messages?.length || 0;

  logToFile(`${separator}\n`);
  logToFile(`SESSION: ${sessionId}\n`);
  logToFile(`TIMESTAMP: ${timestamp}\n`);
  logToFile(`TOTAL MESSAGES: ${totalMessages}\n`);
  logToFile(`${separator}\n\n`);

  const payload: any = {};
  if (systemPrompt) {
    payload.system = systemPrompt;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  payload.messages = messages;

  logToFile(JSON.stringify(payload, null, 2) + "\n\n");
  logToFile(`${separator}\n\n`);
}

function cleanMessages(messages: any[]) {
  return messages.map((msg: any) => {
    if (msg.role === "user" || msg.role === "system") {
      return { role: msg.role, content: msg.content };
    }
    if (msg.role === "assistant") {
      const result: any = { role: "assistant", content: [] };
      if (Array.isArray(msg.content)) {
        const items = msg.content
          .filter((c: any) => c.type === "text" || c.type === "tool-call")
          .map((c: any) => {
            if (c.type === "text") return { type: "text", text: c.text };
            if (c.type === "tool-call") {
              return {
                type: "tool-call",
                toolCallId: c.toolCallId,
                toolName: c.toolName,
                input: c.args,
              };
            }
            return c;
          });
        result.content.push(...items);
      } else if (typeof msg.content === "string" && msg.content) {
        result.content.push({ type: "text", text: msg.content });
      }
      if (Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          result.content.push({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.function?.name,
            input: tc.function?.arguments ? JSON.parse(tc.function.arguments) : undefined,
          });
        }
      }
      return result;
    }
    if (msg.role === "tool") {
      if (Array.isArray(msg.content)) {
        return {
          role: "tool",
          content: msg.content.map((c: any) => ({
            type: "tool-result",
            toolCallId: c.toolCallId,
            toolName: c.toolName,
            output: c.result,
          })),
        };
      }
      return {
        role: "tool",
        content: [{
          type: "tool-result",
          toolCallId: msg.tool_call_id,
          toolName: msg.name,
          output: msg.content,
        }],
      };
    }
    return msg;
  });
}

function cleanStepResponse(content: any[]) {
  const result: any[] = [];
  for (const item of content || []) {
    if (item.type === "text" && item.text) {
      result.push({ type: "text", text: item.text });
    }
    if (item.type === "tool-call") {
      result.push({
        type: "tool-call",
        toolCallId: item.toolCallId,
        toolName: item.toolName,
        input: item.input,
      });
    }
  }
  return result;
}

function cleanToolResults(content: any[]) {
  const result: any[] = [];
  for (const item of content || []) {
    if (item.type === "tool-result") {
      result.push({
        type: "tool-result",
        toolCallId: item.toolCallId,
        toolName: item.toolName,
        output: item.output,
      });
    }
  }
  return result;
}

export function initLogFile() {
  writeFileSync(LOG_FILE, `=== Context Window Log - Started ${new Date().toISOString()} ===\n\n\n`);
}

function cleanTools(tools: any[]) {
  if (!tools || !Array.isArray(tools)) return [];
  return tools.map((tool: any) => ({
    name: tool.name || tool.function?.name,
    description: tool.description || tool.function?.description,
    parameters: tool.parameters || tool.function?.parameters,
  }));
}

export function logStep(step: any) {
  const body = step.request?.body as any;
  const requestMessages = body?.messages ? cleanMessages(body.messages) : [];
  const systemPrompt = body?.system || body?.messages?.find((m: any) => m.role === "system")?.content;
  const tools = cleanTools(body?.tools);

  const assistantResponse = cleanStepResponse(step.content);
  if (assistantResponse.length > 0) {
    requestMessages.push({ role: "assistant", content: assistantResponse });
  }

  const toolResults = cleanToolResults(step.content);
  if (toolResults.length > 0) {
    requestMessages.push({ role: "tool", content: toolResults });
  }

  logContextWindow(requestMessages, systemPrompt, tools);
  console.log(`[STEP] completed - input: ${step.usage?.inputTokens || 0}, output: ${step.usage?.outputTokens || 0}`);
}

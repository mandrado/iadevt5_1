import "dotenv/config";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, stepCountIs } from "ai";
import { tools } from "./tools";
import { initLogFile, logStep } from "./logger";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) {
    console.log("Usage: npx ts-node main.ts <your prompt>");
    process.exit(1);
  }
  if (!process.env.OPENROUTER_MODEL) {
    throw new Error("OPENROUTER_MODEL not set in .env");
  }
  initLogFile();

  const systemPrompt = readFileSync(join(__dirname, "SYSTEM.md"), "utf-8");

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const { text } = await generateText({
    model: openrouter(process.env.OPENROUTER_MODEL),
    system: systemPrompt,
    prompt,
    stopWhen: stepCountIs(5),
    onStepFinish: logStep,
  });
  console.log(text);
}

main();

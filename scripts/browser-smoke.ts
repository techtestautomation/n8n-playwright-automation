import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const artifactDir = resolve("artifacts");
await mkdir(artifactDir, { recursive: true });
const screenshot = resolve(artifactDir, "browser-smoke.png");

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.setContent(
      "<html><head><title>Playwright Smoke</title></head><body><h1>Increment 1</h1></body></html>",
    );
    const title = await page.title();
    if (title !== "Playwright Smoke")
      throw new Error(`Unexpected title: ${title}`);
    await page.screenshot({ path: screenshot });
    console.log(`PASS browser smoke: ${screenshot}`);
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}

import path from "node:path";
import { existsSync, promises as fs } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { config } from "../../config";
import { ApiError } from "../../lib/errors";

type Session = { context: BrowserContext; page: Page; updatedAt: number };
const sessions = new Map<string, Session>();

function executablePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean) as string[];
  return candidates.find((candidate) => existsSync(candidate));
}

function safeUrl(input: string) {
  try {
    const url = new URL(input, `http://127.0.0.1:${config.port}`);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    if (url.hostname === "localhost" || url.hostname === "0.0.0.0") url.hostname = "127.0.0.1";
    return url.toString();
  } catch { throw new ApiError(400, "Informe uma URL HTTP ou HTTPS válida."); }
}

async function getSession(sessionId: string) {
  const existing = sessions.get(sessionId);
  if (existing && !existing.page.isClosed()) { existing.updatedAt = Date.now(); return existing; }
  const browserPath = executablePath();
  if (!browserPath) throw new ApiError(503, "Chrome ou Edge não foi encontrado para iniciar a sessão integrada.");
  const profile = path.join(config.projectRoot, ".runtime", "browser", sessionId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  await fs.mkdir(profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, { executablePath: browserPath, headless: true, viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
  const page = context.pages()[0] ?? await context.newPage();
  const session = { context, page, updatedAt: Date.now() };
  sessions.set(sessionId, session);
  return session;
}

export async function browserSnapshot(sessionId: string) {
  const session = await getSession(sessionId);
  const image = await session.page.screenshot({ type: "jpeg", quality: 72 });
  return { image, url: session.page.url(), title: await session.page.title().catch(() => ""), width: 1440, height: 900 };
}

export async function navigateBrowser(sessionId: string, target: string) {
  const session = await getSession(sessionId);
  const url = safeUrl(target);
  await session.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  return browserSnapshot(sessionId);
}

export async function browserState(sessionId: string) {
  const session = await getSession(sessionId);
  const text = await session.page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  const controls = await session.page.locator("a,button,input,textarea,select").evaluateAll((elements) => elements.slice(0, 100).map((element) => ({
    tag: element.tagName.toLowerCase(), text: (element.textContent || "").trim().slice(0, 180),
    label: element.getAttribute("aria-label"), name: element.getAttribute("name"), href: element.getAttribute("href")
  }))).catch(() => []);
  return { url: session.page.url(), title: await session.page.title().catch(() => ""), text: text.slice(0, 20_000), controls };
}

export async function interactBrowser(sessionId: string, action: "click" | "click_text" | "type" | "back" | "reload" | "scroll", data: { x?: number; y?: number; deltaY?: number; text?: string; selector?: string }) {
  const session = await getSession(sessionId);
  if (action === "click") await session.page.mouse.click(Math.max(0, data.x ?? 0), Math.max(0, data.y ?? 0));
  if (action === "click_text") await session.page.getByText(data.text ?? "", { exact: true }).first().click({ timeout: 10_000 });
  if (action === "type") {
    if (!data.selector) throw new ApiError(400, "Informe o seletor do campo.");
    await session.page.locator(data.selector).first().fill(data.text ?? "", { timeout: 10_000 });
  }
  if (action === "back") await session.page.goBack({ waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => null);
  if (action === "reload") await session.page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
  if (action === "scroll") await session.page.mouse.wheel(0, data.deltaY ?? 600);
  await session.page.waitForTimeout(250);
  return browserSnapshot(sessionId);
}

setInterval(() => {
  const cutoff = Date.now() - 30 * 60_000;
  for (const [id, session] of sessions) if (session.updatedAt < cutoff) { void session.context.close(); sessions.delete(id); }
}, 5 * 60_000).unref();

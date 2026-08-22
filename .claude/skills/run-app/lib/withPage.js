/**
 * Resolves Playwright without requiring it as a project devDependency.
 * It isn't installed under node_modules here — this repo ships to Expo
 * Go/EAS and has no browser-test story of its own. This resolves whatever
 * copy `npx playwright` last cached under ~/.npm/_npx instead of
 * re-downloading Chromium on every run. If that cache is ever cleared,
 * `npx --yes playwright install chromium` once will repopulate it.
 *
 * Usage:
 *   const { withPage } = require('./lib/withPage');
 *   await withPage(async (page) => {
 *     await page.goto('http://localhost:8081');
 *     ...
 *   });
 */
const { execSync } = require('child_process');
const path = require('path');

function resolvePlaywrightModuleDir() {
  try {
    const npxRoot = execSync('npm config get cache', { encoding: 'utf8' }).trim();
    const out = execSync(
      `find "${path.join(npxRoot, '_npx')}" -maxdepth 3 -iname playwright -type d 2>/dev/null | head -1`,
      { encoding: 'utf8' },
    ).trim();
    if (out) return path.dirname(out);
  } catch {
    // fall through
  }
  return null;
}

function loadChromium() {
  try {
    return require('playwright').chromium;
  } catch {
    const dir = resolvePlaywrightModuleDir();
    if (!dir) {
      throw new Error(
        "Playwright not found in node_modules or the npx cache. Run `npx --yes playwright install chromium` once, then retry.",
      );
    }
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(path.join(dir, 'playwright')).chromium;
  }
}

async function withPage(fn, { viewport = { width: 420, height: 900 }, logConsoleErrors = true } = {}) {
  const chromium = loadChromium();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    if (logConsoleErrors) {
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
      });
    }
    return await fn(page);
  } finally {
    await browser.close();
  }
}

module.exports = { withPage, loadChromium };

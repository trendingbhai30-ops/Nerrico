// Diagnose "Failed to launch the browser process!" — try to open Remotion's browser directly.
import { openBrowser, ensureBrowser } from '@remotion/renderer';

try {
  console.log('cwd:', process.cwd());
  const status = await ensureBrowser();
  console.log('ensureBrowser ok:', JSON.stringify(status));
  const browser = await openBrowser('chrome');
  console.log('browser launched OK');
  await browser.close({ silent: true });
  console.log('closed OK');
} catch (e) {
  console.error('FAILED:', e);
  process.exit(1);
}

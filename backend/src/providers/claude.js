import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLAUDE_TIMEOUT_MS, PLAN_ATTEMPTS } from '../config/constants.js';
import { extractJson } from '../utils/json.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('claude');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CWD = path.join(__dirname, '..', '..'); // backend/

/**
 * Ask Claude Code (headless `claude -p`) a question and get the text reply.
 * Uses the user's Claude Code login — no API key involved.
 * The prompt goes in via stdin so Windows command-line length limits don't apply.
 */
export function askClaude(prompt, { timeoutMs = CLAUDE_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', '--output-format', 'text'], {
      cwd: CWD,
      shell: true,
      windowsHide: true,
    });

    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Claude took too long to respond (timeout)'));
    }, timeoutMs);

    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Could not start claude CLI: ${e.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && out.trim()) {
        resolve(out.trim());
      } else {
        reject(new Error(`claude exited with code ${code}: ${err.slice(0, 400) || 'no output'}`));
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Ask Claude for JSON and validate it. On a validation failure the prompt is
 * retried once with the error appended, so the model can correct itself.
 * `validate(parsedJson)` must return the normalized result or throw.
 */
export async function askClaudeJson(prompt, validate, { attempts = PLAN_ATTEMPTS, label = 'plan' } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const raw = await askClaude(
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous answer was invalid: ${lastError}. Output ONLY the corrected JSON.`
    );
    try {
      return validate(extractJson(raw));
    } catch (e) {
      lastError = e.message;
      log.warn(`${label} attempt ${attempt + 1} invalid:`, lastError);
    }
  }
  throw new Error(`${label} failed: ${lastError}`);
}

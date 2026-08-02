import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'branding.json');

let cached = null;

/** Branding for branded modes (Kastoori). Returns null if no config exists. */
export function getBranding() {
  if (cached) return cached;
  if (!fs.existsSync(CONFIG_FILE)) return null;
  const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  cached = {
    name: raw.name || 'Kastoori Real Estate',
    ctaLine: raw.ctaLine || '',
    phone: raw.phone || '',
    instagram: raw.instagram || '',
    colors: raw.colors || {},
    logoFile: raw.logo && fs.existsSync(path.join(CONFIG_DIR, raw.logo)) ? raw.logo : null,
  };
  return cached;
}

export function logoPath() {
  const b = getBranding();
  return b && b.logoFile ? path.join(CONFIG_DIR, b.logoFile) : null;
}

/**
 * The branding object passed into Remotion inputProps for a branded project,
 * with the logo referenced as an HTTP URL (same pattern as audio/photos).
 * Returns null when the mode is unbranded or no config exists.
 */
export function brandingProps(port) {
  const b = getBranding();
  if (!b) return null;
  return {
    name: b.name,
    ctaLine: b.ctaLine,
    phone: b.phone,
    instagram: b.instagram,
    colors: b.colors,
    logoUrl: b.logoFile ? `http://127.0.0.1:${port}/api/branding/logo` : null,
  };
}

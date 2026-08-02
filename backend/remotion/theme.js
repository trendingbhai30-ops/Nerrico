// Vox documentary palette — warm paper, black ink, orange accent.
// Scheme 0 (paper) is the default look; 1-3 are for dramatic beats.
export const SCHEMES = [
  { bg: '#E5E1D8', ink: '#191919', accent: '#F28C1E', paper: true }, // warm gray paper + grid
  { bg: '#191712', ink: '#F0EBE1', accent: '#F28C1E', paper: false }, // near-black
  { bg: '#F28C1E', ink: '#191919', accent: '#F0EBE1', paper: false }, // orange
  { bg: '#C6472E', ink: '#F0EBE1', accent: '#191919', paper: false }, // brick red
];

export const ORANGE = '#F28C1E';
export const CARD_BG = '#F5F1E6';
export const INK = '#191919';

export const HEADLINE_FONT = "'Arial Black', 'Archivo Black', Impact, sans-serif";
export const LABEL_FONT = "'Arial', 'Helvetica Neue', sans-serif";
export const TYPEWRITER_FONT = "'Courier New', 'Courier', monospace";

export function scheme(index) {
  return SCHEMES[((index % SCHEMES.length) + SCHEMES.length) % SCHEMES.length];
}

/** Readable text color for content sitting on top of `hex`. */
export function contrastOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 128 ? '#191919' : '#F0EBE1';
}

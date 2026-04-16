export const LABELS = {
  'rgb-split': 'RGB SPLIT',
  'scanlines': 'SCANLINES',
  'pixel-sort': 'PIXEL SORT',
  'data-corrupt': 'DATA CORRUPT',
  'neon-burn': 'NEON BURN',
  'vhs': 'VHS TAPE',
  'hologram': 'HOLOGRAM',
  'noise': 'STATIC NOISE',
  'edge-glow': 'EDGE GLOW',
  'invert': 'INVERT',
  'posterize': 'POSTERIZE',
  'channel-swap': 'CHANNEL SWAP',
  'smear': 'LIGHT SMEAR',
  'all-glitch': 'FULL GLITCH'
};

export const DEFAULTS = {
  'rgb-split': { x: 12, y: 4, intensity: 7, bands: 6, speed: 0 },
  'scanlines': { height: 2, gap: 4, opacity: 60, speed: 0 },
  'pixel-sort': { lo: 80, hi: 200, dir: 0, chunk: 30, speed: 0 },
  'data-corrupt': { amount: 15, bh: 8, shift: 60, color: 1, speed: 0 },
  'neon-burn': { intensity: 8, hue: 180, sat: 180, speed: 0 },
  'vhs': { noise: 30, jitter: 10, tracking: 5, bleed: 10, speed: 0 },
  'hologram': { opacity: 70, lines: 3, shift: 5, speed: 0 },
  'noise': { amount: 25, color: 0, blend: 70, speed: 0 },
  'edge-glow': { threshold: 30, glow: 4, darkbg: 1, speed: 0 },
  'invert': { amount: 100 },
  'posterize': { levels: 4, speed: 0 },
  'channel-swap': { mode: 1 },
  'smear': { threshold: 200, length: 40, speed: 0 },
  'all-glitch': { intensity: 5 },
};

export const PARAM_DEFS = {
  'rgb-split': [
    { k: 'x', l: 'SHIFT X', mn: 0, mx: 40 },
    { k: 'y', l: 'SHIFT Y', mn: 0, mx: 30 },
    { k: 'intensity', l: 'INTENSITY', mn: 0, mx: 10 },
    { k: 'bands', l: 'BANDS', mn: 0, mx: 20 },
    { k: 'speed', l: 'ANIM SPEED', mn: 0, mx: 20 }
  ],
  'scanlines': [
    { k: 'height', l: 'THICKNESS', mn: 0, mx: 10 },
    { k: 'gap', l: 'GAP', mn: 2, mx: 20 },
    { k: 'opacity', l: 'OPACITY', mn: 0, mx: 100 },
    { k: 'speed', l: 'ROLL SPEED', mn: 0, mx: 20 }
  ],
  'pixel-sort': [
    { k: 'lo', l: 'THRESHOLD MIN', mn: 0, mx: 255 },
    { k: 'hi', l: 'THRESHOLD MAX', mn: 0, mx: 255 },
    { k: 'chunk', l: 'RANGE', mn: 0, mx: 100 },
    { k: 'speed', l: 'ANIM SPEED', mn: 0, mx: 20 }
  ],
  'data-corrupt': [
    { k: 'amount', l: 'BLOCKS', mn: 0, mx: 60 },
    { k: 'bh', l: 'HEIGHT', mn: 0, mx: 40 },
    { k: 'shift', l: 'SHIFT', mn: 0, mx: 200 },
    { k: 'speed', l: 'JITTER', mn: 0, mx: 20 }
  ],
  'neon-burn': [
    { k: 'intensity', l: 'POWER', mn: 0, mx: 20 },
    { k: 'hue', l: 'HUE SHIFT', mn: 0, mx: 360 },
    { k: 'sat', l: 'SATURATION', mn: 0, mx: 300 },
    { k: 'speed', l: 'CYCLE', mn: 0, mx: 20 }
  ],
  'vhs': [
    { k: 'noise', l: 'NOISE', mn: 0, mx: 100 },
    { k: 'jitter', l: 'JITTER', mn: 0, mx: 30 },
    { k: 'bleed', l: 'COLOR BLEED', mn: 0, mx: 30 },
    { k: 'speed', l: 'DRIFT', mn: 0, mx: 20 }
  ],
  'hologram': [
    { k: 'opacity', l: 'OPACITY', mn: 0, mx: 100 },
    { k: 'lines', l: 'LINES', mn: 0, mx: 10 },
    { k: 'shift', l: 'SHIFT', mn: 0, mx: 20 },
    { k: 'speed', l: 'ANIM SPEED', mn: 0, mx: 20 }
  ],
  'noise': [
    { k: 'amount', l: 'INTENSITY', mn: 0, mx: 100 },
    { k: 'blend', l: 'BLENDING', mn: 0, mx: 100 },
    { k: 'speed', l: 'PULSE', mn: 0, mx: 20 }
  ],
  'edge-glow': [
    { k: 'threshold', l: 'THRESHOLD', mn: 0, mx: 100 },
    { k: 'glow', l: 'GLOW', mn: 0, mx: 20 },
    { k: 'speed', l: 'ANIM SPEED', mn: 0, mx: 20 }
  ],
  'invert': [
    { k: 'amount', l: 'INTENSITY', mn: 0, mx: 100 }
  ],
  'posterize': [
    { k: 'levels', l: 'LEVELS', mn: 2, mx: 16 },
    { k: 'speed', l: 'PULSE', mn: 0, mx: 20 }
  ],
  'channel-swap': [
    { k: 'mode', l: 'MODE (1-5)', mn: 1, mx: 5 }
  ],
  'smear': [
    { k: 'threshold', l: 'BRIGHTNESS', mn: 0, mx: 255 },
    { k: 'length', l: 'LENGTH', mn: 0, mx: 200 },
    { k: 'speed', l: 'ANIM SPEED', mn: 0, mx: 20 }
  ],
  'all-glitch': [
    { k: 'intensity', l: 'CHAOS', mn: 0, mx: 10 }
  ],
};

export const PRESETS = {
  vaporwave: { chain: [{ id: 'neon-burn', params: { intensity: 12, hue: 280, sat: 230 } }], accent: '#00fff9' },
  matrix: { chain: [{ id: 'edge-glow', params: { threshold: 20, glow: 10, darkbg: 1 } }], accent: '#00ff41' },
  netpunk: { chain: [{ id: 'rgb-split', params: { x: 20, y: 8, bands: 12, intensity: 9 } }, { id: 'scanlines', params: { height: 2, gap: 4, opacity: 40 } }], accent: '#00fff9' },
  ghost: { chain: [{ id: 'hologram', params: { opacity: 55, lines: 8, shift: 12 } }], accent: '#00fff9' },
  corrupted: { chain: [{ id: 'data-corrupt', params: { amount: 40, bh: 15, shift: 120, color: 1 } }, { id: 'rgb-split', params: { x: 10, y: 3, bands: 8, intensity: 5 } }], accent: '#00fff9' },
  'retro-tv': { chain: [{ id: 'vhs', params: { noise: 45, jitter: 20, tracking: 15, bleed: 20 } }, { id: 'scanlines', params: { height: 2, gap: 3, opacity: 50 } }], accent: '#00fff9' },
  'cyber-psycho': { chain: [{ id: 'edge-glow', params: { threshold: 25, glow: 8, darkbg: 1 } }, { id: 'channel-swap', params: { mode: 2 } }, { id: 'smear', params: { threshold: 180, length: 80 } }, { id: 'neon-burn', params: { intensity: 14, hue: 320, sat: 200 } }], accent: '#ff00ff' },
  'terminal-error': { chain: [{ id: 'invert', params: { amount: 100 } }, { id: 'data-corrupt', params: { amount: 30, bh: 10, shift: 80, color: 0 } }, { id: 'noise', params: { amount: 40, blend: 50 } }, { id: 'scanlines', params: { height: 1, gap: 2, opacity: 70 } }], accent: '#00ff41' },
  'acid-trip': { chain: [{ id: 'rgb-split', params: { x: 30, y: 15, intensity: 10, bands: 4 } }, { id: 'posterize', params: { levels: 3 } }, { id: 'smear', params: { threshold: 150, length: 120 } }, { id: 'noise', params: { amount: 20, blend: 80 } }], accent: '#7700ff' },
  'dark-web': { chain: [{ id: 'hologram', params: { opacity: 40, lines: 4, shift: 10, speed: 5 } }, { id: 'pixel-sort', params: { lo: 20, hi: 100, dir: 0, chunk: 50 } }, { id: 'vhs', params: { noise: 50, jitter: 25, tracking: 10, bleed: 25 } }], accent: '#00fff9' },
  'golden-era': { chain: [{ id: 'neon-burn', params: { intensity: 6, hue: 45, sat: 120 } }, { id: 'smear', params: { threshold: 220, length: 30 } }, { id: 'noise', params: { amount: 15, blend: 40 } }], accent: '#ffff00' },
  'blood-drive': { chain: [{ id: 'edge-glow', params: { threshold: 15, glow: 12, darkbg: 1 } }, { id: 'rgb-split', params: { x: 5, y: 20, bands: 3, intensity: 8 } }, { id: 'posterize', params: { levels: 4 } }], accent: '#ff003c' },
  'dreamcore': { chain: [{ id: 'smear', params: { threshold: 160, length: 150, speed: 5 } }, { id: 'hologram', params: { opacity: 30, lines: 2, shift: 8, speed: 2 } }, { id: 'noise', params: { amount: 10, blend: 90, speed: 10 } }], accent: '#7700ff' },
  'frozen-data': { chain: [{ id: 'invert', params: { amount: 100 } }, { id: 'hologram', params: { opacity: 60, lines: 10, shift: 5, speed: 8 } }, { id: 'pixel-sort', params: { lo: 100, hi: 255, dir: 1, chunk: 40 } }], accent: '#00fff9' },
  'toxic-spill': { chain: [{ id: 'neon-burn', params: { intensity: 15, hue: 120, sat: 250, speed: 10 } }, { id: 'data-corrupt', params: { amount: 20, bh: 20, shift: 150, color: 1, speed: 5 } }], accent: '#00ff41' },
};

export const FX_LIST = Object.keys(LABELS);
export const FX_MAP = Object.fromEntries(FX_LIST.map((id, idx) => [id, idx]));

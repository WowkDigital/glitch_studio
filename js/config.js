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
  'all-glitch': 'FULL GLITCH'
};

export const DEFAULTS = {
  'rgb-split': { x: 12, y: 4, intensity: 7, bands: 6 },
  'scanlines': { height: 2, gap: 4, opacity: 60 },
  'pixel-sort': { lo: 80, hi: 200, dir: 0, chunk: 30 },
  'data-corrupt': { amount: 15, bh: 8, shift: 60, color: 1 },
  'neon-burn': { intensity: 8, hue: 180, sat: 180 },
  'vhs': { noise: 30, jitter: 10, tracking: 5, bleed: 10 },
  'hologram': { opacity: 70, lines: 3, shift: 5 },
  'noise': { amount: 25, color: 0, blend: 70 },
  'edge-glow': { threshold: 30, glow: 4, darkbg: 1 },
  'all-glitch': { intensity: 5 },
};

export const PARAM_DEFS = {
  'rgb-split': [
    { k: 'x', l: 'SHIFT X', mn: 0, mx: 40 },
    { k: 'y', l: 'SHIFT Y', mn: 0, mx: 30 },
    { k: 'intensity', l: 'INTENSITY', mn: 0, mx: 10 },
    { k: 'bands', l: 'BANDS', mn: 0, mx: 20 }
  ],
  'scanlines': [
    { k: 'height', l: 'THICKNESS', mn: 0, mx: 10 },
    { k: 'gap', l: 'GAP', mn: 2, mx: 20 },
    { k: 'opacity', l: 'OPACITY', mn: 0, mx: 100 }
  ],
  'pixel-sort': [
    { k: 'lo', l: 'THRESHOLD MIN', mn: 0, mx: 255 },
    { k: 'hi', l: 'THRESHOLD MAX', mn: 0, mx: 255 },
    { k: 'chunk', l: 'RANGE', mn: 0, mx: 100 }
  ],
  'data-corrupt': [
    { k: 'amount', l: 'BLOCKS', mn: 0, mx: 60 },
    { k: 'bh', l: 'HEIGHT', mn: 0, mx: 40 },
    { k: 'shift', l: 'SHIFT', mn: 0, mx: 200 }
  ],
  'neon-burn': [
    { k: 'intensity', l: 'POWER', mn: 0, mx: 20 },
    { k: 'hue', l: 'HUE SHIFT', mn: 0, mx: 360 },
    { k: 'sat', l: 'SATURATION', mn: 0, mx: 300 }
  ],
  'vhs': [
    { k: 'noise', l: 'NOISE', mn: 0, mx: 100 },
    { k: 'jitter', l: 'JITTER', mn: 0, mx: 30 },
    { k: 'bleed', l: 'COLOR BLEED', mn: 0, mx: 30 }
  ],
  'hologram': [
    { k: 'opacity', l: 'OPACITY', mn: 0, mx: 100 },
    { k: 'lines', l: 'LINES', mn: 0, mx: 10 },
    { k: 'shift', l: 'SHIFT', mn: 0, mx: 20 }
  ],
  'noise': [
    { k: 'amount', l: 'INTENSITY', mn: 0, mx: 100 },
    { k: 'blend', l: 'BLENDING', mn: 0, mx: 100 }
  ],
  'edge-glow': [
    { k: 'threshold', l: 'THRESHOLD', mn: 0, mx: 100 },
    { k: 'glow', l: 'GLOW', mn: 0, mx: 20 }
  ],
  'all-glitch': [
    { k: 'intensity', l: 'CHAOS', mn: 0, mx: 10 }
  ],
};


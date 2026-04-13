/**
 * RNG Helper: Mulberry32
 */
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function applyFx(d, w, h, id, p, rng, accentColor) {
  if (id === 'rgb-split') fxRGB(d, w, h, p, rng);
  else if (id === 'scanlines') fxSL(d, w, h, p);
  else if (id === 'pixel-sort') fxPS(d, w, h, p);
  else if (id === 'data-corrupt') fxDC(d, w, h, p, rng);
  else if (id === 'neon-burn') fxNB(d, w, h, p, accentColor);
  else if (id === 'vhs') fxVHS(d, w, h, p, rng);
  else if (id === 'hologram') fxHolo(d, w, h, p, accentColor);
  else if (id === 'noise') fxNoise(d, w, h, p, rng);
  else if (id === 'edge-glow') fxEdge(d, w, h, p, accentColor);
  else if (id === 'all-glitch') fxAll(d, w, h, p, rng);
}

function fxRGB(d, w, h, p, rng) {
  const sx = p.x || 12, sy = p.y || 4, it = (p.intensity || 7) / 10, bn = Math.max(1, p.bands || 6);
  const orig = new Uint8ClampedArray(d); const bh = Math.ceil(h / bn);
  for (let b = 0; b < bn; b++) {
    const rs = b * bh, re = Math.min(rs + bh, h);
    const rx = (rng() > .5 ? 1 : -1) * sx * (0.5 + rng() * .5) * it, ry = (rng() > .5 ? 1 : -1) * sy * (0.5 + rng() * .5) * it;
    const gx = -(rng() > .5 ? 1 : -1) * sx * .3 * it;
    for (let y = rs; y < re; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const rx2 = Math.round(x + rx), ry2 = Math.round(y + ry);
      if (rx2 >= 0 && rx2 < w && ry2 >= 0 && ry2 < h) d[i] = orig[(ry2 * w + rx2) * 4];
      const gx2 = Math.round(x + gx); if (gx2 >= 0 && gx2 < w) d[i + 1] = orig[(y * w + gx2) * 4 + 1];
      d[i + 2] = orig[i + 2];
    }
  }
}

function fxSL(d, w, h, p) {
  const lh = Math.max(1, p.height || 2), gap = Math.max(1, p.gap || 4), op = (p.opacity || 60) / 100, per = lh + gap;
  for (let y = 0; y < h; y++) if (y % per < lh) { const f = 1 - op; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; } }
}

function fxPS(d, w, h, p) {
  const lo = p.lo || 80, hi = p.hi || 200, hor = !(p.dir > 0.5), cp = (p.chunk || 30) / 100;
  function lm(i) { return .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; }
  if (hor) {
    for (let y = 0; y < h; y++) { let x = 0; while (x < w) { const l0 = lm((y * w + x) * 4); if (l0 >= lo && l0 <= hi) { let e = x; const mr = Math.round(w * cp); while (e < w && e - x < mr) { if (lm((y * w + e) * 4) < lo || lm((y * w + e) * 4) > hi) break; e++; } const px = []; for (let p2 = x; p2 < e; p2++) { const i = (y * w + p2) * 4; px.push([d[i], d[i + 1], d[i + 2], d[i + 3], lm(i)]); } px.sort((a, b) => a[4] - b[4]); for (let p2 = x; p2 < e; p2++) { const i = (y * w + p2) * 4, q = px[p2 - x]; d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; } x = e; } else x++; } }
  } else {
    for (let x = 0; x < w; x++) { let y = 0; while (y < h) { const l0 = lm((y * w + x) * 4); if (l0 >= lo && l0 <= hi) { let e = y; const mr = Math.round(h * cp); while (e < h && e - y < mr) { if (lm((e * w + x) * 4) < lo || lm((e * w + x) * 4) > hi) break; e++; } const px = []; for (let py = y; py < e; py++) { const i = (py * w + x) * 4; px.push([d[i], d[i + 1], d[i + 2], d[i + 3], lm(i)]); } px.sort((a, b) => a[4] - b[4]); for (let py = y; py < e; py++) { const i = (py * w + x) * 4, q = px[py - y]; d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; } y = e; } else y++; } }
  }
}

function fxDC(d, w, h, p, rng) {
  const amt = p.amount || 15, bh = p.bh || 8, sh = p.shift || 60, col = (p.color || 1) > .5;
  for (let i = 0; i < amt; i++) {
    const y = Math.floor(rng() * h), dh = Math.ceil(rng() * bh), dx = Math.round((rng() - .5) * 2 * sh), cr = col ? Math.floor(rng() * 3) : -1;
    for (let dy = 0; dy < dh && y + dy < h; dy++) for (let x = 0; x < w; x++) {
      const src = ((y + dy) * w + Math.min(Math.max(x + dx, 0), w - 1)) * 4, dst = ((y + dy) * w + x) * 4;
      if (cr >= 0) { d[dst + cr] = d[src + cr]; if (rng() < .1) d[dst + cr] = Math.floor(rng() * 256); } else { d[dst] = d[src]; d[dst + 1] = d[src + 1]; d[dst + 2] = d[src + 2]; }
    }
  }
}

function fxNB(d, w, h, p, accentColor) {
  const it = (p.intensity || 8) / 10, hs = p.hue || 180, sat = (p.sat || 180) / 100;
  const ar = parseInt(accentColor.slice(1, 3), 16), ag = parseInt(accentColor.slice(3, 5), 16), ab = parseInt(accentColor.slice(5, 7), 16);
  const ang = hs * Math.PI / 180, cos = Math.cos(ang), sin = Math.sin(ang);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], lum = (r + g + b) / 3;
    const nr = r * (.213 + cos * .787 - sin * .213) + g * (.715 - cos * .715 - sin * .715) + b * (.072 - cos * .072 + sin * .928);
    const ng = r * (.213 - cos * .213 + sin * .143) + g * (.715 + cos * .285 + sin * .14) + b * (.072 - cos * .072 - sin * .283);
    const nb = r * (.213 - cos * .213 - sin * .787) + g * (.715 - cos * .715 + sin * .715) + b * (.072 + cos * .928 + sin * .072);
    const bl = lum / 255, fr = nr * (1 - it * .5) + ar * bl * it * .5, fg = ng * (1 - it * .5) + ag * bl * it * .5, fb = nb * (1 - it * .5) + ab * bl * it * .5;
    const gy = .299 * fr + .587 * fg + .114 * fb;
    d[i] = Math.min(255, gy + (fr - gy) * sat); d[i + 1] = Math.min(255, gy + (fg - gy) * sat); d[i + 2] = Math.min(255, gy + (fb - gy) * sat);
  }
}

function fxVHS(d, w, h, p, rng) {
  const na = (p.noise || 30) / 100, jt = p.jitter || 10, tr = p.tracking || 5, bl = p.bleed || 10;
  const orig = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) {
    const to = Math.round(Math.sin(y / (h / tr) + rng() * Math.PI) * jt);
    for (let x = 0; x < w; x++) {
      const sx = Math.min(Math.max(x + to, 0), w - 1), src = (y * w + sx) * 4, i = (y * w + x) * 4;
      const bx = Math.min(Math.max(x - Math.round(bl * rng()), 0), w - 1), bsrc = (y * w + bx) * 4;
      d[i] = orig[bsrc]; d[i + 1] = orig[src + 1]; d[i + 2] = orig[src + 2];
      if (rng() < na) { const n = (rng() - .5) * 80; d[i] = Math.min(255, Math.max(0, d[i] + n)); d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n)); d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n)); }
    }
  }
}

function fxHolo(d, w, h, p, accentColor) {
  const op = (p.opacity || 70) / 100, ln = p.lines || 3, sh = p.shift || 5;
  const ar = parseInt(accentColor.slice(1, 3), 16), ag = parseInt(accentColor.slice(3, 5), 16), ab = parseInt(accentColor.slice(5, 7), 16);
  const per = Math.ceil(h / (ln * 2)), orig = new Uint8ClampedArray(d);
  for (let i = 0; i < d.length; i += 4) {
    const gy = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2], y = Math.floor((i / 4) / w), la = (y % per) / per < .5 ? op : op * .4;
    d[i] = gy * (1 - la) + ar * la; d[i + 1] = gy * (1 - la) + ag * la; d[i + 2] = gy * (1 - la) + ab * la;
  }
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x++) {
    const src = (y * w + Math.min(x + Math.round(sh * Math.sin(y / 20)), w - 1)) * 4, dst = (y * w + x) * 4;
    d[dst] = orig[src]; d[dst + 1] = orig[src + 1]; d[dst + 2] = orig[src + 2];
  }
}

function fxNoise(d, w, h, p, rng) {
  const amt = (p.amount || 25) / 100, col = (p.color || 0) > .5, bl = (p.blend || 70) / 100;
  for (let i = 0; i < d.length; i += 4) {
    if (col) { d[i] = Math.min(255, Math.max(0, d[i] * (1 - amt * bl) + (rng() * 255) * amt * bl)); d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * (1 - amt * bl) + (rng() * 255) * amt * bl)); d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * (1 - amt * bl) + (rng() * 255) * amt * bl)); }
    else { const n = (rng() - .5) * 2 * 255 * amt * bl; d[i] = Math.min(255, Math.max(0, d[i] + n)); d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n)); d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n)); }
  }
}

function fxEdge(d, w, h, p, accentColor) {
  const thr = (p.threshold || 30) / 100 * 255, dk = (p.darkbg || 1) > .5;
  const ar = parseInt(accentColor.slice(1, 3), 16), ag = parseInt(accentColor.slice(3, 5), 16), ab = parseInt(accentColor.slice(5, 7), 16);
  const orig = new Uint8ClampedArray(d);
  function g(i) { return .299 * orig[i] + .587 * orig[i + 1] + .114 * orig[i + 2]; }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const tl = g((y - 1) * w * 4 + (x - 1) * 4), tc = g((y - 1) * w * 4 + x * 4), tr = g((y - 1) * w * 4 + (x + 1) * 4);
    const ml = g(y * w * 4 + (x - 1) * 4), mr = g(y * w * 4 + (x + 1) * 4);
    const bl = g((y + 1) * w * 4 + (x - 1) * 4), bc = g((y + 1) * w * 4 + x * 4), br = g((y + 1) * w * 4 + (x + 1) * 4);
    const gx = -tl - 2 * ml - bl + tr + 2 * mr + br, gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
    const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy)), i = (y * w + x) * 4;
    if (mag > thr) { const t = mag / 255; d[i] = ar * t + (dk ? 0 : orig[i]) * (1 - t); d[i + 1] = ag * t + (dk ? 0 : orig[i + 1]) * (1 - t); d[i + 2] = ab * t + (dk ? 0 : orig[i + 2]) * (1 - t); }
    else { d[i] = dk ? 0 : orig[i]; d[i + 1] = dk ? 0 : orig[i + 1]; d[i + 2] = dk ? 0 : orig[i + 2]; }
  }
}

function fxAll(d, w, h, p, rng) {
  const it = (p.intensity || 5) / 10;
  fxRGB(d, w, h, { x: 12 * it, y: 4 * it, intensity: p.intensity || 5, bands: 6 }, rng);
  const amt = Math.round(5 + it * 20), sh = Math.round(20 + it * 80), bh = Math.round(2 + it * 10);
  for (let i = 0; i < amt; i++) {
    const y = Math.floor(rng() * h), dx = Math.round((rng() - .5) * 2 * sh);
    for (let dy = 0; dy < bh && y + dy < h; dy++) for (let x = 0; x < w; x++) {
      const sx = Math.min(Math.max(x + dx, 0), w - 1), src = ((y + dy) * w + sx) * 4, dst = ((y + dy) * w + x) * 4;
      if (Math.floor(dy * x * 17) % 3 === 0) d[dst] = d[src];
      else if (Math.floor(dy * x * 13) % 3 === 1) d[dst + 2] = d[src + 2];
    }
  }
  fxSL(d, w, h, { height: 2, gap: 4, opacity: 40 });
  fxNoise(d, w, h, { amount: 15, blend: 60 }, rng);
}

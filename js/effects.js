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

// Global buffer to avoid repeated allocations
let sharedBuffer = null;
function getBuffer(size) {
  if (!sharedBuffer || sharedBuffer.length !== size) sharedBuffer = new Uint8ClampedArray(size);
  return sharedBuffer;
}

export function applyFx(d, w, h, id, p, rng, accentColor, time = 0) {
  if (id === 'rgb-split') fxRGB(d, w, h, p, rng, time);
  else if (id === 'scanlines') fxSL(d, w, h, p, time);
  else if (id === 'pixel-sort') fxPS(d, w, h, p, time);
  else if (id === 'data-corrupt') fxDC(d, w, h, p, rng, time);
  else if (id === 'neon-burn') fxNB(d, w, h, p, accentColor, time);
  else if (id === 'vhs') fxVHS(d, w, h, p, rng, time);
  else if (id === 'hologram') fxHolo(d, w, h, p, accentColor, time);
  else if (id === 'noise') fxNoise(d, w, h, p, rng, time);
  else if (id === 'edge-glow') fxEdge(d, w, h, p, accentColor, time);
  else if (id === 'invert') fxInvert(d, w, h, p, rng);
  else if (id === 'posterize') fxPosterize(d, w, h, p, time);
  else if (id === 'channel-swap') fxChannelSwap(d, w, h, p);
  else if (id === 'smear') fxSmear(d, w, h, p, time);
  else if (id === 'vcr-osd') fxVCR(d, w, h, p, time);
  else if (id === 'all-glitch') fxAll(d, w, h, p, rng, time);
}

let helperCanvas = null;
let hctx = null;

function fxVCR(d, w, h, p, time = 0) {
  const op = (p.opacity ?? 80) / 100, blink = (p.blink ?? 1) > 0.5;
  const now = new Date();
  const year = now.getFullYear() - 20;
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dateStr = `${monthNames[now.getMonth()]} ${now.getDate().toString().padStart(2, '0')} ${year}`;
  
  const totalSec = Math.floor(time / 24); 
  const hh = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  const timeStr = `${hh}:${mm}:${ss}`;

  const isBlink = blink && (Math.floor(time / 15) % 2 === 0);
  
  if (!helperCanvas || helperCanvas.width !== w || helperCanvas.height !== h) {
    helperCanvas = document.createElement('canvas');
    helperCanvas.width = w; helperCanvas.height = h;
    hctx = helperCanvas.getContext('2d', { willReadFrequently: true });
  }

  hctx.clearRect(0, 0, w, h);
  hctx.fillStyle = 'white';
  hctx.font = `${Math.round(h * 0.08)}px "VT323"`; // Adaptive font size
  hctx.textBaseline = 'top';

  // Draw Timecode
  hctx.textAlign = 'right';
  hctx.fillText(timeStr, w * 0.95, h * 0.05);

  // Draw Date
  hctx.textAlign = 'right';
  hctx.fillText(dateStr, w * 0.95, h * 0.85);

  // Draw REC
  if (isBlink) {
    hctx.textAlign = 'left';
    hctx.fillText("REC", w * 0.05, h * 0.05);
    
    // Red Dot
    hctx.beginPath();
    hctx.fillStyle = '#ff0000';
    hctx.arc(w * 0.05 + hctx.measureText("REC").width + h * 0.04, h * 0.05 + h * 0.04, h * 0.02, 0, Math.PI * 2);
    hctx.fill();
    hctx.fillStyle = 'white';
  }

  // Draw PLAY
  hctx.textAlign = 'left';
  hctx.fillText("PLAY", w * 0.05, h * 0.85);

  // Composite the helper canvas onto the data array
  const overlayData = hctx.getImageData(0, 0, w, h).data;
  for (let i = 0; i < d.length; i += 4) {
    const alpha = overlayData[i + 3];
    if (alpha > 0) {
      const f = (alpha / 255) * op;
      const invF = 1 - f;
      d[i] = d[i] * invF + overlayData[i] * f;
      d[i+1] = d[i+1] * invF + overlayData[i+1] * f;
      d[i+2] = d[i+2] * invF + overlayData[i+2] * f;
    }
  }
}

function fxRGB(d, w, h, p, rng, time = 0) {
  const sx = p.x ?? 12, sy = p.y ?? 4, it = (p.intensity ?? 7) / 10, bn = Math.max(1, p.bands ?? 6), speed = (p.speed ?? 0) * 0.1;
  const buf = getBuffer(d.length); buf.set(d);
  const bh = Math.ceil(h / bn);
  const tShiftX = speed > 0 ? Math.sin(time * speed) * sx : 0;
  const tShiftY = speed > 0 ? Math.cos(time * speed) * sy : 0;

  for (let b = 0; b < bn; b++) {
    const rs = b * bh, re = Math.min(rs + bh, h);
    const rx = Math.round(((rng() > .5 ? 1 : -1) * sx * (0.5 + rng() * .5) * it) + tShiftX);
    const ry = Math.round(((rng() > .5 ? 1 : -1) * sy * (0.5 + rng() * .5) * it) + tShiftY);
    const gx = Math.round(-(rng() > .5 ? 1 : -1) * sx * .3 * it);
    for (let y = rs; y < re; y++) {
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const rx2 = x + rx, ry2 = y + ry;
        if (rx2 >= 0 && rx2 < w && ry2 >= 0 && ry2 < h) d[i] = buf[(ry2 * w + rx2) * 4];
        const gx2 = x + gx; if (gx2 >= 0 && gx2 < w) d[i + 1] = buf[(yw + gx2) * 4 + 1];
      }
    }
  }
}

function fxSL(d, w, h, p, time = 0) {
  const lh = Math.max(1, p.height ?? 2), gap = Math.max(1, p.gap ?? 4), op = (p.opacity ?? 60) / 100, per = lh + gap, speed = (p.speed ?? 0) * 0.5;
  const f = 1 - op;
  const offset = (time * speed) % per;
  for (let y = 0; y < h; y++) {
    if ((y + offset) % per < lh) {
      const yw4 = y * w * 4;
      for (let x = 0; x < w; x++) {
        const i = yw4 + x * 4;
        d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
      }
    }
  }
}

function fxPS(d, w, h, p, time = 0) {
  const speed = (p.speed ?? 0) * 0.05;
  const pulse = speed > 0 ? Math.sin(time * speed) * 30 : 0;
  const lo = Math.max(0, (p.lo ?? 80) + pulse), hi = p.hi ?? 200, hor = !(p.dir > 0.5), cp = (p.chunk ?? 30) / 100;
  const maxChunk = Math.round((hor ? w : h) * cp);
  function lm(i) { return .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; }
  
  if (hor) {
    for (let y = 0; y < h; y++) {
      const yw = y * w;
      let x = 0;
      while (x < w) {
        const i0 = (yw + x) * 4;
        const l0 = lm(i0);
        if (l0 >= lo && l0 <= hi) {
          let e = x + 1;
          while (e < w && e - x < maxChunk) {
            const le = lm((yw + e) * 4);
            if (le < lo || le > hi) break;
            e++;
          }
          if (e - x > 1) {
            const px = [];
            for (let p2 = x; p2 < e; p2++) {
              const idx = (yw + p2) * 4;
              px.push({r: d[idx], g: d[idx+1], b: d[idx+2], a: d[idx+3], v: lm(idx)});
            }
            px.sort((a, b) => a.v - b.v);
            for (let p2 = x; p2 < e; p2++) {
              const idx = (yw + p2) * 4;
              const q = px[p2 - x];
              d[idx] = q.r; d[idx + 1] = q.g; d[idx + 2] = q.b;
            }
          }
          x = e;
        } else x++;
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let y = 0;
      while (y < h) {
        const i0 = (y * w + x) * 4;
        const l0 = lm(i0);
        if (l0 >= lo && l0 <= hi) {
          let e = y + 1;
          while (e < h && e - y < maxChunk) {
            const le = lm((e * w + x) * 4);
            if (le < lo || le > hi) break;
            e++;
          }
          if (e - y > 1) {
            const px = [];
            for (let py = y; py < e; py++) {
              const idx = (py * w + x) * 4;
              px.push({r: d[idx], g: d[idx+1], b: d[idx+2], a: d[idx+3], v: lm(idx)});
            }
            px.sort((a, b) => a.v - b.v);
            for (let py = y; py < e; py++) {
              const idx = (py * w + x) * 4;
              const q = px[py - y];
              d[idx] = q.r; d[idx + 1] = q.g; d[idx + 2] = q.b;
            }
          }
          y = e;
        } else y++;
      }
    }
  }
}

function fxDC(d, w, h, p, rng, time = 0) {
  const speed = (p.speed ?? 0) * 0.1;
  const amt = p.amount ?? 15, bh = p.bh ?? 8, sh = p.shift ?? 60, col = (p.color ?? 1) > .5;
  const tShift = speed > 0 ? (Math.sin(time * speed) * sh * 0.5) : 0;
  
  for (let i = 0; i < amt; i++) {
    const y0 = Math.floor(rng() * h), dh = Math.ceil(rng() * bh), dx = Math.round((rng() - .5) * 2 * sh + tShift), cr = col ? Math.floor(rng() * 3) : -1;
    for (let dy = 0; dy < dh && y0 + dy < h; dy++) {
      const yw = (y0 + dy) * w;
      for (let x = 0; x < w; x++) {
        const srcX = Math.min(Math.max(x + dx, 0), w - 1);
        const src = (yw + srcX) * 4, dst = (yw + x) * 4;
        if (cr >= 0) {
          d[dst + cr] = d[src + cr];
          if (rng() < .05) d[dst + cr] = (rng() * 256) | 0;
        } else {
          d[dst] = d[src]; d[dst + 1] = d[src + 1]; d[dst + 2] = d[src + 2];
        }
      }
    }
  }
}

function fxNB(d, w, h, p, accentColor, time = 0) {
  const speed = (p.speed ?? 0) * 2.0;
  const it = (p.intensity ?? 8) / 10, hs = (p.hue ?? 180) + (time * speed), sat = (p.sat ?? 180) / 100;
  const ar = parseInt(accentColor.slice(1, 3), 16), ag = parseInt(accentColor.slice(3, 5), 16), ab = parseInt(accentColor.slice(5, 7), 16);
  const ang = (hs % 360) * Math.PI / 180, cos = Math.cos(ang), sin = Math.sin(ang);
  
  const m1 = .213 + cos * .787 - sin * .213, m2 = .715 - cos * .715 - sin * .715, m3 = .072 - cos * .072 + sin * .928;
  const m4 = .213 - cos * .213 + sin * .143, m5 = .715 + cos * .285 + sin * .14, m6 = .072 - cos * .072 - sin * .283;
  const m7 = .213 - cos * .213 - sin * .787, m8 = .715 - cos * .715 + sin * .715, m9 = .072 + cos * .928 + sin * .072;
  const invIt = 1 - it * .5, it5 = it * .5;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = (r + g + b) * .3333;
    const nr = r * m1 + g * m2 + b * m3, ng = r * m4 + g * m5 + b * m6, nb = r * m7 + g * m8 + b * m9;
    const bl = lum * .00392;
    const fr = nr * invIt + ar * bl * it5, fg = ng * invIt + ag * bl * it5, fb = nb * invIt + ab * bl * it5;
    const gy = .299 * fr + .587 * fg + .114 * fb;
    d[i] = gy + (fr - gy) * sat; d[i + 1] = gy + (fg - gy) * sat; d[i + 2] = gy + (fb - gy) * sat;
  }
}

function fxVHS(d, w, h, p, rng, time = 0) {
  const speed = (p.speed ?? 0) * 0.1;
  const na = (p.noise ?? 30) / 100;
  const jt = p.jitter ?? 10;
  const bl = p.bleed ?? 10;
  const roll = (p.roll ?? 0) * 0.05 * time;
  const desync = (p.desync ?? 0) / 100;

  const buf = getBuffer(d.length);
  buf.set(d);

  // De-sync bar position (oscillates vertically)
  const barPos = (time * 0.02 * (speed + 1)) % 2; // Goes from 0 to 2
  const barHeight = 0.2;
  const barY = (barPos > 1 ? 2 - barPos : barPos) * h; // Ping-pong

  for (let y = 0; y < h; y++) {
    // 1. Vertical Roll
    let readY = (y + roll) % h;
    if (readY < 0) readY += h;
    const yw = y * w;
    const readYw = Math.floor(readY) * w;

    // 2. Tracking Jitter & De-sync Bar
    let to = Math.sin(y / (h / 8) + rng() * Math.PI + time * speed) * jt;

    // Vertical De-sync Bar (Violent horizontal shaking and noise)
    const distToBar = Math.abs(y - barY);
    if (distToBar < barHeight * h) {
      const strength = 1.0 - distToBar / (barHeight * h);
      to += (rng() - 0.5) * strength * desync * 150;
    }
    
    // Bottom Head Switching Noise (classic VHS artifact)
    if (y > h - 15) {
      to += (rng() - 0.5) * 20 * desync;
    }

    const ito = Math.round(to);

    for (let x = 0; x < w; x++) {
      const idx = (yw + x) * 4;
      
      // Horizontal shift for Jitter
      const sx = Math.min(Math.max(x + ito, 0), w - 1);
      
      // Color Bleeding (Red channel horizontal shift)
      const bx = Math.min(Math.max(x - Math.round(bl + (distToBar < barHeight * h ? desync * 20 : 0)), 0), w - 1);
      
      const srcIdx = (readYw + sx) * 4;
      const bsrcIdx = (readYw + bx) * 4;

      d[idx] = buf[bsrcIdx];         // Red
      d[idx + 1] = buf[srcIdx + 1];  // Green
      d[idx + 2] = buf[srcIdx + 2];  // Blue
      // Alpha stays same

      // 3. Noise Overlay
      if (rng() < na || (distToBar < barHeight * h && rng() < desync * 0.5)) {
        const n = (rng() - 0.5) * 100;
        d[idx] = Math.min(255, Math.max(0, d[idx] + n));
        d[idx+1] = Math.min(255, Math.max(0, d[idx+1] + n));
        d[idx+2] = Math.min(255, Math.max(0, d[idx+2] + n));
      }
      
      // Extreme noise for the bottom "head switching" area
      if (y > h - 15 && rng() < 0.3 * desync) {
         const n = rng() * 255;
         d[idx] = d[idx+1] = d[idx+2] = n;
      }
    }
  }
}

function fxHolo(d, w, h, p, accentColor, time = 0) {
  const op = (p.opacity ?? 70) / 100, ln = p.lines ?? 3, sh = p.shift ?? 5, speed = (p.speed ?? 0) * 0.1;
  const ar = parseInt(accentColor.slice(1, 3), 16), ag = parseInt(accentColor.slice(3, 5), 16), ab = parseInt(accentColor.slice(5, 7), 16);
  const per = Math.ceil(h / (ln * 2)), buf = getBuffer(d.length); buf.set(d);
  const invOp = 1 - op, op4 = op * .4, invOp4 = 1 - op4;

  for (let i = 0; i < d.length; i += 4) {
    const gy = (.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]);
    const y = ((i / 4) / w) | 0;
    const isMain = (y % per) / per < .5;
    const la = isMain ? op : op4, ila = isMain ? invOp : invOp4;
    d[i] = gy * ila + ar * la; d[i + 1] = gy * ila + ag * la; d[i + 2] = gy * ila + ab * la;
  }
  for (let y = 0; y < h; y += 2) {
    const yw = y * w, shift = Math.round(sh * Math.sin(y * .05 + time * speed));
    for (let x = 0; x < w; x++) {
      const srcX = Math.min(Math.max(x + shift, 0), w - 1);
      const src = (yw + srcX) * 4, dst = (yw + x) * 4;
      d[dst] = buf[src]; d[dst + 1] = buf[src + 1]; d[dst + 2] = buf[src + 2];
    }
  }
}

function fxNoise(d, w, h, p, rng, time = 0) {
  const speed = (p.speed ?? 0) * 0.1;
  const pulse = speed > 0 ? (1.0 + 0.5 * Math.sin(time * speed)) : 1.0;
  const amt = ((p.amount ?? 25) / 100) * pulse, col = (p.color ?? 0) > .5, bl = (p.blend ?? 70) / 100;
  const f = amt * bl, ifa = 1 - f;
  for (let i = 0; i < d.length; i += 4) {
    if (col) { 
      d[i] = d[i] * ifa + (rng() * 255) * f; 
      d[i + 1] = d[i + 1] * ifa + (rng() * 255) * f; 
      d[i + 2] = d[i + 2] * ifa + (rng() * 255) * f; 
    }
    else { const n = (rng() - .5) * 510 * f; d[i] = Math.max(0, Math.min(255, d[i] + n)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n)); }
  }
}

function fxEdge(d, w, h, p, accentColor, time = 0) {
  const speed = (p.speed ?? 0) * 0.1;
  const pulse = speed > 0 ? (0.7 + 0.3 * Math.sin(time * speed)) : 1.0;
  const thr = (p.threshold ?? 30) / 100 * 255, dk = (p.darkbg ?? 1) > .5;
  const ar = parseInt(accentColor.slice(1, 3), 16), ag = parseInt(accentColor.slice(3, 5), 16), ab = parseInt(accentColor.slice(5, 7), 16);
  const buf = getBuffer(d.length); buf.set(d);
  function g(idx) { return .299 * buf[idx] + .587 * buf[idx + 1] + .114 * buf[idx + 2]; }
  for (let y = 1; y < h - 1; y++) {
    const yprev = (y - 1) * w * 4, ycurr = y * w * 4, ynext = (y + 1) * w * 4;
    for (let x = 1; x < w - 1; x++) {
      const x4 = x * 4, xprev = x4 - 4, xnext = x4 + 4;
      const tl = g(yprev + xprev), tc = g(yprev + x4), tr = g(yprev + xnext);
      const ml = g(ycurr + xprev), mr = g(ycurr + xnext);
      const bl = g(ynext + xprev), bc = g(ynext + x4), br = g(ynext + xnext);
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br, gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.sqrt(gx * gx + gy * gy), i = ycurr + x4;
      if (mag > thr) { 
        const t = mag * .00392 * pulse; 
        const it = 1 - t;
        d[i] = ar * t + (dk ? 0 : buf[i]) * it; 
        d[i + 1] = ag * t + (dk ? 0 : buf[i + 1]) * it; 
        d[i + 2] = ab * t + (dk ? 0 : buf[i + 2]) * it; 
      }
      else { d[i] = dk ? 0 : buf[i]; d[i + 1] = dk ? 0 : buf[i + 1]; d[i + 2] = dk ? 0 : buf[i + 2]; }
    }
  }
}

function fxAll(d, w, h, p, rng, time = 0) {
  const it = (p.intensity ?? 5) / 10;
  if (it === 0) return;
  fxRGB(d, w, h, { x: 12 * it, y: 4 * it, intensity: (p.intensity ?? 5), bands: 6, speed: 2 }, rng, time);
  const amt = Math.round(5 + it * 20), sh = Math.round(20 + it * 80), bh = Math.round(2 + it * 10);
  for (let i = 0; i < amt; i++) {
    const y0 = Math.floor(rng() * h), dx = Math.round((rng() - .5) * 2 * sh);
    for (let dy = 0; dy < bh && y0 + dy < h; dy++) {
      const yw = (y0 + dy) * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.min(Math.max(x + dx, 0), w - 1), src = (yw + sx) * 4, dst = (yw + x) * 4;
        if ((dy * x * 17) % 3 < 1) d[dst] = d[src];
        else if ((dy * x * 13) % 3 < 2) d[dst + 2] = d[src + 2];
      }
    }
  }
  fxSL(d, w, h, { height: 2, gap: 4, opacity: 40, speed: 5 }, time);
  fxNoise(d, w, h, { amount: 15, blend: 60, speed: 5 }, rng, time);
}

function fxInvert(d, w, h, p, rng) {
  const amt = (p.amount ?? 100) / 100;
  for (let i = 0; i < d.length; i += 4) {
    if (rng() < amt) {
      d[i] = 255 - d[i];
      d[i+1] = 255 - d[i+1];
      d[i+2] = 255 - d[i+2];
    }
  }
}

function fxPosterize(d, w, h, p, time = 0) {
  const speed = (p.speed ?? 0) * 0.05;
  const pulse = speed > 0 ? Math.round(Math.sin(time * speed) * 2) : 0;
  const lvl = Math.max(2, (p.levels ?? 4) + pulse);
  const factor = 255 / (lvl - 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / factor) * factor;
    d[i+1] = Math.round(d[i+1] / factor) * factor;
    d[i+2] = Math.round(d[i+2] / factor) * factor;
  }
}

function fxChannelSwap(d, w, h, p) {
  const mode = p.mode ?? 1;
  const buf = getBuffer(d.length); buf.set(d);
  for (let i = 0; i < d.length; i += 4) {
    const r = buf[i], g = buf[i+1], b = buf[i+2];
    if (mode === 1) { d[i] = g; d[i+1] = b; d[i+2] = r; }
    else if (mode === 2) { d[i] = b; d[i+1] = r; d[i+2] = g; }
    else if (mode === 3) { d[i] = r; d[i+1] = b; d[i+2] = g; }
    else if (mode === 4) { d[i] = g; d[i+1] = r; d[i+2] = b; }
    else if (mode === 5) { d[i] = b; d[i+1] = g; d[i+2] = r; }
  }
}

function fxSmear(d, w, h, p, time = 0) {
  const speed = (p.speed ?? 0) * 0.1;
  const pulse = speed > 0 ? (1.0 + 0.5 * Math.sin(time * speed)) : 1.0;
  const thr = p.threshold ?? 200, len = (p.length ?? 40) * pulse;
  const buf = getBuffer(d.length); buf.set(d);
  for (let y = 0; y < h; y++) {
    const yw = y * w;
    let sr = 0, sg = 0, sb = 0;
    for (let x = 0; x < w; x++) {
      const i = (yw + x) * 4;
      const r = buf[i], g = buf[i+1], b = buf[i+2];
      const lum = .299*r + .587*g + .114*b;
      if (lum > thr) { sr = r; sg = g; sb = b; }
      else if (sr > 0 || sg > 0 || sb > 0) {
        d[i] = Math.min(255, d[i] + sr * 0.5);
        d[i+1] = Math.min(255, d[i+1] + sg * 0.5);
        d[i+2] = Math.min(255, d[i+2] + sb * 0.5);
        sr *= (1 - 1/len); sg *= (1 - 1/len); sb *= (1 - 1/len);
        if (sr < 5 && sg < 5 && sb < 5) { sr = sg = sb = 0; }
      }
    }
  }
}

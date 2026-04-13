import { LABELS, DEFAULTS } from './config.js';
import { applyFx, mulberry32 } from './effects.js';
import { renderChain, renderParams } from './ui.js';

// State
let accentColor = '#00fff9';
let animating = false;
let animFrame = null;
let animFrameCount = 0;
let lastRenderTime = 0;
let originalImageData = null;
let effectChain = [];

const originalCanvas = document.getElementById('original-canvas');
const mainCanvas = document.getElementById('main-canvas');
const octx = originalCanvas.getContext('2d');
const ctx = mainCanvas.getContext('2d');

const chainListContainer = document.getElementById('chain-list');
const paramsContainer = document.getElementById('params-container');

// Initialization
export function init() {
  updateChainUI();
  updateSpeedDisplay();
  setupEventListeners();
  setupDropZone();
}

function setupEventListeners() {
  window.addToChain = (id) => {
    effectChain.push({ id, params: JSON.parse(JSON.stringify(DEFAULTS[id] || {})), label: LABELS[id] });
    updateChainUI();
  };

  window.clearChain = () => {
    effectChain = [];
    updateChainUI();
  };

  window.applyPreset = (name) => {
    const presets = {
      vaporwave: [{ id: 'neon-burn', params: { intensity: 12, hue: 280, sat: 230 } }],
      matrix: [{ id: 'edge-glow', params: { threshold: 20, glow: 10, darkbg: 1 } }],
      netpunk: [{ id: 'rgb-split', params: { x: 20, y: 8, bands: 12, intensity: 9 } }, { id: 'scanlines', params: { height: 2, gap: 4, opacity: 40 } }],
      ghost: [{ id: 'hologram', params: { opacity: 55, lines: 8, shift: 12 } }],
      corrupted: [{ id: 'data-corrupt', params: { amount: 40, bh: 15, shift: 120, color: 1 } }, { id: 'rgb-split', params: { x: 10, y: 3, bands: 8, intensity: 5 } }],
      'retro-tv': [{ id: 'vhs', params: { noise: 45, jitter: 20, tracking: 15, bleed: 20 } }, { id: 'scanlines', params: { height: 2, gap: 3, opacity: 50 } }],
    };
    const chain = presets[name];
    if (!chain) return;
    effectChain = chain.map(c => ({ ...c, label: LABELS[c.id], params: { ...DEFAULTS[c.id], ...c.params } }));
    if (name === 'matrix') {
      accentColor = '#00ff41';
      syncAccentUI('#00ff41');
    }
    updateChainUI();
    applyChain();
  };

  window.selAccent = (el, color) => {
    document.querySelectorAll('.sw').forEach(s => s.classList.remove('sel'));
    el.classList.add('sel');
    accentColor = color;
  };

  window.loadFile = (input) => {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > 1200) { h = h * 1200 / w; w = 1200; } if (h > 900) { w = w * 900 / h; h = 900; }
        w = Math.round(w); h = Math.round(h);
        originalCanvas.width = mainCanvas.width = w;
        originalCanvas.height = mainCanvas.height = h;
        octx.drawImage(img, 0, 0, w, h);
        originalImageData = octx.getImageData(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        document.getElementById('drop-ph').style.display = 'none';
        document.getElementById('cwrap').style.display = 'inline-block';
        document.getElementById('toolbar').style.display = 'flex';
        document.getElementById('info-bar').textContent = `${w}×${h}px · ${file.name}`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.resetImage = () => { if (originalImageData) ctx.putImageData(originalImageData, 0, 0); };
  window.clearImage = () => {
    stopAnimate();
    originalImageData = null;
    document.getElementById('drop-ph').style.display = '';
    document.getElementById('cwrap').style.display = 'none';
    document.getElementById('toolbar').style.display = 'none';
    document.getElementById('info-bar').textContent = '';
    document.getElementById('file-input').value = '';
  };

  window.applyChain = () => applyChain();
  window.toggleAnimate = () => { if (animating) stopAnimate(); else startAnimate(); };
  window.updateSpeedDisplay = () => updateSpeedDisplay();
  window.downloadStatic = () => downloadStatic();
  window.startAnimExport = () => startAnimExport();
}

function updateChainUI() {
  renderChain(effectChain, chainListContainer, {
    onRemove: (idx) => {
      effectChain.splice(idx, 1);
      updateChainUI();
    },
    onReorder: (srcIdx, dstIdx) => {
      const [moved] = effectChain.splice(srcIdx, 1);
      const adjIdx = srcIdx < dstIdx ? dstIdx - 1 : dstIdx;
      effectChain.splice(adjIdx, 0, moved);
      updateChainUI();
    }
  });
  renderParams(effectChain, paramsContainer, {
    onParamChange: (idx, key, val) => {
      effectChain[idx].params[key] = val;
    }
  });
}

function syncAccentUI(color) {
  document.querySelectorAll('.sw').forEach(s => {
    s.classList.remove('sel');
    // Check background color in hex or rgb
    if (s.style.backgroundColor === hexToRgb(color)) s.classList.add('sel');
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function setupDropZone() {
  const dp = document.getElementById('drop-ph');
  dp.addEventListener('dragover', e => { e.preventDefault(); dp.classList.add('drag-over'); });
  dp.addEventListener('dragleave', () => dp.classList.remove('drag-over'));
  dp.addEventListener('drop', e => {
    e.preventDefault(); dp.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {
      const fi = document.getElementById('file-input');
      const dt = new DataTransfer();
      dt.items.add(f);
      fi.files = dt.files;
      window.loadFile(fi);
    }
  });
}

// Applying effects
function applyChain(seed) {
  if (!originalImageData || effectChain.length === 0) return;
  ctx.putImageData(originalImageData, 0, 0);
  const w = mainCanvas.width, h = mainCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  effectChain.forEach(item => applyFx(imgData.data, w, h, item.id, item.params, rng, accentColor));
  ctx.putImageData(imgData, 0, 0);
}

// Animation
function updateSpeedDisplay() {
  const fps = parseInt(document.getElementById('anim-speed').value);
  document.getElementById('anim-speed-val').textContent = fps;
  const label = fps <= 4 ? '— VERY SLOW' : fps <= 10 ? '— SLOW' : fps <= 20 ? '— MODERATE' : fps <= 35 ? '— FAST' : '— VERY FAST';
  document.getElementById('speed-display').textContent = fps + ' FPS ' + label;
}

function startAnimate() {
  if (!originalImageData) { alert('Upload an image first!'); return; }
  if (effectChain.length === 0) { alert('Add effects to the chain!'); return; }
  animating = true; animFrameCount = 0; lastRenderTime = 0;
  document.getElementById('animate-btn').textContent = '■ STOP';
  document.getElementById('animate-btn').classList.add('running');
  function loop(ts) {
    if (!animating) return;
    const fps = parseInt(document.getElementById('anim-speed').value);
    const interval = 1000 / fps;
    if (ts - lastRenderTime >= interval) {
      lastRenderTime = ts;
      const mode = document.querySelector('input[name=anim-mode]:checked').value;
      const w = mainCanvas.width, h = mainCanvas.height;
      ctx.putImageData(originalImageData, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);
      const rng = mulberry32(animFrameCount * 7919 % 99991);
      if (mode === 'loop') {
        effectChain.forEach(item => applyFx(imgData.data, w, h, item.id, item.params, rng, accentColor));
      } else if (mode === 'chain') {
        const stepIdx = animFrameCount % effectChain.length;
        for (let i = 0; i <= stepIdx; i++) applyFx(imgData.data, w, h, effectChain[i].id, effectChain[i].params, rng, accentColor);
      } else { // sweep
        const t = (animFrameCount % 120) / 120;
        const sweep = 0.05 + 0.95 * Math.abs(Math.sin(t * Math.PI));
        effectChain.forEach(item => {
          const sp = Object.fromEntries(Object.entries(item.params).map(([k, v]) => [k, v * sweep]));
          applyFx(imgData.data, w, h, item.id, sp, rng, accentColor);
        });
      }
      ctx.putImageData(imgData, 0, 0);
      animFrameCount++;
    }
    animFrame = requestAnimationFrame(loop);
  }
  animFrame = requestAnimationFrame(loop);
}

function stopAnimate() {
  animating = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  document.getElementById('animate-btn').textContent = '⟳ ANIMATE';
  document.getElementById('animate-btn').classList.remove('running');
}

// Export
function downloadStatic() {
  const fmt = document.getElementById('export-format').value;
  const q = parseInt(document.getElementById('export-quality').value) / 100;
  const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt] || 'image/png';
  const a = document.createElement('a'); a.download = `glitch-${Date.now()}.${fmt}`; a.href = mainCanvas.toDataURL(mime, q); a.click();
}

async function startAnimExport() {
  if (!originalImageData || effectChain.length === 0) { alert('Upload an image and add effects!'); return; }
  if (animating) stopAnimate();
  const duration = parseInt(document.getElementById('gif-duration').value);
  const fps = parseInt(document.getElementById('gif-fps').value);
  const format = document.getElementById('gif-format').value;
  const totalFrames = duration * fps;
  const w = mainCanvas.width, h = mainCanvas.height;
  const prog = document.getElementById('export-progress');
  const fill = document.getElementById('prog-fill');
  const text = document.getElementById('prog-text');
  prog.style.display = 'block';

  if (format === 'frames') await exportFrames(totalFrames, fps, w, h, fill, text);
  else if (format === 'webm') await exportWebM(totalFrames, fps, duration, w, h, fill, text);
  else await exportGIF(totalFrames, fps, w, h, fill, text);
}

async function renderFrame(f, w, h) {
  const tmpC = document.createElement('canvas'); tmpC.width = w; tmpC.height = h;
  const tmpX = tmpC.getContext('2d');
  tmpX.putImageData(originalImageData, 0, 0);
  const imgData = tmpX.getImageData(0, 0, w, h);
  const rng = mulberry32(f * 7919 % 99991);
  effectChain.forEach(item => applyFx(imgData.data, w, h, item.id, item.params, rng, accentColor));
  tmpX.putImageData(imgData, 0, 0);
  return tmpC;
}

async function exportFrames(totalFrames, fps, w, h, fill, text) {
  text.textContent = 'RENDERING PNG FRAMES...';
  for (let f = 0; f < totalFrames; f++) {
    const c = await renderFrame(f, w, h);
    const a = document.createElement('a');
    a.download = `glitch-frame-${String(f).padStart(4, '0')}.png`;
    a.href = c.toDataURL('image/png'); a.click();
    fill.style.width = ((f + 1) / totalFrames * 100).toFixed(0) + '%';
    text.textContent = `FRAME ${f + 1} / ${totalFrames}`;
    await sleep(30);
  }
  text.textContent = `DONE — ${totalFrames} FRAMES DOWNLOADED`;
  ctx.putImageData(originalImageData, 0, 0);
  setTimeout(() => { document.getElementById('export-progress').style.display = 'none'; }, 3000);
}

async function exportWebM(totalFrames, fps, duration, w, h, fill, text) {
  text.textContent = 'INITIALIZING WEBM...';
  const tmpC = document.createElement('canvas'); tmpC.width = w; tmpC.height = h;
  const tmpX = tmpC.getContext('2d');
  const supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const stream = tmpC.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: supported, videoBitsPerSecond: 8000000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  rec.start(100);
  for (let f = 0; f < totalFrames; f++) {
    tmpX.putImageData(originalImageData, 0, 0);
    const imgData = tmpX.getImageData(0, 0, w, h);
    const rng = mulberry32(f * 7919 % 99991);
    effectChain.forEach(item => applyFx(imgData.data, w, h, item.id, item.params, rng, accentColor));
    tmpX.putImageData(imgData, 0, 0);
    fill.style.width = ((f + 1) / totalFrames * 100).toFixed(0) + '%';
    text.textContent = `FRAME ${f + 1} / ${totalFrames} — WEBM ENCODING`;
    await sleep(1000 / fps);
  }
  rec.stop();
  await new Promise(r => rec.onstop = r);
  const blob = new Blob(chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.download = `glitch-${Date.now()}.webm`; a.href = url; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  fill.style.width = '100%'; text.textContent = 'WEBM READY — DOWNLOADING!';
  ctx.putImageData(originalImageData, 0, 0);
  setTimeout(() => { document.getElementById('export-progress').style.display = 'none'; }, 3000);
}

async function exportGIF(totalFrames, fps, w, h, fill, text) {
  text.textContent = 'LOADING GIF ENCODER...'; fill.style.width = '3%';
  try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'); }
  catch (e) { text.textContent = 'GIF.js unavailable — switch to WebM or PNG frames'; return; }
  text.textContent = 'INITIALIZING...'; fill.style.width = '8%';
  const gif = new GIF({ workers: 2, quality: 6, width: w, height: h, workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js', repeat: 0 });
  const delay = Math.round(1000 / fps);
  for (let f = 0; f < totalFrames; f++) {
    const c = await renderFrame(f, w, h);
    gif.addFrame(c.getContext('2d'), { copy: true, delay });
    fill.style.width = (8 + (f + 1) / totalFrames * 50).toFixed(0) + '%';
    text.textContent = `FRAME ${f + 1} / ${totalFrames}`;
    await sleep(0);
  }
  ctx.putImageData(originalImageData, 0, 0);
  gif.on('progress', p => { fill.style.width = (58 + p * 42).toFixed(0) + '%'; text.textContent = `GIF ENCODING ${Math.round(p * 100)}%`; });
  gif.on('finished', blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.download = `glitch-${Date.now()}.gif`; a.href = url; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    fill.style.width = '100%'; text.textContent = 'GIF READY — DOWNLOADING!';
    setTimeout(() => { document.getElementById('export-progress').style.display = 'none'; }, 3000);
  });
  gif.render();
}

function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

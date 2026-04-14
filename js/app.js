import { LABELS, DEFAULTS } from './config.js';
import { applyFx, mulberry32 } from './effects.js';
import { renderChain, renderParams } from './ui.js';
import { TransactionManager } from './history.js';

// Configuration
const MAX_PREVIEW_RES = 800;

// State
let accentColor = '#00fff9';
let animating = false;
let animFrame = null;
let animFrameCount = 0;
let lastRenderTime = 0;
let originalImageData = null;
let previewImageData = null;
let effectChain = [];
let frameCache = new Map(); // frameIndex -> ImageData
let historyManager = null;
let livePreviewsEnabled = false;
let libraryPreviewWorker = null; // We'll do it sequentially in main thread for simplicity

const originalCanvas = document.getElementById('original-canvas');
const mainCanvas = document.getElementById('main-canvas');
const octx = originalCanvas.getContext('2d', { willReadFrequently: true });
const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });

const chainListContainer = document.getElementById('chain-list');
const paramsContainer = document.getElementById('params-container');

// Initialization
export function init() {
  historyManager = new TransactionManager(
    { effectChain, accentColor },
    (state) => {
      effectChain = state.effectChain;
      accentColor = state.accentColor;
      syncAccentUI(accentColor);
      clearFrameCache();
      updateChainUI();
      applyChain();
      if (livePreviewsEnabled) updateLibraryPreviews();
    }
  );

  updateChainUI();
  updateSpeedDisplay();
  setupEventListeners();
  setupDropZone();
  loadDefaultImage();
}

function setupEventListeners() {
  window.addToChain = (id, append = false) => {
    if (!append) effectChain = [];
    effectChain.push({ id, params: JSON.parse(JSON.stringify(DEFAULTS[id] || {})), label: LABELS[id] });
    historyManager.push({ effectChain, accentColor });
    clearFrameCache();
    updateChainUI();
    if (!append) applyChain();
  };

  window.clearChain = () => {
    effectChain = [];
    historyManager.push({ effectChain, accentColor });
    clearFrameCache();
    updateChainUI();
    applyChain(); // Clear visual state too
    if (livePreviewsEnabled) updateLibraryPreviews();
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
    }
    historyManager.push({ effectChain, accentColor });
    syncAccentUI(accentColor);
    clearFrameCache();
    updateChainUI();
    applyChain();
    if (livePreviewsEnabled) updateLibraryPreviews();
  };

  window.selAccent = (el, color) => {
    accentColor = color;
    historyManager.push({ effectChain, accentColor });
    syncAccentUI(color);
    clearFrameCache();
    if (!animating) applyChain();
  };

  window.loadFile = (input) => {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        processLoadedImage(img, file.name);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.resetImage = () => { if (previewImageData) applyChain(); };
  window.clearImage = () => {
    stopAnimate();
    originalImageData = null;
    previewImageData = null;
    clearFrameCache();
    document.getElementById('drop-ph').style.display = '';
    document.getElementById('cwrap').style.display = 'none';
    document.getElementById('toolbar').style.display = 'none';
    document.getElementById('info-bar').textContent = '';
    document.getElementById('file-input').value = '';
  };

  window.undo = () => historyManager.undo();
  window.redo = () => historyManager.redo();

  // Keyboard shortcuts
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) window.redo();
        else window.undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        window.redo();
      }
    }
  });

  window.applyChain = () => applyChain();
  window.toggleAnimate = () => { if (animating) stopAnimate(); else startAnimate(); };
  window.updateSpeedDisplay = () => updateSpeedDisplay();
  window.downloadStatic = () => downloadStatic();
  window.startAnimExport = () => startAnimExport();

  window.toggleLivePreviews = (enabled) => {
    livePreviewsEnabled = enabled;
    const grid = document.getElementById('effects-grid');
    if (grid) grid.classList.toggle('live-mode', enabled);
    document.querySelectorAll('.ecard').forEach(el => el.classList.toggle('has-preview', enabled));
    if (enabled) updateLibraryPreviews();
  };
}

const libPreviewCanvas = document.createElement('canvas');
const libPX = libPreviewCanvas.getContext('2d', { willReadFrequently: true });

function updateLibraryPreviews() {
  if (!livePreviewsEnabled || !previewImageData) return;
  
  const w = mainCanvas.width, h = mainCanvas.height;
  const thumbScale = 120 / Math.max(w, h);
  const tw = Math.round(w * thumbScale), th = Math.round(h * thumbScale);

  if (libPreviewCanvas.width !== tw || libPreviewCanvas.height !== th) {
    libPreviewCanvas.width = tw; libPreviewCanvas.height = th;
  }

  // Create base thumbnail of CURRENT state (mainCanvas)
  libPX.drawImage(mainCanvas, 0, 0, tw, th);
  const baseData = libPX.getImageData(0, 0, tw, th);

  document.querySelectorAll('.ecard').forEach(card => {
    const id = card.getAttribute('onclick').match(/'([^']+)'/)[1];
    let canvas = card.querySelector('.ecard-preview canvas');
    if (!canvas) {
      const wrapper = document.createElement('div');
      wrapper.className = 'ecard-preview';
      canvas = document.createElement('canvas');
      wrapper.appendChild(canvas);
      card.appendChild(wrapper);
    }
    
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw; canvas.height = th;
    }
    
    // Apply effect ON TOP of current state
    const previewData = new ImageData(new Uint8ClampedArray(baseData.data), baseData.width, baseData.height);
    const rng = mulberry32(12345); // Static RNG for consistent previews
    applyFx(previewData.data, previewData.width, previewData.height, id, DEFAULTS[id], rng, accentColor);
    
    const pctx = canvas.getContext('2d', { willReadFrequently: true });
    pctx.putImageData(previewData, 0, 0);
  });
}

function processLoadedImage(img, name) {
  let w = img.width, h = img.height;
  const maxW = 3000, maxH = 3000;
  if (w > maxW) { h = h * maxW / w; w = maxW; } 
  if (h > maxH) { w = w * maxH / h; h = maxH; }
  w = Math.round(w); h = Math.round(h);

  originalCanvas.width = w; originalCanvas.height = h;
  octx.drawImage(img, 0, 0, w, h);
  originalImageData = octx.getImageData(0, 0, w, h);

  // Preview scaling
  let pw = w, ph = h;
  if (pw > MAX_PREVIEW_RES) { ph = ph * MAX_PREVIEW_RES / pw; pw = MAX_PREVIEW_RES; }
  if (ph > MAX_PREVIEW_RES) { pw = pw * MAX_PREVIEW_RES / ph; ph = MAX_PREVIEW_RES; }
  pw = Math.round(pw); ph = Math.round(ph);

  mainCanvas.width = pw; mainCanvas.height = ph;
  const pctx = mainCanvas.getContext('2d', { willReadFrequently: true });
  pctx.drawImage(img, 0, 0, pw, ph);
  previewImageData = pctx.getImageData(0, 0, pw, ph);

  window._glitchBuffer = null;
  clearFrameCache();

  document.getElementById('drop-ph').style.display = 'none';
  document.getElementById('cwrap').style.display = 'flex';
  document.getElementById('toolbar').style.display = 'flex';
  document.getElementById('info-bar').textContent = `${w}×${h}px [Preview: ${pw}×${ph}] · ${name}`;
  if (livePreviewsEnabled) setTimeout(updateLibraryPreviews, 100);
}

function loadDefaultImage() {
  const imgPath = 'WD_logo.png';
  const img = new Image();
  img.onload = () => {
    processLoadedImage(img, imgPath + ' (System Default)');
    window.applyPreset('corrupted');
    startAnimate();
  };
  img.onerror = () => console.warn('Default image not found.');
  img.src = imgPath;
}

function updateChainUI() {
  renderChain(effectChain, chainListContainer, {
    onRemove: (idx) => {
      effectChain.splice(idx, 1);
      historyManager.push({ effectChain, accentColor });
      clearFrameCache();
      updateChainUI();
      applyChain();
      if (livePreviewsEnabled) updateLibraryPreviews();
    },
    onReorder: (srcIdx, dstIdx) => {
      const [moved] = effectChain.splice(srcIdx, 1);
      const adjIdx = srcIdx < dstIdx ? dstIdx - 1 : dstIdx;
      effectChain.splice(adjIdx, 0, moved);
      historyManager.push({ effectChain, accentColor });
      clearFrameCache();
      updateChainUI();
      applyChain();
      if (livePreviewsEnabled) updateLibraryPreviews();
    }
  });
  renderParams(effectChain, paramsContainer, {
    onParamChange: (idx, key, val, isCommit) => {
      effectChain[idx].params[key] = val;
      clearFrameCache();
      if (isCommit) {
        historyManager.push({ effectChain, accentColor });
        if (livePreviewsEnabled) updateLibraryPreviews();
      }
      if (!animating) applyChain();
    }
  });
}

function clearFrameCache() {
  frameCache.clear();
}

function syncAccentUI(color) {
  document.querySelectorAll('.sw').forEach(s => {
    s.classList.remove('sel');
    if (s.style.backgroundColor === hexToRgb(color)) s.classList.add('sel');
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
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
      const dt = new DataTransfer(); dt.items.add(f); fi.files = dt.files;
      window.loadFile(fi);
    }
  });
}

function applyChain(seed) {
  if (!previewImageData || effectChain.length === 0) return;
  const w = mainCanvas.width, h = mainCanvas.height;
  if (!window._glitchBuffer) window._glitchBuffer = ctx.createImageData(w, h);
  const imgData = window._glitchBuffer;
  imgData.data.set(previewImageData.data);
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  effectChain.forEach(item => applyFx(imgData.data, w, h, item.id, item.params, rng, accentColor));
  ctx.putImageData(imgData, 0, 0);
}

function updateSpeedDisplay() {
  const fps = parseInt(document.getElementById('anim-speed').value);
  document.getElementById('anim-speed-val').textContent = fps;
  const label = fps <= 4 ? '— VERY SLOW' : fps <= 10 ? '— SLOW' : fps <= 20 ? '— MODERATE' : fps <= 35 ? '— FAST' : '— VERY FAST';
  document.getElementById('speed-display').textContent = fps + ' FPS ' + label;
}

function startAnimate() {
  if (!previewImageData) { alert('Upload image!'); return; }
  if (effectChain.length === 0) { alert('Add effects!'); return; }
  animating = true; animFrameCount = 0; lastRenderTime = 0;
  document.getElementById('animate-btn').textContent = '■ STOP';
  document.getElementById('animate-btn').classList.add('running');
  
  function loop(ts) {
    if (!animating) return;
    const fps = parseInt(document.getElementById('anim-speed').value);
    const interval = 1000 / fps;
    if (ts - lastRenderTime >= interval) {
      lastRenderTime = ts;
      const w = mainCanvas.width, h = mainCanvas.height;
      const frameIdx = animFrameCount % 120; // Cache limit of 120 frames

      if (frameCache.has(frameIdx)) {
        ctx.putImageData(frameCache.get(frameIdx), 0, 0);
      } else {
        if (!window._glitchBuffer) window._glitchBuffer = ctx.createImageData(w, h);
        const imgData = window._glitchBuffer;
        imgData.data.set(previewImageData.data);
        const mode = document.querySelector('input[name=anim-mode]:checked').value;
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
        
        // Cache this frame if we still have room
        if (frameCache.size < 120) {
          const cacheData = ctx.createImageData(w, h);
          cacheData.data.set(imgData.data);
          frameCache.set(frameIdx, cacheData);
        }
      }
      animFrameCount++;
    }
    animFrame = requestAnimationFrame(loop);
  }
  animFrame = requestAnimationFrame(loop);
}

function stopAnimate() {
  animating = false; if (animFrame) cancelAnimationFrame(animFrame);
  document.getElementById('animate-btn').textContent = '⟳ ANIMATE';
  document.getElementById('animate-btn').classList.remove('running');
}

function downloadStatic() {
  const fmt = document.getElementById('export-format').value;
  const q = parseInt(document.getElementById('export-quality').value) / 100;
  const w = originalCanvas.width, h = originalCanvas.height;
  
  // Render full resolution for export
  const tempCanvas = document.createElement('canvas'); tempCanvas.width = w; tempCanvas.height = h;
  const tx = tempCanvas.getContext('2d', { willReadFrequently: true });
  tx.putImageData(originalImageData, 0, 0);
  const imgData = tx.getImageData(0, 0, w, h);
  effectChain.forEach(item => applyFx(imgData.data, w, h, item.id, item.params, Math.random, accentColor));
  tx.putImageData(imgData, 0, 0);
  
  const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt] || 'image/png';
  const a = document.createElement('a'); a.download = `glitch-${Date.now()}.${fmt}`; a.href = tempCanvas.toDataURL(mime, q); a.click();
}

async function startAnimExport() {
  if (!originalImageData || effectChain.length === 0) { alert('Upload and add effects!'); return; }
  if (animating) stopAnimate();
  const duration = parseInt(document.getElementById('gif-duration').value), fps = parseInt(document.getElementById('anim-speed').value);
  const format = document.getElementById('gif-format').value, totalFrames = duration * fps;
  const w = originalCanvas.width, h = originalCanvas.height;
  const prog = document.getElementById('export-progress');
  const fill = document.getElementById('prog-fill'), text = document.getElementById('prog-text');
  prog.style.display = 'block';

  if (format === 'frames') await exportFrames(totalFrames, fps, w, h, fill, text);
  else if (format === 'mp4') await exportMP4(totalFrames, fps, w, h, fill, text);
  else if (format === 'webm') await exportWebM(totalFrames, fps, duration, w, h, fill, text);
  else await exportGIF(totalFrames, fps, w, h, fill, text);
}

async function exportMP4(totalFrames, fps, w, h, fill, text) {
  if (!window.VideoEncoder) {
    text.textContent = 'MP4 EXPORT NOT SUPPORTED BY BROWSER';
    setTimeout(() => { document.getElementById('export-progress').style.display = 'none'; }, 3000);
    return;
  }

  console.log('Starting MP4 Export:', { totalFrames, fps, w, h });
  text.textContent = 'INITIALIZING MP4 ENCODER...';
  
  try {
    const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@3.0.0/build/mp4-muxer.mjs');

    const finalW = w % 2 === 0 ? w : w - 1;
    const finalH = h % 2 === 0 ? h : h - 1;

    let muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: finalW,
        height: finalH
      },
      fastStart: 'in-memory'
    });

    let videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        console.error('VideoEncoder Error:', e);
        text.textContent = 'ENCODER ERROR: ' + e.message;
      }
    });

    // avc1.4D4028 = Main Profile @ Level 4.0 (supports up to 2048x1024)
    videoEncoder.configure({
      codec: 'avc1.4D4028', 
      width: finalW,
      height: finalH,
      bitrate: 8_000_000,
      framerate: fps
    });

    for (let f = 0; f < totalFrames; f++) {
      if (videoEncoder.state === 'closed') break;
      const c = await renderFrameFull(f, finalW, finalH);
      // IMPORTANT: Timestamp must be an integer (microseconds)
      const timestamp = Math.round(f * 1_000_000 / fps);
      const frame = new VideoFrame(c, { timestamp });
      
      try {
        videoEncoder.encode(frame, { keyFrame: f % 30 === 0 });
      } catch (e) {
        console.error('Encode failed:', e);
        frame.close();
        break;
      }
      frame.close();

      fill.style.width = ((f + 1) / totalFrames * 100).toFixed(0) + '%';
      text.textContent = `ENCODING MP4: FRAME ${f + 1}/${totalFrames}`;
      if (f % 5 === 0) await sleep(0); // Periodic yields to the UI
    }

    console.log('Finalizing MP4 encoding...');
    text.textContent = 'FINALIZING FILE...';
    
    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    const { buffer } = muxer.target;
    if (!buffer || buffer.byteLength === 0) throw new Error('Generated MP4 buffer is empty');

    const blob = new Blob([buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `glitch-${Date.now()}.mp4`;
    a.href = url;
    a.click();

    console.log('MP4 Download triggered successfully.');
    text.textContent = 'MP4 READY — DOWNLOADING!';
    setTimeout(() => { URL.revokeObjectURL(url); document.getElementById('export-progress').style.display = 'none'; }, 3000);

  } catch (e) {
    console.error('MP4 Export Fatal Error:', e);
    text.textContent = 'FATAL EXPORT ERROR';
    setTimeout(() => { document.getElementById('export-progress').style.display = 'none'; }, 5000);
  }
}

async function renderFrameFull(f, w, h) {
  const tmpC = document.createElement('canvas'); tmpC.width = w; tmpC.height = h;
  const tmpX = tmpC.getContext('2d', { willReadFrequently: true });
  tmpX.putImageData(originalImageData, 0, 0);
  const imgData = tmpX.getImageData(0, 0, w, h);
  const rng = mulberry32(f * 7919 % 99991);
  effectChain.forEach(item => applyFx(imgData.data, w, h, item.id, item.params, rng, accentColor));
  tmpX.putImageData(imgData, 0, 0);
  return tmpC;
}

async function exportFrames(totalFrames, fps, w, h, fill, text) {
  text.textContent = 'RENDERING FULL RES...';
  for (let f = 0; f < totalFrames; f++) {
    const c = await renderFrameFull(f, w, h);
    const a = document.createElement('a'); a.download = `glitch-frame-${String(f).padStart(4, '0')}.png`; a.href = c.toDataURL('image/png'); a.click();
    fill.style.width = ((f + 1) / totalFrames * 100).toFixed(0) + '%'; text.textContent = `FRAME ${f + 1} / ${totalFrames}`;
    await sleep(30);
  }
  setTimeout(() => { document.getElementById('export-progress').style.display = 'none'; }, 3000);
}

async function exportWebM(totalFrames, fps, duration, w, h, fill, text) {
  const tmpC = document.createElement('canvas'); tmpC.width = w; tmpC.height = h;
  const tmpX = tmpC.getContext('2d', { willReadFrequently: true });
  const supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const stream = tmpC.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: supported, videoBitsPerSecond: 12000000 });
  const chunks = []; rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  rec.start(100);
  for (let f = 0; f < totalFrames; f++) {
    tmpX.putImageData(originalImageData, 0, 0);
    const imgData = tmpX.getImageData(0, 0, w, h);
    const rng = mulberry32(f * 7919 % 99991);
    effectChain.forEach(item => applyFx(imgData.data, w, h, item.id, item.params, rng, accentColor));
    tmpX.putImageData(imgData, 0, 0);
    fill.style.width = ((f + 1) / totalFrames * 100).toFixed(0) + '%'; text.textContent = `ENCODING ${f + 1}/${totalFrames}`;
    await sleep(1000 / fps);
  }
  rec.stop(); await new Promise(r => rec.onstop = r);
  const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
  const a = document.createElement('a'); a.download = `glitch-${Date.now()}.webm`; a.href = url; a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.getElementById('export-progress').style.display = 'none'; }, 3000);
}

async function exportGIF(totalFrames, fps, w, h, fill, text) {
  try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'); } catch (e) { return; }
  const gif = new GIF({ workers: 4, quality: 6, width: w, height: h, workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js', repeat: 0 });
  const delay = Math.round(1000 / fps);
  for (let f = 0; f < totalFrames; f++) {
    const c = await renderFrameFull(f, w, h);
    gif.addFrame(c.getContext('2d'), { copy: true, delay });
    fill.style.width = (8 + (f + 1) / totalFrames * 50).toFixed(0) + '%'; text.textContent = `FRAME ${f + 1}/${totalFrames}`;
    await sleep(0);
  }
  gif.on('progress', p => { fill.style.width = (58 + p * 42).toFixed(0) + '%'; text.textContent = `ENCODING ${Math.round(p * 100)}%`; });
  gif.on('finished', blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.download = `glitch-${Date.now()}.gif`; a.href = url; a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.getElementById('export-progress').style.display = 'none'; }, 3000);
  });
  gif.render();
}

function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

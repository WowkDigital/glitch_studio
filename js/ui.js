import { LABELS, PARAM_DEFS } from './config.js';

export function renderChain(effectChain, container, options = {}) {
  const { onRemove, onReorder } = options;
  container.innerHTML = '';
  if (effectChain.length === 0) {
    container.innerHTML = '<div class="chain-empty">no effects — add from library</div>';
    return;
  }
  effectChain.forEach((item, idx) => {
    if (idx > 0) {
      const arrow = document.createElement('div');
      arrow.className = 'chain-arrow';
      arrow.textContent = '↓';
      container.appendChild(arrow);
    }
    const el = document.createElement('div');
    el.className = 'chain-item';
    el.draggable = true;
    el.innerHTML = `
      <span class="chain-drag">⠿</span>
      <span class="chain-num">${idx + 1}</span>
      <span class="chain-name">${item.label}</span>
      <span class="chain-del">✕</span>
    `;

    // Delete event
    el.querySelector('.chain-del').onclick = (e) => {
      e.stopPropagation();
      if (onRemove) onRemove(idx);
    };

    // Drag and Drop
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', idx);
      e.dataTransfer.effectAllowed = 'move';
      el.style.opacity = '.5';
    });
    el.addEventListener('dragend', () => { el.style.opacity = '1'; });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const srcIdx = parseInt(e.dataTransfer.getData('text/plain'));
      if (srcIdx === idx) return;
      if (onReorder) onReorder(srcIdx, idx);
    });

    container.appendChild(el);
  });
}

export function renderParams(effectChain, container, options = {}) {
  const { onParamChange } = options;
  if (effectChain.length === 0) {
    container.innerHTML = '<span style="font-size:9px;color:var(--dim)">Add effects to chain</span>';
    return;
  }
  container.innerHTML = effectChain.map((item, idx) => {
    const defs = PARAM_DEFS[item.id] || [];
    const inputs = defs.map(d => {
      const v = item.params[d.k] !== undefined ? item.params[d.k] : 5;
      const uid = `cp-${idx}-${d.k}`;
      return `
        <div class="param-row">
          <span class="param-label">${d.l}</span>
          <input type="range" id="${uid}" min="${d.mn}" max="${d.mx}" value="${v}" step="1" data-idx="${idx}" data-key="${d.k}">
          <span class="param-val" id="${uid}-v">${v}</span>
        </div>`;
    }).join('');
    return `<div class="pblock"><div class="pblock-title">${idx + 1}. ${item.label}</div>${inputs}</div>`;
  }).join('');

  // Attach events
  container.querySelectorAll('input[type=range]').forEach(input => {
    input.oninput = (e) => {
      const idx = e.target.dataset.idx;
      const key = e.target.dataset.key;
      const val = parseInt(e.target.value);
      document.getElementById(`${e.target.id}-v`).textContent = val;
      if (onParamChange) onParamChange(idx, key, val, false); // false = not committed yet
    };
    input.onchange = (e) => {
      if (onParamChange) onParamChange(e.target.dataset.idx, e.target.dataset.key, parseInt(e.target.value), true); // true = committed
    };
  });
}

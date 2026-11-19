// Vice Cover Studio — the editor wiring.
// Loads the person's own photos (FileReader / object URLs, never uploaded),
// lets them pick a panel, drag to crop it, zoom it, caption it, and export
// the cover as a real PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080.
import { drawCover, panelsFor, renderCover, SIZES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

export const state = {
  size: 'square',
  grade: 'sunset',
  caption: 'Sunset Heist',
  subtitle: 'Vice City • 2026',
  photos: [null, null, null],
  photoNames: ['—', '—', '—'],
  panelPhoto: [0, 1, 0, 1],
  crops: [
    { scale: 1, ox: 0, oy: 0 },
    { scale: 1, ox: 0, oy: 0 },
    { scale: 1, ox: 0, oy: 0 },
    { scale: 1, ox: 0, oy: 0 },
  ],
  selected: 0,
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Waits until the vendored display font is usable for canvas type. */
async function fontReady() {
  try {
    await document.fonts.load('900 100px ViceDisplay');
    await document.fonts.ready;
  } catch {
    // Falls back to the system sans-serif if the font cannot load.
  }
}

function panelRects() {
  const { width: w, height: h } = canvas;
  return panelsFor(state.size).map((p) => ({ x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h }));
}

function redraw() {
  canvas.width = SIZES[state.size].w;
  canvas.height = SIZES[state.size].h;
  drawCover(canvas, state);
  syncPanelControls();
}

/** Keeps the panel controls (zoom, photo, crop) showing the selected panel. */
function syncPanelControls() {
  const i = state.selected;
  const crop = state.crops[i];
  $('panelLabel').textContent = `Panel ${i + 1} of ${panelRects().length}`;
  $('panelPhoto').value = String(state.panelPhoto[i]);
  $('zoom').value = String(Math.round(crop.scale * 100));
  $('zoomVal').textContent = `${Math.round(crop.scale * 100)}%`;
  $('panX').value = String(Math.round(crop.ox * 100));
  $('panY').value = String(Math.round(crop.oy * 100));
}

function setStatus(text) {
  status.textContent = text;
}

/** Puts a loaded photo into slot `slot` (0, 1 or 2) and redraws. */
export function setPhoto(slot, img, name) {
  state.photos[slot] = img;
  state.photoNames[slot] = name || `Photo ${'ABC'[slot]}`;
  $(`photoName${'ABC'[slot]}`).textContent = state.photoNames[slot];
  redraw();
  setStatus(`${state.photoNames[slot]} loaded — pick a panel, drag to crop, then export.`);
}

// ---- Photo inputs: three slots, each from the person's own machine. ----
['A', 'B', 'C'].forEach((letter, slot) => {
  $(`photo${letter}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setPhoto(slot, await loadImage(URL.createObjectURL(file)), file.name);
    } catch {
      setStatus(`Could not read ${file.name}. Try another image file.`);
    }
  });
  $(`sample${letter}`).addEventListener('click', async () => {
    const sample = slot === 2 ? 'pier' : 'boulevard';
    try {
      setPhoto(slot, await loadImage(`samples/${sample}.jpg`), `Sample: ${sample}`);
    } catch {
      setStatus('Sample photo failed to load.');
    }
  });
});

// One photo in every panel, at the click of a button.
$('fillAll').addEventListener('click', () => {
  const slot = Number($('panelPhoto').value);
  state.panelPhoto = state.panelPhoto.map(() => slot);
  redraw();
  setStatus(`Every panel now shows Photo ${'ABC'[slot]}.`);
});

// ---- Caption, subtitle, grade and size. ----
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
$('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  state.selected = 0;
  redraw();
  setStatus(`${SIZES[state.size].label} — preview updated.`);
});

// ---- Selected panel: which photo it shows, zoom and pan sliders. ----
$('panelPhoto').addEventListener('change', (e) => {
  state.panelPhoto[state.selected] = Number(e.target.value);
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  state.crops[state.selected].scale = Number(e.target.value) / 100;
  redraw();
});
$('panX').addEventListener('input', (e) => {
  state.crops[state.selected].ox = Number(e.target.value) / 100;
  redraw();
});
$('panY').addEventListener('input', (e) => {
  state.crops[state.selected].oy = Number(e.target.value) / 100;
  redraw();
});
$('resetCrop').addEventListener('click', () => {
  state.crops[state.selected] = { scale: 1, ox: 0, oy: 0 };
  redraw();
  setStatus(`Panel ${state.selected + 1} crop reset.`);
});

// ---- Canvas pointer work: click a panel to select it, drag to pan its photo,
// wheel to zoom it. Coordinates are mapped from CSS pixels to canvas pixels. ----
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
function panelAt(x, y) {
  const rects = panelRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const p = rects[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  state.selected = i;
  dragging = { x: p.x, y: p.y, ox: state.crops[i].ox, oy: state.crops[i].oy };
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const rects = panelRects();
  const rect = rects[state.selected];
  state.crops[state.selected].ox = dragging.ox + (p.x - dragging.x) / rect.w;
  state.crops[state.selected].oy = dragging.oy + (p.y - dragging.y) / rect.h;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const crop = state.crops[state.selected];
  crop.scale = Math.min(3, Math.max(1, crop.scale * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

// ---- Export: a real PNG download at the chosen post size. ----
async function exportPng(sizeKey) {
  await fontReady();
  const out = renderCover(state, sizeKey);
  out.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${sizeKey}-${SIZES[sizeKey].w}x${SIZES[sizeKey].h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    setStatus(`Saved ${a.download} — share it anywhere.`);
  }, 'image/png');
}
document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', () => exportPng(btn.dataset.export));
});

// ---- Shot mode: fixed scenes for screenshots, or the live editor. ----
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { loadImage, fontReady, state, setPhoto, redraw, renderCover, SIZES });
} else {
  fontReady().then(redraw);
  redraw();
}

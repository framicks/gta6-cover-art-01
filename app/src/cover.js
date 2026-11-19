// Vice Cover Studio — the cover drawing engine.
// Draws a multi-panel GTA-style poster cover onto any canvas: a Vice City sunset
// sky, a slatted retro sun, photo panels with white gutters, palm silhouettes,
// a neon colour grade, and a big condensed caption banner. Everything drawn here
// is original vector art and type; no game artwork, logo or font is used.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
};

export const GRADES = {
  sunset: { name: 'Sunset', top: 'rgba(255, 94, 120, 0.16)', bottom: 'rgba(255, 150, 60, 0.22)' },
  neon: { name: 'Neon', top: 'rgba(0, 229, 255, 0.18)', bottom: 'rgba(255, 0, 153, 0.22)' },
  night: { name: 'Night', top: 'rgba(40, 20, 120, 0.28)', bottom: 'rgba(255, 60, 140, 0.16)' },
};

// Panel rectangles, as fractions of the cover size, per export size.
// Every layout has a big hero panel plus smaller panels beneath or beside it.
export function panelsFor(size) {
  const m = 0.025; // outer margin
  const g = 0.018; // gutter between panels
  const w = 1 - 2 * m;
  if (size === 'portrait') {
    return [
      { x: m, y: m, w, h: 0.5 },
      { x: m, y: 0.54, w: (w - g) / 2, h: 0.235 },
      { x: m + (w - g) / 2 + g, y: 0.54, w: (w - g) / 2, h: 0.235 },
      { x: m, y: 0.795, w, h: 0.18 },
    ];
  }
  if (size === 'landscape') {
    const heroW = 0.56;
    return [
      { x: m, y: m, w: heroW, h: 1 - 2 * m },
      { x: m + heroW + g, y: m, w: 1 - 2 * m - heroW - g, h: (1 - 2 * m - g) / 2 },
      { x: m + heroW + g, y: m + (1 - 2 * m - g) / 2 + g, w: 1 - 2 * m - heroW - g, h: (1 - 2 * m - g) / 2 },
    ];
  }
  // square
  return [
    { x: m, y: m, w, h: 0.585 },
    { x: m, y: 0.63, w: (w - g) / 2, h: 0.345 },
    { x: m + (w - g) / 2 + g, y: 0.63, w: (w - g) / 2, h: 0.345 },
  ];
}

// Where the caption banner sits, as a fraction of the cover height. The strip
// holds two lines: the big caption and a smaller subtitle beneath it.
export function bannerFor(size) {
  if (size === 'portrait') return { y: 0.44, h: 0.13, tilt: -0.02 };
  if (size === 'landscape') return { y: 0.79, h: 0.17, tilt: -0.015 };
  return { y: 0.575, h: 0.14, tilt: -0.02 };
}

/** Draws one photo into a panel rect, honouring the crop (zoom + pan offsets). */
export function drawPhotoInPanel(ctx, photo, rect, crop) {
  if (!photo) return;
  const pw = photo.naturalWidth;
  const ph = photo.naturalHeight;
  const base = Math.max(rect.w / pw, rect.h / ph);
  const scale = base * (crop?.scale ?? 1);
  const dw = pw * scale;
  const dh = ph * scale;
  const ox = (crop?.ox ?? 0) * rect.w;
  const oy = (crop?.oy ?? 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, rect.x + (rect.w - dw) / 2 + ox, rect.y + (rect.h - dh) / 2 + oy, dw, dh);
  ctx.restore();
}

/** A slatted retro sun, drawn on its own layer so the slats cut only the sun. */
function drawRetroSun(ctx, cx, cy, r) {
  const layer = document.createElement('canvas');
  layer.width = Math.ceil(r * 2 + 4);
  layer.height = Math.ceil(r * 2 + 4);
  const l = layer.getContext('2d');
  const grad = l.createLinearGradient(0, 0, 0, r * 2);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.55, '#ff7e5f');
  grad.addColorStop(1, '#ff2e88');
  l.fillStyle = grad;
  l.beginPath();
  l.arc(r + 2, r + 2, r, 0, Math.PI * 2);
  l.fill();
  // Slats: clear widening horizontal bars across the sun's lower half.
  l.globalCompositeOperation = 'destination-out';
  let y = r + 2 + r * 0.08;
  let bar = r * 0.045;
  while (y < r * 2 + 2) {
    l.fillRect(0, y, r * 2 + 4, bar);
    y += bar + r * 0.14;
    bar *= 1.45;
  }
  ctx.drawImage(layer, cx - r - 2, cy - r - 2);
}

/** One original palm silhouette: a curved trunk and fanning fronds.
 *  (x, y) is the base of the trunk; the crown fans out above it. */
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning slightly.
  ctx.lineWidth = s * 0.06;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.5, x + s * 0.22, y - s * 0.85);
  ctx.stroke();
  // Fronds fanning from the crown, each arcing up then drooping down.
  const cx = x + s * 0.22;
  const cy = y - s * 0.85;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.92 - i * 0.16);
    const len = s * (0.38 + 0.08 * Math.cos(i * 1.7));
    const ex = cx + Math.cos(a) * len;
    const ey = cy + Math.sin(a) * len * 0.55 + s * 0.16;
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.55, cy - s * 0.14, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** The sunset sky behind the panels: violet dusk fading to a hot horizon. */
function drawSky(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1b0b3b');
  sky.addColorStop(0.45, '#7b1e6e');
  sky.addColorStop(0.75, '#e8446e');
  sky.addColorStop(1, '#ff9a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
}

/** The neon grade: a soft-light wash plus a vignette that deepens the edges. */
function drawGrade(ctx, w, h, grade) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, g.top);
  wash.addColorStop(1, g.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(10, 0, 30, 0)');
  vig.addColorStop(1, 'rgba(10, 0, 30, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** The caption banner: a tilted hot-pink strip with huge condensed type on
 *  the top line and the subtitle in small yellow capitals beneath it. */
function drawCaptionBanner(ctx, w, h, size, caption, subtitle) {
  const band = bannerFor(size);
  const y = band.y * h;
  const bh = band.h * h;
  ctx.save();
  ctx.translate(w / 2, y + bh / 2);
  ctx.rotate(band.tilt);
  // Strip with a yellow edge.
  const strip = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  strip.addColorStop(0, '#ff2e88');
  strip.addColorStop(0.5, '#ff4d6d');
  strip.addColorStop(1, '#ff2e88');
  ctx.fillStyle = strip;
  ctx.fillRect(-w * 0.52, -bh / 2, w * 1.04, bh);
  ctx.fillStyle = '#ffe259';
  ctx.fillRect(-w * 0.52, bh / 2 - h * 0.008, w * 1.04, h * 0.008);
  // Caption, shrunk to fit, on the strip's top line.
  const text = (caption || 'VICE CITY').trim().toUpperCase();
  let fs = bh * 0.56;
  ctx.font = `${fs}px ViceDisplay, "Arial Narrow", sans-serif`;
  while (ctx.measureText(text).width > w * 0.94 && fs > 10) {
    fs -= 2;
    ctx.font = `${fs}px ViceDisplay, "Arial Narrow", sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(20, 0, 40, 0.55)';
  ctx.shadowBlur = fs * 0.12;
  ctx.shadowOffsetY = fs * 0.05;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, -bh * 0.14);
  // Subtitle, small yellow capitals on the strip's bottom line.
  if (subtitle && subtitle.trim()) {
    const sub = subtitle.trim().toUpperCase();
    let sfs = bh * 0.17;
    ctx.font = `${sfs}px ViceDisplay, "Arial Narrow", sans-serif`;
    while (ctx.measureText(sub).width > w * 0.9 && sfs > 8) {
      sfs -= 1;
      ctx.font = `${sfs}px ViceDisplay, "Arial Narrow", sans-serif`;
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffe259';
    ctx.fillText(sub, 0, bh * 0.28);
  }
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` from a state:
 * { size, grade, caption, subtitle, photos: [Image|null], panelPhoto: [n],
 *   crops: [{scale, ox, oy}] }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const size = state.size || 'square';
  drawSky(ctx, w, h);
  const panels = panelsFor(size).map((p) => ({
    x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h,
  }));
  // Photos fill their panels; an empty panel keeps the sunset sky.
  panels.forEach((rect, i) => {
    const photo = state.photos?.[state.panelPhoto?.[i] ?? i] ?? null;
    drawPhotoInPanel(ctx, photo, rect, state.crops?.[i]);
  });
  // Retro sun and palms over the hero panel's sky corners.
  const hero = panels[0];
  drawRetroSun(ctx, hero.x + hero.w * 0.8, hero.y + hero.h * 0.22, Math.min(hero.w, hero.h) * 0.15);
  ctx.save();
  ctx.globalAlpha = 0.85;
  drawPalm(ctx, hero.x + hero.w * 0.02, hero.y + hero.h * 0.3, hero.h * 0.3, '#14082b');
  drawPalm(ctx, hero.x + hero.w * 0.13, hero.y + hero.h * 0.33, hero.h * 0.2, '#1c0a38');
  ctx.restore();
  // White gutters outline every panel.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  panels.forEach((rect) => ctx.strokeRect(rect.x, rect.y, rect.w, rect.h));
  drawGrade(ctx, w, h, state.grade || 'sunset');
  drawCaptionBanner(ctx, w, h, size, state.caption, state.subtitle);
}

/** Renders the cover at an export size onto a fresh canvas and returns it. */
export function renderCover(state, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, { ...state, size: sizeKey });
  return canvas;
}

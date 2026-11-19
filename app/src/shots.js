// Fixed scenes for screenshots.
// ?shot=cover shows the cover the app itself exported: it renders the cover at
// the export size, takes the real PNG the app wrote (canvas.toBlob), and shows
// that PNG full-bleed — so the screenshot is the exported file, not a mock-up.
// ?shot=editor shows the editor with a sample photo loaded.
// `photo` picks the sample (samples/<photo>.jpg), `caption` the words, and
// `size` the post size (square, portrait or landscape).
// window.__shotReady is set once the scene is fully painted.
export async function runShot(shot, query, api) {
  const { loadImage, fontReady, state, setPhoto, renderCover, SIZES } = api;
  const caption = query.get('caption') ?? 'Sunset Heist';
  const photoName = query.get('photo') ?? 'pier';
  const sizeKey = query.get('size') ?? 'square';
  state.caption = caption;
  state.subtitle = query.get('subtitle') ?? 'Vice City • 2026';
  state.grade = query.get('grade') ?? 'sunset';
  state.size = sizeKey;

  await fontReady();
  const photo = await loadImage(`samples/${photoName}.jpg`);
  setPhoto(0, photo, `Sample: ${photoName}`);
  // The second photo slot gets the other sample, so multi-panel covers show
  // two different photos in the screenshots. Panels alternate between the
  // two loaded photos, so no panel is ever left empty.
  const other = photoName === 'pier' ? 'boulevard' : 'pier';
  try {
    setPhoto(1, await loadImage(`samples/${other}.jpg`), `Sample: ${other}`);
  } catch {
    // One photo is enough; the cover still renders.
  }
  state.panelPhoto = [0, 1, 0, 1];

  if (shot === 'cover') {
    // Render the export, then show the PNG the app wrote.
    const out = renderCover(state, sizeKey);
    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    const url = URL.createObjectURL(blob);
    document.body.classList.add('shot-cover');
    const view = document.getElementById('shotView');
    view.hidden = false; // the div starts hidden so the live editor never shows it
    const img = document.getElementById('shotImg');
    img.src = url;
    img.alt = `Exported ${SIZES[sizeKey].label} cover: ${caption}`;
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
  } else {
    // Editor view: the app with a photo loaded, ready to crop and export.
    api.redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

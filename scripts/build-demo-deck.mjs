#!/usr/bin/env node
// Builds the official 7-slide project demo (Space Apps Project Submission Guide, 13 Nov 2026: "up to seven slides
// including title and intro slides", in English, hosted at a public link).
//
//   NODE_PATH=$(npm root -g) LIVE_URL="https://<user>.github.io/threadline/" node scripts/build-demo-deck.mjs
//   soffice --headless --convert-to pdf --outdir docs/demo docs/demo/threadline-demo-7slides.pptx
//
// Needs `pptxgenjs` (not a dependency of the game: install it on the machine that builds the deck, e.g. `npm i -g pptxgenjs`)
// and LibreOffice for the PDF. Uses the SI-watermarked screenshots (python3 scripts/watermark-screenshots.py).
// Rules this file keeps (tests/docs/demo.test.ts checks the result): exactly 7 slides, at most 30 words of content per
// slide, and the footer "Built with SI assistance (Claude, Anthropic)" on every slide (it lives on the slide layouts).
// No NASA logos, no photos of people, no real-world number that is not in docs/truth-ledger.md.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');

const LIVE_URL = process.env.LIVE_URL ?? '';
const OUT = process.env.OUT ?? 'docs/demo/threadline-demo-7slides.pptx';
const SHOTS = 'submission/screenshots-si';
const FOOTER = 'Built with SI assistance (Claude, Anthropic)';

// Palette taken from the game itself (dark navy, cyan, amber), all well above 4.5:1 on the background.
const BG = '0B1020', PANEL = '141B33', EDGE = '7585BC', TEXT = 'E8ECF8', MUTED = 'A9B4D0';
const CYAN = '4DD8FF', AMBER = 'FFB020', GREEN = '4DE0A0', PINK = 'FF8FB1';
const FONT = 'Calibri';

for (const f of ['02-design-bay-threads.png', '03-mission-control.png', '04-outcome-chain.png'])
  if (!existsSync(`${SHOTS}/${f}`)) { console.error(`missing ${SHOTS}/${f}: run python3 scripts/watermark-screenshots.py`); process.exit(1); }
mkdirSync('docs/demo', { recursive: true });

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 in
pres.title = 'Threadline: 7-slide project demo';
pres.author = 'Team Threadline (Sagar)';
pres.subject = `NASA Space Apps Challenge 2026 project demo. ${FOOTER}.`;
pres.company = '';
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

const footerObj = { text: { text: FOOTER, options: { x: 0.5, y: 5.17, w: 9, h: 0.3, fontFace: FONT, fontSize: 11, color: MUTED, align: 'left', margin: 0 } } };
pres.defineSlideMaster({ title: 'TITLE_SLIDE', background: { color: BG }, objects: [footerObj] });
pres.defineSlideMaster({
  title: 'CONTENT', background: { color: BG }, objects: [footerObj],
  slideNumber: undefined,
});

const txt = (slide, text, o) => slide.addText(text, { fontFace: FONT, isTextBox: true, margin: 0, valign: 'top', ...o });
const title = (slide, text) => txt(slide, text, { x: 0.5, y: 0.35, w: 9, h: 0.7, fontSize: 34, bold: true, color: TEXT, valign: 'middle', objectName: 'Title' });
const panel = (slide, x, y, w, h, o = {}) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: PANEL }, line: { color: EDGE, width: 1 }, objectName: o.name ?? 'Panel' });
const node = (slide, x, y, d, color) => slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color: BG, width: 1.5 }, objectName: 'Thread node' });
const thread = (slide, x1, y1, x2, y2, color, dash = 'solid') => slide.addShape(pres.shapes.LINE, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color, width: 2.25, dashType: dash }, objectName: 'Thread' });
const shot = (slide, file, x, y, w, alt) => {
  const h = (w * 756) / 1280; // the watermarked screenshots are 1280 x 756
  panel(slide, x - 0.06, y - 0.06, w + 0.12, h + 0.12, { name: 'Image frame' });
  slide.addImage({ path: `${SHOTS}/${file}`, x, y, w, h, altText: alt, objectName: 'Screenshot' });
  return h;
};

// 1. Title, tagline, team, member, challenge ----------------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: 'TITLE_SLIDE' });
  txt(s, 'Threadline', { x: 0.5, y: 0.6, w: 4.6, h: 1.0, fontSize: 56, bold: true, color: TEXT, objectName: 'Title' });
  txt(s, 'Every choice leaves a trace.', { x: 0.5, y: 1.65, w: 4.6, h: 0.5, fontSize: 24, italic: true, color: CYAN, objectName: 'Tagline' });
  panel(s, 0.5, 2.4, 4.6, 2.2, { name: 'Team panel' });
  const rows = [['Team', 'Threadline'], ['Member', 'Sagar'], ['Challenge', 'Space Mission Design Game']];
  rows.forEach(([k, v], i) => {
    txt(s, k, { x: 0.75, y: 2.55 + i * 0.68, w: 1.3, h: 0.6, fontSize: 14, color: MUTED, valign: 'middle', objectName: `${k} label` });
    txt(s, v, { x: 2.05, y: 2.55 + i * 0.68, w: 2.9, h: 0.6, fontSize: 18, bold: true, color: TEXT, valign: 'middle', objectName: `${k} value` });
  });
  txt(s, 'Independent project. Not affiliated with NASA.', { x: 0.5, y: 4.7, w: 4.6, h: 0.3, fontSize: 12, color: MUTED, objectName: 'Disclaimer' });
  shot(s, '03-mission-control.png', 5.45, 1.2, 4.0, 'Screenshot of the Threadline Mission Control screen: a solar storm warning and three answers, each with its cost and risk.');
}

// 2. The challenge and the gap ------------------------------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  title(s, 'The challenge and the gap');
  panel(s, 0.5, 1.4, 4.2, 2.0, { name: 'Challenge card' });
  node(s, 0.75, 1.62, 0.3, CYAN);
  txt(s, 'Challenge', { x: 1.2, y: 1.58, w: 3.2, h: 0.4, fontSize: 16, bold: true, color: CYAN, valign: 'middle' });
  txt(s, 'Space Mission Design Game', { x: 0.75, y: 2.1, w: 3.7, h: 1.1, fontSize: 28, bold: true, color: TEXT });
  panel(s, 5.3, 1.4, 4.2, 2.0, { name: 'Gap card' });
  node(s, 5.55, 1.62, 0.3, AMBER);
  txt(s, 'Gap', { x: 6.0, y: 1.58, w: 3.2, h: 0.4, fontSize: 16, bold: true, color: AMBER, valign: 'middle' });
  txt(s, 'In a textbook, the chain of mission trade-offs is invisible.', { x: 5.55, y: 2.1, w: 3.7, h: 1.1, fontSize: 20, color: TEXT });
  thread(s, 4.7, 2.4, 5.3, 2.4, MUTED, 'dash');
  panel(s, 0.5, 3.75, 9.0, 1.0, { name: 'Answer banner' });
  node(s, 0.8, 4.1, 0.3, GREEN);
  txt(s, 'Answer', { x: 1.3, y: 3.95, w: 1.4, h: 0.6, fontSize: 16, bold: true, color: GREEN, valign: 'middle' });
  txt(s, 'Make the chain visible.', { x: 2.7, y: 3.95, w: 6.5, h: 0.6, fontSize: 26, bold: true, color: TEXT, valign: 'middle' });
}

// 3. The game (screenshot) ----------------------------------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  title(s, 'The game');
  txt(s, 'Design a Moon orbiter. Threads link each choice to the meters it moves.', { x: 0.5, y: 1.3, w: 3.3, h: 1.3, fontSize: 20, color: TEXT, objectName: 'Lead' });
  const steps = ['Pick instruments', 'Launch', 'Storm decision', 'Rewind'];
  steps.forEach((t, i) => {
    const y = 2.75 + i * 0.5;
    s.addShape(pres.shapes.OVAL, { x: 0.5, y, w: 0.36, h: 0.36, fill: { color: [CYAN, AMBER, PINK, GREEN][i] }, line: { color: BG, width: 1 }, objectName: 'Step dot' });
    txt(s, t, { x: 1.05, y: y - 0.02, w: 2.7, h: 0.4, fontSize: 16, color: TEXT, valign: 'middle', objectName: 'Step' });
  });
  shot(s, '02-design-bay-threads.png', 4.05, 1.35, 5.45, 'Screenshot of the Threadline Design Bay: three instruments chosen, and coloured threads from the choice to the meters it changed.');
}

// 4. Consequence threads and cause chains (screenshot) ------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  title(s, 'Consequence threads and cause chains');
  shot(s, '04-outcome-chain.png', 0.5, 1.3, 6.0, 'Screenshot of the Threadline outcome screen: the result, four scores and a cause chain from the player’s decision to the outcome.');
  txt(s, 'Every outcome traces back to a decision.', { x: 6.85, y: 1.3, w: 2.65, h: 1.5, fontSize: 20, bold: true, color: TEXT, objectName: 'Lead' });
  txt(s, 'Rewind: same seed, one change.', { x: 6.85, y: 3.0, w: 2.65, h: 0.9, fontSize: 16, color: CYAN, objectName: 'Rewind' });
}

// 5. NASA data and resources, honestly ----------------------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  title(s, 'NASA data and resources');
  panel(s, 0.5, 1.3, 4.5, 3.4, { name: 'Data panel' });
  node(s, 0.75, 1.52, 0.3, CYAN);
  txt(s, 'Moon Fact Sheet', { x: 1.2, y: 1.48, w: 3.6, h: 0.4, fontSize: 18, bold: true, color: CYAN, valign: 'middle' });
  const vals = [['Radius', '1737.4 km'], ['GM', '0.00490 ×10⁶ km³/s²'], ['Distance', '0.3844 ×10⁶ km']];
  vals.forEach(([k, v], i) => {
    txt(s, k, { x: 0.75, y: 2.2 + i * 0.8, w: 1.2, h: 0.6, fontSize: 14, color: MUTED, valign: 'middle', objectName: `${k} label` });
    txt(s, v, { x: 1.95, y: 2.2 + i * 0.8, w: 2.95, h: 0.6, fontSize: 20, bold: true, color: TEXT, valign: 'middle', objectName: `${k} value` });
  });
  panel(s, 5.3, 1.3, 4.2, 3.4, { name: 'Segments panel' });
  txt(s, 'Four segments: structure only', { x: 5.55, y: 1.45, w: 3.8, h: 0.5, fontSize: 16, bold: true, color: AMBER, valign: 'middle' });
  const seg = [['Launch', 'launcher', CYAN], ['Space', 'spacecraft', GREEN], ['Ground', 'downlink', AMBER], ['User', 'outcome', PINK]];
  seg.forEach(([k, v, c], i) => {
    const y = 2.15 + i * 0.62;
    node(s, 5.55, y + 0.1, 0.26, c);
    txt(s, `${k}: ${v}`, { x: 6.05, y, w: 3.3, h: 0.46, fontSize: 18, color: TEXT, valign: 'middle', objectName: 'Segment' });
  });
}

// 6. Validity and limits ------------------------------------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  title(s, 'Validity and limits');
  const rows = [['NASA DATA', 'Moon values only', CYAN], ['SIMPLIFIED PHYSICS', 'Circular orbit, fixed eclipse', GREEN], ['GAME MODEL', 'Everything else is invented for play', AMBER]];
  rows.forEach(([label, text, c], i) => {
    const y = 1.3 + i * 0.95;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 3.2, h: 0.7, rectRadius: 0.35, fill: { color: BG }, line: { color: c, width: 2 }, objectName: 'Label chip' });
    txt(s, label, { x: 0.5, y, w: 3.2, h: 0.7, fontSize: 16, bold: true, color: c, align: 'center', valign: 'middle', objectName: 'Label' });
    txt(s, text, { x: 4.0, y, w: 5.5, h: 0.7, fontSize: 20, color: TEXT, valign: 'middle', objectName: 'Label meaning' });
  });
  panel(s, 0.5, 4.2, 9.0, 0.6, { name: 'Limits note' });
  txt(s, 'Chromium-tested only. No player study.', { x: 0.8, y: 4.2, w: 8.5, h: 0.6, fontSize: 16, color: MUTED, valign: 'middle', objectName: 'Limits' });
}

// 7. What is next and the live link ------------------------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: 'CONTENT' });
  title(s, 'What’s next');
  const next = [['Sourced numbers', CYAN], ['More missions', GREEN], ['Real player tests', PINK]];
  next.forEach(([t, c], i) => {
    const x = 0.5 + i * 3.05;
    panel(s, x, 1.3, 2.9, 1.5, { name: 'Next card' });
    node(s, x + 0.25, 1.55, 0.34, c);
    txt(s, t, { x: x + 0.25, y: 2.05, w: 2.45, h: 0.6, fontSize: 20, bold: true, color: TEXT, valign: 'middle', objectName: 'Next' });
  });
  const hasUrl = LIVE_URL.length > 0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 3.3, w: 9.0, h: 1.3, rectRadius: 0.12, fill: { color: PANEL }, line: { color: hasUrl ? CYAN : AMBER, width: 2, dashType: hasUrl ? 'solid' : 'dash' }, objectName: 'Link panel' });
  txt(s, 'Play it:', { x: 0.8, y: 3.4, w: 8.4, h: 0.4, fontSize: 16, color: MUTED, valign: 'middle', objectName: 'Link label' });
  if (hasUrl) txt(s, LIVE_URL, { x: 0.8, y: 3.85, w: 8.4, h: 0.6, fontSize: 24, bold: true, color: CYAN, valign: 'middle', hyperlink: { url: LIVE_URL }, objectName: 'Live link' });
  else txt(s, '[OWNER: add the live link]', { x: 0.8, y: 3.85, w: 8.4, h: 0.6, fontSize: 24, bold: true, color: AMBER, valign: 'middle', objectName: 'Live link placeholder' });
}

await pres.writeFile({ fileName: OUT });
// pptxgenjs writes empty folder entries into the zip; some cloud viewers refuse such files, so drop them (best effort).
spawnSync('zip', ['-dq', OUT, '*/'], { stdio: 'ignore' });
console.log(`wrote ${OUT}${LIVE_URL ? '' : ' (live link is a placeholder: set LIVE_URL and rebuild)'}`);

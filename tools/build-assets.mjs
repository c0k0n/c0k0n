/**
 * Regenerates every SVG in assets/ from live GitHub data.
 *
 *   GH_TOKEN=$(gh auth token) node tools/build-assets.mjs
 *
 * Nothing is hand-typed: bar lengths, percentages, commit counts and dates all
 * come from the API, so the charts cannot drift away from the profile.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const USER = 'c0k0n';
const OUT = path.join(import.meta.dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

const token = (process.env.GH_TOKEN || execSync('gh auth token', { encoding: 'utf8' })).trim();
const H = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'gh' };

const get = async (p) => {
  const r = await fetch(`https://api.github.com${p}`, { headers: H });
  if (!r.ok) throw new Error(`${p} -> ${r.status}`);
  return r.json();
};
const countCommits = async (name) => {
  const r = await fetch(`https://api.github.com/repos/${USER}/${name}/commits?per_page=1`, { headers: H });
  if (!r.ok) return 0;
  const link = r.headers.get('link');
  const m = link && link.match(/[?&]page=(\d+)>; rel="last"/);
  if (m) return +m[1];
  const j = await r.json();
  return Array.isArray(j) ? j.length : 0;
};

/* ------------------------------------------------------------------ data */

const all = (await get(`/users/${USER}/repos?per_page=100&sort=pushed`)).filter((r) => !r.fork);
const projects = all.filter((r) => r.name !== USER);
for (const r of projects) r.commits = await countCommits(r.name);

const yearAgo = new Date();
yearAgo.setFullYear(yearAgo.getFullYear() - 1);
const commitsYear = (await get(
  `/search/commits?q=author:${USER}+author-date:>=${yearAgo.toISOString().slice(0, 10)}&per_page=1`
)).total_count;

const langBytes = {};
for (const r of projects) for (const [k, v] of Object.entries(await get(`/repos/${USER}/${r.name}/languages`))) langBytes[k] = (langBytes[k] || 0) + v;
const langTotal = Object.values(langBytes).reduce((a, b) => a + b, 0);
const langs = Object.entries(langBytes).sort((a, b) => b[1] - a[1]);

const LIVE = {
  basirah: 'https://basirah.pages.dev',
  languageatlas: 'https://languageatlas.pages.dev',
  'lstm-trend': 'https://lstm-trend.streamlit.app',
  'job-tracker': 'https://job-tracker.sanctum.workers.dev',
  'hobun-ssg': 'https://hobun-ssg.pages.dev',
};

const fmtBytes = (b) => (b >= 1e6 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/* --------------------------------------------------------------- theming */

const THEMES = {
  light: {
    bg: '#FFFFFF', card: '#F6F8FA', border: '#D0D7DE', text: '#1F2328', sub: '#59636E', grid: '#EAEEF2',
    accent: ['#B46708', '#1F6FEB', '#1F7A6B', '#7A4FB0', '#B0453A', '#0F766E', '#9A6700', '#8250DF'],
  },
  dark: {
    bg: '#0D1117', card: '#151B23', border: '#30363D', text: '#E6EDF3', sub: '#8B949E', grid: '#21262D',
    accent: ['#F5B56B', '#79C0FF', '#7FD1C1', '#C3A6E8', '#F29D86', '#A5D6FF', '#FFD58A', '#D2A8FF'],
  },
};
const SANS = "ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (w, h, title, desc, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-labelledby="t d">` +
  `<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>${body}</svg>\n`;

/* Bars are emitted at zero and animated up to their value, so the first painted
   frame is the empty state — no flash of the finished chart before it plays. */
const grow = (attr, to, begin, dur = 1.1) =>
  `<animate attributeName="${attr}" values="0;${to}" keyTimes="0;1" dur="${dur}s" begin="${begin}s" ` +
  `calcMode="spline" keySplines="0.22 1 0.36 1" fill="freeze"/>`;

/* -------------------------------------------------------------- 1. header */

function header() {
  const W = 1600, H = 340;
  let stars = '';
  const rnd = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  for (let i = 0; i < 70; i++) {
    const x = 20 + rnd(i, 1) * (W - 40);
    const y = 12 + rnd(i, 2) * 250;
    const r = 0.6 + rnd(i, 3) * 1.5;
    const o = 0.25 + rnd(i, 4) * 0.6;
    const dur = 2.6 + rnd(i, 5) * 4.4;
    const beg = rnd(i, 6) * 5;
    stars +=
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#F8D7A4" fill-opacity="${o.toFixed(2)}">` +
      `<animate attributeName="fill-opacity" values="${o.toFixed(2)};${(o * 0.15).toFixed(2)};${o.toFixed(2)}" ` +
      `dur="${dur.toFixed(2)}s" begin="${beg.toFixed(2)}s" repeatCount="indefinite"/></circle>`;
  }
  const shoot = (y0, x0, delay) =>
    `<g opacity="0"><path d="M0 0 L150 -46" stroke="url(#trail)" stroke-width="2" stroke-linecap="round"/>` +
    `<animateTransform attributeName="transform" type="translate" from="${x0} ${y0}" to="${x0 + 620} ${y0 + 190}" ` +
    `dur="1.5s" begin="${delay}s;${delay}s+7.5s;${delay}s+15s" fill="freeze"/>` +
    `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.6;1" dur="1.5s" ` +
    `begin="${delay}s;${delay}s+7.5s;${delay}s+15s" fill="freeze"/></g>`;

  return wrap(W, H, 'Horizon', 'A warm amber horizon under a deep blue night sky with drifting stars.', `
  <defs>
    <linearGradient id="sky" x1="800" y1="0" x2="800" y2="340" gradientUnits="userSpaceOnUse">
      <stop stop-color="#061321"/><stop offset="0.58" stop-color="#102C43"/><stop offset="1" stop-color="#7A4B32"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(800 300) rotate(-90) scale(200 620)">
      <stop stop-color="#F5B56B" stop-opacity="0.85"/><stop offset="1" stop-color="#F5B56B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="trail" x1="0" y1="0" x2="150" y2="-46" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8D7A4" stop-opacity="0"/><stop offset="1" stop-color="#F8D7A4" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="rule" x1="180" y1="0" x2="1420" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F5B56B" stop-opacity="0"/><stop offset="0.5" stop-color="#F5B56B" stop-opacity="0.85"/><stop offset="1" stop-color="#F5B56B" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="340" rx="18" fill="url(#sky)"/>
  <circle cx="800" cy="300" r="260" fill="url(#glow)">
    <animate attributeName="opacity" values="0.75;1;0.75" dur="7s" repeatCount="indefinite"/>
  </circle>
  ${stars}
  ${shoot(40, 120, 1.2)}${shoot(20, 900, 4.6)}
  <path d="M0 296C240 268 420 308 640 292C812 279 1004 254 1204 292C1368 322 1486 304 1600 284V340H0V296Z" fill="#061321" fill-opacity="0.72"/>
  <path d="M0 316C260 300 470 330 700 318C900 308 1120 292 1330 316C1450 330 1530 322 1600 312V340H0V316Z" fill="#040E19"/>
  <path d="M180 264H1420" stroke="url(#rule)" stroke-width="1.25" stroke-dasharray="2 9">
    <animate attributeName="stroke-dashoffset" from="0" to="-110" dur="6s" repeatCount="indefinite"/>
  </path>`);
}

/* ------------------------------------------------------------- 2. tagline */

function tagline(t, lines) {
  const W = 820, H = 46, n = lines.length, slot = 3, dur = n * slot;
  const items = lines
    .map((s, i) => {
      const anim =
        `<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.02;0.31;0.333;1" ` +
        `dur="${dur}s" begin="${i * slot}s" repeatCount="indefinite" fill="freeze"/>`;
      return `<text x="${W / 2}" y="30" font-family="${MONO}" font-size="16" fill="${t.text}" opacity="0" text-anchor="middle">${esc(s)}${anim}</text>`;
    })
    .join('');
  return wrap(W, H, 'What tends to get built', lines.join(' · '), items);
}

/* ---------------------------------------------------------------- 3. stats */

function stats(t) {
  const W = 1600, H = 190;
  const cards = [
    [String(projects.length), 'public projects'],
    [String(commitsYear), 'commits, last 12 months'],
    [String(Object.keys(LIVE).length), 'live deployments'],
    [String(langs.length), 'languages tracked'],
  ];
  const cw = 386, gap = 18, x0 = (W - (cw * 4 + gap * 3)) / 2;
  const body = cards
    .map(([v, label], i) => {
      const x = x0 + i * (cw + gap);
      return `<g><rect x="${x}" y="24" width="${cw}" height="142" rx="14" fill="${t.card}" stroke="${t.border}"/>
      <rect x="${x}" y="24" width="${cw}" height="3" rx="1.5" fill="${t.accent[i]}">
        <animate attributeName="width" values="0;${cw}" keyTimes="0;1" dur="0.9s" begin="${(i * 0.12).toFixed(2)}s" calcMode="spline" keySplines="0.22 1 0.36 1" fill="freeze"/>
      </rect>
      <circle cx="${x + 26}" cy="60" r="4" fill="${t.accent[i]}">
        <animate attributeName="opacity" values="0.35;1;0.35" dur="2.8s" begin="${(i * 0.3).toFixed(2)}s" repeatCount="indefinite"/>
      </circle>
      <text x="${x + cw / 2}" y="98" font-family="${MONO}" font-size="46" font-weight="700" fill="${t.text}" text-anchor="middle" opacity="0">${v}
        <animate attributeName="opacity" values="0;1" keyTimes="0;1" dur="0.6s" begin="${(0.15 + i * 0.12).toFixed(2)}s" fill="freeze"/>
      </text>
      <text x="${x + cw / 2}" y="132" font-family="${SANS}" font-size="15" fill="${t.sub}" text-anchor="middle" opacity="0">${esc(label)}
        <animate attributeName="opacity" values="0;1" keyTimes="0;1" dur="0.6s" begin="${(0.35 + i * 0.12).toFixed(2)}s" fill="freeze"/>
      </text></g>`;
    })
    .join('');
  return wrap(W, H, 'Profile totals', `${cards.length} totals: ${cards.map((c) => c.join(' ')).join(', ')}.`, body);
}

/* ------------------------------------------------------------- 4. languages */

function languages(t) {
  const top = langs.slice(0, 8);
  const rest = langs.slice(8).reduce((a, [, v]) => a + v, 0);
  const rows = top.map(([k, v]) => [k, v]);
  if (rest > 0) rows.push([`${langs.length - 8} others`, rest]);

  const rowH = 32, top0 = 96, W = 1600, H = top0 + rows.length * rowH + 28;
  const xLabel = 24, xBar = 176, barMax = 1130, xVal = xBar + barMax + 20;
  const max = rows[0][1];

  const body =
    `<text x="24" y="42" font-family="${SANS}" font-size="21" font-weight="600" fill="${t.text}">Language mix</text>` +
    `<text x="24" y="68" font-family="${SANS}" font-size="14" fill="${t.sub}">Share of tracked bytes across the public projects — ${fmtBytes(langTotal)} total</text>` +
    rows
      .map(([name, v], i) => {
        const y = top0 + i * rowH;
        const w = Math.max(3, Math.round((v / max) * barMax));
        const c = t.accent[i % t.accent.length];
        return `<g>
        <text x="${xLabel}" y="${y + 16}" font-family="${MONO}" font-size="13" fill="${t.text}">${esc(name)}</text>
        <rect x="${xBar}" y="${y + 3}" width="${barMax}" height="17" rx="4" fill="${t.grid}"/>
        <rect x="${xBar}" y="${y + 3}" width="${w}" height="17" rx="4" fill="${c}">${grow('width', w, 0.08 * i + 0.15)}</rect>
        <text x="${xVal}" y="${y + 16}" font-family="${MONO}" font-size="12" fill="${t.sub}" opacity="0">${((v / langTotal) * 100).toFixed(1)}% · ${fmtBytes(v)}
          <animate attributeName="opacity" values="0;1" keyTimes="0;1" dur="0.5s" begin="${(0.08 * i + 0.5).toFixed(2)}s" fill="freeze"/>
        </text></g>`;
      })
      .join('');
  return wrap(W, H, 'Language mix', `Tracked bytes by language. ${rows.map(([n, v]) => `${n} ${((v / langTotal) * 100).toFixed(1)} percent`).join(', ')}.`, body);
}

/* -------------------------------------------------------------- 5. commits */

function commits(t) {
  const rows = [...projects].sort((a, b) => b.commits - a.commits);
  const W = 1600, H = 332;
  const x0 = 96, x1 = 1548, base = 276, top0 = 88;
  // Long repo names wrap onto a second line instead of being rotated: horizontal
  // text stays readable at a glance, which is the whole point of the axis.
  const wrapLabel = (name, max = 15) => {
    const parts = name.split('-');
    const lines = [];
    let line = '';
    for (const p of parts) {
      const next = line ? `${line}-${p}` : p;
      if (next.length > max && line) { lines.push(line); line = p; } else { line = next; }
    }
    if (line) lines.push(line);
    return lines;
  };
  const max = Math.max(...rows.map((r) => r.commits));
  const step = (x1 - x0) / rows.length;
  const bw = Math.min(88, step * 0.56);

  let grid = '';
  for (let g = 0; g <= max; g += Math.ceil(max / 3 / 10) * 10) {
    const y = base - (g / max) * (base - top0);
    grid += `<path d="M${x0} ${y.toFixed(1)}H${x1}" stroke="${t.grid}" stroke-width="1"/>` +
      `<text x="${x0 - 14}" y="${(y + 4).toFixed(1)}" font-family="${MONO}" font-size="11" fill="${t.sub}" text-anchor="end">${g}</text>`;
  }

  const bars = rows
    .map((r, i) => {
      const cx = x0 + step * i + step / 2;
      const h = Math.max(3, Math.round((r.commits / max) * (base - top0)));
      const c = t.accent[i % t.accent.length];
      return `<g>
      <rect x="${(cx - bw / 2).toFixed(1)}" y="${base - h}" width="${bw.toFixed(1)}" height="${h}" rx="5" fill="${c}">
        ${grow('height', h, 0.09 * i + 0.15)}
        <animate attributeName="y" from="${base}" to="${base - h}" keyTimes="0;1" dur="1.1s" begin="${(0.09 * i + 0.15).toFixed(2)}s" calcMode="spline" keySplines="0.22 1 0.36 1" fill="freeze"/>
      </rect>
      <text x="${cx.toFixed(1)}" y="${base - h - 9}" font-family="${MONO}" font-size="13" font-weight="600" fill="${t.text}" text-anchor="middle" opacity="0">${r.commits}
        <animate attributeName="opacity" values="0;1" keyTimes="0;1" dur="0.4s" begin="${(0.09 * i + 0.8).toFixed(2)}s" fill="freeze"/>
      </text>
      ${wrapLabel(r.name)
        .map((ln, j) => `<text x="${cx.toFixed(1)}" y="${base + 24 + j * 15}" font-family="${MONO}" font-size="12" fill="${t.sub}" text-anchor="middle">${esc(ln)}</text>`)
        .join('')}
    </g>`;
    })
    .join('');

  return wrap(W, H, 'Commits per repository', `Commit counts: ${rows.map((r) => `${r.name} ${r.commits}`).join(', ')}.`,
    `<text x="24" y="42" font-family="${SANS}" font-size="21" font-weight="600" fill="${t.text}">Where the commits landed</text>` +
    `<text x="24" y="68" font-family="${SANS}" font-size="14" fill="${t.sub}">Commits on the default branch, per project</text>` +
    grid + bars +
    `<path d="M${x0} ${base}H${x1}" stroke="${t.border}" stroke-width="1.5"/>`);
}

/* ---------------------------------------------------------------- 6. stack */

function stack(t) {
  const areas = [
    ['Web', ['TypeScript', 'SvelteKit', 'Svelte 5', 'Astro', 'Hono', 'HTML', 'CSS', 'Tailwind']],
    ['Runtime & delivery', ['Bun', 'Node', 'Cloudflare Workers', 'Cloudflare Pages', 'Streamlit']],
    ['Data & ML', ['Python', 'Keras', 'PyTorch', 'scikit-learn', 'yfinance', 'SQL', 'Power BI']],
    ['Systems & tooling', ['Bash', 'Go', 'Git', 'Docker', 'Linux', 'WSL']],
  ];
  const W = 1600, H = 306;
  const colW = 380, gap = 20, x00 = (W - (colW * 4 + gap * 3)) / 2;
  let m = 0;
  const cols = areas
    .map(([title, chips], col) => {
      const x = x00 + col * (colW + gap);
      const c = t.accent[col % t.accent.length];
      let cx = x + 16, cy = 128, out = '';
      for (const chip of chips) {
        const w = Math.round(chip.length * 7.6 + 22);
        if (cx + w > x + colW - 16) { cx = x + 16; cy += 36; }
        out += `<g opacity="0"><rect x="${cx}" y="${cy}" width="${w}" height="27" rx="13.5" fill="${t.card}" stroke="${t.border}"/>
        <text x="${cx + w / 2}" y="${cy + 18}" font-family="${MONO}" font-size="12" fill="${t.text}" text-anchor="middle">${esc(chip)}</text>
        <animate attributeName="opacity" values="0;1" keyTimes="0;1" dur="0.45s" begin="${(0.04 * m + 0.2).toFixed(2)}s" fill="freeze"/>
        <animateTransform attributeName="transform" type="translate" values="0 7;0 0" keyTimes="0;1" dur="0.45s" begin="${(0.04 * m + 0.2).toFixed(2)}s" calcMode="spline" keySplines="0.22 1 0.36 1" fill="freeze"/></g>`;
        cx += w + 8;
        m++;
      }
      const needed = cy + 36 - 128;
      return `<g><rect x="${x}" y="96" width="${colW}" height="${186}" rx="14" fill="${t.card}" stroke="${t.border}" opacity="0">
        <animate attributeName="opacity" values="0;1" keyTimes="0;1" dur="0.4s" begin="${(col * 0.08).toFixed(2)}s" fill="freeze"/></rect>
      <rect x="${x}" y="96" width="${colW}" height="3" rx="1.5" fill="${c}">
        <animate attributeName="width" values="0;${colW}" keyTimes="0;1" dur="0.7s" begin="${(col * 0.08).toFixed(2)}s" calcMode="spline" keySplines="0.22 1 0.36 1" fill="freeze"/></rect>
      <text x="${x + 16}" y="122" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.text}">${esc(title)}</text>
      ${out}</g>`;
    })
    .join('');

  return wrap(W, H, 'Working set', `Tools by area: ${areas.map(([a, c]) => `${a} — ${c.join(', ')}`).join('. ')}.`,
    `<text x="24" y="42" font-family="${SANS}" font-size="21" font-weight="600" fill="${t.text}">Working set</text>` +
    `<text x="24" y="68" font-family="${SANS}" font-size="14" fill="${t.sub}">What tends to show up in the work</text>` + cols);
}

/* ------------------------------------------------------------------- write */

const write = (name, s) => { fs.writeFileSync(path.join(OUT, name), s); return name; };

const made = [write('header.svg', header())];
for (const [k, t] of Object.entries(THEMES)) {
  made.push(write(`tagline-${k}.svg`, tagline(t, ['building small web tools', 'following language and data threads', 'learning in public'])));
  made.push(write(`stats-${k}.svg`, stats(t)));
  made.push(write(`languages-${k}.svg`, languages(t)));
  made.push(write(`commits-${k}.svg`, commits(t)));
  made.push(write(`stack-${k}.svg`, stack(t)));
}
console.log(made.join('\n'));
console.log(`\nprojects=${projects.length} commitsYear=${commitsYear} languages=${langs.length} totalBytes=${fmtBytes(langTotal)}`);
console.log(langs.map(([k, v]) => `  ${k.padEnd(12)} ${((v / langTotal) * 100).toFixed(1)}%`).join('\n'));

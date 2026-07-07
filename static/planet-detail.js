// Seeded close-up detail generation for planets.
// Pure logic (hashKey/mulberry32/traitsFor) has no DOM dependency; texture
// baking is browser-only and lazily cached.

export function hashKey(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function traitsFor(key) {
  const rnd = mulberry32(hashKey(key));
  const style = ['banded', 'blobby', 'mottled'][Math.floor(rnd() * 3)];
  const spinDur = 18 + rnd() * 22;
  const spinDir = rnd() < 0.5 ? 1 : -1;
  const clouds = rnd() < 0.55;
  const moonCount = rnd() < 0.4 ? 0 : (rnd() < 0.7 ? 1 : 2);
  const moons = [];
  for (let i = 0; i < moonCount; i++) {
    moons.push({
      rel: 0.14 + rnd() * 0.12,               // moon diameter / planet diameter
      orbit: 0.85 + i * 0.45 + rnd() * 0.25,  // orbit radius / planet size
      dur: 9 + rnd() * 14,                    // seconds per orbit
      phase: rnd(),                           // initial position 0..1
    });
  }
  return { style, spinDur, spinDir, clouds, moons };
}

// ── texture baking (browser-only) ────────────────────────────────────────
const TEX_W = 512, TEX_H = 256;
const _texCache = new Map();

// Soft radial blob drawn at x and x±TEX_W so the strip tiles horizontally.
function soft(ctx, x, y, rx, ry, color, alpha) {
  for (const ox of [x - TEX_W, x, x + TEX_W]) {
    ctx.save();
    ctx.translate(ox, y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
}

function bakeSurface(rnd, p, style) {
  const c = document.createElement('canvas');
  c.width = TEX_W; c.height = TEX_H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = p.mid;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  if (style === 'banded') {
    const bands = 5 + Math.floor(rnd() * 4);
    for (let b = 0; b < bands; b++) {
      const y = (b + 0.5) / bands * TEX_H + (rnd() - 0.5) * 18;
      const col = [p.light, p.dark, p.atmo][Math.floor(rnd() * 3)];
      const h = TEX_H / bands * (0.55 + rnd() * 0.5);
      for (let x = 0; x < TEX_W; x += 26)
        soft(ctx, x + rnd() * 20, y + (rnd() - 0.5) * 10, 48 + rnd() * 30, h * 0.5, col, 0.16 + rnd() * 0.1);
    }
  } else if (style === 'blobby') {
    const n = 12 + Math.floor(rnd() * 8);
    for (let i = 0; i < n; i++)
      soft(ctx, rnd() * TEX_W, rnd() * TEX_H, 34 + rnd() * 58, 26 + rnd() * 44,
        [p.light, p.dark][Math.floor(rnd() * 2)], 0.22 + rnd() * 0.16);
  } else { // mottled
    const n = 90 + Math.floor(rnd() * 50);
    for (let i = 0; i < n; i++)
      soft(ctx, rnd() * TEX_W, rnd() * TEX_H, 4 + rnd() * 10, 4 + rnd() * 10,
        [p.light, p.dark, p.dark][Math.floor(rnd() * 3)], 0.2 + rnd() * 0.15);
  }
  for (let i = 0; i < 4; i++) // faint atmo accents on every style
    soft(ctx, rnd() * TEX_W, rnd() * TEX_H, 40 + rnd() * 50, 24 + rnd() * 30, p.atmo, 0.08 + rnd() * 0.06);
  return c.toDataURL();
}

function bakeClouds(rnd, p) {
  const c = document.createElement('canvas');
  c.width = TEX_W; c.height = TEX_H;
  const ctx = c.getContext('2d');
  const n = 8 + Math.floor(rnd() * 7);
  for (let i = 0; i < n; i++)
    soft(ctx, rnd() * TEX_W, rnd() * TEX_H, 46 + rnd() * 60, 12 + rnd() * 16, '#ffffff', 0.28 + rnd() * 0.2);
  return c.toDataURL();
}

export function textureFor(p, traits) {
  const k = p.key + '|' + p.light + p.mid + p.dark + p.atmo;
  if (!_texCache.has(k)) {
    const rnd = mulberry32(hashKey(p.key) ^ 0x9e3779b9);
    try {
      _texCache.set(k, {
        surface: bakeSurface(rnd, p, traits.style),
        clouds: traits.clouds ? bakeClouds(rnd, p) : null,
      });
    } catch { _texCache.set(k, { surface: null, clouds: null }); } // degrade to base sphere
  }
  return _texCache.get(k);
}

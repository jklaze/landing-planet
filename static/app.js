// Solar-system landing page — Preact port of the Claude Design "Solar System" component.
// Content lives in data/site.json; edit mode (10 clicks on the nav dot + password)
// persists changes through server.py.
import { h, render, Component, createRef } from 'https://esm.sh/preact@10.24.3';
import htm from 'https://esm.sh/htm@3.1.1';
const html = htm.bind(h);

const FH = "'Fredoka',sans-serif", FB = "'Nunito',sans-serif";
const PALETTES = [
  ['#cfe8b0', '#7cbf6a', '#356b3d', '#a8e063'],
  ['#bfe3ff', '#5aa8f0', '#274f96', '#7cc0ff'],
  ['#e6d8ff', '#a98bef', '#5a41ab', '#c9b3ff'],
  ['#ffcfa3', '#ef8f5a', '#a8492a', '#ffb27a'],
  ['#ffd0e0', '#f085ab', '#a83f68', '#ff9dc2'],
  ['#bdf1ff', '#4fb3d9', '#234a86', '#6fd0ee'],
  ['#ffe6a3', '#eab84f', '#9c7018', '#ffd76a'],
  ['#b8f0e4', '#45b8a4', '#1c7364', '#6fd8c6'],
];

class Solar extends Component {
  constructor() {
    super();
    this.parallaxRef = createRef(); this.starRef1 = createRef(); this.starRef2 = createRef();
    this.pwdRef = createRef();
    this._nx = 0; this._ny = 0; this._raf = null; this._drift = 0;
    this.token = sessionStorage.getItem('solar-token') || '';
    const vw = window.innerWidth, vh = window.innerHeight;
    this.state = { site: null, sel: null, view: null, open: false, ci: 0, hov: null, hovSun: false,
      vw, vh, baseScale: this.calcScale(vw, vh), drift: 0, logoClicks: 0,
      pwdOpen: false, pwd: '', pwdErr: false, pwdMsg: '', editable: false, saveState: 'saved', confirmOpen: false };
  }

  calcScale(vw, vh) { return Math.max(0.3, Math.min(1.05, Math.min(vw / 1480, vh / 980))); }
  posOf(p, drift) {
    const r = p.ang * Math.PI / 180 + drift * Math.pow(300 / p.a, 0.6);
    const x = 750 + p.a * Math.cos(r), y = 750 + p.a * 0.5 * Math.sin(r);
    return { x, y, dx: x - 750, dy: y - 750 };
  }

  async componentDidMount() {
    fetch('data/site.json', { cache: 'no-store' }).then(r => r.json()).then(site => {
      this.setState({ site });
      if (this.state.editable && !this._snap) this._snap = structuredClone(site);
    });
    if (this.token) fetch('/api/session', { headers: { Authorization: 'Bearer ' + this.token } })
      .then(r => {
        if (r.ok) { this.setState({ editable: true }); if (this.state.site && !this._snap) this._snap = structuredClone(this.state.site); }
        else { this.token = ''; sessionStorage.removeItem('solar-token'); }
      });
    this._onResize = () => { const vw = window.innerWidth, vh = window.innerHeight; this.setState({ vw, vh, baseScale: this.calcScale(vw, vh) }); };
    this._onKey = (e) => { if (e.key === 'Escape') { if (this.state.confirmOpen) this.setState({ confirmOpen: false }); else if (this.state.pwdOpen) this.closePwd(); else this.back(); } };
    this._onMove = (e) => {
      if (this.state.sel != null) return;
      this._nx = e.clientX / window.innerWidth - 0.5;
      this._ny = e.clientY / window.innerHeight - 0.5;
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        const set = (r, kx, ky) => { if (r.current) r.current.style.transform = `translate(${this._nx * kx}px, ${this._ny * ky}px)`; };
        set(this.parallaxRef, 6, 5); set(this.starRef1, -9, -7); set(this.starRef2, -15, -12);
      });
    };
    this._onWheel = (e) => { if (this.state.sel == null) this._drift += e.deltaY * 0.0016; };
    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('mousemove', this._onMove);
    window.addEventListener('wheel', this._onWheel, { passive: true });
    const tick = (ts) => {
      if (this._last == null) this._last = ts;
      const dt = Math.min(0.05, (ts - this._last) / 1000); this._last = ts;
      if (this.state.sel == null && !this._dragging) { this._drift += dt * 0.028; this.setState({ drift: this._drift }); }
      this._loop = requestAnimationFrame(tick);
    };
    this._loop = requestAnimationFrame(tick);
  }

  stageTransform() {
    const { sel, vw, vh, baseScale, drift, site } = this.state;
    if (sel == null) return `scale(${baseScale})`;
    const narrow = vw < 820;
    const Fx = narrow ? 0 : -vw * 0.20, Fy = narrow ? -vh * 0.22 : -vh * 0.02;
    if (sel === 'sun') return `translate(${Fx}px, ${Fy}px) scale(${baseScale * 1.7})`;
    const pos = this.posOf(site.planets[sel], drift), K = baseScale * 2.35;
    return `translate(${Fx - K * pos.dx}px, ${Fy - K * pos.dy}px) scale(${K})`;
  }

  select(i) {
    this._nx = 0; this._ny = 0;
    for (const r of [this.parallaxRef, this.starRef1, this.starRef2]) if (r.current) r.current.style.transform = '';
    this.setState({ sel: i, view: i, open: true, ci: 0, hov: null });
  }
  back() {
    this.setState({ sel: null, open: false });
    clearTimeout(this._t);
    this._t = setTimeout(() => { if (!this.state.open) this.setState({ view: null }); }, 560);
  }
  carousel(dir, n) { if (n) this.setState(s => ({ ci: (s.ci + dir + n) % n })); }

  // ── editing ──────────────────────────────────────────────────────────────
  persist() {
    clearTimeout(this._sv);
    this.setState({ saveState: 'saving' });
    this._sv = setTimeout(async () => {
      try {
        const r = await fetch('/api/site', { method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token },
          body: JSON.stringify(this.state.site) });
        this.setState({ saveState: r.ok ? 'saved' : 'error' });
      } catch { this.setState({ saveState: 'error' }); }
    }, 700);
  }
  up(fn, cb) {
    const site = structuredClone(this.state.site);
    fn(site);
    this.setState({ site }, cb);
    this.persist();
  }
  dragPlanet(e, i) {
    if (!this.state.editable || this.state.sel != null) return;
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      moved = true; this._dragging = true;
      const { vw, vh, baseScale, drift } = this.state;
      const dx = (ev.clientX - vw / 2) / baseScale, dy = (ev.clientY - vh / 2) / baseScale;
      const a = Math.round(Math.max(140, Math.min(720, Math.hypot(dx, dy * 2))));
      const ang = Math.round(((Math.atan2(dy * 2, dx) - drift * Math.pow(300 / a, 0.6)) * 180 / Math.PI % 360 + 360) % 360);
      const site = structuredClone(this.state.site);
      site.planets[i].a = a; site.planets[i].ang = ang;
      this.setState({ site });
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      this._dragging = false;
      if (moved) {
        this._noClick = true; setTimeout(() => { this._noClick = false; }, 0);
        this.persist();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  }
  ed(set) { return (e) => this.up(s => set(s, e.target.innerText.replace(/\s+/g, ' ').trim())); }
  editLink(cur, set) {
    return (e) => {
      if (!this.state.editable) return;
      e.preventDefault();
      const v = prompt('Link URL', cur);
      if (v != null) this.up(s => set(s, v.trim() || '#'));
    };
  }
  pickImage(cb) {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/avif' });
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const bmp = await createImageBitmap(f);
        const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
        const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + this.token },
          body: JSON.stringify({ dataUrl: c.toDataURL('image/webp', 0.85) }) });
        if (!r.ok) throw new Error();
        cb((await r.json()).url);
      } catch { alert('Upload failed.'); }
    };
    inp.click();
  }
  addPlanet() {
    const c = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const maxA = Math.max(180, ...this.state.site.planets.map(p => p.a));
    const p = { key: 'p' + Date.now().toString(36), name: 'New Planet', tagline: 'a shiny new world',
      desc: 'Describe this project…', link: '#', size: 46 + Math.round(Math.random() * 36),
      a: Math.min(maxA + 65, 720), ang: Math.round(Math.random() * 360), ring: Math.random() < 0.25,
      light: c[0], mid: c[1], dark: c[2], atmo: c[3], tags: [], images: [] };
    this.up(s => s.planets.push(p), () => this.select(this.state.site.planets.length - 1));
  }
  delPlanet(i) {
    if (!confirm('Delete this planet?')) return;
    this.setState({ sel: null, open: false, view: null });
    this.up(s => s.planets.splice(i, 1));
  }

  // ── auth ─────────────────────────────────────────────────────────────────
  bumpLogo() {
    if (this.state.editable) return;
    clearTimeout(this._logoTimer);
    this._logoTimer = setTimeout(() => this.setState({ logoClicks: 0 }), 1400);
    this.setState(s => {
      const n = s.logoClicks + 1;
      if (n >= 10) {
        setTimeout(() => this.pwdRef.current && this.pwdRef.current.focus(), 60);
        return { logoClicks: 0, pwdOpen: true, pwd: '', pwdErr: false, pwdMsg: '' };
      }
      return { logoClicks: n };
    });
  }
  closePwd() { this.setState({ pwdOpen: false, pwd: '', pwdErr: false, pwdMsg: '' }); }
  async submitPwd() {
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: this.state.pwd }) });
      if (r.ok) {
        this.token = (await r.json()).token;
        sessionStorage.setItem('solar-token', this.token);
        if (this.state.site) this._snap = structuredClone(this.state.site);
        this.setState({ editable: true, pwdOpen: false, pwd: '', pwdErr: false, pwdMsg: '' });
      } else this.setState({ pwdErr: true, pwdMsg: (await r.json()).error || 'Incorrect password. Try again.' });
    } catch { this.setState({ pwdErr: true, pwdMsg: 'Server unreachable.' }); }
  }
  async finishEdit(save) {
    this.setState({ confirmOpen: false });
    clearTimeout(this._sv);
    const body = save ? this.state.site : this._snap;
    if (body) {
      try {
        await fetch('/api/site', { method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token },
          body: JSON.stringify(body) });
      } catch { /* fall through — the refetch below shows whatever the server has */ }
    }
    let site = body || this.state.site;
    try { site = await (await fetch('data/site.json?v=' + Date.now(), { cache: 'no-store' })).json(); } catch {}
    this._snap = null;
    this.token = '';
    sessionStorage.removeItem('solar-token');
    this.setState({ editable: false, site, saveState: 'saved', sel: null, open: false, view: null });
  }

  // ── render ───────────────────────────────────────────────────────────────
  render() {
    const { site, sel, view, open, ci, hov, hovSun, vw, drift, pwdOpen, pwd, pwdErr, pwdMsg, editable, saveState, confirmOpen } = this.state;
    if (!site) return html`<div/>`;
    const active = sel != null, narrow = vw < 820, o = site.owner;

    const planets = site.planets.map((p, i) => {
      const s = p.size, isSel = sel === i, isHov = hov === i, lift = isSel || isHov;
      const pos = this.posOf(p, drift);
      const glowHex = lift ? 'cc' : '55';
      const ringBase = p.ring ? { position: 'absolute', left: '50%', top: '50%', width: (s * 2.2) + 'px', height: (s * 0.74) + 'px', borderRadius: '50%', border: `${Math.max(4, s * 0.085)}px solid ${p.atmo}99`, boxShadow: `0 0 ${s * 0.3}px ${p.atmo}44` } : null;
      return html`
      <div key=${p.key}
        onMouseEnter=${() => { if (!active) this.setState({ hov: i }); }}
        onMouseLeave=${() => this.setState({ hov: null })}
        onClick=${() => { if (!this._noClick) this.select(i); }}
        onPointerDown=${(e) => this.dragPlanet(e, i)}
        style=${{ position: 'absolute', left: pos.x + 'px', top: pos.y + 'px', width: s + 'px', height: s + 'px', transform: 'translate(-50%,-50%)', zIndex: Math.round(pos.y) + (isHov ? 300 : 0), cursor: active ? 'default' : (editable ? 'grab' : 'pointer'), touchAction: editable ? 'none' : 'auto', opacity: (active && !isSel) ? 0.14 : 1, filter: (active && !isSel) ? 'blur(1.5px)' : 'none', transition: 'opacity .5s, filter .5s', pointerEvents: active ? 'none' : 'auto' }}>
        <div style=${{ position: 'relative', width: '100%', height: '100%', animation: `bob ${(4.2 + (i % 4) * 0.9).toFixed(2)}s ease-in-out ${(i * 0.55).toFixed(2)}s infinite`, willChange: 'transform' }}>
          <div style=${{ position: 'relative', width: '100%', height: '100%', transform: isHov ? 'scale(1.17)' : 'scale(1)', transition: 'transform .38s cubic-bezier(.34,1.56,.64,1)' }}>
            ${p.ring && html`<div style=${{ ...ringBase, zIndex: 1, transform: 'translate(-50%,-50%) rotate(-16deg)' }}/>`}
            <div style=${{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, ${p.light}, ${p.mid} 54%, ${p.dark} 100%)`, boxShadow: `inset ${-s * 0.14}px ${-s * 0.16}px ${s * 0.3}px rgba(0,0,0,.5), inset ${s * 0.08}px ${s * 0.06}px ${s * 0.16}px rgba(255,255,255,.28), 0 0 ${s * (lift ? 0.95 : 0.5)}px ${p.atmo}${glowHex}, 0 ${s * 0.16}px ${s * 0.4}px rgba(0,0,0,.4)`, transition: 'box-shadow .38s' }}/>
            ${p.ring && html`<div style=${{ ...ringBase, zIndex: 3, transform: 'translate(-50%,-50%) rotate(-16deg)', clipPath: 'polygon(-12% 47%, 112% 47%, 112% 130%, -12% 130%)' }}/>`}
            <div style=${{ position: 'absolute', left: '50%', top: 'calc(100% + 12px)', transform: isHov ? 'translateX(-50%)' : 'translateX(-50%) translateY(5px)', whiteSpace: 'nowrap', fontFamily: FH, fontWeight: 600, fontSize: '14px', color: '#fff', background: 'rgba(10,12,30,.72)', backdropFilter: 'blur(6px)', padding: '5px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.16)', opacity: (isHov && !active) ? 1 : 0, transition: 'opacity .25s, transform .25s', pointerEvents: 'none', boxShadow: '0 6px 20px rgba(0,0,0,.35)', zIndex: 5 }}>${p.name}</div>
          </div>
        </div>
      </div>`;
    });

    const sunSel = sel === 'sun';
    const p = (view != null && view !== 'sun') ? site.planets[view] : null;
    const n = p ? p.images.length : 0;

    const chip = (t, j) => html`
      <span style=${{ fontFamily: FB, fontSize: '12.5px', fontWeight: 600, color: 'rgba(255,255,255,.82)', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', padding: '5px 11px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        ${t}
        ${editable && html`<span onClick=${() => this.up(s => s.planets[view].tags.splice(j, 1))} style=${{ cursor: 'pointer', opacity: .6 }}>✕</span>`}
      </span>`;

    const linkCard = (label, icon, cur, set) => html`
      <a class="lcard" href=${cur} target="_blank" rel="noopener" onClick=${this.editLink(cur, set)}
        style=${{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', textDecoration: 'none', fontFamily: FH, fontWeight: 500, fontSize: '14px', transition: 'all .2s' }}>
        ${icon}<span>${label}</span>${editable && html`<span style=${{ marginLeft: 'auto', opacity: .5, fontSize: '12px' }}>✎</span>`}
      </a>`;

    const closeBtn = html`<button class="xbtn" onClick=${() => this.back()} aria-label="Close" style=${{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>✕</button>`;

    const svg = {
      mail: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
      pin: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
      gh: html`<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5 18.3 5.3 18.3 5.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>`,
      li: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5V9h3v10zM6.5 7.7a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5zM19 19h-3v-4.9c0-1.2 0-2.7-1.6-2.7s-1.9 1.3-1.9 2.6V19h-3V9h2.9v1.4h.04a3.2 3.2 0 0 1 2.9-1.6c3.1 0 3.7 2 3.7 4.7V19z"/></svg>`,
      doc: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></svg>`,
    };
    const iconBox = (ic) => html`<span style=${{ width: '30px', height: '30px', flex: '0 0 30px', borderRadius: '9px', background: 'rgba(255,180,120,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffce8f' }}>${ic}</span>`;

    const panelBase = { zIndex: 60, background: 'linear-gradient(160deg, rgba(21,23,48,.94), rgba(12,13,30,.97))', backdropFilter: 'blur(14px)', boxShadow: '-20px 0 60px rgba(0,0,0,.45)', transition: 'transform .55s cubic-bezier(.22,1,.36,1)', overflowY: 'auto', color: '#eef' };
    const panelStyle = narrow
      ? { ...panelBase, position: 'fixed', left: 0, right: 0, bottom: 0, height: '66vh', borderRadius: '22px 22px 0 0', borderTop: '1px solid rgba(255,255,255,.1)', transform: open ? 'translateY(0)' : 'translateY(112%)' }
      : { ...panelBase, position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(444px,92vw)', borderLeft: '1px solid rgba(255,255,255,.1)', transform: open ? 'translateX(0)' : 'translateX(114%)' };

    return html`
    <div style=${{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'radial-gradient(1200px 820px at 78% 10%, rgba(232,137,107,.20), transparent 60%), radial-gradient(1000px 900px at 10% 84%, rgba(110,150,235,.18), transparent 62%), radial-gradient(900px 720px at 62% 96%, rgba(150,111,205,.16), transparent 60%), radial-gradient(1500px 1050px at 50% 44%, rgba(34,44,96,.55), transparent 72%), linear-gradient(160deg,#0c0e26 0%,#0a0a1e 55%,#08081a 100%)' }}>

      <div ref=${this.starRef1} style=${{ position: 'absolute', inset: '-40px', pointerEvents: 'none', willChange: 'transform,opacity', animation: 'tw 7s ease-in-out infinite', backgroundImage: 'radial-gradient(1.6px 1.6px at 42px 62px, rgba(255,255,255,.95), transparent), radial-gradient(1px 1px at 132px 158px, rgba(255,255,255,.7), transparent), radial-gradient(1px 1px at 214px 92px, rgba(200,220,255,.6), transparent), radial-gradient(1.6px 1.6px at 302px 204px, rgba(255,255,255,.85), transparent), radial-gradient(1px 1px at 92px 252px, rgba(255,236,210,.7), transparent)', backgroundSize: '340px 300px' }}/>
      <div ref=${this.starRef2} style=${{ position: 'absolute', inset: '-40px', pointerEvents: 'none', willChange: 'transform,opacity', animation: 'tw2 9.5s ease-in-out infinite', backgroundImage: 'radial-gradient(1px 1px at 180px 40px, rgba(255,255,255,.6), transparent), radial-gradient(1px 1px at 60px 190px, rgba(200,220,255,.5), transparent), radial-gradient(1.4px 1.4px at 250px 130px, rgba(255,255,255,.7), transparent)', backgroundSize: '290px 240px' }}/>

      <nav style=${{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 26px', background: 'rgba(10,12,30,.34)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,.06)', opacity: sel == null ? 1 : 0, pointerEvents: sel == null ? 'auto' : 'none', transition: 'opacity .4s' }}>
        <div style=${{ display: 'flex', alignItems: 'center', gap: '9px', fontFamily: FH, fontWeight: 600, fontSize: '20px', color: '#fff', letterSpacing: '-.3px' }}>
          <span onClick=${() => this.bumpLogo()} style=${{ width: '9px', height: '9px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#ffd98a,#ff8a5c)', boxShadow: '0 0 12px rgba(255,150,90,.8)', userSelect: 'none' }}/>
          ${o.ownerName}
        </div>
        <div style=${{ fontFamily: FB, fontSize: '13px', color: 'rgba(255,255,255,.72)', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '999px', padding: '7px 14px', backdropFilter: 'blur(6px)' }}>✦  ${o.navHint}</div>
      </nav>

      <div ref=${this.parallaxRef} style=${{ position: 'absolute', inset: 0, transformOrigin: 'center center', willChange: 'transform', animation: 'arrive 1.1s ease-out both' }}>
      <div style=${{ position: 'absolute', left: '50%', top: '50%', width: '1500px', height: '1500px', marginLeft: '-750px', marginTop: '-750px', transformOrigin: 'center center', transition: 'transform .85s cubic-bezier(.22,1,.36,1)', transform: this.stageTransform() }}>

        ${site.planets.map(pl => html`<div key=${'o' + pl.key} style=${{ position: 'absolute', left: '50%', top: '50%', width: (pl.a * 2) + 'px', height: pl.a + 'px', transform: 'translate(-50%,-50%)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '50%', pointerEvents: 'none' }}/>`)}

        <div onMouseEnter=${() => { if (!active) this.setState({ hovSun: true }); }} onMouseLeave=${() => this.setState({ hovSun: false })} onClick=${() => this.select('sun')}
          style=${{ position: 'absolute', left: '750px', top: '750px', width: '300px', height: '300px', transform: `translate(-50%,-50%) scale(${(hovSun && !active) ? 1.04 : 1})`, zIndex: 740, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: active ? 'default' : 'pointer', transition: 'transform .45s cubic-bezier(.34,1.56,.64,1)', pointerEvents: active ? 'none' : 'auto', opacity: (active && !sunSel) ? 0.14 : 1, filter: (active && !sunSel) ? 'blur(1.5px)' : 'none' }}>
          <div style=${{ position: 'absolute', inset: '-74px', borderRadius: '50%', background: 'conic-gradient(from 0deg, rgba(255,190,110,0), rgba(255,210,140,.30), rgba(255,150,90,.05) 55%, rgba(255,190,110,0))', filter: 'blur(16px)', zIndex: 0, pointerEvents: 'none', animation: 'coronaspin 26s linear infinite' }}/>
          <div style=${{ position: 'absolute', inset: '-64px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,198,122,.5), rgba(255,140,90,.20) 45%, transparent 70%)', filter: 'blur(6px)', zIndex: 0, pointerEvents: 'none', animation: 'sunpulse 6s ease-in-out infinite' }}/>
          <div style=${{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 42% 36%, #fff3c4, #ffb347 40%, #ff7a52 72%, #c94f2e 100%)', boxShadow: 'inset -22px -26px 64px rgba(120,30,0,.5), inset 16px 16px 44px rgba(255,255,255,.4), 0 0 130px rgba(255,150,90,.6)', zIndex: 1 }}/>
          <div style=${{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: sunSel ? 0 : 1, transition: 'opacity .4s' }}>
            <div style=${{ fontFamily: FH, fontWeight: 700, fontSize: '38px', color: '#fff', letterSpacing: '-.5px', textShadow: '0 2px 12px rgba(120,30,0,.55)' }}>${o.ownerName}</div>
            <div style=${{ fontFamily: FB, fontSize: '14px', color: 'rgba(255,255,255,.92)', marginTop: '7px', textShadow: '0 1px 8px rgba(120,30,0,.6)' }}>${o.profession}</div>
          </div>
          <div style=${{ position: 'absolute', left: '50%', top: 'calc(100% + 14px)', transform: (hovSun && !active) ? 'translateX(-50%)' : 'translateX(-50%) translateY(5px)', whiteSpace: 'nowrap', fontFamily: FH, fontWeight: 600, fontSize: '14px', color: '#fff', background: 'rgba(10,12,30,.72)', backdropFilter: 'blur(6px)', padding: '5px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.16)', opacity: (hovSun && !active) ? 1 : 0, transition: 'opacity .25s, transform .25s', pointerEvents: 'none', boxShadow: '0 6px 20px rgba(0,0,0,.35)', zIndex: 5 }}>About me</div>
        </div>

        ${planets}
      </div>
      </div>

      <div onClick=${() => this.back()} style=${{ position: 'fixed', inset: 0, zIndex: 55, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .5s', background: narrow ? 'linear-gradient(0deg, rgba(6,8,22,.55), transparent 55%)' : 'linear-gradient(90deg, transparent 42%, rgba(6,8,22,.5) 100%)' }}/>

      <div style=${panelStyle}>
        ${view === 'sun' && html`
        <div style=${{ padding: '28px 30px 40px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' }}>
          <div style=${{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style=${{ fontFamily: FB, fontSize: '12px', letterSpacing: '2.5px', color: 'rgba(255,255,255,.5)', fontWeight: 700 }}>ABOUT ME</span>
            ${closeBtn}
          </div>
          <div style=${{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '2px' }}>
            <div onClick=${() => editable && this.pickImage(url => this.up(s => { s.owner.photo = url; }))}
              style=${{ width: '88px', height: '88px', flex: '0 0 88px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,210,140,.55)', boxShadow: '0 0 26px rgba(255,150,90,.4)', background: 'radial-gradient(circle at 40% 34%,#3a2a2a,#1a1526)', cursor: editable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ${o.photo
                ? html`<img src=${o.photo} alt="" style=${{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>`
                : html`<span style=${{ fontFamily: FB, fontSize: '11px', color: 'rgba(255,255,255,.45)' }}>${editable ? '+ photo' : 'Photo'}</span>`}
            </div>
            <div style=${{ minWidth: 0 }}>
              <h2 contentEditable=${editable} onBlur=${this.ed((s, v) => { s.owner.fullName = v; })} style=${{ fontFamily: FH, fontWeight: 700, fontSize: '27px', lineHeight: 1.08, color: '#ffd98a', margin: 0 }}>${o.fullName}</h2>
              <div contentEditable=${editable} onBlur=${this.ed((s, v) => { s.owner.profession = v; })} style=${{ fontFamily: FB, fontStyle: 'italic', color: 'rgba(255,255,255,.66)', fontSize: '15px', marginTop: '5px' }}>${o.profession}</div>
            </div>
          </div>
          <p contentEditable=${editable} onBlur=${this.ed((s, v) => { s.owner.bio = v; })} style=${{ fontFamily: FB, fontSize: '15.5px', lineHeight: 1.62, color: 'rgba(238,240,255,.85)', margin: '2px 0 0' }}>${o.bio}</p>
          <div style=${{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '2px' }}>
            <div style=${{ display: 'flex', alignItems: 'center', gap: '11px', fontFamily: FB, fontSize: '14.5px', color: 'rgba(238,240,255,.82)' }}>
              ${iconBox(svg.mail)}<span contentEditable=${editable} onBlur=${this.ed((s, v) => { s.owner.email = v; })}>${o.email}</span>
            </div>
            <div style=${{ display: 'flex', alignItems: 'center', gap: '11px', fontFamily: FB, fontSize: '14.5px', color: 'rgba(238,240,255,.82)' }}>
              ${iconBox(svg.pin)}<span contentEditable=${editable} onBlur=${this.ed((s, v) => { s.owner.location = v; })}>${o.location}</span>
            </div>
          </div>
          <div style=${{ flex: 1, minHeight: '16px' }}/>
          <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            ${linkCard('GitHub', svg.gh, site.links.github, (s, v) => { s.links.github = v; })}
            ${linkCard('LinkedIn', svg.li, site.links.linkedin, (s, v) => { s.links.linkedin = v; })}
            ${linkCard('Resume', svg.doc, site.links.resume, (s, v) => { s.links.resume = v; })}
            ${linkCard('Email', svg.mail, site.links.email, (s, v) => { s.links.email = v; })}
          </div>
        </div>`}

        ${p && html`
        <div style=${{ padding: '28px 30px 40px', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '100%' }}>
          <div style=${{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style=${{ fontFamily: FB, fontSize: '12px', letterSpacing: '2.5px', color: 'rgba(255,255,255,.5)', fontWeight: 700 }}>PROJECT ${String(view + 1).padStart(2, '0')}</span>
            ${closeBtn}
          </div>
          <div>
            <h2 contentEditable=${editable} onBlur=${this.ed((s, v) => { s.planets[view].name = v; })} style=${{ fontFamily: FH, fontWeight: 700, fontSize: '40px', lineHeight: 1.04, color: p.light, margin: '4px 0 0' }}>${p.name}</h2>
            <div contentEditable=${editable} onBlur=${this.ed((s, v) => { s.planets[view].tagline = v; })} style=${{ fontFamily: FB, fontStyle: 'italic', color: 'rgba(255,255,255,.62)', fontSize: '15px', marginTop: '3px' }}>${p.tagline}</div>
          </div>

          ${(n > 0 || editable) && html`
          <div>
            <div style=${{ position: 'relative', width: '100%', height: '210px', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(0,0,0,.28)' }}>
              ${n > 0 ? html`
              <div style=${{ display: 'flex', width: '100%', height: '210px', transform: `translateX(${-ci * 100}%)`, transition: 'transform .45s cubic-bezier(.22,1,.36,1)' }}>
                ${p.images.map(u => html`<img key=${u} src=${u} alt="" style=${{ flex: '0 0 100%', width: '100%', height: '210px', objectFit: 'cover', display: 'block' }}/>`)}
              </div>` : html`
              <div onClick=${() => this.pickImage(url => this.up(s => { s.planets[view].images.push(url); }))} style=${{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FB, fontSize: '13px', color: 'rgba(255,255,255,.45)', cursor: 'pointer' }}>+ drop in a screenshot</div>`}
              ${n > 1 && html`
                <button onClick=${() => this.carousel(-1, n)} aria-label="Previous" style=${{ position: 'absolute', top: '50%', left: '8px', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(10,12,30,.6)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', fontSize: '19px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', zIndex: 3 }}>‹</button>
                <button onClick=${() => this.carousel(1, n)} aria-label="Next" style=${{ position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(10,12,30,.6)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', fontSize: '19px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', zIndex: 3 }}>›</button>`}
            </div>
            ${n > 1 && html`
            <div style=${{ display: 'flex', gap: '7px', justifyContent: 'center', marginTop: '12px' }}>
              ${p.images.map((u, idx) => html`<div key=${'d' + u} style=${{ width: '8px', height: '8px', borderRadius: '50%', background: idx === ci ? p.light : 'rgba(255,255,255,.3)', transition: 'background .2s' }}/>`)}
            </div>`}
            ${editable && n > 0 && html`
            <div style=${{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px', fontFamily: FB, fontSize: '12.5px' }}>
              <button onClick=${() => this.pickImage(url => this.up(s => { s.planets[view].images.push(url); }))} style=${{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', borderRadius: '999px', padding: '4px 12px', cursor: 'pointer' }}>+ image</button>
              <button onClick=${() => { this.up(s => { s.planets[view].images.splice(ci, 1); }); this.setState({ ci: Math.max(0, ci - 1) }); }} style=${{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#ff9a8a', borderRadius: '999px', padding: '4px 12px', cursor: 'pointer' }}>remove this image</button>
            </div>`}
          </div>`}

          <p contentEditable=${editable} onBlur=${this.ed((s, v) => { s.planets[view].desc = v; })} style=${{ fontFamily: FB, fontSize: '15.5px', lineHeight: 1.62, color: 'rgba(238,240,255,.85)', margin: '2px 0 0' }}>${p.desc}</p>

          <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            ${p.tags.map((t, j) => chip(t, j))}
            ${editable && html`<input placeholder="+ tag" onKeyDown=${(e) => { const v = e.target.value.trim(); if (e.key === 'Enter' && v) { this.up(s => s.planets[view].tags.push(v)); e.target.value = ''; } }} style=${{ fontFamily: FB, fontSize: '12.5px', width: '72px', background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.25)', color: '#fff', padding: '5px 11px', borderRadius: '999px', outline: 'none' }}/>`}
          </div>

          <div style=${{ flex: 1, minHeight: '14px' }}/>
          <a href=${p.link} target="_blank" rel="noopener" onClick=${this.editLink(p.link, (s, v) => { s.planets[view].link = v; })}
            style=${{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '14px', fontFamily: FH, fontWeight: 600, fontSize: '16px', textDecoration: 'none', background: `linear-gradient(135deg, ${p.light}, ${p.mid})`, color: '#141126', boxShadow: `0 10px 30px ${p.atmo}55` }}>
            <span>${editable ? 'Edit project link' : 'Visit project'}</span><span style=${{ fontSize: '18px' }}>${editable ? '✎' : '↗'}</span>
          </a>
          ${editable && html`
          <button onClick=${() => this.delPlanet(view)} style=${{ background: 'none', border: '1px solid rgba(255,120,110,.35)', color: '#ff9a8a', borderRadius: '11px', padding: '9px', fontFamily: FH, fontSize: '13px', cursor: 'pointer' }}>Delete this planet</button>`}
        </div>`}
      </div>

      ${pwdOpen && html`
      <div onClick=${() => this.closePwd()} style=${{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,5,16,.6)', backdropFilter: 'blur(6px)', animation: 'arrive .25s ease-out both' }}>
        <div onClick=${(e) => e.stopPropagation()} style=${{ width: 'min(340px,90vw)', background: 'linear-gradient(160deg,rgba(28,26,54,.98),rgba(14,14,32,.99))', border: '1px solid rgba(255,210,140,.25)', borderRadius: '18px', padding: '26px 24px', boxShadow: '0 30px 80px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', gap: '14px', animation: pwdErr ? 'shake .4s' : 'none' }}>
          <div style=${{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style=${{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,180,120,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffce8f' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <div style=${{ fontFamily: FH, fontWeight: 600, fontSize: '17px', color: '#fff' }}>Restricted</div>
          </div>
          <div style=${{ fontFamily: FB, fontSize: '13.5px', color: 'rgba(238,240,255,.7)', lineHeight: 1.5 }}>Enter the password to unlock edit mode.</div>
          <input ref=${this.pwdRef} type="password" value=${pwd} onInput=${(e) => this.setState({ pwd: e.target.value, pwdErr: false })}
            onKeyDown=${(e) => { if (e.key === 'Enter') this.submitPwd(); if (e.key === 'Escape') this.closePwd(); }} placeholder="Password"
            style=${{ width: '100%', padding: '11px 13px', borderRadius: '11px', background: 'rgba(255,255,255,.05)', border: `1px solid ${pwdErr ? 'rgba(255,120,110,.6)' : 'rgba(255,255,255,.15)'}`, color: '#fff', fontFamily: FB, fontSize: '14px', outline: 'none' }}/>
          ${pwdErr && html`<div style=${{ fontFamily: FB, fontSize: '12.5px', color: '#ff9a8a', marginTop: '-6px' }}>${pwdMsg}</div>`}
          <div style=${{ display: 'flex', gap: '9px', marginTop: '2px' }}>
            <button onClick=${() => this.closePwd()} style=${{ flex: 1, padding: '11px', borderRadius: '11px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', fontFamily: FH, fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick=${() => this.submitPwd()} style=${{ flex: 1, padding: '11px', borderRadius: '11px', background: 'linear-gradient(135deg,#ffd98a,#ff8a5c)', border: 'none', color: '#241016', fontFamily: FH, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Unlock</button>
          </div>
        </div>
      </div>`}

      ${editable && html`
      <div style=${{ position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: 190, display: 'flex', alignItems: 'center', gap: '9px', background: 'rgba(20,22,46,.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,210,140,.3)', borderRadius: '999px', padding: '8px 16px 8px 13px', boxShadow: '0 10px 30px rgba(0,0,0,.4)', fontFamily: FB, fontSize: '13px', color: 'rgba(255,240,220,.92)' }}>
        <span style=${{ width: '8px', height: '8px', borderRadius: '50%', background: saveState === 'error' ? '#ff9a8a' : '#7bd88f', boxShadow: `0 0 10px ${saveState === 'error' ? '#ff9a8a' : '#7bd88f'}` }}/>
        ${saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed — retrying on next edit' : 'Edit mode on — click text to edit, drag planets to move orbits'}
        <button onClick=${() => this.addPlanet()} style=${{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', borderRadius: '999px', padding: '3px 10px', fontFamily: FH, fontSize: '12px', cursor: 'pointer' }}>+ planet</button>
        <button onClick=${() => this.setState({ confirmOpen: true })} style=${{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', borderRadius: '999px', padding: '3px 10px', fontFamily: FH, fontSize: '12px', cursor: 'pointer' }}>Done</button>
      </div>`}

      ${confirmOpen && html`
      <div onClick=${() => this.setState({ confirmOpen: false })} style=${{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,5,16,.6)', backdropFilter: 'blur(6px)', animation: 'arrive .25s ease-out both' }}>
        <div onClick=${(e) => e.stopPropagation()} style=${{ width: 'min(360px,90vw)', background: 'linear-gradient(160deg,rgba(28,26,54,.98),rgba(14,14,32,.99))', border: '1px solid rgba(255,210,140,.25)', borderRadius: '18px', padding: '26px 24px', boxShadow: '0 30px 80px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style=${{ fontFamily: FH, fontWeight: 600, fontSize: '17px', color: '#fff' }}>Finish editing?</div>
          <div style=${{ fontFamily: FB, fontSize: '13.5px', color: 'rgba(238,240,255,.7)', lineHeight: 1.5 }}>Save your changes, or discard everything since you unlocked edit mode.</div>
          <div style=${{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '2px' }}>
            <button onClick=${() => this.finishEdit(true)} style=${{ padding: '11px', borderRadius: '11px', background: 'linear-gradient(135deg,#ffd98a,#ff8a5c)', border: 'none', color: '#241016', fontFamily: FH, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Save & exit</button>
            <button onClick=${() => this.finishEdit(false)} style=${{ padding: '11px', borderRadius: '11px', background: 'rgba(255,120,110,.12)', border: '1px solid rgba(255,120,110,.35)', color: '#ff9a8a', fontFamily: FH, fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>Discard changes & exit</button>
            <button onClick=${() => this.setState({ confirmOpen: false })} style=${{ padding: '11px', borderRadius: '11px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', fontFamily: FH, fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>Keep editing</button>
          </div>
        </div>
      </div>`}
    </div>`;
  }
}

render(html`<${Solar}/>`, document.getElementById('app'));

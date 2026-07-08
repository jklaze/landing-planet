// Solar-system landing page. The App container owns all state and behaviour
// (orbit animation, drag, auth, persistence); the view is composed from the
// small components in scene.js / panels.js / overlays.js, styled by app.css.
// Content lives in data/site.json; edit mode (10 clicks on the nav dot +
// password) persists changes through server.py.
import { html, render, Component, createRef, cx } from './lib.js';
import * as api from './api.js';
import { Starfield, Nav, Sun, Planet, Stage } from './scene.js';
import { AboutPanel, ProjectPanel } from './panels.js';
import { PasswordModal, ConfirmModal, Toolbar } from './overlays.js';

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

class App extends Component {
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
    api.fetchSite().then((site) => {
      this.setState({ site });
      if (this.state.editable && !this._snap) this._snap = structuredClone(site);
    });
    if (this.token) api.checkSession(this.token).then((r) => {
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
  carousel(dir, n) { if (n) this.setState((s) => ({ ci: (s.ci + dir + n) % n })); }

  // ── editing ──────────────────────────────────────────────────────────────
  persist() {
    clearTimeout(this._sv);
    this.setState({ saveState: 'saving' });
    this._sv = setTimeout(async () => {
      try {
        const r = await api.saveSite(this.token, this.state.site);
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
  editLink(cur, set) {
    return (e) => {
      if (!this.state.editable) return;
      e.preventDefault();
      const v = prompt('Link URL', cur);
      if (v != null) this.up((s) => set(s, v.trim() || '#'));
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
        const r = await api.uploadImage(this.token, c.toDataURL('image/webp', 0.85));
        if (!r.ok) throw new Error();
        cb((await r.json()).url);
      } catch { alert('Upload failed.'); }
    };
    inp.click();
  }
  addPlanet() {
    const c = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const maxA = Math.max(180, ...this.state.site.planets.map((p) => p.a));
    const p = { key: 'p' + Date.now().toString(36), name: 'New Planet', tagline: 'a shiny new world',
      desc: 'Describe this project…', link: '#', size: 46 + Math.round(Math.random() * 36),
      a: Math.min(maxA + 65, 720), ang: Math.round(Math.random() * 360), ring: Math.random() < 0.25,
      light: c[0], mid: c[1], dark: c[2], atmo: c[3], tags: [], images: [] };
    this.up((s) => s.planets.push(p), () => this.select(this.state.site.planets.length - 1));
  }
  delPlanet(i) {
    if (!confirm('Delete this planet?')) return;
    this.setState({ sel: null, open: false, view: null });
    this.up((s) => s.planets.splice(i, 1));
  }

  // ── auth ─────────────────────────────────────────────────────────────────
  bumpLogo() {
    if (this.state.editable) return;
    clearTimeout(this._logoTimer);
    this._logoTimer = setTimeout(() => this.setState({ logoClicks: 0 }), 1400);
    this.setState((s) => {
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
      const r = await api.login(this.state.pwd);
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
      try { await api.saveSite(this.token, body); }
      catch { /* fall through — the refetch below shows whatever the server has */ }
    }
    let site = body || this.state.site;
    try { site = await api.fetchSite(true); } catch {}
    this._snap = null;
    this.token = '';
    sessionStorage.removeItem('solar-token');
    this.setState({ editable: false, site, saveState: 'saved', sel: null, open: false, view: null });
  }

  // ── render ───────────────────────────────────────────────────────────────
  render() {
    const { site, sel, view, open, hov, hovSun, vw, drift, pwdOpen, editable, confirmOpen } = this.state;
    if (!site) return html`<div/>`;
    const active = sel != null, narrow = vw < 820, o = site.owner;
    const project = (view != null && view !== 'sun') ? site.planets[view] : null;

    const orbits = site.planets.map((pl) => html`<div key=${'o' + pl.key} class="orbit" style=${{ width: (pl.a * 2) + 'px', height: pl.a + 'px' }}/>`);
    const planets = site.planets.map((p, i) => html`
      <${Planet} key=${p.key} p=${p} i=${i} sel=${sel} hov=${hov} active=${active} editable=${editable} view=${view} pos=${this.posOf(p, drift)}
        onEnter=${() => { if (!active) this.setState({ hov: i }); }} onLeave=${() => this.setState({ hov: null })}
        onClick=${() => { if (!this._noClick) this.select(i); }} onPointerDown=${(e) => this.dragPlanet(e, i)}/>`);

    return html`
    <div class="bg">
      <${Starfield} layer1=${this.starRef1} layer2=${this.starRef2}/>
      <${Nav} ownerName=${o.ownerName} navHint=${o.navHint} dimmed=${active} onLogo=${() => this.bumpLogo()}/>

      <${Stage} parallaxRef=${this.parallaxRef} transform=${this.stageTransform()} orbits=${orbits}>
        <${Sun} owner=${o} hovSun=${hovSun} active=${active} sunSel=${sel === 'sun'}
          onEnter=${() => { if (!active) this.setState({ hovSun: true }); }} onLeave=${() => this.setState({ hovSun: false })} onClick=${() => this.select('sun')}/>
        ${planets}
      <//>

      <div class=${cx('scrim', narrow ? 'narrow' : 'wide', open && 'open')} onClick=${() => this.back()}/>
      <div class=${cx('panel', narrow ? 'narrow' : 'wide', open && 'open')}>
        ${view === 'sun' && html`<${AboutPanel} app=${this}/>`}
        ${project && html`<${ProjectPanel} app=${this} p=${project} index=${view}/>`}
      </div>

      ${pwdOpen && html`<${PasswordModal} app=${this}/>`}
      ${editable && html`<${Toolbar} app=${this}/>`}
      ${confirmOpen && html`<${ConfirmModal} app=${this}/>`}
    </div>`;
  }
}

render(html`<${App}/>`, document.getElementById('app'));

// The visual solar system: starfield, nav, sun, planets and the zoomable stage.
// Static styling lives in app.css; only per-datum geometry and per-planet
// colours (computed from site.json) stay inline here.
import { html } from './lib.js';
import { traitsFor, textureFor } from './planet-detail.js';
import { HoverLabel } from './atoms.js';

export const Starfield = ({ layer1, layer2 }) => html`
  <div ref=${layer1} class="stars stars1"/>
  <div ref=${layer2} class="stars stars2"/>`;

export const Nav = ({ ownerName, navHint, dimmed, onLogo }) => html`
  <nav class=${'nav' + (dimmed ? ' dim' : '')}>
    <div class="brand"><span class="brand-dot" onClick=${onLogo}/>${ownerName}</div>
    <div class="nav-hint">✦  ${navHint}</div>
  </nav>`;

export const Sun = ({ owner, hovSun, active, sunSel, onEnter, onLeave, onClick }) => {
  const lift = hovSun && !active, dim = active && !sunSel;
  return html`
    <div class="sun" onMouseEnter=${onEnter} onMouseLeave=${onLeave} onClick=${onClick}
      style=${{ transform: `translate(-50%,-50%) scale(${lift ? 1.04 : 1})`, cursor: active ? 'default' : 'pointer', pointerEvents: active ? 'none' : 'auto', opacity: dim ? 0.14 : 1, filter: dim ? 'blur(1.5px)' : 'none' }}>
      <div class="sun-corona"/>
      <div class="sun-glow"/>
      <div class="sun-body"/>
      <div class="sun-caption" style=${{ opacity: sunSel ? 0 : 1 }}>
        <div class="sun-name">${owner.ownerName}</div>
        <div class="sun-role">${owner.profession}</div>
      </div>
      <${HoverLabel} text="About me" shown=${lift} top="calc(100% + 14px)"/>
    </div>`;
};

// Close-up detail layers (seeded surface spin, clouds, moons) — mounted only
// while this planet is the open view, faded in once it is selected.
const PlanetDetail = ({ p, s, fadeIn }) => {
  const tr = traitsFor(p.key), tex = textureFor(p, tr);
  const fade = { opacity: fadeIn ? 1 : 0, transition: 'opacity .55s' };
  return html`
    ${tex.surface && html`
    <div style=${{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: '50%', overflow: 'hidden', ...fade, animation: 'arrive .6s ease-out backwards' }}>
      <div class="pd-anim" style=${{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%', backgroundImage: `url(${tex.surface})`, backgroundSize: '50% 100%', backgroundRepeat: 'repeat-x', animation: `slide ${tr.spinDur.toFixed(1)}s linear infinite ${tr.spinDir < 0 ? 'reverse' : 'normal'}`, willChange: 'transform' }}/>
      ${tex.clouds && html`<div class="pd-anim" style=${{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%', backgroundImage: `url(${tex.clouds})`, backgroundSize: '50% 100%', backgroundRepeat: 'repeat-x', opacity: .55, animation: `slide ${(tr.spinDur * 1.7).toFixed(1)}s linear infinite ${tr.spinDir < 0 ? 'normal' : 'reverse'}`, willChange: 'transform' }}/>`}
      <div style=${{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 34% 30%, rgba(255,255,255,.22), transparent 46%)', boxShadow: `inset ${-s * 0.14}px ${-s * 0.16}px ${s * 0.3}px rgba(0,0,0,.55), inset ${s * 0.08}px ${s * 0.06}px ${s * 0.16}px rgba(255,255,255,.22)` }}/>
    </div>`}
    ${tr.moons.map((m, mi) => {
      const R = s * m.orbit, ry = R * 0.34, msz = Math.max(5, s * m.rel);
      const dx = -m.phase * m.dur, dy = dx - m.dur / 4;
      return html`
      <div key=${'m' + mi} class="pd-anim" style=${{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, zIndex: 4, ...fade, animation: `arrive .6s ease-out backwards, mz ${m.dur.toFixed(2)}s linear infinite ${dy.toFixed(2)}s` }}>
        <div class="pd-anim" style=${{ '--r': R.toFixed(1) + 'px', transform: `translateX(${R.toFixed(1)}px)`, animation: `mx ${m.dur.toFixed(2)}s ease-in-out infinite ${dx.toFixed(2)}s` }}>
          <div class="pd-anim" style=${{ '--ry': ry.toFixed(1) + 'px', animation: `my ${m.dur.toFixed(2)}s ease-in-out infinite ${dy.toFixed(2)}s` }}>
            <div style=${{ width: msz + 'px', height: msz + 'px', marginLeft: -msz / 2 + 'px', marginTop: -msz / 2 + 'px', borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, ${p.light}, #9aa 55%, #445 100%)`, boxShadow: `inset ${-msz * 0.12}px ${-msz * 0.14}px ${msz * 0.3}px rgba(0,0,0,.5), 0 0 ${msz * 0.5}px ${p.atmo}33` }}/>
          </div>
        </div>
      </div>`;
    })}`;
};

export const Planet = ({ p, i, sel, hov, active, editable, view, pos, onEnter, onLeave, onClick, onPointerDown }) => {
  const s = p.size, isSel = sel === i, isHov = hov === i, lift = isSel || isHov;
  const glowHex = lift ? 'cc' : '55';
  const ringBase = p.ring ? { position: 'absolute', left: '50%', top: '50%', width: (s * 2.2) + 'px', height: (s * 0.74) + 'px', borderRadius: '50%', border: `${Math.max(4, s * 0.085)}px solid ${p.atmo}99`, boxShadow: `0 0 ${s * 0.3}px ${p.atmo}44` } : null;
  return html`
    <div key=${p.key}
      onMouseEnter=${onEnter} onMouseLeave=${onLeave} onClick=${onClick} onPointerDown=${onPointerDown}
      style=${{ position: 'absolute', left: pos.x + 'px', top: pos.y + 'px', width: s + 'px', height: s + 'px', transform: 'translate(-50%,-50%)', zIndex: Math.round(pos.y) + (isHov ? 300 : 0), cursor: active ? 'default' : (editable ? 'grab' : 'pointer'), touchAction: editable ? 'none' : 'auto', opacity: (active && !isSel) ? 0.14 : 1, filter: (active && !isSel) ? 'blur(1.5px)' : 'none', transition: 'opacity .5s, filter .5s', pointerEvents: active ? 'none' : 'auto' }}>
      <div style=${{ position: 'relative', width: '100%', height: '100%', animation: `bob ${(4.2 + (i % 4) * 0.9).toFixed(2)}s ease-in-out ${(i * 0.55).toFixed(2)}s infinite`, willChange: 'transform' }}>
        <div style=${{ position: 'relative', width: '100%', height: '100%', transform: isHov ? 'scale(1.17)' : 'scale(1)', transition: 'transform .38s cubic-bezier(.34,1.56,.64,1)' }}>
          ${p.ring && html`<div style=${{ ...ringBase, zIndex: 1, transform: 'translate(-50%,-50%) rotate(-16deg)' }}/>`}
          <div style=${{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, ${p.light}, ${p.mid} 54%, ${p.dark} 100%)`, boxShadow: `inset ${-s * 0.14}px ${-s * 0.16}px ${s * 0.3}px rgba(0,0,0,.5), inset ${s * 0.08}px ${s * 0.06}px ${s * 0.16}px rgba(255,255,255,.28), 0 0 ${s * (lift ? 0.95 : 0.5)}px ${p.atmo}${glowHex}, 0 ${s * 0.16}px ${s * 0.4}px rgba(0,0,0,.4)`, transition: 'box-shadow .38s' }}/>
          ${view === i && html`<${PlanetDetail} p=${p} s=${s} fadeIn=${isSel}/>`}
          ${p.ring && html`<div style=${{ ...ringBase, zIndex: 3, transform: 'translate(-50%,-50%) rotate(-16deg)', clipPath: 'polygon(-12% 47%, 112% 47%, 112% 130%, -12% 130%)' }}/>`}
          <${HoverLabel} text=${p.name} shown=${isHov && !active}/>
        </div>
      </div>
    </div>`;
};

export const Stage = ({ parallaxRef, transform, orbits, children }) => html`
  <div ref=${parallaxRef} class="parallax">
    <div class="stage" style=${{ transform }}>
      ${orbits}
      ${children}
    </div>
  </div>`;

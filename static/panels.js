// The sliding side/bottom panel contents. These are "connected" components:
// they receive the App controller and call its edit helpers (up/ed/pickImage/
// editLink) directly, which keeps the many edit call-sites readable.
import { html } from './lib.js';
import { icons } from './icons.js';
import { Field, Chip, LinkCard, IconBox, CloseBtn } from './atoms.js';

export const AboutPanel = ({ app }) => {
  const { site, editable } = app.state, o = site.owner;
  const set = (fn) => (v) => app.up((s) => fn(s, v));
  return html`
    <div class="panel-body about">
      <div class="prow"><span class="eyebrow">ABOUT ME</span><${CloseBtn} onClose=${() => app.back()}/></div>
      <div class="about-head">
        <div class=${'avatar' + (editable ? ' edit' : '')}
          onClick=${() => editable && app.pickImage((url) => app.up((s) => { s.owner.photo = url; }))}>
          ${o.photo
            ? html`<img src=${o.photo} alt=""/>`
            : html`<span class="avatar-ph">${editable ? '+ photo' : 'Photo'}</span>`}
        </div>
        <div style=${{ minWidth: 0 }}>
          <${Field} tag="h2" className="about-name" value=${o.fullName} editable=${editable} onCommit=${set((s, v) => { s.owner.fullName = v; })}/>
          <${Field} className="about-role" value=${o.profession} editable=${editable} onCommit=${set((s, v) => { s.owner.profession = v; })}/>
        </div>
      </div>
      <${Field} tag="p" className="bio" value=${o.bio} editable=${editable} onCommit=${set((s, v) => { s.owner.bio = v; })}/>
      <div class="info-list">
        <div class="info-row"><${IconBox}>${icons.mail}<//><${Field} tag="span" value=${o.email} editable=${editable} onCommit=${set((s, v) => { s.owner.email = v; })}/></div>
        <div class="info-row"><${IconBox}>${icons.pin}<//><${Field} tag="span" value=${o.location} editable=${editable} onCommit=${set((s, v) => { s.owner.location = v; })}/></div>
      </div>
      <div class="spacer"/>
      <div class="links-grid">
        <${LinkCard} label="GitHub" icon=${icons.gh} href=${site.links.github} editable=${editable} onEditLink=${app.editLink(site.links.github, (s, v) => { s.links.github = v; })}/>
        <${LinkCard} label="LinkedIn" icon=${icons.li} href=${site.links.linkedin} editable=${editable} onEditLink=${app.editLink(site.links.linkedin, (s, v) => { s.links.linkedin = v; })}/>
        <${LinkCard} label="Resume" icon=${icons.doc} href=${site.links.resume} editable=${editable} onEditLink=${app.editLink(site.links.resume, (s, v) => { s.links.resume = v; })}/>
        <${LinkCard} label="Email" icon=${icons.mail} href=${site.links.email} editable=${editable} onEditLink=${app.editLink(site.links.email, (s, v) => { s.links.email = v; })}/>
      </div>
    </div>`;
};

export const ProjectPanel = ({ app, p, index }) => {
  const { editable, ci } = app.state, n = p.images.length;
  const set = (fn) => (v) => app.up((s) => fn(s, v));
  const addImage = () => app.pickImage((url) => app.up((s) => { s.planets[index].images.push(url); }));
  return html`
    <div class="panel-body project">
      <div class="prow"><span class="eyebrow">PROJECT ${String(index + 1).padStart(2, '0')}</span><${CloseBtn} onClose=${() => app.back()}/></div>
      <div>
        <${Field} tag="h2" className="proj-name" style=${{ color: p.light }} value=${p.name} editable=${editable} onCommit=${set((s, v) => { s.planets[index].name = v; })}/>
        <${Field} className="proj-tagline" value=${p.tagline} editable=${editable} onCommit=${set((s, v) => { s.planets[index].tagline = v; })}/>
      </div>

      ${(n > 0 || editable) && html`
      <div>
        <div class="shot">
          ${n > 0 ? html`
          <div class="shot-track" style=${{ transform: `translateX(${-ci * 100}%)` }}>
            ${p.images.map((u) => html`<img key=${u} src=${u} alt=""/>`)}
          </div>` : html`
          <div class="shot-empty" onClick=${addImage}>+ drop in a screenshot</div>`}
          ${n > 1 && html`
            <button class="arr" style=${{ left: '8px' }} onClick=${() => app.carousel(-1, n)} aria-label="Previous">‹</button>
            <button class="arr" style=${{ right: '8px' }} onClick=${() => app.carousel(1, n)} aria-label="Next">›</button>`}
        </div>
        ${n > 1 && html`
        <div class="dots">
          ${p.images.map((u, idx) => html`<div key=${'d' + u} class="dot" style=${{ background: idx === ci ? p.light : 'rgba(255,255,255,.3)' }}/>`)}
        </div>`}
        ${editable && n > 0 && html`
        <div class="img-edit">
          <button class="mini" onClick=${addImage}>+ image</button>
          <button class="mini danger" onClick=${() => { app.up((s) => { s.planets[index].images.splice(ci, 1); }); app.setState({ ci: Math.max(0, ci - 1) }); }}>remove this image</button>
        </div>`}
      </div>`}

      <${Field} tag="p" className="proj-desc" value=${p.desc} editable=${editable} onCommit=${set((s, v) => { s.planets[index].desc = v; })}/>

      <div class="tags">
        ${p.tags.map((t, j) => html`<${Chip} text=${t} editable=${editable} onRemove=${() => app.up((s) => s.planets[index].tags.splice(j, 1))}/>`)}
        ${editable && html`<input class="tag-input" placeholder="+ tag" onKeyDown=${(e) => { const v = e.target.value.trim(); if (e.key === 'Enter' && v) { app.up((s) => s.planets[index].tags.push(v)); e.target.value = ''; } }}/>`}
      </div>

      <div class="spacer"/>
      <a class="visit" href=${p.link} target="_blank" rel="noopener" onClick=${app.editLink(p.link, (s, v) => { s.planets[index].link = v; })}
        style=${{ background: `linear-gradient(135deg, ${p.light}, ${p.mid})`, boxShadow: `0 10px 30px ${p.atmo}55` }}>
        <span>${editable ? 'Edit project link' : 'Visit project'}</span><span class="arrow">${editable ? '✎' : '↗'}</span>
      </a>
      ${editable && html`<button class="del" onClick=${() => app.delPlanet(index)}>Delete this planet</button>`}
    </div>`;
};

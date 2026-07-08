// Full-screen overlays: password prompt, finish-editing confirm, edit toolbar.
import { html, cx } from './lib.js';
import { icons } from './icons.js';
import { Modal } from './atoms.js';

export const PasswordModal = ({ app }) => {
  const { pwd, pwdErr, pwdMsg } = app.state;
  return html`
    <${Modal} onClose=${() => app.closePwd()} width="min(340px,90vw)" shake=${pwdErr}>
      <div class="mhead"><span class="mlock">${icons.lock}</span><div class="mtitle">Restricted</div></div>
      <div class="mtext">Enter the password to unlock edit mode.</div>
      <input ref=${app.pwdRef} type="password" class=${cx('pwd-input', pwdErr && 'err')} value=${pwd}
        onInput=${(e) => app.setState({ pwd: e.target.value, pwdErr: false })}
        onKeyDown=${(e) => { if (e.key === 'Enter') app.submitPwd(); if (e.key === 'Escape') app.closePwd(); }}
        placeholder="Password"/>
      ${pwdErr && html`<div class="pwd-err">${pwdMsg}</div>`}
      <div class="mrow">
        <button class="btn grow" onClick=${() => app.closePwd()}>Cancel</button>
        <button class="btn primary grow" onClick=${() => app.submitPwd()}>Unlock</button>
      </div>
    <//>`;
};

export const ConfirmModal = ({ app }) => html`
  <${Modal} onClose=${() => app.setState({ confirmOpen: false })} width="min(360px,90vw)">
    <div class="mtitle">Finish editing?</div>
    <div class="mtext">Save your changes, or discard everything since you unlocked edit mode.</div>
    <div class="mcol">
      <button class="btn primary" onClick=${() => app.finishEdit(true)}>Save & exit</button>
      <button class="btn danger" onClick=${() => app.finishEdit(false)}>Discard changes & exit</button>
      <button class="btn" onClick=${() => app.setState({ confirmOpen: false })}>Keep editing</button>
    </div>
  <//>`;

export const Toolbar = ({ app }) => {
  const { saveState } = app.state;
  const msg = saveState === 'saving' ? 'Saving…'
    : saveState === 'error' ? 'Save failed — retrying on next edit'
    : 'Edit mode on — click text to edit, drag planets to move orbits';
  return html`
    <div class="toolbar">
      <span class=${cx('toolbar-dot', saveState === 'error' && 'err')}/>
      ${msg}
      <button class="pill" onClick=${() => app.addPlanet()}>+ planet</button>
      <button class="pill" onClick=${() => app.setState({ confirmOpen: true })}>Done</button>
    </div>`;
};

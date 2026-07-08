// Small, pure, reusable building blocks. Each takes explicit props only.
import { html, cx } from './lib.js';

// Hover name pill shown under the sun and each planet.
export const HoverLabel = ({ text, shown, top }) =>
  html`<div class=${cx('plabel', shown && 'show')} style=${top ? { top } : {}}>${text}</div>`;

export const CloseBtn = ({ onClose }) =>
  html`<button class="xbtn" onClick=${onClose} aria-label="Close">✕</button>`;

export const IconBox = ({ children }) => html`<span class="icon-box">${children}</span>`;

// Editable-in-place text. `onCommit` fires on blur with the cleaned text.
export const Field = ({ tag = 'div', value, editable, onCommit, className, style }) => {
  const onBlur = editable
    ? (e) => onCommit(e.target.innerText.replace(/\s+/g, ' ').trim())
    : undefined;
  return html`<${tag} contentEditable=${editable} onBlur=${onBlur} class=${className} style=${style}>${value}</${tag}>`;
};

export const Chip = ({ text, editable, onRemove }) => html`
  <span class="chip">
    ${text}
    ${editable && html`<span class="chip-x" onClick=${onRemove}>✕</span>`}
  </span>`;

export const LinkCard = ({ label, icon, href, editable, onEditLink }) => html`
  <a class="lcard" href=${href} target="_blank" rel="noopener" onClick=${onEditLink}>
    ${icon}<span>${label}</span>${editable && html`<span class="edit-mark">✎</span>`}
  </a>`;

// Generic centred modal shell. `shake` briefly shakes the card (wrong password).
export const Modal = ({ onClose, width, shake, children }) => html`
  <div class="mbg" onClick=${onClose}>
    <div class="mcard" onClick=${(e) => e.stopPropagation()}
      style=${{ width, ...(shake ? { animation: 'shake .4s' } : {}) }}>${children}</div>
  </div>`;

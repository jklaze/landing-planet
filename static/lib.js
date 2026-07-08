// Shared Preact/HTM binding + tiny helpers. Every module imports `html` from
// here so the whole app shares one Preact instance and one htm binding.
import { h, render, Component, createRef } from 'https://esm.sh/preact@10.24.3';
import htm from 'https://esm.sh/htm@3.1.1';

export const html = htm.bind(h);
export { h, render, Component, createRef };

// Join truthy class names: cx('panel', open && 'open') -> "panel open".
export const cx = (...c) => c.filter(Boolean).join(' ');

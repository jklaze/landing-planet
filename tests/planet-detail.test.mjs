// Run with: node --test tests/planet-detail.test.mjs
// (No node on this machine at time of writing; the same assertions are also
// exercised in-browser during verification.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashKey, mulberry32, traitsFor } from '../static/planet-detail.js';

test('hashKey is deterministic and spreads keys', () => {
  assert.equal(hashKey('mercury'), hashKey('mercury'));
  assert.notEqual(hashKey('mercury'), hashKey('venus'));
});

test('mulberry32 yields a stable stream in [0,1)', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('traitsFor is deterministic per key', () => {
  assert.deepEqual(traitsFor('p1abc'), traitsFor('p1abc'));
  assert.notDeepEqual(traitsFor('p1abc'), traitsFor('p2xyz'));
});

test('traitsFor stays in spec ranges', () => {
  for (let i = 0; i < 200; i++) {
    const t = traitsFor('key' + i);
    assert.ok(['banded', 'blobby', 'mottled'].includes(t.style));
    assert.ok(t.spinDur >= 18 && t.spinDur <= 40);
    assert.ok(t.spinDir === 1 || t.spinDir === -1);
    assert.equal(typeof t.clouds, 'boolean');
    assert.ok(t.moons.length >= 0 && t.moons.length <= 2);
    for (const m of t.moons) {
      assert.ok(m.rel > 0.1 && m.rel < 0.32);
      assert.ok(m.orbit >= 0.8 && m.orbit <= 1.8);
      assert.ok(m.dur >= 9 && m.dur <= 26);
      assert.ok(m.phase >= 0 && m.phase < 1);
    }
  }
});

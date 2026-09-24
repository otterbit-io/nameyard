import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, rubberband } from '../dist/assets/js/spring.js';

test('momentum projection follows Apple\'s deceleration formula', () => {
  assert.equal(project(0), 0);
  // 1000 px/s with decelerationRate 0.998 travels 499 px before resting.
  assert.ok(Math.abs(project(1000) - 499) < 1e-9);
  assert.ok(project(-500) < 0);
});

test('rubber-banding resists more the further you pull', () => {
  const h = 700;
  const a = rubberband(100, h);
  const b = rubberband(200, h);
  assert.ok(a < 100 && b < 200);
  assert.ok(b - a < a); // the second 100 px move the sheet less than the first
  assert.equal(rubberband(0, h), 0);
});

// A tiny spring animator in Apple's terms: damping ratio + response (seconds).
// It always animates from the current (presentation) value and keeps its velocity
// when it is re-targeted, so every animation can be interrupted and reversed.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where a flick would come to rest (Apple's projection, decelerationRate 0.998). */
export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary instead of a hard stop. */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function createSpring({ value = 0, onUpdate = () => {} } = {}) {
  let x = value;
  let v = 0;
  let target = value;
  let damping = 1;
  let response = 0.35;
  let onRest = null;
  let frame = 0;
  let last = 0;

  function step(now) {
    const dt = Math.min(0.064, (now - last) / 1000);
    last = now;
    const stiffness = (2 * Math.PI / response) ** 2;
    const friction = (4 * Math.PI * damping) / response;
    const substeps = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / substeps;
    for (let i = 0; i < substeps; i++) {
      v += (-stiffness * (x - target) - friction * v) * h;
      x += v * h;
    }
    if (Math.abs(x - target) < 0.0005 && Math.abs(v) < 0.01) {
      x = target;
      v = 0;
      frame = 0;
      onUpdate(x);
      const done = onRest;
      onRest = null;
      done?.(x);
      return;
    }
    onUpdate(x);
    frame = requestAnimationFrame(step);
  }

  return {
    get value() { return x; },
    get velocity() { return v; },
    get target() { return target; },
    get isAnimating() { return frame !== 0; },

    /** Animate to a new target. Options: velocity, damping, response, onRest. */
    to(next, options = {}) {
      target = next;
      if (options.velocity !== undefined) v = options.velocity;
      damping = options.damping ?? 1;
      response = options.response ?? 0.35;
      onRest = options.onRest ?? null; // an interrupted animation never reports rest
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    },

    /** Jump without animating (used while a finger is dragging). */
    set(next) {
      cancelAnimationFrame(frame);
      frame = 0;
      onRest = null;
      x = next;
      target = next;
      v = 0;
      onUpdate(x);
    },

    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      onRest = null;
    },
  };
}

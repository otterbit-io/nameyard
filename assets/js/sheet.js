// Sheets built on <dialog> (focus trap, Escape, semantics) with spring motion.
//
// One number drives everything: t = 0 is fully open, t = 1 is fully closed.
// - Phones: a bottom sheet. t maps to translateY; the grabber tracks the finger 1:1,
//   a flick is projected forward and decides between dismiss and snap back.
// - Larger screens: a panel that grows out of the element that opened it and
//   shrinks back into it, so it leaves the way it came.
// Opening while closing (or the reverse) just re-targets the spring.

import { createSpring, project, rubberband, reducedMotion } from './spring.js';

const phone = () => matchMedia('(max-width: 639px)').matches;
const OPEN = { damping: 1, response: 0.38 };
const CLOSE = { damping: 1, response: 0.3 };

export function createSheet(dialog, { onClose } = {}) {
  const panel = dialog.querySelector('.sheet-panel');
  const scrim = dialog.querySelector('.sheet-scrim');
  let source = null;
  let mode = 'panel';
  let origin = { dx: 0, dy: 0, scale: 0.85 };
  let height = 1;

  const spring = createSpring({ value: 1, onUpdate: render });

  function render(t) {
    const progress = Math.min(1, Math.max(0, t));
    scrim.style.opacity = String(1 - progress);
    if (reducedMotion()) {
      // Cross-fade only: no movement, no scaling.
      panel.style.transform = 'none';
      panel.style.opacity = String(1 - progress);
      return;
    }
    if (mode === 'sheet') {
      panel.style.opacity = '1';
      panel.style.transform = `translate3d(0, ${t * height}px, 0)`;
    } else {
      const s = 1 - (1 - origin.scale) * progress;
      panel.style.transform = `translate3d(${origin.dx * progress}px, ${origin.dy * progress}px, 0) scale(${s})`;
      panel.style.opacity = String(Math.min(1, (1 - progress) * 1.6));
    }
  }

  function measure() {
    mode = phone() ? 'sheet' : 'panel';
    dialog.dataset.mode = mode;
    const saved = panel.style.transform;
    panel.style.transform = 'none';
    const rect = panel.getBoundingClientRect();
    panel.style.transform = saved;
    height = rect.height + 24;
    origin = { dx: 0, dy: 24, scale: 0.92 };
    if (mode === 'panel' && source?.isConnected) {
      const src = source.getBoundingClientRect();
      origin = {
        dx: src.left + src.width / 2 - (rect.left + rect.width / 2),
        dy: src.top + src.height / 2 - (rect.top + rect.height / 2),
        scale: Math.min(0.9, Math.max(0.2, src.width / rect.width)),
      };
      // Grow out of the trigger, not out of the panel's centre.
      panel.style.transformOrigin = 'center';
    }
  }

  function open(trigger = document.activeElement) {
    if (!dialog.open) {
      source = trigger instanceof Element ? trigger : null;
      dialog.showModal();
      measure();
      spring.set(1);
    }
    dialog.classList.add('is-open');
    spring.to(0, OPEN);
  }

  function close(options = {}) {
    if (!dialog.open) return;
    dialog.classList.remove('is-open');
    spring.to(1, {
      ...CLOSE,
      ...options,
      onRest: () => {
        dialog.close();
        panel.style.transform = '';
        panel.style.opacity = '';
        onClose?.();
      },
    });
  }

  // Escape: animate out instead of vanishing.
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  scrim.addEventListener('click', () => close());
  for (const btn of dialog.querySelectorAll('[data-close]')) btn.addEventListener('click', () => close());

  // ---- Drag to dismiss (phones) ------------------------------------------
  const handle = dialog.querySelector('.sheet-drag');
  let drag = null;

  handle?.addEventListener('pointerdown', (e) => {
    if (mode !== 'sheet' || e.button !== 0) return;
    if (e.target.closest('button, a, input, select')) return;
    handle.setPointerCapture(e.pointerId);
    // Grab the sheet wherever it is right now, even mid-animation.
    const y = spring.value * height;
    spring.stop();
    drag = { id: e.pointerId, startY: e.clientY, startSheetY: y, moved: false, history: [{ y, time: e.timeStamp }] };
  });

  handle?.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const delta = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(delta) < 6) return;
    drag.moved = true;
    let y = drag.startSheetY + delta;
    if (y < 0) y = -rubberband(-y, height); // resist pulling the sheet higher than open
    drag.history.push({ y, time: e.timeStamp });
    if (drag.history.length > 6) drag.history.shift();
    spring.set(y / height);
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { history, moved } = drag;
    drag = null;
    if (!moved) return;
    const first = history[0];
    const lastPoint = history[history.length - 1];
    const dt = Math.max(1, lastPoint.time - first.time) / 1000;
    const velocity = (lastPoint.y - first.y) / dt; // px/s, positive = downwards
    const projected = lastPoint.y + project(velocity);
    if (projected > height * 0.5) {
      close({ velocity: velocity / height, damping: 1, response: 0.3 });
    } else {
      // The finger carried momentum, so a little bounce is allowed here.
      dialog.classList.add('is-open');
      spring.to(0, { velocity: velocity / height, damping: 0.8, response: 0.3 });
    }
  }
  handle?.addEventListener('pointerup', endDrag);
  handle?.addEventListener('pointercancel', endDrag);

  addEventListener('resize', () => {
    if (dialog.open) {
      measure();
      render(spring.value);
    }
  });

  return { open, close, get isOpen() { return dialog.open; } };
}

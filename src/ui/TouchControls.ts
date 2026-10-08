/**
 * On-screen touch controls for mobile. Renders a virtual button / slider
 * overlay and exposes a latched `InputState` that InputManager merges into the
 * unified input each frame.
 *
 * Key behaviours:
 * - The throttle slider is DRAG-to-set and LATCHES on release, so the kart keeps
 *   driving without holding the control.
 * - Steering uses a horizontal drag slider: slide left to steer left, slide
 *   right to steer right; releasing snaps back to centre.
 * - Everything else maps 1:1 to a held button (brake, drift, item, look-back).
 */
import { clamp, clamp01 } from '../core/math';
import { createEmptyInput, type InputState } from '../core/types';
import { el } from './dom';

const STEER_RAMP_UP_TIME = 0.12;
const STEER_RAMP_DOWN_TIME = 0.08;

function hasTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
}

function rampToward(current: number, target: number, dt: number): number {
  if (current === target) return current;
  const movingOut = Math.abs(target) > Math.abs(current) && Math.sign(target) === Math.sign(current || target);
  const rate = movingOut ? 1 / STEER_RAMP_UP_TIME : 1 / STEER_RAMP_DOWN_TIME;
  const step = rate * dt;
  if (Math.abs(target - current) <= step) return target;
  return current + Math.sign(target - current) * step;
}

export class TouchControls {
  /** True on touch-capable devices; overrides layout + enables the overlay. */
  readonly active: boolean;
  /** Live touch input state (edge fields consumed by InputManager). */
  readonly state: InputState = createEmptyInput();

  private readonly rootNode: HTMLElement;
  private readonly throttleNode: HTMLElement;
  private readonly throttleFill: HTMLElement;
  private readonly throttleThumb: HTMLElement;
  private readonly throttleValue: HTMLElement;
  private readonly steerNode: HTMLElement;
  private readonly steerFill: HTMLElement;
  private readonly steerThumb: HTMLElement;

  private steerDragValue = 0;
  private steerDragging = false;
  private steerValue = 0;
  private brakeHeld = false;
  private driftHeld = false;
  private itemHeld = false;
  private lookBackHeld = false;
  private throttleDragging = false;

  private lastTime = performance.now();
  private disposed = false;

  constructor(root: HTMLElement) {
    this.active = hasTouch();
    if (this.active) document.documentElement.classList.add('touch');

    this.rootNode = el('div', 'touch-controls', undefined, root);

    // ---- steering (horizontal slider, right side) ---------------------------
    this.steerNode = el('div', 'steer-slider', undefined, this.rootNode);
    el('div', 'steer-track', undefined, this.steerNode);
    this.steerFill = el('div', 'steer-fill', undefined, this.steerNode);
    this.steerThumb = el('div', 'steer-thumb', undefined, this.steerNode);
    this.bindSteer();
    this.syncSteerUI();

    // ---- drift --------------------------------------------------------------
    const drift = el('button', 'btn-touch tc-drift', '漂移', this.rootNode);
    drift.type = 'button';
    this.bindHold(drift, () => (this.driftHeld = true), () => (this.driftHeld = false));

    // ---- throttle slider (latched) -----------------------------------------
    this.throttleNode = el('div', 'throttle-slider', undefined, this.rootNode);
    el('div', 'throttle-label', '油门', this.throttleNode);
    el('div', 'throttle-track', undefined, this.throttleNode);
    this.throttleFill = el('div', 'throttle-fill', undefined, this.throttleNode);
    this.throttleThumb = el('div', 'throttle-thumb', undefined, this.throttleNode);
    this.throttleValue = el('div', 'throttle-value', '0%', this.throttleNode);
    this.bindThrottle();

    // ---- brake / item / look-back ------------------------------------------
    const brake = el('button', 'btn-touch tc-brake', '刹车', this.rootNode);
    brake.type = 'button';
    this.bindHold(brake, () => (this.brakeHeld = true), () => (this.brakeHeld = false));

    const item = el('button', 'btn-touch tc-item', '道具', this.rootNode);
    item.type = 'button';
    this.bindHold(
      item,
      () => {
        this.itemHeld = true;
        this.state.useItem = true;
      },
      () => (this.itemHeld = false),
    );

    const lookBack = el('button', 'btn-touch tc-lookback', '后视', this.rootNode);
    lookBack.type = 'button';
    this.bindHold(lookBack, () => (this.lookBackHeld = true), () => (this.lookBackHeld = false));

    // ---- pause --------------------------------------------------------------
    const pause = el('button', 'btn-touch tc-pause', '暂停', this.rootNode);
    pause.type = 'button';
    this.bindTap(pause, () => (this.state.pause = true));

    this.syncThrottleUI();
  }

  /** Recompute continuous values and clear one-frame edge flags. */
  update(): void {
    const now = performance.now();
    const dt = clamp((now - this.lastTime) / 1000, 0, 0.1);
    this.lastTime = now;

    const steerTarget = this.steerDragValue;
    this.steerValue = rampToward(this.steerValue, steerTarget, dt);

    const s = this.state;
    s.steer = this.steerValue;
    s.brake = this.brakeHeld ? 1 : 0;
    s.drift = this.driftHeld;
    s.lookBack = this.lookBackHeld;
    s.useItemHeld = this.itemHeld;

    // Edges are one-shot; consumed here after InputManager has read them.
    s.useItem = false;
    s.pause = false;
  }

  /** Clear all persistent state at the start of a race (no throttle leak). */
  reset(): void {
    const s = this.state;
    s.throttle = 0;
    s.brake = 0;
    s.steer = 0;
    s.drift = false;
    s.useItemHeld = false;
    s.lookBack = false;
    s.useItem = false;
    s.pause = false;
    this.steerValue = 0;
    this.steerDragValue = 0;
    this.steerDragging = false;
    this.syncSteerUI();
    this.brakeHeld = false;
    this.driftHeld = false;
    this.itemHeld = false;
    this.lookBackHeld = false;
    this.syncThrottleUI();
  }

  setVisible(visible: boolean): void {
    if (!this.active) return;
    this.rootNode.classList.toggle('visible', visible);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.rootNode.remove();
  }

  // ---------------------------------------------------------------------------

  private bindHold(
    node: HTMLElement,
    onDown: () => void,
    onUp: () => void,
  ): void {
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      onDown();
    });
    const release = (): void => onUp();
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', release);
    node.addEventListener('lostpointercapture', release);
  }

  private bindTap(node: HTMLElement, onTap: () => void): void {
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onTap();
    });
  }

  private bindThrottle(): void {
    const apply = (e: PointerEvent): void => {
      const rect = this.throttleNode.getBoundingClientRect();
      const t = clamp01(1 - (e.clientY - rect.top) / Math.max(1, rect.height));
      this.state.throttle = t;
      this.syncThrottleUI();
    };
    this.throttleNode.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.throttleDragging = true;
      try {
        this.throttleNode.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      apply(e);
    });
    this.throttleNode.addEventListener('pointermove', (e) => {
      if (this.throttleDragging) apply(e);
    });
    const end = (): void => {
      this.throttleDragging = false;
    };
    this.throttleNode.addEventListener('pointerup', end);
    this.throttleNode.addEventListener('pointercancel', end);
    this.throttleNode.addEventListener('lostpointercapture', end);
  }

  private syncThrottleUI(): void {
    const t = this.state.throttle;
    const pct = (t * 100).toFixed(0);
    this.throttleFill.style.height = `${pct}%`;
    this.throttleThumb.style.bottom = `${pct}%`;
    this.throttleValue.textContent = `${pct}%`;
  }

  private bindSteer(): void {
    const apply = (e: PointerEvent): void => {
      const rect = this.steerNode.getBoundingClientRect();
      // In portrait the whole app is rotated 90°, so the "horizontal" slider
      // spans the screen's vertical axis. Measure along whichever axis the
      // slider actually occupies, matching the throttle slider's drag feel.
      const alongX = rect.width >= rect.height;
      const size = alongX ? rect.width : rect.height;
      const start = alongX ? rect.left : rect.top;
      const pos = alongX ? e.clientX : e.clientY;
      const t = clamp01((pos - start) / Math.max(1, size));
      this.steerDragValue = t * 2 - 1; // -1 (left) .. +1 (right)
      this.syncSteerUI();
    };
    this.steerNode.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.steerDragging = true;
      try {
        this.steerNode.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      apply(e);
    });
    this.steerNode.addEventListener('pointermove', (e) => {
      if (this.steerDragging) apply(e);
    });
    const end = (): void => {
      this.steerDragging = false;
      this.steerDragValue = 0;
      this.syncSteerUI();
    };
    this.steerNode.addEventListener('pointerup', end);
    this.steerNode.addEventListener('pointercancel', end);
    this.steerNode.addEventListener('lostpointercapture', end);
  }

  private syncSteerUI(): void {
    const v = this.steerDragValue;
    const pct = 50 + v * 50;
    this.steerThumb.style.left = `${pct}%`;
    this.steerFill.classList.toggle('left', v < -0.01);
    this.steerFill.style.width = `${Math.abs(v) * 50}%`;
  }
}
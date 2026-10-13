// ===== js/camera.js =====
import { CONFIG } from './config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = CONFIG.BASE_GROUND_Y - 100;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  snapTo(x, y) { this.x = x; this.y = y; }

  follow(targetX, targetY, viewW, viewH, dt) {
    const C = CONFIG.CAMERA;
    const desiredX = targetX + (0.5 - C.ANCHOR_X) * viewW;
    const desiredY = targetY + (0.5 - C.ANCHOR_Y) * viewH;

    const k = 1 - Math.pow(1 - C.LERP, dt / 16.67);
    const ky = 1 - Math.pow(1 - C.LERP_Y, dt / 16.67);

    this.x += (desiredX - this.x) * k;
    this.y += (desiredY - this.y) * ky;

    // тряска
    if (this.shake > 0) {
      this.shake -= dt / 1000;
      const s = Math.max(0, this.shake) * 22;
      this.shakeX = (Math.random() - 0.5) * s;
      this.shakeY = (Math.random() - 0.5) * s;
    } else {
      this.shakeX = this.shakeY = 0;
    }
  }

  addShake(amount) { this.shake = Math.min(0.6, this.shake + amount); }

  worldToScreen(wx, wy, viewW, viewH) {
    return {
      x: wx - this.x + viewW / 2 + this.shakeX,
      y: wy - this.y + viewH / 2 + this.shakeY,
    };
  }
}
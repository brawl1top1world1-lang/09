// ===== js/renderer.js =====
import { CONFIG } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0;
    this.dpr = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /* ================= ФОН ================= */
  drawSky(skyColors, camY) {
    const { ctx, w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, skyColors[0]);
    g.addColorStop(0.55, skyColors[1]);
    g.addColorStop(1, skyColors[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  drawParallax(camX, camY, skyColors, time) {
    const { ctx, w, h } = this;
    const horizon = h * 0.72 - (camY - CONFIG.BASE_GROUND_Y) * 0.08;

    // --- Солнце/луна ---
    ctx.save();
    ctx.globalAlpha = 0.5;
    const sunX = w * 0.78 - camX * 0.012;
    const sunY = horizon - h * 0.42;
    const sg = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 110);
    sg.addColorStop(0, 'rgba(255,220,150,.95)');
    sg.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sunX, sunY, 110, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // --- Дальние горы ---
    this._mountains(camX * 0.08, horizon + 10, 260, 'rgba(20,28,38,.75)', 0.9);
    // --- Средние руины ---
    this._ruins(camX * 0.22, horizon + 40, 'rgba(14,20,28,.85)');
    // --- Ближние холмы ---
    this._mountains(camX * 0.42, horizon + 110, 150, 'rgba(9,13,18,.95)', 1.6);
  }

  _mountains(offset, baseY, amp, color, freqMul) {
    const { ctx, w } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY + amp);
    const step = 26;
    for (let x = 0; x <= w + step; x += step) {
      const t = (x + offset) * 0.0016 * freqMul;
      const y = baseY - (Math.sin(t) * 0.5 + Math.sin(t * 2.3 + 1.2) * 0.3 + Math.sin(t * 0.6) * 0.2) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, baseY + amp * 2);
    ctx.lineTo(0, baseY + amp * 2);
    ctx.closePath();
    ctx.fill();
  }

  _ruins(offset, baseY, color) {
    const { ctx, w } = this;
    ctx.fillStyle = color;
    const seedStep = 130;
    const start = Math.floor((offset - 200) / seedStep) * seedStep;
    for (let k = start; k < offset + w + 300; k += seedStep) {
      const sx = k - offset;
      const rnd = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;
      const bw = 40 + rnd * 70;
      const bh = 50 + ((rnd * 977) % 1) * 150;
      ctx.fillRect(sx, baseY - bh, bw, bh);
      // "окна"
      ctx.save();
      ctx.fillStyle = 'rgba(255,180,90,.10)';
      for (let wy = baseY - bh + 12; wy < baseY - 12; wy += 26) {
        for (let wx = sx + 8; wx < sx + bw - 10; wx += 20) {
          if (((wx * 7 + wy * 13) | 0) % 3 === 0) ctx.fillRect(wx, wy, 8, 12);
        }
      }
      ctx.restore();
    }
  }

  /* ================= ЗЕМЛЯ ================= */
  drawTerrain(terrain, cam) {
    const { ctx, w, h } = this;
    const leftX = cam.x - w / 2 - 60;
    const rightX = cam.x + w / 2 + 60;

    const segW = terrain.segW;
    let i0 = Math.max(0, Math.floor(leftX / segW) - 1);
    let i1 = Math.min(terrain.points.length - 1, Math.ceil(rightX / segW) + 1);

    const toScreenX = (x) => x - cam.x + w / 2 + cam.shakeX;
    const toScreenY = (y) => y - cam.y + h / 2 + cam.shakeY;

    // --- тело земли ---
    ctx.beginPath();
    ctx.moveTo(toScreenX(terrain.points[i0].x), toScreenY(terrain.points[i0].y));
    for (let i = i0 + 1; i <= i1; i++) {
      const p = terrain.points[i];
      ctx.lineTo(toScreenX(p.x), toScreenY(p.y));
    }
    const bottom = h + 200;
    ctx.lineTo(toScreenX(terrain.points[i1].x), bottom);
    ctx.lineTo(toScreenX(terrain.points[i0].x), bottom);
    ctx.closePath();

    const gg = ctx.createLinearGradient(0, toScreenY(terrain.minY) - 40, 0, bottom);
    gg.addColorStop(0, '#3b3226');
    gg.addColorStop(0.25, '#2b2419');
    gg.addColorStop(1, '#14100b');
    ctx.fillStyle = gg;
    ctx.fill();

    // --- трава/кромка ---
    ctx.beginPath();
    ctx.moveTo(toScreenX(terrain.points[i0].x), toScreenY(terrain.points[i0].y));
    for (let i = i0 + 1; i <= i1; i++) {
      const p = terrain.points[i];
      ctx.lineTo(toScreenX(p.x), toScreenY(p.y));
    }
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#5d6b3a';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7d8f4d';
    ctx.stroke();

    // --- вода в ямах ---
    for (const wtr of terrain.waters) {
      if (wtr.x1 < leftX || wtr.x0 > rightX) continue;
      const sx = toScreenX(wtr.x0);
      const ex = toScreenX(wtr.x1);
      const sy = toScreenY(wtr.y);
      const wg = ctx.createLinearGradient(0, sy, 0, sy + 220);
      wg.addColorStop(0, 'rgba(60,140,180,.75)');
      wg.addColorStop(1, 'rgba(10,30,50,.95)');
      ctx.fillStyle = wg;
      ctx.fillRect(sx, sy, ex - sx, 260);

      // блики
      ctx.strokeStyle = 'rgba(180,230,255,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, sy);
      ctx.stroke();
    }
  }

  /* ================= ОБЪЕКТЫ ================= */
  drawProps(bodies, cam) {
    const { ctx, w, h } = this;
    const sx = (x) => x - cam.x + w / 2 + cam.shakeX;
    const sy = (y) => y - cam.y + h / 2 + cam.shakeY;

    for (const b of bodies) {
      const kind = b.gameKind;
      ctx.save();
      ctx.translate(sx(b.position.x), sy(b.position.y));
      ctx.rotate(b.angle);
      const verts = b.vertices;
      ctx.beginPath();
      ctx.moveTo(verts[0].x - b.position.x, verts[0].y - b.position.y);
      for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(verts[i].x - b.position.x, verts[i].y - b.position.y);
      }
      ctx.closePath();

      if (kind === 'rock') {
        ctx.fillStyle = '#4a4a4e';
        ctx.fill();
        ctx.strokeStyle = '#2c2c30'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        ctx.beginPath();
        ctx.arc(-4, -6, 6, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'barrel') {
        ctx.fillStyle = '#8a5a20';
        ctx.fill();
        ctx.strokeStyle = '#4e320f'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,200,90,.22)';
        ctx.fillRect(-14, -8, 28, 5);
        ctx.fillRect(-14, 4, 28, 5);
      } else {
        ctx.fillStyle = '#3a3f46';
        ctx.fill();
        ctx.strokeStyle = '#22262b'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawZombies(zombies, cam) {
    const { ctx, w, h } = this;
    const sx = (x) => x - cam.x + w / 2 + cam.shakeX;
    const sy = (y) => y - cam.y + h / 2 + cam.shakeY;

    for (const z of zombies) {
      const b = z.body;
      const px = sx(b.position.x);
      const py = sy(b.position.y);
      if (px < -120 || px > w + 120) continue;

      const Z = CONFIG.ZOMBIE;
      const W = Z.WIDTH * z.scale, H = Z.HEIGHT * z.scale;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(b.angle);

      // тень
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath();
      ctx.ellipse(0, H / 2 + 3, W * 0.65, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // тело
      const grad = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
      if (z.dead) {
        grad.addColorStop(0, '#6d8a3a');
        grad.addColorStop(1, '#3d5220');
      } else {
        grad.addColorStop(0, `hsl(${z.hue},45%,52%)`);
        grad.addColorStop(1, `hsl(${z.hue},50%,28%)`);
      }
      ctx.fillStyle = grad;
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 2;

      this._roundRect(ctx, -W / 2, -H / 2, W, H, 8);
      ctx.fill(); ctx.stroke();

      // глаза
      if (!z.dead) {
        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(-W * 0.2, -H * 0.26, 2.2, 0, Math.PI * 2);
        ctx.arc(W * 0.2, -H * 0.26, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // руки
        ctx.strokeStyle = `hsl(${z.hue},45%,42%)`;
        ctx.lineWidth = 5;
        const swing = Math.sin(z.wobble) * 5;
        ctx.beginPath();
        ctx.moveTo(-W / 2, -H * 0.12);
        ctx.lineTo(-W / 2 - 12, -H * 0.05 + swing);
        ctx.moveTo(W / 2, -H * 0.12);
        ctx.lineTo(W / 2 + 12, -H * 0.05 - swing);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#c9c9c9';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-W * 0.32, -H * 0.3); ctx.lineTo(-W * 0.08, -H * 0.2);
        ctx.moveTo(-W * 0.08, -H * 0.3); ctx.lineTo(-W * 0.32, -H * 0.2);
        ctx.moveTo(W * 0.08, -H * 0.3);  ctx.lineTo(W * 0.32, -H * 0.2);
        ctx.moveTo(W * 0.32, -H * 0.3);  ctx.lineTo(W * 0.08, -H * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawCar(car, cam) {
    const { ctx, w, h } = this;
    const sx = (x) => x - cam.x + w / 2 + cam.shakeX;
    const sy = (y) => y - cam.y + h / 2 + cam.shakeY;

    const ch = car.chassis;

    // --- тень ---
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx(ch.position.x), sy(ch.position.y) + 46, car.def.width * 0.55, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- кузов ---
    ctx.save();
    ctx.translate(sx(ch.position.x), sy(ch.position.y));
    ctx.rotate(ch.angle);

    const W = car.def.width, H = car.def.height;
    const grad = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
    grad.addColorStop(0, car.def.color);
    grad.addColorStop(1, car.def.colorDark);
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 2.5;

    this._roundRect(ctx, -W / 2, -H / 2, W, H, 7);
    ctx.fill(); ctx.stroke();

    // кабина
    ctx.fillStyle = 'rgba(20,28,38,.9)';
    ctx.beginPath();
    ctx.moveTo(-W * 0.34, -H / 2);
    ctx.lineTo(W * 0.10, -H / 2);
    ctx.lineTo(W * 0.16, -H / 2 - 14);
    ctx.lineTo(-W * 0.26, -H / 2 - 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.stroke();

    // водитель (палка с головой)
    const drvX = -W * 0.10;
    const drvY = -H / 2 - 4;
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(drvX, drvY - 10, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2c22'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(drvX, drvY - 4); ctx.lineTo(drvX, drvY + 8); ctx.stroke();

    // фары
    ctx.fillStyle = 'rgba(255,235,170,.92)';
    ctx.beginPath();
    ctx.arc(W / 2 - 6, 0, 4, 0, Math.PI * 2); ctx.fill();

    // вспышка урона
    if (car.damageFlash > 0.02) {
      ctx.fillStyle = `rgba(255,60,40,${Math.min(0.6, car.damageFlash)})`;
      this._roundRect(ctx, -W / 2, -H / 2, W, H, 7);
      ctx.fill();
    }
    ctx.restore();

    // --- колёса ---
    for (const wh of [car.wheelA, car.wheelB]) {
      const px = sx(wh.position.x), py = sy(wh.position.y);
      const r = wh.circleRadius;

      ctx.save();
      ctx.translate(px, py);

      // тень
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

      ctx.rotate(wh.angle);
      const wg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r);
      wg.addColorStop(0, '#3a3f45');
      wg.addColorStop(1, '#15181c');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0a0c0f'; ctx.lineWidth = 2.5; ctx.stroke();

      // протектор
      ctx.strokeStyle = 'rgba(160,170,180,.35)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
        ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
        ctx.stroke();
      }
      // диск
      ctx.fillStyle = '#8d949c';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4c525a';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }
  }

  drawFinishLine(terrain, level, cam) {
    const x = terrain.points[0].x + level.target * CONFIG.PX_PER_METER;
    if (x < cam.x - this.w || x > cam.x + this.w * 1.5) return;
    const { ctx, w, h } = this;
    const px = x - cam.x + w / 2 + cam.shakeX;
    const gy = terrain.groundYAt(x) - cam.y + h / 2 + cam.shakeY;

    ctx.save();
    // столб
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(px - 3, gy - 240, 6, 240);
    // флаг
    const t = performance.now() * 0.003;
    ctx.fillStyle = '#e94b3c';
    ctx.beginPath();
    ctx.moveTo(px + 3, gy - 238);
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      ctx.lineTo(px + 3 + f * 80, gy - 238 + Math.sin(t + f * 4) * 6 + f * 4);
    }
    for (let i = 10; i >= 0; i--) {
      const f = i / 10;
      ctx.lineTo(px + 3 + f * 80, gy - 190 + Math.sin(t + f * 4) * 6 + f * 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }
}
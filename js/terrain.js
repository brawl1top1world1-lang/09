// ===== js/terrain.js =====
import { CONFIG } from './config.js';
import { makePropBodies } from './obstacles.js';

const { Body, Composite, Bodies } = Matter;

/* ---------- Seeded RNG ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Terrain {
  /**
   * @param {object} level  запись из LEVELS
   * @param {Matter.World} world
   */
  constructor(level, world) {
    this.level = level;
    this.world = world;
    this.rng = mulberry32(level.seed);
    this.segW = CONFIG.SEGMENT_WIDTH;
    this.chunkSize = CONFIG.CHUNK_SEGMENTS;

    this.count = Math.ceil(level.length / this.segW) + 60;
    this.points = [];        // [{x, y}] верхняя граница земли
    this.gaps = [];          // [{i0, i1}] индексы сегментов без земли
    this.waters = [];        // [{x0, x1, y}]
    this.props = [];         // [{x, y, type, angle}]
    this.chunks = new Map(); // index -> {bodies: []}
    this.activeChunks = new Set();
    this.maxY = CONFIG.BASE_GROUND_Y;
    this.minY = CONFIG.BASE_GROUND_Y;

    this._generatePoints();
    this._generateProps();
    this.deathY = this.maxY + 260;
  }

  /* ================= ГЕНЕРАЦИЯ ================= */
  _generatePoints() {
    const rng = this.rng;
    const base = CONFIG.BASE_GROUND_Y;
    const h = this.level.hilliness;

    // --- ямы ---
    const gapRanges = [];
    const usableLen = this.level.length - 900;
    for (let i = 0; i < this.level.pits; i++) {
      const startPx = 900 + rng() * usableLen;
      const widthPx = 80 + rng() * (120 + 70 * h);
      gapRanges.push([startPx, startPx + widthPx]);
    }
    gapRanges.sort((a, b) => a[0] - b[0]);

    // --- профиль ---
    let y = base;
    let vel = 0;
    const lowClamp = base - 210 * h;
    const highClamp = base + 170 * h;

    for (let i = 0; i < this.count; i++) {
      const x = i * this.segW;

      // плавный шум (случайное блуждание с затуханием)
      vel += (rng() - 0.5) * 3.4 * h;
      vel *= 0.90;
      y += vel;

      // дополнительные крупные холмы
      y += Math.sin(x * 0.00042) * 0.55 * h;
      y += Math.sin(x * 0.0011 + 1.7) * 0.28 * h;

      // не даём уехать слишком далеко
      if (y < lowClamp)  { y = lowClamp;  vel *= 0.4; }
      if (y > highClamp) { y = highClamp; vel *= 0.4; }

      // стартовая площадка — ровная
      if (x < 700) y = base;

      this.points.push({ x, y });
      if (y > this.maxY) this.maxY = y;
      if (y < this.minY) this.minY = y;
    }

    // --- отмечаем ямы по индексам сегментов ---
    for (const [a, b] of gapRanges) {
      const i0 = Math.max(0, Math.floor(a / this.segW));
      const i1 = Math.min(this.count - 1, Math.ceil(b / this.segW));
      if (i1 - i0 < 2) continue;
      this.gaps.push({ i0, i1 });
      // вода на дне ямы
      const edgeY = Math.max(this.points[i0]?.y ?? base, this.points[i1]?.y ?? base);
      this.waters.push({ x0: i0 * this.segW, x1: i1 * this.segW, y: edgeY + 150 });
    }

    // пересчёт deathY после всех манипуляций
    this.maxY = this.points.reduce((m, p) => Math.max(m, p.y), base);
  }

  _generateProps() {
    const rng = this.rng;
    const density = this.level.propDensity;
    const step = Math.floor(320 / density);
    for (let x = 900; x < this.level.length - 200; x += step) {
      if (rng() > 0.55) continue;
      const px = x + (rng() - 0.5) * step * 0.7;
      if (this.isGapAt(px)) continue;
      const r = rng();
      let type = 'rock';
      if (r > 0.80) type = 'barrel';
      else if (r > 0.62) type = 'wreck';
      this.props.push({
        x: px,
        y: this.groundYAt(px),
        type,
        angle: (rng() - 0.5) * 0.6,
      });
    }
  }

  /* ================= ХЕЛПЕРЫ ================= */
  isGapAt(x) {
    for (const g of this.gaps) {
      const x0 = g.i0 * this.segW, x1 = g.i1 * this.segW;
      if (x >= x0 && x <= x1) return true;
    }
    return false;
  }

  groundYAt(x) {
    if (x <= 0) return this.points[0].y;
    const idx = x / this.segW;
    const i = Math.floor(idx);
    if (i >= this.points.length - 1) return this.points[this.points.length - 1].y;
    const t = idx - i;
    return this.points[i].y * (1 - t) + this.points[i + 1].y * t;
  }

  waterAt(x, y) {
    for (const w of this.waters) {
      if (x >= w.x0 && x <= w.x1 && y >= w.y) return true;
    }
    return false;
  }

  /* ================= ЧАНКИ ================= */
  _chunkIndexFor(x) { return Math.floor(x / (this.segW * this.chunkSize)); }

  _createChunk(ci) {
    const bodies = [];
    const startSeg = ci * this.chunkSize;
    const endSeg = Math.min(this.count - 1, startSeg + this.chunkSize);

    for (let i = startSeg; i < endSeg; i++) {
      if (this._segInGap(i)) continue;
      const p0 = this.points[i];
      const p1 = this.points[i + 1];
      if (!p0 || !p1) continue;

      const D = CONFIG.GROUND_DEPTH;
      const verts = [
        { x: p0.x, y: p0.y },
        { x: p1.x, y: p1.y },
        { x: p1.x, y: p1.y + D },
        { x: p0.x, y: p0.y + D },
      ];

      const body = Body.create({
        vertices: verts,
        isStatic: true,
        friction: 0.95,
        frictionStatic: 1.2,
        restitution: 0.02,
        label: 'ground',
      });
      body.gameType = 'ground';
      bodies.push(body);
    }

    // объекты на этом участке
    const x0 = startSeg * this.segW;
    const x1 = endSeg * this.segW;
    for (const p of this.props) {
      if (p.x >= x0 && p.x < x1) {
        bodies.push(...makePropBodies(p));
      }
    }

    if (bodies.length) Composite.add(this.world, bodies);
    this.chunks.set(ci, { bodies });
  }

  _segInGap(i) {
    for (const g of this.gaps) if (i >= g.i0 && i < g.i1) return true;
    return false;
  }

  /** Вызывается каждый кадр — активирует/деактивирует чанки вокруг машины */
  update(carX) {
    const spanW = this.segW * this.chunkSize;
    const from = this._chunkIndexFor(carX - CONFIG.CHUNK_BEHIND);
    const to   = this._chunkIndexFor(carX + CONFIG.CHUNK_AHEAD);
    const totalChunks = Math.ceil(this.count / this.chunkSize);

    for (let ci = Math.max(0, from); ci <= Math.min(totalChunks - 1, to); ci++) {
      if (!this.activeChunks.has(ci)) {
        if (!this.chunks.has(ci)) this._createChunk(ci);
        else Composite.add(this.world, this.chunks.get(ci).bodies);
        this.activeChunks.add(ci);
      }
    }

    // выгружаем далёкие чанки
    for (const ci of Array.from(this.activeChunks)) {
      if (ci < from || ci > to) {
        const c = this.chunks.get(ci);
        if (c) Composite.remove(this.world, c.bodies);
        this.activeChunks.delete(ci);
      }
    }
  }

  destroy() {
    for (const ci of this.activeChunks) {
      const c = this.chunks.get(ci);
      if (c) Composite.remove(this.world, c.bodies);
    }
    this.activeChunks.clear();
    this.chunks.clear();
  }
}
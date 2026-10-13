// ===== js/main.js =====
import { CONFIG } from './config.js';
import { Bus } from './events.js';
import { Save } from './save.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { GameWorld } from './engine.js';
import { Renderer } from './renderer.js';
import { CARS, LEVELS } from './upgrades.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);

    Save.load();
    Audio.init();
    Audio.setEnabled(!!Save.data.settings.sound);
    Input.init();

    UI.init(this);
    this.state = 'MENU';
    this.world = null;
    this.paused = false;
    this._attractTime = 0;
    this._attractCam = { x: 0, y: CONFIG.BASE_GROUND_Y - 120 };
    this._attractSky = LEVELS[0].sky;

    this._bindGlobal();
    this.openMenu();

    this.lastTs = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  /* ================= STATE ================= */
  openMenu() {
    this._teardownWorld();
    this.state = 'MENU';
    this.paused = false;
    Audio.stopEngine();
    UI.show('menu');
    UI.showHUD(false);
    UI.updateMenuMoney();
    this._attractSky = LEVELS[Math.floor(Math.random() * LEVELS.length)].sky;
  }

  openGarage() {
    this._teardownWorld();
    this.state = 'GARAGE';
    this.paused = false;
    Audio.stopEngine();
    UI.show('garage');
    UI.showHUD(false);
    UI.refreshGarage();
  }

  startRun() {
    const level = LEVELS.find(l => l.id === Save.data.currentLevel) || LEVELS[0];
    const carDef = CARS.find(c => c.id === Save.data.currentCar) || CARS[0];
    const ups = Save.getUpgrades(carDef.id);

    this._teardownWorld();

    this.world = new GameWorld(level, carDef, { ...ups }, this.renderer.w, this.renderer.h);
    this.state = 'PLAYING';
    this.paused = false;
    Input.reset();
    Audio.resume();
    Audio.startEngine();

    UI.show('hud');
    UI.showHUD(true);
  }

  /* ================= LOOP ================= */
  _loop(ts) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(64, ts - this.lastTs);
    this.lastTs = ts;

    if (this.state === 'PLAYING' && this.world) {
      this._updatePlaying(dt);
    } else {
      this._updateAttract(dt);
    }
  }

  _updatePlaying(dt) {
    const w = this.world;
    w.update(dt);
    this._render(w);

    const stats = w.getStats();
    UI.updateHUD(stats);

    // проверка конца заезда
    if ((stats.dead || stats.finished) && !this._runEnded) {
      this._runEnded = true;
      this._pendingEnd = { stats, t: 0 };
    }

    if (this._runEnded) {
      this._pendingEnd.t += dt;
      if (this._pendingEnd.t > 1100) {
        const s = this._pendingEnd.stats;
        this._finishRun(s);
      }
    }
  }

  _finishRun(s) {
    this._runEnded = false;
    this._pendingEnd = null;

    // деньги
    Save.addMoney(Math.floor(s.money));

    // рекорд уровня
    const isRecord = Save.setLevelRecord(s.levelId, Math.floor(s.distance));
    // разблокировка следующего уровня
    const idx = LEVELS.findIndex(l => l.id === s.levelId);
    if (idx >= 0 && idx < LEVELS.length - 1 && s.distance >= LEVELS[idx].target) {
      const next = LEVELS[idx + 1];
      // просто разрешаем — доступ проверяется через рекорд предыдущего
    }

    Audio.stopEngine();
    Audio.playDeath();
    UI.showDeath(s);
    this.state = 'DEAD';
    UI.showHUD(false);
  }

  _updateAttract(dt) {
    // фоновая анимация для меню/гаража
    this._attractTime += dt / 1000;
    this._attractCam.x += dt * 0.06;

    const r = this.renderer;
    const cam = {
      x: this._attractCam.x,
      y: CONFIG.BASE_GROUND_Y - 110,
      shakeX: 0, shakeY: 0,
    };

    r.drawSky(this._attractSky, cam.y);
    r.drawParallax(cam.x, cam.y, this._attractSky, this._attractTime);

    // рисуем «землю» синусоидой
    const fakeTerrain = {
      segW: 40,
      minY: CONFIG.BASE_GROUND_Y - 40,
      points: [],
      waters: [],
    };
    const startIdx = Math.floor((cam.x - r.w) / 40);
    const endIdx = Math.ceil((cam.x + r.w) / 40);
    for (let i = startIdx; i <= endIdx; i++) {
      fakeTerrain.points.push({
        x: i * 40,
        y: CONFIG.BASE_GROUND_Y + Math.sin(i * 0.09) * 45 + Math.sin(i * 0.023) * 65,
      });
    }
    // сдвигаем индексы для drawTerrain (он ожидает массив с 0..n)
    r.drawTerrain(fakeTerrain, cam);

    // затемняем
    r.ctx.fillStyle = 'rgba(6,10,14,.55)';
    r.ctx.fillRect(0, 0, r.w, r.h);
  }

  _render(world) {
    const r = this.renderer;
    const cam = world.camera;
    const sky = world.level.sky;

    r.drawSky(sky, cam.y);
    r.drawParallax(cam.x, cam.y, sky, performance.now() * 0.001);
    r.drawFinishLine(world.terrain, world.level, cam);
    r.drawTerrain(world.terrain, cam);

    // props (активные чанки)
    const props = [];
    for (const ci of world.terrain.activeChunks) {
      const c = world.terrain.chunks.get(ci);
      if (!c) continue;
      for (const b of c.bodies) if (b.gameType === 'prop') props.push(b);
    }
    r.drawProps(props, cam);

    r.drawZombies(world.zombies, cam);
    r.drawCar(world.car, cam);

    // виньетка
    const { ctx, w, h } = r;
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  _teardownWorld() {
    this._runEnded = false;
    this._pendingEnd = null;
    if (this.world) {
      this.world.destroy();
      this.world = null;
    }
  }

  _bindGlobal() {
    window.addEventListener('resize', () => {
      if (this.world) {
        this.world.viewW = this.renderer.w;
        this.world.viewH = this.renderer.h;
      }
    });
    // разблокировка звука первым жестом
    const unlock = () => { Audio.resume(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.state === 'PLAYING') this.openGarage();
        else if (this.state === 'GARAGE') this.openMenu();
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__game = new Game();
});
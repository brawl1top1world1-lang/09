// ===== js/engine.js =====
import { CONFIG, CAT } from './config.js';
import { Bus } from './events.js';
import { Terrain } from './terrain.js';
import { Car } from './vehicle.js';
import { Zombie } from './zombie.js';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { CARS, upgradeValue } from './upgrades.js';

const { Engine, Composite, Events, Vector, Body, Sleeping } = Matter;

export class GameWorld {
  /**
   * @param {object} levelDef  из LEVELS
   * @param {object} carDef    из CARS
   * @param {object} upgrades  { engine:0, wheels:0,... }
   * @param {number} viewW
   * @param {number} viewH
   */
  constructor(levelDef, carDef, upgrades, viewW, viewH) {
    this.level = levelDef;
    this.carDef = carDef;
    this.upgrades = upgrades;
    this.viewW = viewW;
    this.viewH = viewH;

    // ---- Matter ----
    this.engine = Engine.create({ gravity: { x: 0, y: CONFIG.GRAVITY } });
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 8;
    this.engine.constraintIterations = 4;
    this.world = this.engine.world;
    this.world.bounds.min.x = -1e6;
    this.world.bounds.max.x = 1e6;

    // ---- Террейн ----
    this.terrain = new Terrain(levelDef, this.world);
    const startX = 260;
    const startY = this.terrain.groundYAt(startX) - 70;

    // ---- Машина ----
    this.car = new Car(startX, startY, carDef, upgrades, this.world);
    this.startX = startX;

    // ---- Зомби ----
    this.zombies = [];
    this._nextZombieX = startX + 900;

    // ---- Камера ----
    this.camera = new Camera();
    this.camera.snapTo(startX, startY);

    // ---- Статистика ----
    this.maxX = startX;
    this.kills = 0;
    this.moneyEarned = 0;
    this.elapsed = 0;
    this.finished = false;
    this.finishedBonus = 0;
    this.fuelWarned = false;
    this._prevSpeed = 0;

    // ---- События коллизий ----
    this._collisionHandler = (ev) => this._onCollision(ev);
    Events.on(this.engine, 'collisionStart', this._collisionHandler);

    Bus.on('zombieKilled', (p) => {
      this.kills++;
      const reward = CONFIG.ECON.PER_ZOMBIE * this.level.rewardMul;
      this.moneyEarned += reward;
      Audio.playSquash();
      this.camera.addShake(0.08);
    });

    this.acc = 0;
    this.destroyed = false;

    // стартовые зомби перед машиной
    this._preSpawnZombies();
  }

  /* ================= СПАВН ЗОМБИ ================= */
  _preSpawnZombies() {
    for (let x = this.startX + 700; x < this.startX + 1600; x += 160) {
      this._spawnZombie(x);
    }
  }

  _spawnZombie(x) {
    if (this.zombies.filter(z => !z.dead).length >= CONFIG.ZOMBIE.MAX_ALIVE) return;
    const y = this.terrain.groundYAt(x);
    const kind = Math.random() < 0.18 * this.level.zombieRate ? 'runner' : 'walker';
    const z = new Zombie(x, y, kind);
    Composite.add(this.world, z.body);
    this.zombies.push(z);
  }

  _manageZombies() {
    const carX = this.car.position.x;
    const Z = CONFIG.ZOMBIE;

    // спавн впереди
    const spawnLimit = carX + Z.SPAWN_AHEAD;
    const density = 0.55 + 0.85 * this.level.zombieRate;
    while (this._nextZombieX < spawnLimit) {
      this._nextZombieX += 90 / density + Math.random() * 120 / density;
      if (this.terrain.isGapAt(this._nextZombieX)) continue;
      this._spawnZombie(this._nextZombieX);
    }

    // удаление далёких/мёртвых
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.removable) { z.destroy(this.world); this.zombies.splice(i, 1); continue; }
      if (z.body.position.x < carX - Z.DESPAWN_BEHIND) {
        z.destroy(this.world); this.zombies.splice(i, 1);
      }
    }
  }

  /* ================= КОЛЛИЗИИ ================= */
  _onCollision(ev) {
    for (const pair of ev.pairs) {
      const a = pair.bodyA, b = pair.bodyB;
      const carBody =
        a.gameType === 'chassis' || a.gameType === 'wheel' ? a :
        b.gameType === 'chassis' || b.gameType === 'wheel' ? b : null;
      if (!carBody) continue;

      const other = carBody === a ? b : a;
      if (other.gameType !== 'zombie') continue;

      const z = other.zombieRef;
      if (!z || z.dead) continue;

      const rel = Vector.magnitude(Vector.sub(carBody.velocity, other.velocity));
      const carSpeed = this.car.speed;

      if (rel > CONFIG.ZOMBIE.KILL_SPEED || carSpeed > CONFIG.ZOMBIE.KILL_SPEED) {
        const dir = Vector.normalise(Vector.sub(other.position, carBody.position));
        if (z.kill(dir, rel)) {
          Bus.emit('zombieKilled', { zombie: z });
        }
      } else {
        // зомби бьёт машину
        if (z.canHit()) {
          z.markHit();
          this.car.damage(CONFIG.ZOMBIE.HIT_DAMAGE, 'zombie');
          Audio.playHit(0.4);
          this.camera.addShake(0.06);
        }
      }
    }
  }

  /* ================= ОСНОВНОЙ ЦИКЛ ================= */
  update(dtMs) {
    if (this.destroyed) return;

    const dt = Math.min(64, dtMs);
    this.acc += dt;
    let steps = 0;

    while (this.acc >= CONFIG.FIXED_DT && steps < CONFIG.MAX_SUBSTEPS) {
      this._step(CONFIG.FIXED_DT);
      this.acc -= CONFIG.FIXED_DT;
      steps++;
    }
    if (steps === CONFIG.MAX_SUBSTEPS) this.acc = 0;

    // камера — раз в кадр
    this.camera.follow(
      this.car.position.x,
      this.car.position.y,
      this.viewW,
      this.viewH,
      dt
    );

    // звук двигателя
    const speed01 = Math.min(1, this.car.speed / (CONFIG.CAR.MAX_OMEGA * 2.2 * 22));
    Audio.updateEngine(speed01, this.car.throttle && !this.car.dead);

    this.elapsed += dt / 1000;
  }

  _step(stepMs) {
    const car = this.car;

    // --- управление ---
    if (!car.dead) {
      const onGround = this._carOnGround();
      const beforeSpeed = car.speed;
      car.fixedUpdate(stepMs, Input, onGround);

      // террейн-чанки
      this.terrain.update(car.position.x);

      // зомби AI
      for (const z of this.zombies) z.fixedUpdate(stepMs, car.position.x);

      // --- физика ---
      Engine.update(this.engine, stepMs);

      // --- пост-обработка ---
      car.postStep(beforeSpeed, stepMs);

      // вылетел за пределы
      if (car.position.y > this.terrain.deathY) car.kill('fall');
      if (this.terrain.waterAt(car.position.x, car.position.y)) car.kill('water');

      // дистанция
      if (car.position.x > this.maxX) this.maxX = car.position.x;

      // финиш
      const distM = (this.maxX - this.startX) / CONFIG.PX_PER_METER;
      if (!this.finished && distM >= this.level.target) {
        this.finished = true;
        this.finishedBonus = CONFIG.ECON.FINISH_BONUS * this.level.rewardMul;
        this.moneyEarned += this.finishedBonus;
        Audio.playWin();
        Bus.emit('levelFinished', { distance: distM });
      }

      // предупреждение о топливе
      if (!this.fuelWarned && car.fuel < 15) {
        this.fuelWarned = true;
        Audio.playFuelWarn();
        Bus.emit('fuelLow');
      }
    } else {
      // машина мертва — просто продолжаем физику
      Engine.update(this.engine, stepMs);
      for (const z of this.zombies) z.fixedUpdate(stepMs, car.position.x);
      this.terrain.update(car.position.x);
    }

    this._manageZombies();
  }

  _carOnGround() {
    const p = this.car.chassis.position;
    const gy = this.terrain.groundYAt(p.x);
    return p.y + CONFIG.CAR.WHEEL_Y_OFFSET + 10 >= gy;
  }

  /* ================= СТАТИСТИКА ================= */
  getStats() {
    const distM = Math.max(0, (this.maxX - this.startX) / CONFIG.PX_PER_METER);
    const kmh = Math.round(this.car.speed * 60 / CONFIG.PX_PER_METER * 3.6);
    return {
      money: this.moneyEarned,
      kills: this.kills,
      distance: distM,
      target: this.level.target,
      speed: kmh,
      fuel: this.car.fuel,
      fuelMax: this.car.fuelCapacity,
      hp: this.car.hp,
      hpMax: this.car.maxHP,
      dead: this.car.dead,
      deathReason: this.car.deathReason,
      finished: this.finished,
      finishedBonus: this.finishedBonus,
      levelName: this.level.name,
      levelId: this.level.id,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    Events.off(this.engine, 'collisionStart', this._collisionHandler);
    this.terrain.destroy();
    for (const z of this.zombies) z.destroy(this.world);
    this.zombies.length = 0;
    if (this.car) this.car.destroy();
    Composite.clear(this.world, false, true);
    Engine.clear(this.engine);
  }
}
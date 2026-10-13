// ===== js/vehicle.js =====
import { CONFIG, CAT } from './config.js';
import { upgradeValue } from './upgrades.js';
import { Bus } from './events.js';

const { Bodies, Body, Composite, Constraint, Vector } = Matter;

export class Car {
  /**
   * @param {number} x стартовая позиция
   * @param {number} y
   * @param {object} carDef  запись из CARS
   * @param {object} upgrades { engine:0, wheels:0, ... }
   * @param {Matter.World} world
   */
  constructor(x, y, carDef, upgrades, world) {
    this.def = carDef;
    this.upgrades = upgrades;
    this.world = world;

    // ---- Считываем характеристики из апгрейдов ----
    const eng  = upgradeValue('engine', upgrades.engine);
    const whl  = upgradeValue('wheels', upgrades.wheels);
    const sus  = upgradeValue('suspension', upgrades.suspension);
    const arm  = upgradeValue('armor', upgrades.armor);
    const fuel = upgradeValue('fuel', upgrades.fuel);

    this.torque = CONFIG.CAR.BASE_TORQUE * eng.torque;
    this.maxOmega = CONFIG.CAR.MAX_OMEGA * eng.maxOmega;
    this.wheelFriction = CONFIG.CAR.WHEEL_FRICTION * whl.friction;
    this.suspStiff = sus.stiff;
    this.suspDamp = sus.damp;
    this.damageMul = sus.dmgMul;
    this.maxHP = arm.hp;
    this.fuelCapacity = fuel.capacity;

    // ---- Состояние ----
    this.hp = this.maxHP;
    this.fuel = this.fuelCapacity;
    this.dead = false;
    this.deathReason = null;
    this.flipTimer = 0;
    this.airborne = false;
    this.throttle = false;

    const C = CONFIG.CAR;
    const m = carDef.massScale;
    const W = carDef.width, H = carDef.height;
    const WB = carDef.wheelBase;
    const WR = carDef.wheelRadius;

    // ---- Кузов ----
    this.chassis = Bodies.rectangle(x, y, W, H, {
      density: C.CHASSIS_DENSITY * m,
      friction: C.CHASSIS_FRICTION,
      frictionAir: 0.008,
      chamfer: { radius: 6 },
      label: 'chassis',
      collisionFilter: { category: CAT.CHASSIS, mask: CAT.GROUND | CAT.ZOMBIE | CAT.PROP },
    });
    this.chassis.gameType = 'chassis';

    // ---- Колёса ----
    const mk = (wx) => Bodies.circle(x + wx, y + C.WHEEL_Y_OFFSET, WR, {
      density: C.WHEEL_DENSITY * m,
      friction: this.wheelFriction,
      frictionStatic: C.WHEEL_FRICTION_STATIC,
      frictionAir: 0.006,
      restitution: 0.05,
      label: 'wheel',
      collisionFilter: { category: CAT.WHEEL, mask: CAT.GROUND | CAT.ZOMBIE | CAT.PROP },
    });
    this.wheelA = mk(-WB / 2);
    this.wheelB = mk(+WB / 2);
    this.wheelA.gameType = this.wheelB.gameType = 'wheel';

    // ---- Подвеска ----
    const mkSus = (wheel, wx) => Constraint.create({
      bodyA: this.chassis,
      pointA: { x: wx, y: C.WHEEL_Y_OFFSET },
      bodyB: wheel,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: this.suspStiff,
      damping: this.suspDamp,
      render: { visible: false },
    });

    this.susA = mkSus(this.wheelA, -WB / 2);
    this.susB = mkSus(this.wheelB, +WB / 2);

    // ---- Стабилизатор, чтобы колёса не разъезжались ----
    const mkStab = (wheel, wx) => Constraint.create({
      bodyA: this.chassis,
      pointA: { x: wx * 0.55, y: C.WHEEL_Y_OFFSET + 1 },
      bodyB: wheel,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 0.92,
      damping: 0.4,
      render: { visible: false },
    });
    this.stabA = mkStab(this.wheelA, -WB / 2);
    this.stabB = mkStab(this.wheelB, +WB / 2);

    Composite.add(world, [this.chassis, this.wheelA, this.wheelB, this.susA, this.susB, this.stabA, this.stabB]);

    this.emit = 0;      // для дыма/искр
    this.damageFlash = 0;
  }

  get position() { return this.chassis.position; }
  get speed() { return Vector.magnitude(this.chassis.velocity); }
  get angle() {
    let a = this.chassis.angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  /* ================= ФИЗИЧЕСКИЙ ШАГ ================= */
  fixedUpdate(dt, input, onGround) {
    if (this.dead) return;
    const dtSec = dt / 1000;
    const gas = input.gas;
    const brake = input.brake;
    this.throttle = gas;

    const wheels = [this.wheelA, this.wheelB];

    for (const w of wheels) {
      if (gas) {
        if (w.angularVelocity < this.maxOmega) {
          w.torque += this.torque;
        }
      } else if (brake) {
        if (w.angularVelocity > -this.maxOmega * CONFIG.CAR.REVERSE_FACTOR) {
          w.torque -= this.torque * 0.78;
        }
      } else {
        // торможение двигателем
        w.torque -= w.angularVelocity * CONFIG.CAR.ENGINE_BRAKE * w.inertia / 277.8;
      }
    }

    // ---- урон от переворота ----
    if (Math.abs(this.angle) > CONFIG.DRIVER.FLIP_ANGLE && onGround) {
      this.flipTimer += dtSec;
      if (this.flipTimer > CONFIG.DRIVER.FLIP_GRACE) {
        this.damage(CONFIG.DRIVER.FLIP_DPS * dtSec, 'flip');
      }
    } else {
      this.flipTimer = Math.max(0, this.flipTimer - dtSec * 2);
    }

    // ---- топливо ----
    const burn = gas ? CONFIG.FUEL.GAS_BURN : CONFIG.FUEL.IDLE_BURN;
    this.fuel -= burn * dtSec;
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.kill('fuel');
    }

    if (this.damageFlash > 0) this.damageFlash -= dtSec * 3;
  }

  /* ================= УРОН / СМЕРТЬ ================= */
  damage(amount, reason = 'crash') {
    if (this.dead) return;
    const final = amount * this.damageMul;
    this.hp -= final;
    this.damageFlash = Math.min(1, this.damageFlash + final / 40);
    Bus.emit('carDamaged', { amount: final, reason });
    if (this.hp <= 0) {
      this.hp = 0;
      this.kill(reason);
    }
  }

  kill(reason) {
    if (this.dead) return;
    this.dead = true;
    this.deathReason = reason;
    Bus.emit('carDestroyed', { reason });
  }

  /** Вызывается после Engine.update — детект резких ударов */
  postStep(prevSpeed, dt) {
    if (this.dead) return;
    const dv = Math.abs(this.speed - prevSpeed);
    const cfg = CONFIG.DRIVER;
    if (dv > cfg.CRASH_DV) {
      this.damage((dv - cfg.CRASH_DV) * cfg.CRASH_SCALE, 'crash');
    }
  }

  destroy() {
    Composite.remove(this.world, [this.chassis, this.wheelA, this.wheelB, this.susA, this.susB, this.stabA, this.stabB]);
  }
}
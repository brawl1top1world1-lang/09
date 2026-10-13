// ===== js/zombie.js =====
import { CONFIG, CAT } from './config.js';

const { Bodies, Body, Composite, Vector } = Matter;

let uid = 0;

export class Zombie {
  constructor(x, groundY, kind = 'walker') {
    const Z = CONFIG.ZOMBIE;
    this.id = ++uid;
    this.kind = kind;
    this.dead = false;
    this.deadTimer = 0;
    this.hitCooldown = 0;
    this.wobble = Math.random() * Math.PI * 2;
    this.flash = 0;

    this.body = Bodies.rectangle(x, groundY - Z.HEIGHT / 2 - 2, Z.WIDTH, Z.HEIGHT, {
      density: Z.DENSITY,
      friction: 0.55,
      frictionAir: 0.02,
      restitution: 0.05,
      chamfer: { radius: 7 },
      label: 'zombie',
      collisionFilter: { category: CAT.ZOMBIE, mask: 0xFFFFFFFF },
    });
    this.body.gameType = 'zombie';
    this.body.zombieRef = this;

    // разный цвет у "бегунов"
    this.hue = kind === 'runner' ? 90 : 118;
    this.scale = kind === 'runner' ? 0.85 : 1;
    this.speedMul = kind === 'runner' ? 2.4 : 1;
  }

  fixedUpdate(dt, carX) {
    const dtSec = dt / 1000;
    if (this.hitCooldown > 0) this.hitCooldown -= dtSec;
    if (this.flash > 0) this.flash -= dtSec * 4;

    if (this.dead) {
      this.deadTimer += dtSec;
      return;
    }

    const b = this.body;
    // "идут" влево, если не перевернулись
    const upright = Math.abs(b.angle) < 1.0;
    if (upright) {
      const f = CONFIG.ZOMBIE.WALK_FORCE * this.speedMul * b.mass;
      b.force.x -= f;
      b.torque += Math.sin(this.wobble += dtSec * 6) * 0.000002 * b.mass;
    }
  }

  /** Убить зомби импульсом от удара */
  kill(impulseDir, power) {
    if (this.dead) return false;
    this.dead = true;
    this.deadTimer = 0;
    const p = Math.min(1, power / 14);
    Body.setVelocity(this.body, {
      x: impulseDir.x * (4 + p * 10) + (Math.random() - 0.5) * 3,
      y: -3 - p * 7 - Math.random() * 3,
    });
    Body.setAngularVelocity(this.body, (Math.random() - 0.5) * 0.6);
    this.body.collisionFilter.mask = CAT.GROUND;
    return true;
  }

  /** Зомби бьёт машину */
  canHit() { return !this.dead && this.hitCooldown <= 0; }
  markHit() { this.hitCooldown = CONFIG.ZOMBIE.HIT_COOLDOWN; }

  get removable() { return this.dead && this.deadTimer > CONFIG.ZOMBIE.RAGDOLL_LIFE; }

  destroy(world) { Composite.remove(world, this.body); }
}
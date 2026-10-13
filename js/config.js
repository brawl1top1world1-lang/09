// ===== js/config.js =====
// Все константы игры. Правь здесь — остальной код подхватит.

export const CAT = {
  GROUND:  0x0001,
  CHASSIS: 0x0002,
  WHEEL:   0x0004,
  ZOMBIE:  0x0008,
  PROP:    0x0010,
};

export const CONFIG = {
  // ---- Цикл ----
  FIXED_DT: 1000 / 60,       // мс на один физический шаг
  MAX_SUBSTEPS: 5,           // защита от "спирали смерти"
  GRAVITY: 1.0,

  // ---- Мир ----
  SEGMENT_WIDTH: 40,         // ширина одного сегмента земли, px
  CHUNK_SEGMENTS: 20,        // сегментов в одном чанке
  CHUNK_AHEAD: 2800,         // на сколько px вперёд активировать чанки
  CHUNK_BEHIND: 3500,        // на сколько px назад держать чанки
  BASE_GROUND_Y: 420,        // базовый уровень земли
  GROUND_DEPTH: 700,         // толщина тела земли
  PX_PER_METER: 20,          // сколько пикселей в одном "метре" дистанции

  // ---- Машина ----
  CAR: {
    WIDTH: 96,
    HEIGHT: 30,
    WHEEL_RADIUS: 22,
    WHEEL_BASE: 68,          // расстояние между осями
    WHEEL_Y_OFFSET: 33,      // насколько центр колеса ниже центра кузова
    SUSPENSION_STIFFNESS: 0.62,
    SUSPENSION_DAMPING: 0.20,
    CHASSIS_DENSITY: 0.0016,
    WHEEL_DENSITY: 0.0016,
    WHEEL_FRICTION: 1.2,
    WHEEL_FRICTION_STATIC: 2.2,
    CHASSIS_FRICTION: 0.35,
    BASE_TORQUE: 0.052,      // базовый крутящий момент (умножается на апгрейд)
    MAX_OMEGA: 0.46,         // макс. угловая скорость колеса (рад/шаг)
    REVERSE_FACTOR: 0.55,
    ENGINE_BRAKE: 0.020,
    AIR_DRAG: 0.0006,        // сопротивление воздуха для кузова
    MAX_HP: 100,
  },

  // ---- Топливо ----
  FUEL: {
    CAPACITY: 100,
    IDLE_BURN: 1.1,          // единиц в секунду
    GAS_BURN: 3.0,
  },

  // ---- Водитель ----
  DRIVER: {
    FLIP_ANGLE: Math.PI * 0.62,  // порог "перевернулся"
    FLIP_GRACE: 1.1,             // сек. до начала урона
    FLIP_DPS: 26,                // урон в секунду при перевороте
    CRASH_DV: 5.2,               // порог резкого изменения скорости (px/шаг)
    CRASH_SCALE: 5.5,            // урон = (dv - CRASH_DV) * SCALE
  },

  // ---- Экономика ----
  ECON: {
    PER_METER: 1.4,
    PER_ZOMBIE: 18,
    FINISH_BONUS: 500,
  },

  // ---- Зомби ----
  ZOMBIE: {
    WIDTH: 22,
    HEIGHT: 48,
    DENSITY: 0.0013,
    WALK_FORCE: 0.00016,     // сила ходьбы влево
    KILL_SPEED: 6.5,         // относительная скорость (px/шаг) для убийства
    HIT_DAMAGE: 7,           // урон машине при медленном наезде
    HIT_COOLDOWN: 0.8,       // сек. между атаками одного зомби
    SPAWN_AHEAD: 1900,
    SPAWN_BEHIND: 700,
    DESPAWN_BEHIND: 2600,
    MAX_ALIVE: 34,
    RAGDOLL_LIFE: 2.6,       // сек. до исчезновения трупа
  },

  // ---- Камера ----
  CAMERA: {
    LERP: 0.085,
    LERP_Y: 0.055,
    ANCHOR_X: 0.32,          // доля ширины экрана, где стоит машина
    ANCHOR_Y: 0.62,
  },

  // ---- Отладка ----
  DEBUG: false,
};
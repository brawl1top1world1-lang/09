// ===== js/upgrades.js =====
// Data-driven конфиг: машины, апгрейды, уровни.
// Чтобы добавить новую — просто допиши объект в массив.

export const UPGRADE_DEFS = [
  {
    id: 'engine', name: 'Двигатель', icon: '⚙️',
    desc: 'Крутящий момент и максимальная скорость',
    levels: [
      { cost: 0,     torque: 1.00, maxOmega: 1.00 },
      { cost: 420,   torque: 1.20, maxOmega: 1.05 },
      { cost: 1100,  torque: 1.45, maxOmega: 1.11 },
      { cost: 2600,  torque: 1.75, maxOmega: 1.18 },
      { cost: 5800,  torque: 2.10, maxOmega: 1.26 },
      { cost: 12000, torque: 2.55, maxOmega: 1.35 },
    ],
  },
  {
    id: 'wheels', name: 'Колёса', icon: '🛞',
    desc: 'Сцепление с землёй и разгон',
    levels: [
      { cost: 0,     friction: 1.00 },
      { cost: 350,   friction: 1.18 },
      { cost: 900,   friction: 1.38 },
      { cost: 2200,  friction: 1.62 },
      { cost: 5000,  friction: 1.90 },
      { cost: 11000, friction: 2.25 },
    ],
  },
  {
    id: 'suspension', name: 'Подвеска', icon: '🪛',
    desc: 'Мягче приземления, меньше урона от ударов',
    levels: [
      { cost: 0,     stiff: 0.62, damp: 0.20, dmgMul: 1.00 },
      { cost: 400,   stiff: 0.58, damp: 0.24, dmgMul: 0.88 },
      { cost: 1000,  stiff: 0.54, damp: 0.28, dmgMul: 0.76 },
      { cost: 2400,  stiff: 0.50, damp: 0.33, dmgMul: 0.64 },
      { cost: 5400,  stiff: 0.46, damp: 0.38, dmgMul: 0.52 },
      { cost: 12000, stiff: 0.42, damp: 0.44, dmgMul: 0.40 },
    ],
  },
  {
    id: 'armor', name: 'Броня', icon: '🛡️',
    desc: 'Прочность водителя',
    levels: [
      { cost: 0,     hp: 100 },
      { cost: 500,   hp: 130 },
      { cost: 1300,  hp: 165 },
      { cost: 3000,  hp: 210 },
      { cost: 6800,  hp: 265 },
      { cost: 15000, hp: 340 },
    ],
  },
  {
    id: 'fuel', name: 'Топливный бак', icon: '⛽',
    desc: 'Больше топлива — дальше заезд',
    levels: [
      { cost: 0,     capacity: 100 },
      { cost: 450,   capacity: 122 },
      { cost: 1150,  capacity: 148 },
      { cost: 2700,  capacity: 180 },
      { cost: 6100,  capacity: 218 },
      { cost: 13500, capacity: 265 },
    ],
  },
];

export function upgradeValue(defId, level) {
  const def = UPGRADE_DEFS.find(d => d.id === defId);
  if (!def) return null;
  const idx = Math.max(0, Math.min(def.levels.length - 1, level | 0));
  return def.levels[idx];
}

export const CARS = [
  {
    id: 'junker', name: 'Ржавый Драндулет', icon: '🚗', cost: 0,
    desc: 'Разбитая тачка, которая ещё едет. Классика.',
    width: 96, height: 30, wheelBase: 68, wheelRadius: 22, massScale: 1.00,
    color: '#b8453a', colorDark: '#7d2b23',
  },
  {
    id: 'pickup', name: 'Пикап «Мясник»', icon: '🛻', cost: 3200,
    desc: 'Тяжёлый, устойчивый, отлично давит зомби.',
    width: 112, height: 34, wheelBase: 78, wheelRadius: 25, massScale: 1.25,
    color: '#3f7fb8', colorDark: '#27506f',
  },
  {
    id: 'monster', name: 'Монстр-Трак', icon: '🚙', cost: 11000,
    desc: 'Огромные колёса. Прыгает через ямы.',
    width: 108, height: 34, wheelBase: 80, wheelRadius: 34, massScale: 1.15,
    color: '#4fa84f', colorDark: '#2e6b2e',
  },
  {
    id: 'bus', name: 'Школьный Автобус', icon: '🚌', cost: 26000,
    desc: 'Тяжёлый, медленный, неубиваемый.',
    width: 156, height: 40, wheelBase: 108, wheelRadius: 26, massScale: 1.85,
    color: '#e0b93c', colorDark: '#96791f',
  },
  {
    id: 'tank', name: 'Танк «Жнец»', icon: '🛺', cost: 60000,
    desc: 'Финальная машина. Сносит всё.',
    width: 140, height: 38, wheelBase: 100, wheelRadius: 30, massScale: 2.10,
    color: '#6d7a86', colorDark: '#454e57',
  },
];

export const LEVELS = [
  {
    id: 'level1', name: 'Пригород', seed: 20240501,
    length: 16000, target: 250, hilliness: 0.55, pits: 3,
    zombieRate: 0.85, propDensity: 0.55, rewardMul: 1.00,
    sky: ['#2b3a4a', '#5b7286', '#c98b5e'],
  },
  {
    id: 'level2', name: 'Шоссе', seed: 777001,
    length: 22000, target: 450, hilliness: 0.85, pits: 6,
    zombieRate: 1.10, propDensity: 0.8, rewardMul: 1.25,
    sky: ['#1e2a38', '#4a5f73', '#e0a06a'],
  },
  {
    id: 'level3', name: 'Пустошь', seed: 31337,
    length: 28000, target: 700, hilliness: 1.20, pits: 10,
    zombieRate: 1.40, propDensity: 1.0, rewardMul: 1.55,
    sky: ['#3a1f2b', '#6b3b40', '#c26a44'],
  },
  {
    id: 'level4', name: 'Мёртвый Город', seed: 999666,
    length: 36000, target: 1000, hilliness: 1.45, pits: 15,
    zombieRate: 1.75, propDensity: 1.25, rewardMul: 2.00,
    sky: ['#12161c', '#2b3038', '#7a4a3a'],
  },
];

export const UPGRADE_IDS = UPGRADE_DEFS.map(d => d.id);
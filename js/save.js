// ===== js/save.js =====
const KEY = 'earn_to_die_save_v1';

const DEFAULT_SAVE = () => ({
  version: 1,
  money: 0,
  totalEarned: 0,
  currentCar: 'junker',
  cars: ['junker'],
  upgrades: {},             // { carId: { engine:0, wheels:0, ... } }
  levels: {},               // { level1: bestDistanceMeters }
  currentLevel: 'level1',
  settings: { sound: true, debug: false },
});

export const Save = {
  data: DEFAULT_SAVE(),

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = Object.assign(DEFAULT_SAVE(), parsed);
        this.data.settings = Object.assign({ sound: true, debug: false }, parsed.settings || {});
        this.data.upgrades = parsed.upgrades || {};
        this.data.levels = parsed.levels || {};
        this.data.cars = Array.isArray(parsed.cars) && parsed.cars.length ? parsed.cars : ['junker'];
      } else {
        this.data = DEFAULT_SAVE();
      }
    } catch (e) {
      console.warn('Save.load: повреждённое сохранение, сброс', e);
      this.data = DEFAULT_SAVE();
    }
    return this.data;
  },

  flush() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn('Save.flush failed', e); }
  },

  getUpgrades(carId) {
    if (!this.data.upgrades[carId]) {
      this.data.upgrades[carId] = { engine: 0, wheels: 0, suspension: 0, armor: 0, fuel: 0 };
    }
    return this.data.upgrades[carId];
  },

  addMoney(n) {
    this.data.money += n;
    this.data.totalEarned += Math.max(0, n);
    this.flush();
  },

  spend(n) {
    if (this.data.money < n) return false;
    this.data.money -= n;
    this.flush();
    return true;
  },

  ownCar(id) { return this.data.cars.includes(id); },

  unlockCar(id) {
    if (!this.ownCar(id)) { this.data.cars.push(id); this.flush(); }
  },

  setLevelRecord(levelId, meters) {
    const cur = this.data.levels[levelId] || 0;
    if (meters > cur) { this.data.levels[levelId] = meters; this.flush(); return true; }
    return false;
  },

  exportJSON() { return JSON.stringify(this.data, null, 2); },

  importJSON(text) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) return false;
      this.data = Object.assign(DEFAULT_SAVE(), parsed);
      this.flush();
      return true;
    } catch { return false; }
  },

  reset() {
    this.data = DEFAULT_SAVE();
    this.flush();
  },
};
// ===== js/events.js =====
// Простейшая шина событий.

const map = new Map();

export const Bus = {
  on(name, cb) {
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(cb);
    return () => Bus.off(name, cb);
  },
  off(name, cb) {
    const arr = map.get(name);
    if (!arr) return;
    const i = arr.indexOf(cb);
    if (i >= 0) arr.splice(i, 1);
  },
  emit(name, payload) {
    const arr = map.get(name);
    if (!arr) return;
    for (const cb of arr.slice()) {
      try { cb(payload); } catch (e) { console.error('[Bus]', name, e); }
    }
  },
  clear() { map.clear(); },
};
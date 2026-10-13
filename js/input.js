// ===== js/input.js =====
// Клавиатура + тач (левая половина — тормоз, правая — газ).

export const Input = {
  gas: false,
  brake: false,
  _keys: new Set(),
  _el: null,

  init(el) {
    this._el = el || window;

    window.addEventListener('keydown', (e) => this._onKey(e, true));
    window.addEventListener('keyup',   (e) => this._onKey(e, false));

    // ---- Тач ----
    const touchStart = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const half = window.innerWidth * 0.5;
        if (t.clientX > half) this.gas = true; else this.brake = true;
      }
    };
    const touchEnd = (e) => {
      e.preventDefault();
      // пересчитываем по оставшимся касаниям
      let g = false, b = false;
      const half = window.innerWidth * 0.5;
      for (const t of e.touches) {
        if (t.clientX > half) g = true; else b = true;
      }
      this.gas = g; this.brake = b;
    };

    const target = document.getElementById('hud') || window;
    target.addEventListener('touchstart', touchStart, { passive: false });
    target.addEventListener('touchend', touchEnd, { passive: false });
    target.addEventListener('touchcancel', touchEnd, { passive: false });

    // ---- Мышь (для десктопа, если хочется) ----
    const el = document.getElementById('game');
    el.addEventListener('mousedown', (e) => {
      if (e.clientX > window.innerWidth * 0.5) this.gas = true; else this.brake = true;
    });
    window.addEventListener('mouseup', () => { this.gas = false; this.brake = false; });
  },

  _onKey(e, down) {
    const k = e.key.toLowerCase();
    const code = e.code;
    const isGas   = ['arrowright', 'd', 'в'].includes(k) || code === 'ArrowRight' || code === 'KeyD';
    const isBrake = ['arrowleft', 'a', 'ф'].includes(k)  || code === 'ArrowLeft'  || code === 'KeyA';
    const isUp    = ['arrowup', 'w', 'ц'].includes(k)    || code === 'ArrowUp'    || code === 'KeyW';
    const isDown  = ['arrowdown', 's', 'ы'].includes(k)  || code === 'ArrowDown'  || code === 'KeyS';

    if (isGas)   { this.gas = down;   e.preventDefault(); }
    if (isBrake) { this.brake = down; e.preventDefault(); }
    if (isUp)    { this.gas = down;   e.preventDefault(); }
    if (isDown)  { this.brake = down; e.preventDefault(); }

    if (down) this._keys.add(k); else this._keys.delete(k);
  },

  reset() { this.gas = false; this.brake = false; this._keys.clear(); },
};
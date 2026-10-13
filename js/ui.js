// ===== js/ui.js =====
import { Save } from './save.js';
import { Audio } from './audio.js';
import { UPGRADE_DEFS, CARS, LEVELS, upgradeValue } from './upgrades.js';

const $ = (id) => document.getElementById(id);

export const UI = {
  game: null,
  currentScreen: 'menu',

  init(game) {
    this.game = game;

    // --- кнопки с data-action ---
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      Audio.resume();
      if (a === 'play')     { this.game.openGarage(); }
      if (a === 'garage')   { this.game.openGarage(); }
      if (a === 'menu')     { this.game.openMenu(); }
      if (a === 'start')    { this.game.startRun(); }
      if (a === 'settings') { this.show('settings'); this.refreshSettings(); }
    });

    $('btn-pause').addEventListener('click', () => this.game.openGarage());

    // настройки
    $('opt-sound').addEventListener('change', (e) => {
      Save.data.settings.sound = e.target.checked;
      Audio.setEnabled(e.target.checked);
      Save.flush();
    });
    $('opt-debug').addEventListener('change', (e) => {
      Save.data.settings.debug = e.target.checked;
      Save.flush();
    });
    $('btn-export').addEventListener('click', () => {
      $('io-area').value = Save.exportJSON();
      this.toast('Прогресс скопирован в поле ниже', 'ok');
    });
    $('btn-import').addEventListener('click', () => {
      const ok = Save.importJSON($('io-area').value);
      this.toast(ok ? 'Прогресс загружен!' : 'Некорректный JSON', ok ? 'ok' : 'err');
      if (ok) { this.game.openGarage(); }
    });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('Точно сбросить ВЕСЬ прогресс?')) {
        Save.reset();
        Audio.playError();
        this.toast('Прогресс сброшен', 'err');
        this.game.openMenu();
      }
    });
  },

  /* ---------- Экраны ---------- */
  show(name) {
    for (const el of document.querySelectorAll('.screen')) el.classList.remove('active');
    const el = $('screen-' + name);
    if (el) el.classList.add('active');
    this.currentScreen = name;
    $('hud').classList.toggle('hidden', name !== 'hud');
    if (name === 'hud') $('hud').classList.add('hidden'); // hud управляется отдельно
  },

  showHUD(visible) {
    $('hud').classList.toggle('hidden', !visible);
  },

  /* ---------- HUD ---------- */
  updateHUD(s) {
    $('hud-money').textContent = Math.floor(s.money);
    $('hud-kills').textContent = s.kills;
    $('hud-dist').textContent = Math.floor(s.distance) + ' м';
    $('hud-speed').textContent = s.speed;
    $('hud-level').textContent = s.levelName.toUpperCase();

    const fuelPct = Math.max(0, Math.min(1, s.fuel / s.fuelMax));
    $('bar-fuel').style.width = (fuelPct * 100) + '%';
    $('bar-fuel').style.background = fuelPct < 0.2
      ? 'linear-gradient(90deg,#e2564a,#ff9c2f)'
      : 'linear-gradient(90deg,#ff9c2f,#ffd34d)';

    const hpPct = Math.max(0, Math.min(1, s.hp / s.hpMax));
    $('bar-hp').style.width = (hpPct * 100) + '%';
    $('bar-hp').style.background = hpPct < 0.3
      ? 'linear-gradient(90deg,#8b1f16,#e2564a)'
      : 'linear-gradient(90deg,#e2564a,#57d97b)';

    $('hud-goal').textContent = `ЦЕЛЬ: ${Math.floor(s.target)} м`;
  },

  /* ---------- Гараж ---------- */
  refreshGarage() {
    const d = Save.data;
    $('garage-money').textContent = Math.floor(d.money);

    this._renderCars();
    this._renderUpgrades();
    this._renderLevels();
  },

  _renderCars() {
    const host = $('car-list');
    host.innerHTML = '';
    const d = Save.data;

    for (const car of CARS) {
      const owned = d.cars.includes(car.id);
      const selected = d.currentCar === car.id;
      const canBuy = d.money >= car.cost;

      const el = document.createElement('div');
      el.className = 'card' + (selected ? ' selected' : '') + (!owned && !canBuy ? ' locked' : '');
      el.innerHTML = `
        <div class="thumb" style="color:${car.color}">${car.icon}</div>
        <div class="info">
          <b>${car.name}</b>
          <small>${car.desc}</small>
        </div>
        <div class="price ${owned ? 'owned' : (canBuy ? '' : 'cant')}">
          ${owned ? (selected ? '✔ ВЫБРАНА' : 'ВЫБРАТЬ') : '$' + car.cost}
        </div>
      `;

      el.addEventListener('click', () => {
        if (owned) {
          if (!selected) {
            d.currentCar = car.id;
            Save.flush();
            Audio.playBuy();
            this.refreshGarage();
          }
        } else if (canBuy) {
          if (Save.spend(car.cost)) {
            Save.unlockCar(car.id);
            d.currentCar = car.id;
            Save.flush();
            Audio.playBuy();
            this.toast(`Куплено: ${car.name}`, 'ok');
            this.refreshGarage();
          }
        } else {
          Audio.playError();
          this.toast('Недостаточно денег', 'err');
        }
      });

      host.appendChild(el);
    }
  },

  _renderUpgrades() {
    const host = $('upgrade-list');
    host.innerHTML = '';
    const d = Save.data;
    const carId = d.currentCar;
    const ups = Save.getUpgrades(carId);

    for (const def of UPGRADE_DEFS) {
      const lvl = ups[def.id] | 0;
      const isMax = lvl >= def.levels.length - 1;
      const next = isMax ? null : def.levels[lvl + 1];
      const canBuy = next && d.money >= next.cost;

      const row = document.createElement('div');
      row.className = 'up-row';

      let pips = '';
      for (let i = 0; i < def.levels.length; i++) {
        pips += `<i class="pip ${i <= lvl ? 'on' : ''}"></i>`;
      }

      row.innerHTML = `
        <div class="up-head">
          <span class="ico">${def.icon}</span>
          <b>${def.name}</b>
          <span style="font-size:11px;color:var(--dim)">${lvl}/${def.levels.length - 1}</span>
        </div>
        <div class="pips">${pips}</div>
        <div class="up-foot">
          <small>${def.desc}</small>
          <button class="buy ${isMax ? 'max' : ''}" ${isMax || !canBuy ? 'disabled' : ''}>
            ${isMax ? 'МАКС' : '$' + next.cost}
          </button>
        </div>
      `;

      if (!isMax) {
        row.querySelector('.buy').addEventListener('click', () => {
          const cost = next.cost;
          if (Save.spend(cost)) {
            ups[def.id] = lvl + 1;
            Save.flush();
            Audio.playBuy();
            this.toast(`${def.name} → ур. ${lvl + 1}`, 'ok');
            this.refreshGarage();
          } else {
            Audio.playError();
            this.toast('Недостаточно денег', 'err');
          }
        });
      }

      host.appendChild(row);
    }
  },

  _renderLevels() {
    const host = $('level-select');
    host.innerHTML = '';
    const d = Save.data;

    LEVELS.forEach((lv, idx) => {
      const unlocked = idx === 0 ||
        (d.levels[LEVELS[idx - 1].id] || 0) >= LEVELS[idx - 1].target;
      const active = d.currentLevel === lv.id;

      const b = document.createElement('button');
      b.className = 'lv-btn' + (active ? ' active' : '') + (unlocked ? '' : ' locked');
      const best = Math.floor(d.levels[lv.id] || 0);
      b.innerHTML = unlocked
        ? `${lv.name}<br><span style="font-size:10px;opacity:.7">рекорд ${best}м / цель ${lv.target}м</span>`
        : `🔒 ${lv.name}`;

      if (unlocked) {
        b.addEventListener('click', () => {
          d.currentLevel = lv.id;
          Save.flush();
          Audio.playBuy();
          this.refreshGarage();
        });
      }
      host.appendChild(b);
    });
  },

  /* ---------- Экран смерти ---------- */
  showDeath(stats) {
    const reasons = {
      crash: '☠ Смерть от удара',
      flip:  '☠ Машина раздавила водителя',
      zombie:'☠ Водителя сожрали',
      fuel:  '⛽ Кончилось топливо',
      fall:  '🕳 Машина улетела в пропасть',
      water: '💧 Машина утонула',
    };
    const won = stats.finished;

    $('death-title').textContent = won ? '🏁 УРОВЕНЬ ПРОЙДЕН!' : (reasons[stats.deathReason] || '☠ КОНЕЦ ЗАЕЗДА');
    $('death-reason').textContent = won
      ? `Цель ${stats.target} м достигнута. Бонус: $${Math.floor(stats.finishedBonus)}`
      : `Дистанция: ${Math.floor(stats.distance)} м из ${stats.target} м`;

    $('death-dist').textContent = Math.floor(stats.distance) + ' м';
    $('death-kills').textContent = stats.kills;
    $('death-money').textContent = '$' + Math.floor(stats.money);

    const best = Math.floor(Save.data.levels[stats.levelId] || 0);
    $('death-best').textContent = best + ' м';

    this.show('death');
    this.showHUD(false);
  },

  refreshSettings() {
    $('opt-sound').checked = !!Save.data.settings.sound;
    $('opt-debug').checked = !!Save.data.settings.debug;
  },

  updateMenuMoney() {
    $('menu-money').textContent = '$' + Math.floor(Save.data.totalEarned);
  },

  /* ---------- Toast ---------- */
  _toastTimer: null,
  toast(text, type = '') {
    const el = $('toast');
    el.textContent = text;
    el.className = 'toast show ' + type;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.className = 'toast ' + type; }, 1800);
  },
};
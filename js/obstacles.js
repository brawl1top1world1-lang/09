// ===== js/obstacles.js =====
import { CAT } from './config.js';

const { Bodies } = Matter;

/**
 * Создаёт статические тела-препятствия по описанию.
 * @param {{x:number,y:number,type:string,angle:number}} p
 * @returns {Matter.Body[]}
 */
export function makePropBodies(p) {
  const out = [];

  if (p.type === 'rock') {
    const r = 14 + Math.random() * 22;
    const b = Bodies.polygon(p.x, p.y - r * 0.55, 6 + (Math.random() * 3 | 0), r, {
      isStatic: true,
      friction: 0.9,
      angle: p.angle,
      label: 'prop',
      collisionFilter: { category: CAT.PROP, mask: 0xFFFFFFFF },
    });
    b.gameType = 'prop';
    b.gameKind = 'rock';
    out.push(b);
  } else if (p.type === 'barrel') {
    const b = Bodies.rectangle(p.x, p.y - 26, 34, 52, {
      isStatic: false,
      density: 0.0016,
      friction: 0.7,
      restitution: 0.15,
      chamfer: { radius: 6 },
      angle: p.angle,
      label: 'prop',
      collisionFilter: { category: CAT.PROP, mask: 0xFFFFFFFF },
    });
    b.gameType = 'prop';
    b.gameKind = 'barrel';
    out.push(b);
  } else { // wreck — разбитая машина
    const b = Bodies.rectangle(p.x, p.y - 22, 92, 34, {
      isStatic: true,
      friction: 0.9,
      chamfer: { radius: 8 },
      angle: p.angle * 1.5,
      label: 'prop',
      collisionFilter: { category: CAT.PROP, mask: 0xFFFFFFFF },
    });
    b.gameType = 'prop';
    b.gameKind = 'wreck';
    out.push(b);
  }

  return out;
}
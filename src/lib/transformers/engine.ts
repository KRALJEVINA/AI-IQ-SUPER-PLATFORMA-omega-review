/** Local prototype. No network, rewards, persistence or geographic terrain data. */
export const TRANSFORMERS_ID = 'igrica-transformers-1350';
export const SECTOR = {
  name: 'Smederevo — probni sektor', latitude: 44.66, longitude: 20.93,
  size: 100, metresPerUnit: 20,
  obstacles: [{ x: 40, z: 35, w: 12, d: 10 }, { x: 58, z: 62, w: 14, d: 8 }],
} as const;
export const CAMERAS = Array.from({ length: 23 }, (_, index) => ({
  id: index + 1,
  name: ['Taktički pogled odozgo', 'Praćenje jedinice', 'Orbitalni pregled'][index] ?? `Planirani pogled ${index + 1}`,
  implemented: index < 3,
}));
export type Form = 'robot' | 'vehicle';
export interface Unit {
  id: 'player' | 'bot'; x: number; z: number; hp: number; form: Form;
  transition: number; cooldown: number; flash: number;
}
export interface Duel {
  phase: 'ready' | 'active' | 'finished';
  units: [Unit, Unit]; remaining: number; elapsed: number;
  result: 'win' | 'loss' | 'draw' | null;
  camera: number; orbit: number; paused: boolean;
}
export type Action =
  | { type: 'start' | 'reset' | 'transform' | 'fire' | 'pause' }
  | { type: 'camera'; id: number }
  | { type: 'orbit'; delta: number }
  | { type: 'tick'; dt: number; x: number; z: number };

export function createDuel(): Duel {
  const unit = (id: Unit['id'], x: number, z: number): Unit => ({
    id, x, z, hp: 100, form: 'robot', transition: 0, cooldown: 0, flash: 0,
  });
  return { phase: 'ready', units: [unit('player', 20, 50), unit('bot', 80, 50)],
    remaining: 90, elapsed: 0, result: null, camera: 1, orbit: 0, paused: false };
}
const finite = (n: number) => Number.isFinite(n) ? n : 0;
export function canStand(x: number, z: number): boolean {
  const radius = 2;
  return Number.isFinite(x) && Number.isFinite(z)
    && x >= radius && z >= radius && x <= SECTOR.size - radius && z <= SECTOR.size - radius
    && !SECTOR.obstacles.some(o => x + radius > o.x && x - radius < o.x + o.w
      && z + radius > o.z && z - radius < o.z + o.d);
}
function move(unit: Unit, x: number, z: number, dt: number) {
  const length = Math.max(1, Math.hypot(x, z));
  const speed = unit.form === 'vehicle' ? 18 : 10;
  const nx = unit.x + x / length * speed * dt;
  const nz = unit.z + z / length * speed * dt;
  if (canStand(nx, unit.z)) unit.x = nx;
  if (canStand(unit.x, nz)) unit.z = nz;
}
function fire(attacker: Unit, target: Unit) {
  if (attacker.form !== 'robot' || attacker.transition > 0 || attacker.cooldown > 0 || attacker.hp <= 0) return;
  attacker.cooldown = 0.8;
  attacker.flash = 0.15;
  const distance = Math.hypot(attacker.x - target.x, attacker.z - target.z);
  // Sample the short shot segment so solid obstacles block attacks as well as movement.
  const blocked = SECTOR.obstacles.some(o => {
    for (let i = 0; i <= 40; i++) {
      const x = attacker.x + (target.x - attacker.x) * i / 40;
      const z = attacker.z + (target.z - attacker.z) * i / 40;
      if (x >= o.x && x <= o.x + o.w && z >= o.z && z <= o.z + o.d) return true;
    }
    return false;
  });
  if (distance <= 26 && !blocked) target.hp = Math.max(0, target.hp - 10);
}
function finish(state: Duel): Duel {
  const [player, bot] = state.units;
  if (player.hp > 0 && bot.hp > 0 && state.remaining > 0) return state;
  state.phase = 'finished';
  state.result = player.hp <= 0 && bot.hp <= 0 ? 'draw'
    : player.hp <= 0 ? 'loss' : bot.hp <= 0 ? 'win' : 'draw';
  return state;
}
export function duelReducer(state: Duel, action: Action): Duel {
  if (action.type === 'reset') return createDuel();
  if (action.type === 'start') return state.phase === 'ready' ? { ...state, phase: 'active' } : state;
  if (action.type === 'camera') return CAMERAS.some(c => c.id === action.id && c.implemented)
    ? { ...state, camera: action.id } : state;
  if (action.type === 'orbit') return { ...state, orbit: state.orbit + finite(action.delta) };
  if (action.type === 'pause') return state.phase === 'active' ? { ...state, paused: !state.paused } : state;
  if (state.phase !== 'active' || state.paused) return state;
  const next: Duel = { ...state, units: [{ ...state.units[0] }, { ...state.units[1] }] };
  const [player, bot] = next.units;
  if (action.type === 'transform') {
    if (player.transition === 0) player.transition = 0.6;
  } else if (action.type === 'fire') {
    fire(player, bot);
  } else if (action.type === 'tick') {
    const dt = Math.max(0, Math.min(0.05, finite(action.dt)));
    if (dt === 0) return state;
    next.elapsed += dt;
    next.remaining = Math.max(0, next.remaining - dt);
    for (const unit of next.units) {
      const previous = unit.transition;
      unit.transition = Math.max(0, unit.transition - dt);
      if (previous > 0 && unit.transition === 0) unit.form = unit.form === 'robot' ? 'vehicle' : 'robot';
      unit.cooldown = Math.max(0, unit.cooldown - dt);
      unit.flash = Math.max(0, unit.flash - dt);
    }
    if (player.transition === 0) move(player, finite(action.x), finite(action.z), dt);
    const dx = player.x - bot.x, dz = player.z - bot.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 19) move(bot, dx / Math.max(1, distance), dz / Math.max(1, distance), dt);
    // Bot is deliberately slower to shoot than the player: a transparent local sparring partner.
    if (bot.cooldown === 0 && next.remaining > 0) { fire(bot, player); bot.cooldown = 1.2; }
  }
  return finish(next);
}

/** Orthographic 2.5D projection; all views use the same world and unit identity. */
export function project(x: number, z: number, height: number, state: Duel): [number, number] {
  const tracked = state.camera === 2;
  const cx = tracked ? state.units[0].x : 50, cz = tracked ? state.units[0].z : 50;
  const angle = state.camera === 1 ? 0 : state.camera === 2 ? Math.PI / 4 : state.orbit;
  const pitch = state.camera === 1 ? 1 : 0.55;
  const scale = tracked ? 7 : 4.3;
  const dx = x - cx, dz = z - cz;
  return [400 + (dx * Math.cos(angle) - dz * Math.sin(angle)) * scale,
    260 + (dx * Math.sin(angle) + dz * Math.cos(angle)) * scale * pitch - height * scale];
}

/* Commit Village — world generation: terrain, river, roads, buildings, scenery, life */
'use strict';

const C = {
  plaster: 0xEFE6D2, cream: 0xE9D7B5, pink: 0xE9C6B9, sky: 0xC9DCE6, timber: 0x5A3B24, timberL: 0x7A5233,
  stone: 0x8F8B84, stoneD: 0x6F6A63, stoneL: 0xA8A39A, red: 0xB5533A, redD: 0x8C3A26, slate: 0x5D6878, slateD: 0x434C59,
  thatch: 0xCDAA5E, thatchD: 0xA9873F, wood: 0x8A5A34, plank: 0xA9763F, door: 0x6A3D1E, glow: 0xFFC66E, iron: 0x3B3B40,
  green: 0x4E8A4A, blue: 0x4C7FB0, barn: 0x9E3B2E, white: 0xF4F1EA, gold: 0xE3B341,
};
const stoneFn = (x, y, z) => { const h = hash3(x, y, z); return h < 0.25 ? C.stoneD : h > 0.85 ? C.stoneL : C.stone; };
const tiles = (a, b) => (x, y, z) => ((y + (hash3(x, 0, z) < 0.08 ? 1 : 0)) % 2 === 0 ? a : b);
const SEA = 2.6, RX = 86, RZ = 58;
const riverX = z => -12 + 3 * Math.sin(z / 12);

const FLATS = [
  { x: -38, z: -3, r: 22, e: 8, h: 3 }, { x: -35, z: -32, r: 8, e: 6, h: 3 },
  { x: 23, z: -1, r: 13, e: 8, h: 5 }, { x: 10, z: -22, r: 9, e: 6, h: 3 },
  { x: 6, z: 28, r: 9, e: 6, h: 3 }, { x: 56, z: -2, r: 17, e: 6, h: 3 }, { x: 77, z: 1, r: 8, e: 5, h: 3 },
];

// ---------------- sites ----------------
const SITES = {
  home:     { x: -51, z: 12, face: 'E', kind: 'cottage', title: 'Your Cottage', term: 'Your computer', icon: '🏡',
              desc: 'Home sweet home. Everything west of the river lives on YOUR machine: no one else can see it until you push.' },
  workshop: { x: -51, z: -4, face: 'E', kind: 'workshop', title: 'Workshop', term: 'Working directory', icon: '🔨', acts: ['edit'],
              desc: 'Where you craft. Parchments on the bench are files you changed but have not packed yet (modified / untracked).' },
  shed:     { x: -39, z: -15, face: 'S', kind: 'shed', title: 'Packing Shed', term: 'Staging area (index)', icon: '📦', acts: ['add'],
              desc: 'Choose which goods go into the next crate. Packed parcels are "staged": ready, but not sealed yet.' },
  archive:  { x: -23, z: -12, face: 'S', kind: 'archive', title: 'Archive Cellar', term: 'Local repository (.git)', icon: '🗄️', acts: ['commit', 'log'],
              desc: 'Sealed crates live here. Every crate is a commit: a permanent snapshot with a wax-seal hash and a label (message).' },
  feat:     { x: -35, z: -33, face: 'S', kind: 'hut', title: 'Feature Hut', term: 'Feature branch', icon: '🌿', acts: ['branch', 'switch'],
              desc: 'A side road off main. Work here without disturbing the main road; it rejoins later through a Pull Request.' },
  hall:     { x: 28, z: -7, face: 'W', kind: 'townhall', title: 'Town Hall', term: 'GitHub · origin (remote)', icon: '🏛️', acts: ['push', 'fetch', 'pull'],
              desc: 'The shared Town Hall everyone trusts. Your village and Alice\'s both send crates here. This is GitHub.' },
  granary:  { x: 28, z: 12, face: 'W', kind: 'granary', title: 'Granary', term: 'Remote branches (origin/*)', icon: '🌾', acts: ['push'],
              desc: 'Stores the crates that have been pushed: one stack per branch (origin/main, origin/feature/...).' },
  petition: { x: 10, z: -24, face: 'S', kind: 'petition', title: 'Petition Hall', term: 'Pull Requests', icon: '📜', acts: ['pr', 'review', 'merge'],
              desc: 'Pin a petition asking to bring your road into main. Neighbours review it, the mill runs checks, then it gets merged.' },
  alice:    { x: 6, z: 31, face: 'N', kind: 'alice', title: 'Alice\'s House', term: 'A teammate\'s clone', icon: '👩‍💻', acts: ['alice'],
              desc: 'Alice has her own copy of the repo. When she pushes, the Town Hall gets crates you don\'t have yet.' },
  mill:     { x: 42, z: -7, face: 'S', kind: 'mill', title: 'Actions Mill', term: 'GitHub Actions trigger', icon: '⚙️', acts: ['ci'],
              desc: 'A push or PR turns the mill: it starts the pipeline (a workflow) that every crate must pass.' },
  lint:     { x: 52, z: 9, face: 'N', kind: 'lint', title: 'Lint Inspector', term: 'CI · lint / style checks', icon: '🔍',
              desc: 'An inspector checks the crate is neatly packed: formatting, style, obvious mistakes.' },
  test:     { x: 61, z: -9, face: 'S', kind: 'tower', title: 'Test Watchtower', term: 'CI · automated tests', icon: '🧪',
              desc: 'Watchers try everything inside the crate. If anything breaks, the bell rings and the lamp turns red.' },
  forge:    { x: 70, z: -9, face: 'S', kind: 'forge', title: 'Build Forge', term: 'CI · build / package', icon: '🔥',
              desc: 'The smith turns the code into a shippable artifact: compiled, bundled, ready.' },
  harbor:   { x: 82, z: 2, face: 'E', kind: 'none', title: 'Deploy Harbour', term: 'CD · deploy to production', icon: '⛵',
              desc: 'When main passes all checks, the ship sails the finished goods out to the world: your users.' },
};
const NODES = { plaza: [-37, 3], J1: [-31, 1], J0: [-25, 0.5], bW: [-21, 0], bE: [-3, 0], R1: [5, 2], hallPlaza: [13, 3],
  F1: [-31, -22], F2: [-26, -28], b2W: [-23, -28], b2E: [-5, -28], F3: [2, -26], P1: [12, -8],
  A1: [10, 15], S0: [35, 3], S1: [42, 3], S2: [52, 3], S3: [61, 3], S4: [70, 3], S5: [79, 2], S6: [92, 2] };
const BRIDGES = [{ cx: -12, cz: 0, L: 18, W: 5 }, { cx: -14, cz: -28, L: 18, W: 5 }];
const PIER = { x0: 79, x1: 95, z0: 0, z1: 4, y: 3.5 };
const ROADS = [
  ['home.door', 'plaza'], ['workshop.door', 'plaza'], ['shed.door', 'plaza'], ['archive.door', 'J0'],
  ['plaza', 'J1', 'J0', 'bW'], ['bW', 'bE', 'bridge'], ['bE', 'R1', 'hallPlaza'], ['hall.door', 'hallPlaza'], ['granary.door', 'hallPlaza'],
  ['J1', 'F1', 'feat.door'], ['feat.door', 'F2', 'b2W'], ['b2W', 'b2E', 'bridge'], ['b2E', 'F3', 'petition.door'], ['petition.door', 'P1', 'hallPlaza'],
  ['alice.door', 'A1', 'hallPlaza'], ['hallPlaza', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5'], ['S5', 'S6', 'bridge'],
  ['mill.door', 'S1'], ['lint.door', 'S2'], ['test.door', 'S3'], ['forge.door', 'S4'],
];

const World = {
  scene: null, H: null, gx0: -104, gz0: -78, GW: 208, GH: 156, blocked: null,
  sites: SITES, nodes: {}, adj: {}, pickables: [], anchors: {}, lamps: {}, smokers: [], movers: [], labels: [],
  riverX,

  cell(x, z) { return (Math.floor(z) - this.gz0) * this.GW + (Math.floor(x) - this.gx0); },
  h(x, z) { const xi = Math.floor(x), zi = Math.floor(z); if (xi < this.gx0 || zi < this.gz0 || xi >= this.gx0 + this.GW || zi >= this.gz0 + this.GH) return 0; return this.H[this.cell(x, z)]; },
  groundY(x, z) {
    for (const b of BRIDGES) { const dx = x - b.cx; if (Math.abs(dx) <= b.L / 2 && Math.abs(z - b.cz) <= b.W / 2 + 0.6) return bridgeTop(dx, b.L); }
    if (x >= PIER.x0 - 0.5 && x <= PIER.x1 && z >= PIER.z0 - 0.5 && z <= PIER.z1 + 0.5) return PIER.y;
    return Math.max(this.h(x, z), SEA - 0.4);
  },
  isBlocked(x, z) { const i = this.cell(x, z); return this.blocked[i] === 1; },
  block(x0, z0, x1, z1) { for (let z = Math.floor(z0); z <= Math.ceil(z1); z++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) { const i = this.cell(x, z); if (i >= 0 && i < this.blocked.length) this.blocked[i] = 1; } },
};
function bridgeTop(dx, L) { return Math.round((3 + 1.3 * (1 - Math.pow(dx / (L / 2), 2))) * 2) / 2; }

function islandE(x, z) { return (x / RX) ** 2 + (z / RZ) ** 2 + (fbm(x * 0.045 + 10, z * 0.045) - 0.5) * 0.4; }
function rawH(x, z) {
  const e = islandE(x, z);
  if (e >= 1) return e < 1.07 ? 2 : e < 1.3 ? 1 : 0;
  let base = 3 + Math.max(0, fbm(x * 0.035, z * 0.035 + 40) - 0.47) * 14;
  if (e > 0.82) base = lerp(base, 3, (e - 0.82) / 0.18);
  let sw = 0, sh = 0;
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    const w = d < f.r ? 1 : d < f.r + f.e ? 1 - smooth((d - f.r) / f.e) : 0;
    sw += w; sh += w * f.h;
  }
  let h = Math.round(sw > 1 ? sh / sw : sh + (1 - sw) * base);
  const dr = Math.abs(x - riverX(z));
  if (dr < 3) h = 1; else if (dr < 4.6) h = Math.min(h, 2); else if (dr < 7) h = Math.min(h, 3);
  return h;
}
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / L, 0, 1);
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

// ---------------- building kits (fine voxels, scale 0.5) ----------------
function postsFor(len) { const p = []; for (let u = 0; u < len - 3; u += 6) p.push(u); p.push(len - 1); return p; }

function house(o) {
  const m = new VoxelModel(), w = o.w, d = o.d, x0 = -w / 2, x1 = w / 2 - 1, z0 = -d / 2, z1 = d / 2 - 1;
  const fh = o.fh || 8, floors = o.floors || 1, H = 1 + floors * fh;
  const wall = o.stoneWalls ? stoneFn : o.planks ? ((x, y, z) => ((x === x0 || x === x1 ? z : x) % 2 ? o.planks : o.planks2)) : (o.wall || C.plaster);
  m.box(x0, -6, z0, x1, 1, z1, stoneFn);
  m.hollow(x0, 2, z0, x1, H, z1, wall);
  const faces = [
    { len: w, at: u => [x0 + u, z1], n: [0, 1], front: true }, { len: w, at: u => [x0 + u, z0], n: [0, -1] },
    { len: d, at: u => [x0, z0 + u], n: [-1, 0] }, { len: d, at: u => [x1, z0 + u], n: [1, 0] }];
  for (const f of faces) {
    const posts = postsFor(f.len);
    if (o.timber) {
      for (const p of posts) for (let y = 2; y <= H; y++) { const [x, z] = f.at(p); m.set(x, y, z, C.timber); }
      for (let u = 0; u < f.len; u++) { const [x, z] = f.at(u); for (let fl = 0; fl <= floors; fl++) m.set(x, 1 + fl * fh + (fl ? 0 : 1), z, C.timber); }
      if (floors > 1) for (let i = 0; i < posts.length - 1; i++) { // tudor braces on upper floor
        const a = posts[i], b = posts[i + 1]; if (b - a < 5) continue;
        for (let k = 1; k < 4; k++) { const [x, z] = f.at(a + k); m.set(x, 1 + fh + k, z, C.timber); const [x2, z2] = f.at(b - k); m.set(x2, 1 + fh + k, z2, C.timber); }
      }
    }
    for (let fl = 0; fl < floors; fl++) {
      const yb = 1 + fl * fh;
      for (let i = 0; i < posts.length - 1; i++) {
        const a = posts[i], b = posts[i + 1]; if (b - a < 5) continue;
        const c = a + Math.floor((b - a) / 2);
        const [cx] = f.at(c);
        if (f.front && fl === 0 && Math.abs(cx + 0.5) <= 3.5) continue;
        for (let y = yb + 3; y <= yb + 5; y++) for (const u of [c - 1, c]) { const [x, z] = f.at(u); m.set(x, y, z, C.glow, true); }
        if (o.shutter) for (let y = yb + 3; y <= yb + 5; y++) for (const u of [c - 2, c + 1]) { const [x, z] = f.at(u); m.set(x, y, z, o.shutter); }
        for (const u of [c - 1, c]) {
          const [x, z] = f.at(u);
          m.set(x + f.n[0], yb + 2, z + f.n[1], C.wood);
          if (o.flowers && fl === 0) m.set(x + f.n[0], yb + 3, z + f.n[1], pick([0xE04B5A, 0xF2A6C2, 0xF6D04D, 0xffffff, 0xC45AD8]));
        }
      }
    }
  }
  // door
  if (o.door !== false) {
    m.box(-1, 2, z1, 1, 7, z1, (x, y) => (x === 0 && y % 2 ? 0x5A3318 : (o.doorCol || C.door)));
    m.box(-2, 2, z1, -2, 8, z1, C.timber); m.box(2, 2, z1, 2, 8, z1, C.timber); m.box(-2, 8, z1, 2, 8, z1, C.timber);
    m.box(-2, 1, z1 + 1, 2, 1, z1 + 2, stoneFn);
    m.set(3, 7, z1 + 1, C.glow, true); m.set(3, 6, z1 + 1, C.iron);
  }
  // roof
  const roofCol = tiles(o.roof, o.roofD), over = 1;
  if (o.roofType === 'hip') m.hip(x0, z0, x1, z1, H + 1, roofCol, o.ridge || o.roofD, over);
  else if (o.roofType === 'gableZ') {
    const t = new VoxelModel(); t.gable(z0, x0, z1, x1, H + 1, roofCol, o.ridge || o.roofD, over, wall);
    for (const [k, c] of t.m) { const [a, y, b] = k.split(',').map(Number); m.set(b, y, a, c); }
  } else m.gable(x0, z0, x1, z1, H + 1, roofCol, o.ridge || o.roofD, over, wall);
  let chimney = null;
  if (o.chimney !== false) {
    const cx = x1 - 3, cz = z0 + 3, top = H + Math.floor(Math.min(w, d) / 2) + 4;
    m.box(cx, H - 2, cz, cx + 1, top, cz + 1, stoneFn); m.box(cx - 1, top, cz - 1, cx + 2, top, cz + 2, C.stoneD);
    m.set(cx, top, cz, null); m.set(cx + 1, top, cz, null); m.set(cx, top, cz + 1, null); m.set(cx + 1, top, cz + 1, null);
    chimney = [cx + 1, top + 1, cz + 1];
  }
  return { m, w, d, H, x0, x1, z0, z1, front: z1 + 1, chimney };
}

function barrel(m, x, y, z) { m.box(x, y, z, x + 1, y + 2, z + 1, (a, b) => (b === y + 1 ? C.iron : C.wood)); }
function crateV(m, x, y, z) { m.box(x, y, z, x + 1, y + 1, z + 1, (a, b, c) => ((a + b + c) % 2 ? C.plank : 0x8E6234)); }

const KITS = {
  cottage() { const b = house({ w: 20, d: 16, fh: 8, timber: true, roof: C.thatch, roofD: C.thatchD, ridge: 0x8E6E30, shutter: 0x4F7B4A, flowers: true });
    barrel(b.m, b.x1 - 2, 2, b.front + 1); b.m.box(b.x0, 2, b.front + 4, b.x0 + 6, 2, b.front + 4, C.wood); return b; },
  alice() { const b = house({ w: 18, d: 16, floors: 2, fh: 8, timber: true, wall: C.pink, roof: C.red, roofD: C.redD, roofType: 'gableZ', shutter: 0x3E6E9E, flowers: true }); return b; },
  workshop() {
    const b = house({ w: 24, d: 18, fh: 9, timber: true, wall: C.cream, roof: C.red, roofD: C.redD, shutter: 0x7B4A2A, flowers: false });
    const m = b.m, fz = b.front;
    m.box(-11, 2, fz + 4, -4, 4, fz + 7, (x, y) => (y === 4 ? C.plank : (x === -11 || x === -4 ? C.timber : null)));
    m.box(-11, 4, fz + 4, -4, 4, fz + 7, C.plank);
    m.box(4, 2, fz + 4, 6, 3, fz + 5, C.iron); m.box(3, 4, fz + 4, 7, 4, fz + 5, 0x55565C); // anvil
    barrel(m, 9, 2, fz + 2); crateV(m, 9, 2, fz + 5); crateV(m, 9, 4, fz + 5);
    for (let i = 0; i < 4; i++) m.box(b.x0 - 3, 2 + i, b.z0 + 2, b.x0 - 2, 2 + i, b.z0 + 9 - i, (x, y, z) => (z % 3 ? 0x7A5230 : 0xC8A273)); // log pile
    b.anchor = { workbench: [-7.5, 5, fz + 5.5] };
    // hanging sign
    m.box(b.x1 + 1, 9, fz - 3, b.x1 + 3, 9, fz - 3, C.iron); m.box(b.x1 + 3, 6, fz - 4, b.x1 + 3, 8, fz - 2, C.gold);
    b.front = fz + 6; return b;
  },
  shed() {
    const m = new VoxelModel(), w = 22, d = 16, x0 = -11, x1 = 10, z0 = -8, z1 = 7, H = 8;
    m.box(x0, -6, z0, x1, 1, z1, stoneFn);
    m.box(x0, 2, z0, x1, H, z0, (x, y) => (x % 2 ? C.plank : 0x96652F));
    m.box(x0, 2, z0, x0, H, z1, (x, y, z) => (z % 2 ? C.plank : 0x96652F)); m.box(x1, 2, z0, x1, H, z1, (x, y, z) => (z % 2 ? C.plank : 0x96652F));
    for (const x of [x0, -4, 3, x1]) m.box(x, 2, z1, x, H, z1, C.timber);
    m.box(x0, H, z1, x1, H, z1, C.timber);
    m.gable(x0, z0, x1, z1, H + 1, tiles(C.slate, C.slateD), 0x3A414C, 1, C.plank);
    for (let x = x0 + 2; x < x1 - 1; x += 3) { crateV(m, x, 2, z0 + 2); if (hash3(x, 1, 1) > 0.4) crateV(m, x, 4, z0 + 2); }
    m.box(x0 + 1, 5, z0 + 1, x1 - 1, 5, z0 + 3, C.wood);
    m.box(x0 + 2, 2, z1 + 3, x0 + 9, 2, z1 + 7, (x, y, z) => (x % 2 ? 0xB8864E : 0x9C6E3A)); // pallet
    m.set(x1 - 2, 6, z1 + 1, C.glow, true);
    return { m, w, d, H, x0, x1, z0, z1, front: z1 + 8, anchor: { pallet: [x0 + 5.5, 3, z1 + 5] }, chimney: null };
  },
  archive() {
    const b = house({ w: 22, d: 18, fh: 10, stoneWalls: true, roof: C.slate, roofD: C.slateD, roofType: 'hip', ridge: 0x3A414C, chimney: false, doorCol: 0x4A3424 });
    const m = b.m, fz = b.front;
    m.set(-3, 6, fz, C.glow, true); m.set(3, 6, fz, C.glow, true);
    // vault yard: low wall
    for (let x = b.x0; x <= b.x0 + 12; x++) { m.set(x, 2, fz + 9, stoneFn); m.set(x, 3, fz + 9, C.stoneD); }
    for (let z = fz; z <= fz + 9; z++) { m.set(b.x0, 2, z, stoneFn); m.set(b.x0, 3, z, C.stoneD); }
    m.box(b.x0 + 1, 1, fz, b.x0 + 12, 1, fz + 8, (x, y, z) => ((x + z) % 2 ? 0x7E7870 : 0x8E877D));
    b.anchor = { vault: [b.x0 + 2.5, 2, fz + 1.5] };
    b.front = fz + 3; return b;
  },
  hut() {
    const b = house({ w: 14, d: 14, fh: 8, timber: true, wall: C.cream, roof: C.blue, roofD: 0x3A6590, shutter: 0x4E8A4A, flowers: true });
    const m = b.m; m.box(b.x1 + 2, 2, b.front, b.x1 + 2, 18, b.front, C.timberL);
    m.box(b.x1 + 3, 13, b.front, b.x1 + 8, 17, b.front, (x, y) => (y === 15 && x > b.x1 + 4 ? 0xffffff : 0x2EA043));
    b.anchor = { flag: [b.x1 + 2, 19, b.front] }; return b;
  },
  townhall() {
    const b = house({ w: 30, d: 24, floors: 2, fh: 9, timber: true, wall: C.plaster, roof: C.slate, roofD: C.slateD, ridge: 0x343B46, shutter: 0x2F4F6F, door: false });
    const m = b.m, z1 = b.z1;
    const tz0 = z1 - 4, tz1 = z1 + 5, top = 46;
    m.box(-5, -6, tz0, 4, top, tz1, (x, y, z) => (y < 12 ? stoneFn(x, y, z) : (x === -5 || x === 4) && (z === tz0 || z === tz1) ? C.timber : C.plaster));
    for (let y = 2; y < top; y++) for (let x = -4; x <= 3; x++) for (let z = tz0 + 1; z < tz1; z++) m.set(x, y, z, null);
    m.hip(-5, tz0, 4, tz1, top + 1, tiles(C.slateD, 0x343B46), 0x2A3038, 1);
    m.box(-1, top + 7, Math.floor((tz0 + tz1) / 2), 0, top + 11, Math.floor((tz0 + tz1) / 2), C.gold);
    // clock
    for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (a * a + c * c <= 10) m.set(a - 0.5 + (a < 0 ? 0 : 0), 36 + c, tz1, a * a + c * c > 6 ? C.gold : 0xFFF6DD, a * a + c * c <= 6);
    m.box(0, 36, tz1 + 1, 0, 38, tz1 + 1, C.iron); m.box(0, 36, tz1 + 1, 2, 36, tz1 + 1, C.iron);
    // belfry openings
    for (const y of [41, 42, 43]) { m.set(-2, y, tz1, null); m.set(-1, y, tz1, null); m.set(0, y, tz1, null); m.set(1, y, tz1, null); m.set(-5, y, tz0 + 4, null); m.set(4, y, tz0 + 4, null); }
    m.box(-1, 41, tz0 + 4, 0, 42, tz0 + 5, C.gold);
    // grand door
    m.box(-2, 2, tz1, 1, 9, tz1, (x, y) => (y === 9 ? C.timber : x % 2 ? 0x4E2E14 : C.door));
    m.box(-4, 1, tz1 + 1, 3, 1, tz1 + 4, stoneFn); m.box(-3, 0, tz1 + 5, 2, 0, tz1 + 6, stoneFn);
    m.set(-3, 8, tz1 + 1, C.glow, true); m.set(2, 8, tz1 + 1, C.glow, true);
    // banners
    for (const x of [-12, 11]) { m.box(x, 10, z1 + 1, x, 17, z1 + 1, (xx, y) => (y === 13 ? 0xFFFFFF : 0x24292F)); m.set(x, 9, z1 + 1, C.gold); }
    b.front = tz1 + 3; return b;
  },
  granary() {
    const b = house({ w: 22, d: 22, fh: 11, planks: C.barn, planks2: 0x8C3328, roof: C.red, roofD: C.redD, roofType: 'hip', door: false, chimney: false });
    const m = b.m, z1 = b.z1;
    m.box(-4, 2, z1, 3, 10, z1, (x, y) => ((x === -4 || x === 3 || y === 10 || x + y === 3 + 2 || x - y === -4 - 2) ? C.white : 0x7A2A22));
    // silo
    const sx = b.x1 + 6, sz = b.z0 + 6;
    for (let y = -4; y < 30; y++) for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) { const r = Math.hypot(x, z); if (r <= 4.7 && r > 3.4) m.set(sx + x, y, sz + z, y % 6 === 0 ? 0x8A8F95 : 0xB9BEC4); }
    for (let i = 0; i < 6; i++) for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x, z) <= 5 - i) m.set(sx + x, 30 + i, sz + z, 0x7D8B99);
    b.anchor = { yardMain: [-9.5, 2, z1 + 4], yardFeat: [-9.5, 2, z1 + 9] };
    m.box(-11, 1, z1 + 2, 10, 1, z1 + 11, (x, y, z) => ((x + z) % 2 ? 0xB59A6A : 0xA68A5B));
    b.front = z1 + 12; return b;
  },
  petition() {
    const b = house({ w: 22, d: 18, fh: 10, timber: false, wall: C.cream, roof: C.red, roofD: C.redD, roofType: 'hip', shutter: 0x8C3A26, chimney: false });
    const m = b.m, fz = b.front;
    for (const x of [-9, -4, 3, 8]) m.box(x, 2, fz + 3, x, 10, fz + 3, C.white);
    m.box(-10, 11, fz, 9, 11, fz + 4, tiles(C.red, C.redD)); m.box(-10, 1, fz, 9, 1, fz + 4, C.stoneL);
    // notice board
    m.box(-7, 2, fz + 9, -7, 11, fz + 9, C.timber); m.box(6, 2, fz + 9, 6, 11, fz + 9, C.timber);
    m.box(-6, 5, fz + 9, 5, 11, fz + 9, 0x5C3B1E); m.box(-7, 12, fz + 8, 6, 12, fz + 10, tiles(C.red, C.redD));
    b.anchor = { board: [-4.5, 9, fz + 10.6] };
    b.front = fz + 13; return b;
  },
  mill() {
    const m = new VoxelModel(), top = 30;
    m.box(-8, -6, -8, 7, 1, 7, stoneFn);
    for (let y = 2; y <= top; y++) {
      const r = Math.round(7 - (y / top) * 2.5);
      for (let x = -r; x < r; x++) for (let z = -r; z < r; z++) {
        if (x > -r && x < r - 1 && z > -r && z < r - 1) continue;
        if ((Math.abs(x) + Math.abs(z)) > r * 1.55) continue;
        m.set(x, y, z, y < 6 ? stoneFn : (y % 7 === 0 ? C.timber : C.white));
      }
    }
    m.gable(-5, -5, 4, 4, top + 1, tiles(C.thatch, C.thatchD), 0x8E6E30, 1, C.white);
    for (const y of [12, 20]) { m.set(-1, y, 6, C.glow, true); m.set(-1, y + 1, 6, C.glow, true); m.set(0, y, 6, C.glow, true); m.set(0, y + 1, 6, C.glow, true); }
    m.box(-1, 2, 6, 1, 6, 6, C.door); m.box(-2, 1, 7, 2, 1, 9, stoneFn);
    m.box(-1, top - 3, 6, 0, top - 2, 9, C.timber);
    return { m, w: 16, d: 16, H: top, x0: -8, x1: 7, z0: -8, z1: 7, front: 10, anchor: { hub: [-0.5 + 0.5, top - 2, 10] } };
  },
  lint() {
    const b = house({ w: 16, d: 14, fh: 8, timber: true, wall: C.cream, roof: 0x5E8C55, roofD: 0x4A7343, roofType: 'hip', ridge: 0x3E6038, shutter: 0x5E8C55, chimney: false });
    const m = b.m; // magnifier sign
    m.box(b.x1 + 2, 2, b.front - 2, b.x1 + 2, 12, b.front - 2, C.timber);
    for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) { const r = a * a + c * c; if (r <= 10 && r >= 5) m.set(b.x1 + 2, 15 + c, b.front - 2 + a, C.gold); else if (r < 5) m.set(b.x1 + 2, 15 + c, b.front - 2 + a, 0xBFE3F0, true); }
    return b;
  },
  tower() {
    const m = new VoxelModel(), r = 7, top = 36;
    m.box(-r, -6, -r, r - 1, top, r - 1, (x, y, z) => stoneFn(x, y, z));
    m.box(-r + 1, top - 6, -r + 1, r - 2, top, r - 2, null);
    m.box(-r - 1, top - 6, -r - 1, r, top - 6, r, C.stoneD);
    for (let x = -r - 1; x <= r; x++) for (let z = -r - 1; z <= r; z++) if ((x === -r - 1 || x === r || z === -r - 1 || z === r) && (x + z) % 2 === 0) { m.set(x, top - 5, z, stoneFn); m.set(x, top - 4, z, stoneFn); }
    for (const y of [8, 16, 24]) for (const [x, z] of [[-1, r - 1], [0, r - 1], [-r, 0], [r - 1, 0], [-1, -r]]) { m.set(x, y, z, C.glow, true); m.set(x, y + 1, z, C.glow, true); }
    m.box(-2, top - 5, -2, 1, top - 2, 1, C.timber); m.box(-1, top - 1, -1, 0, top, 0, C.glow, true);
    m.hip(-3, -3, 2, 2, top + 1, tiles(C.red, C.redD), C.redD, 0);
    m.box(-1, 2, r - 1, 0, 6, r - 1, C.door); m.box(-2, 1, r, 1, 1, r + 2, stoneFn);
    return { m, w: 14, d: 14, H: top, x0: -r, x1: r - 1, z0: -r, z1: r - 1, front: r + 3, anchor: { bell: [0, top - 3, 0] } };
  },
  forge() {
    const b = house({ w: 22, d: 18, fh: 9, stoneWalls: true, roof: C.slate, roofD: C.slateD, shutter: null, chimney: false });
    const m = b.m, fz = b.front;
    m.box(-9, -2, b.z0 + 2, -5, 30, b.z0 + 6, stoneFn); m.box(-8, 30, b.z0 + 3, -6, 30, b.z0 + 5, null);
    m.box(4, 2, fz - 1, 9, 6, fz - 1, (x, y) => (y < 5 ? 0xFF7A2F : 0xFFB347), true);
    m.box(3, 7, fz - 1, 10, 7, fz - 1, C.timber);
    m.box(-6, 2, fz + 3, -4, 3, fz + 4, C.iron); m.box(-7, 4, fz + 3, -3, 4, fz + 4, 0x55565C);
    m.box(5, 2, fz + 3, 8, 3, fz + 5, (x, y) => (y === 3 ? 0x5C88B8 : C.wood));
    b.chimney = [-7, 31, b.z0 + 4]; b.front = fz + 6; return b;
  },
};

// ---------------- build everything ----------------
World.build = function (scene) {
  this.scene = scene;
  const GW = this.GW, GH = this.GH;
  this.H = new Int8Array(GW * GH); this.blocked = new Uint8Array(GW * GH); this.road = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) this.H[j * GW + i] = rawH(i + this.gx0 + 0.5, j + this.gz0 + 0.5);

  // --- sites: resolve rotation + door nodes
  const FACE = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };
  for (const [name, s] of Object.entries(SITES)) {
    s.name = name; s.rot = FACE[s.face];
    if (s.kind === 'none') continue;
    s.kit = KITS[s.kind]();
    const fwd = [Math.sin(s.rot), Math.cos(s.rot)];
    const dist = s.kit.front * 0.5 + 2.5;
    NODES[name + '.door'] = [s.x + fwd[0] * dist, s.z + fwd[1] * dist];
    const hw = s.kit.w / 4 + 1.5, hd = s.kit.d / 4 + 1.5;
    const ew = (s.face === 'E' || s.face === 'W') ? hd : hw, ed = (s.face === 'E' || s.face === 'W') ? hw : hd;
    s.half = [ew, ed];
  }
  for (const [k, v] of Object.entries(NODES)) this.nodes[k] = new THREE.Vector2(v[0], v[1]);

  // --- roads: paint + graph
  const segs = [];
  for (const r of ROADS) {
    const bridge = r[r.length - 1] === 'bridge', names = bridge ? r.slice(0, -1) : r;
    for (let i = 0; i < names.length - 1; i++) {
      const a = names[i], b = names[i + 1];
      (this.adj[a] = this.adj[a] || []).push(b); (this.adj[b] = this.adj[b] || []).push(a);
      if (!bridge) segs.push([this.nodes[a], this.nodes[b], a.includes('.door') || b.includes('.door') ? 1.3 : 1.8]);
    }
  }
  const plazas = [[-38, -1, 7], [13, 3, 5.5]];
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = i + this.gx0 + 0.5, z = j + this.gz0 + 0.5, idx = j * GW + i;
    if (this.H[idx] < 3) continue;
    for (const [a, b, w] of segs) {
      const wob = w + (vnoise(x * 0.4, z * 0.4) - 0.5) * 0.9;
      if (distSeg(x, z, a.x, a.y, b.x, b.y) < wob) { this.road[idx] = 1; break; }
    }
    for (const [px, pz, pr] of plazas) if (Math.hypot(x - px, z - pz) < pr + (vnoise(x, z) - 0.5)) this.road[idx] = 2;
  }
  for (let i = 0; i < this.road.length; i++) if (this.road[i]) this.blocked[i] = 1;

  this.buildTerrain(scene);
  this.buildWater(scene);
  this.placeBuildings(scene);
  this.buildBridges(scene);
  this.buildScenery(scene);
  this.buildTrees(scene);
  this.buildLife(scene);
};

World.buildTerrain = function (scene) {
  const m = new VoxelModel(), GW = this.GW, GH = this.GH;
  const grass = [0x6FA34A, 0x7DAE4F, 0x8DB654, 0x64983F], dirt = 0x86643F, sand = 0xD9C38F;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = i + this.gx0, z = j + this.gz0, h = this.H[j * GW + i];
    if (h <= 0) continue;
    if (islandE(x, z) > 1.45) continue;
    let mn = h;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + dx, jj = j + dz;
      const hn = (ii < 0 || jj < 0 || ii >= GW || jj >= GH) ? 0 : this.H[jj * GW + ii];
      mn = Math.min(mn, hn);
    }
    const road = this.road[j * GW + i], dr = Math.abs(x + 0.5 - riverX(z + 0.5)), e = islandE(x, z);
    const n = fbm(x * 0.08, z * 0.08), n2 = hash3(x, 7, z);
    for (let y = Math.max(0, mn - 1); y < h; y++) {
      let c;
      if (y === h - 1) {
        if (road === 2) c = n2 < 0.3 ? 0x8F877A : n2 < 0.6 ? 0xA39A8B : 0x9A9184;
        else if (road === 1) c = n2 < 0.25 ? 0x9C8460 : n2 < 0.5 ? 0xB09670 : 0xA88E66;
        else if (h <= 2) c = h <= 1 ? 0xB8A272 : sand;
        else if (h === 3 && (e > 0.93 || dr < 5.6)) c = n2 < 0.5 ? sand : 0xCDBB84;
        else c = grass[Math.floor(clamp(n * 4 + (n2 - 0.5) * 0.9, 0, 3.99))];
        if (h >= 7 && n2 < 0.3 && !road) c = 0x9A9890;
      } else c = y < h - 3 ? stoneFn(x, y, z) : (hash3(x, y, z) < 0.2 ? 0x76583A : dirt);
      m.set(x, y, z, c);
    }
  }
  const g = m.build({ jitter: 0.04 });
  g.children[0].castShadow = false;
  scene.add(g);
  // seabed far plane
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshLambertMaterial({ color: 0x1F5D7A }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = 0.05; scene.add(bed);
};

World.buildWater = function (scene) {
  const geo = new THREE.PlaneGeometry(420, 340, 140, 110);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhongMaterial({ color: 0x3C9CC4, transparent: true, opacity: 0.78, shininess: 80, specular: 0x9FD8F0, flatShading: true });
  this.water = new THREE.Mesh(geo, mat);
  this.water.position.y = SEA; this.water.receiveShadow = true;
  this.waterBase = Float32Array.from(geo.attributes.position.array);
  scene.add(this.water);
};

World.placeBuildings = function (scene) {
  for (const s of Object.values(SITES)) {
    if (!s.kit) continue;
    const k = s.kit, y = this.h(s.x, s.z);
    const g = k.m.build({ scale: 0.5 });
    g.position.set(s.x, y, s.z); g.rotation.y = s.rot;
    g.traverse(o => { o.userData.site = s.name; });
    scene.add(g); g.updateMatrixWorld(true);
    s.group = g; s.y = y;
    this.pickables.push(g);
    this.block(s.x - s.half[0], s.z - s.half[1], s.x + s.half[0], s.z + s.half[1]);
    const L = (p) => g.localToWorld(new THREE.Vector3(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5));
    if (k.chimney) this.smokers.push(L(k.chimney));
    s.anchors = {};
    if (k.anchor) for (const [n, p] of Object.entries(k.anchor)) s.anchors[n] = L(p);
    s.right = new THREE.Vector3(Math.cos(s.rot), 0, -Math.sin(s.rot));
    s.fwd = new THREE.Vector3(Math.sin(s.rot), 0, Math.cos(s.rot));
    s.top = y + k.H * 0.5 + Math.min(k.w, k.d) * 0.28 + (s.kind === 'townhall' ? 14 : s.kind === 'tower' ? 3 : 0);
    // status lamp for pipeline stations
    if (['mill', 'lint', 'test', 'forge'].includes(s.name)) this.lamps[s.name] = this.makeLamp(scene, L([k.x1 + 3, 0, k.front - 2]).setY(y));
  }
  this.lamps.harbor = this.makeLamp(scene, new THREE.Vector3(80, 3.5, -0.5));
  SITES.harbor.y = 3.5; SITES.harbor.top = 12;
  // windmill sails
  const mill = SITES.mill, sm = new VoxelModel();
  for (let a = 0; a < 4; a++) for (let r = 2; r < 22; r++) for (let w = 0; w < 5; w++) {
    const lat = r % 3 === 0 || w === 0 || w === 4;
    const [x, y] = [[r, w], [-w, r], [-r, -w], [w, -r]][a];
    if (lat) sm.set(x, y, 0, w === 0 ? C.timber : 0xD8CFC0); else if (hash3(r, w, a) > 0.1) sm.set(x, y, 0, 0xEFE9DD);
  }
  sm.box(-1, -1, -1, 1, 1, 1, C.timber);
  this.sails = sm.build({ scale: 0.5, ox: 0.5, oy: 0.5, oz: 0.5 });
  this.sails.position.copy(mill.anchors.hub); scene.add(this.sails);
  this.sailSpeed = 0.4;
};

World.makeLamp = function (scene, p) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 0, 9, 0, C.iron); m.box(-1, 10, -1, 1, 10, 1, C.iron); m.box(-1, 14, -1, 1, 14, 1, C.iron);
  const g = m.build({ scale: 0.5 });
  g.position.copy(p); scene.add(g);
  const mat = new THREE.MeshBasicMaterial({ color: 0x777777 });
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), mat);
  bulb.position.set(p.x + 0.25, p.y + 6.25, p.z + 0.25); scene.add(bulb);
  const light = new THREE.PointLight(0xffffff, 0, 14, 2); light.position.copy(bulb.position); scene.add(light);
  return { bulb, set(col) { mat.color.set(col); light.color.set(col); light.intensity = col === 0x777777 ? 0 : 1.2; } };
};

World.buildBridges = function (scene) {
  const m = new VoxelModel();
  for (const b of BRIDGES) {
    const half = b.L, fx0 = Math.round((b.cx - b.L / 2) * 2), fz0 = Math.round((b.cz - b.W / 2) * 2);
    for (let i = 0; i < b.L * 2; i++) {
      const dx = (fx0 + i + 0.5) / 2 - b.cx, top = Math.round(bridgeTop(dx, b.L) * 2);
      for (let k = 0; k < b.W * 2; k++) {
        const edge = k === 0 || k === b.W * 2 - 1;
        for (let y = 0; y < top + (edge ? 2 : 0); y++) {
          const yw = y / 2, archH = 0.4 + 2.9 * Math.sqrt(Math.max(0, 1 - (dx / 4.6) ** 2)), side = Math.abs(Math.abs(dx) - 6.6) < 1.2 ? 0.4 + 1.6 * Math.sqrt(Math.max(0, 1 - ((Math.abs(dx) - 6.6) / 1.2) ** 2)) : 0;
          if (yw < archH && Math.abs(dx) < 4.6 && y < top - 2) continue;
          if (side && yw < side && y < top - 2) continue;
          const isDeck = y === top - 1 && !edge;
          m.set(fx0 + i, y, fz0 + k, isDeck ? (hash3(i, k, 3) < 0.4 ? 0x8F877A : 0xA39A8B) : y >= top ? C.stoneL : stoneFn);
        }
      }
    }
    this.block(b.cx - b.L / 2 - 1, b.cz - b.W, b.cx + b.L / 2 + 1, b.cz + b.W);
  }
  // pier
  const P = PIER;
  for (let X = P.x0 * 2; X <= P.x1 * 2; X++) for (let Z = P.z0 * 2; Z <= P.z1 * 2 + 1; Z++) {
    m.set(X, 6, Z, (X % 4 === 0) ? 0x7A5230 : (Z % 2 ? 0xA9763F : 0x9C6B38));
    if (X % 8 === 0 && (Z === P.z0 * 2 || Z === P.z1 * 2 + 1)) { m.box(X, 0, Z, X, 8, Z, C.timber); }
  }
  for (let X = P.x0 * 2 + 4; X < P.x1 * 2; X += 9) { barrel(m, X, 7, P.z1 * 2 + 1 - 2); }
  crateV(m, P.x1 * 2 - 4, 7, P.z0 * 2); crateV(m, P.x1 * 2 - 4, 9, P.z0 * 2);
  // lighthouse
  const lx = 86 * 2, lz = -9 * 2, base = this.h(86, -9) * 2;
  for (let y = base - 4; y < base + 50; y++) for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) {
    const r = Math.hypot(x, z), R = 5 - (y - base) / 25;
    if (r <= R && r > R - 1.4) m.set(lx + x, y, lz + z, y < base + 3 ? stoneFn : (Math.floor((y - base) / 6) % 2 ? 0xC8463A : C.white));
  }
  for (let y = base + 50; y < base + 55; y++) for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { const r = Math.hypot(x, z); if (r <= 3.2) m.set(lx + x, y, lz + z, r > 2.4 ? (y === base + 50 ? C.iron : null) : 0xFFF2B0, r <= 2.4); }
  m.hip(lx - 3, lz - 3, lx + 3, lz + 3, base + 55, 0xC8463A, 0x8C2F27, 0);
  this.beacon = new THREE.Vector3(86.25, base / 2 + 26.5, -8.75);
  const g = m.build({ scale: 0.5 }); scene.add(g);
  this.lighthouseLight = new THREE.PointLight(0xFFE7A0, 0, 60, 1.5); this.lighthouseLight.position.copy(this.beacon); scene.add(this.lighthouseLight);
  this.block(83, -12, 90, -6);
};

World.buildScenery = function (scene) {
  const m = new VoxelModel(), F = v => Math.round(v * 2);
  const gy = (x, z) => Math.round(this.groundY(x, z) * 2);
  // well in the plaza
  { const cx = F(-38), cz = F(-1), y = gy(-38, -1);
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) { const r = Math.hypot(x, z); if (r <= 4.2 && r > 2.6) { m.set(cx + x, y, cz + z, stoneFn); m.set(cx + x, y + 1, cz + z, stoneFn); m.set(cx + x, y + 2, cz + z, C.stoneL); } else if (r <= 2.6) m.set(cx + x, y, cz + z, 0x3C9CC4); }
    for (const s of [-3, 3]) m.box(cx + s, y + 3, cz, cx + s, y + 8, cz, C.timber);
    m.box(cx - 4, y + 9, cz - 2, cx + 4, y + 9, cz + 2, tiles(C.red, C.redD)); m.box(cx - 3, y + 10, cz - 1, cx + 3, y + 10, cz + 1, C.redD);
    m.box(cx - 2, y + 7, cz, cx + 2, y + 7, cz, C.wood); m.box(cx, y + 3, cz, cx, y + 6, cz, 0x9A8060); }
  this.block(-41, -4, -35, 2);
  // market stalls around plaza
  const stall = (x, z, col, rotX) => {
    const X = F(x), Z = F(z), y = gy(x, z);
    for (const [a, b] of [[0, 0], [5, 0], [0, 4], [5, 4]]) m.box(X + a, y, Z + b, X + a, y + 6, Z + b, C.timber);
    m.box(X, y + 2, Z, X + 5, y + 2, Z + 4, C.plank);
    for (let a = 0; a <= 5; a++) for (let b = -1; b <= 5; b++) m.set(X + a, y + 7, Z + b, (a % 2) ? col : 0xF4F1EA);
    for (let a = 1; a < 5; a++) m.set(X + a, y + 3, Z + 1 + (a % 2), pick([0xE04B5A, 0xF6D04D, 0x7DBB5A, 0xE38B2E, 0x9C5AD8]));
    this.block(x - 0.5, z - 0.5, x + 3.5, z + 3);
  };
  stall(-46, 6, 0xC8463A); stall(-31, 6, 0x3E6E9E); stall(-46, -12, 0x4E8A4A);
  stall(5, 8, 0xE3B341);
  // lamp posts along roads
  const lamp = (x, z) => { const X = F(x), Z = F(z), y = gy(x, z); if (this.h(x, z) < 3) return; m.box(X, y, Z, X, y + 7, Z, C.iron); m.box(X, y + 8, Z, X, y + 8, Z, 0xFFD27A, true); m.set(X, y + 9, Z, C.iron); this.lampSpots.push(new THREE.Vector3(x, y / 2 + 4.3, z)); };
  this.lampSpots = [];
  for (const r of ROADS) {
    if (r[r.length - 1] === 'bridge') continue;
    for (let i = 0; i < r.length - 1; i++) {
      const a = this.nodes[r[i]], b = this.nodes[r[i + 1]], L = a.distanceTo(b);
      for (let t = 6; t < L - 3; t += 13) {
        const p = a.clone().lerp(b, t / L), n = new THREE.Vector2(-(b.y - a.y), b.x - a.x).normalize().multiplyScalar(2.6);
        const q = p.add(n);
        if (!this.isBlocked(q.x, q.y)) { lamp(q.x, q.y); this.block(q.x - 0.5, q.y - 0.5, q.x + 0.5, q.y + 0.5); }
      }
    }
  }
  // signposts at the main/feature fork
  const sign = (x, z, items) => { const X = F(x), Z = F(z), y = gy(x, z); m.box(X, y, Z, X, y + 8, Z, C.timberL);
    items.forEach(([dx, col], i) => { for (let k = 1; k <= 4; k++) m.set(X + dx * k, y + 7 - i * 2, Z, col); m.set(X + dx * 5, y + 7 - i * 2, Z, col); }); };
  sign(-29, -2.5, [[1, 0x24292F], [-1, 0x2EA043]]);
  sign(15, -1, [[1, 0x24292F]]);
  // fences + fields
  const fence = (x0, z0, x1, z1) => {
    for (let X = F(x0); X <= F(x1); X++) for (const Z of [F(z0), F(z1)]) { const y = gy(X / 2, Z / 2); if (X % 4 === 0) m.box(X, y, Z, X, y + 3, Z, C.wood); m.set(X, y + 2, Z, C.timberL); }
    for (let Z = F(z0); Z <= F(z1); Z++) for (const X of [F(x0), F(x1)]) { const y = gy(X / 2, Z / 2); if (Z % 4 === 0) m.box(X, y, Z, X, y + 3, Z, C.wood); m.set(X, y + 2, Z, C.timberL); }
  };
  const field = (x0, z0, x1, z1, kind) => {
    for (let X = F(x0) + 1; X < F(x1); X++) for (let Z = F(z0) + 1; Z < F(z1); Z++) {
      const y = gy(X / 2, Z / 2), row = Z % 4;
      if (kind === 'wheat') { if (row < 3) { const hh = 2 + (hash3(X, 1, Z) < 0.5 ? 1 : 0); for (let k = 0; k < hh; k++) m.set(X, y + k, Z, k === hh - 1 ? (hash3(X, Z, 2) < 0.5 ? 0xE8C35A : 0xD9AE45) : 0xB8963C); } else m.set(X, y - 1, Z, 0x7A5A36); }
      else if (kind === 'crops') { if (row === 0) m.set(X, y - 1, Z, 0x6E4E2E); else if (row === 2 && X % 3 === 0) { m.set(X, y, Z, 0x4E8A3A); m.set(X, y + 1, Z, 0x6FB04A); if (hash3(X, Z, 9) < 0.15) m.set(X, y, Z, 0xE38B2E); } }
    }
    fence(x0, z0, x1, z1); this.block(x0, z0, x1, z1);
  };
  field(-35, 10, -25, 22, 'wheat'); field(-23, 10, -17, 22, 'crops'); field(-35, 25, -22, 33, 'crops');
  field(35, 12, 46, 24, 'wheat'); field(-58, 22, -47, 30, 'wheat');
  fence(17, 22, 32, 34); this.block(17, 22, 32, 34);
  this.pasture = [18, 23, 31, 33];
  // hay bales, barrels, crates and rocks
  for (const [x, z] of [[33, 26], [35, 27], [-19, 25], [-56, 18], [47, 18]]) { const X = F(x), Z = F(z), y = gy(x, z); m.box(X, y, Z, X + 2, y + 2, Z + 3, (a, b, c) => (c % 2 ? 0xE0BE5C : 0xCDA94B)); }
  // flowers / tufts / rocks across grass
  for (let i = 0; i < 2600; i++) {
    const x = rr(-80, 80), z = rr(-55, 55), h = this.h(x, z);
    if (h < 3 || this.isBlocked(x, z) || islandE(x, z) > 0.92 || Math.abs(x - riverX(z)) < 6) continue;
    const X = F(x), Z = F(z), y = h * 2, r = rand();
    if (r < 0.55) m.set(X, y, Z, pick([0x5E9A3E, 0x74AE4A, 0x86BC55]));
    else if (r < 0.9) { m.set(X, y, Z, 0x4E8A3A); m.set(X, y + 1, Z, pick([0xE04B5A, 0xF6D04D, 0xFFFFFF, 0xC45AD8, 0x6FA8F5, 0xF29C38])); }
    else { m.box(X, y, Z, X + ri(0, 2), y + ri(0, 1), Z + ri(0, 2), stoneFn); }
  }
  // reeds on river banks
  for (let z = -50; z < 50; z += 0.7) for (const s of [-1, 1]) {
    if (hash3(Math.round(z * 10), s, 3) > 0.35) continue;
    const x = riverX(z) + s * rr(4.4, 5.2); if (this.isBlocked(x, z) || this.h(x, z) < 2) continue;
    const X = F(x), Z = F(z), y = Math.round(this.groundY(x, z) * 2); const hh = ri(2, 4);
    for (let k = 0; k < hh; k++) m.set(X, y + k, Z, k === hh - 1 ? 0x8A6A3A : 0x5E8C3A);
  }
  scene.add(m.build({ scale: 0.5 }));
};

World.buildTrees = function (scene) {
  const m = new VoxelModel();
  const leaf = (pal) => (x, y, z) => pal[Math.floor(clamp(hash3(x, y, z) * 0.6 + (y % 7) / 14, 0, 0.999) * pal.length)];
  const OAK = [0x3E7A36, 0x4B8A3C, 0x5A9A42, 0x6DAA4B], PINE = [0x24503A, 0x2F5E40, 0x3A6C47], BIRCH = [0x7FB04A, 0x92BE52, 0xA6C95C], AUT = [0xC8642E, 0xD98A2E, 0xB54A2A, 0xE2B13C];
  const tree = (x, z, type) => {
    const y = this.h(x, z);
    if (type === 'oak' || type === 'autumn') {
      const th = ri(3, 5);
      m.box(x, y, z, x, y + th, z, 0x5E4026);
      const pal = type === 'autumn' ? AUT : OAK, r = rr(2.2, 3.4);
      m.sphere(x, y + th + 1, z, r, leaf(pal), 1.3, 0.85);
      if (rand() < 0.6) m.sphere(x + ri(-2, 2), y + th, z + ri(-2, 2), r * 0.7, leaf(pal), 1.2);
    } else if (type === 'pine') {
      const th = ri(7, 10);
      m.box(x, y, z, x, y + 2, z, 0x4E3520);
      for (let k = 0; k < th; k++) { const r = (1 - k / th) * 3.3 + (k % 2 ? 0 : 0.6); for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) if (Math.hypot(a, b) <= r) m.set(x + a, y + 2 + k, z + b, leaf(PINE)); }
      m.set(x, y + 2 + th, z, PINE[0]);
    } else if (type === 'birch') {
      const th = ri(4, 6);
      m.box(x, y, z, x, y + th, z, (a, b) => (hash3(a, b, 5) < 0.25 ? 0x3A3A3A : 0xEDEBE4));
      m.sphere(x, y + th + 1, z, rr(1.8, 2.4), leaf(BIRCH), 1, 1.4);
    } else { m.sphere(x, y, z, rr(1, 1.7), leaf(OAK), 0.8, 0.8); }
  };
  let n = 0;
  for (let i = 0; i < 9000 && n < 330; i++) {
    const x = Math.round(rr(-82, 84)), z = Math.round(rr(-56, 56)), h = this.h(x, z), e = islandE(x, z);
    if (h < 3 || e > 0.9 || Math.abs(x - riverX(z)) < 7) continue;
    let ok = true;
    for (let a = -3; a <= 3 && ok; a++) for (let b = -3; b <= 3; b++) if (this.isBlocked(x + a, z + b)) { ok = false; break; }
    if (!ok) continue;
    const dens = fbm(x * 0.05 + 50, z * 0.05);
    if (dens < 0.5 && rand() > 0.08) continue;
    const type = h >= 6 || dens > 0.68 ? (rand() < 0.75 ? 'pine' : 'oak') : rand() < 0.12 ? 'autumn' : rand() < 0.2 ? 'birch' : rand() < 0.2 ? 'bush' : 'oak';
    tree(x, z, type); this.block(x - 2, z - 2, x + 2, z + 2); n++;
  }
  // a few handpicked trees in the village
  [[-44, 18, 'oak'], [-28, 14, 'birch'], [-58, -14, 'oak'], [-22, -22, 'autumn'], [2, 18, 'oak'], [16, 18, 'birch'], [36, -14, 'pine'], [-6, 12, 'bush'], [-4, -10, 'bush'], [20, -16, 'oak']]
    .forEach(([x, z, t]) => { if (!this.isBlocked(x, z)) tree(x, z, t); });
  scene.add(m.build({ jitter: 0.1 }));
};

// ---------------- characters ----------------
function partModel(fn, scale, pivot) { const m = new VoxelModel(); fn(m); return m.build({ scale, ox: pivot[0], oy: pivot[1], oz: pivot[2], jitter: 0.03 }); }
function makeVillager(o = {}) {
  const S = 0.21, skin = o.skin || 0xE8B48A, shirt = o.shirt || 0x3E6E9E, pants = o.pants || 0x4A3A2A, hair = o.hair || 0x4A2F1A;
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const leg = () => partModel(m => { m.box(0, -6, 0, 1, -1, 1, pants); m.box(0, -6, 0, 1, -6, 1, 0x2A1E14); }, S, [1, 0, 1]);
  const arm = () => partModel(m => { m.box(0, -5, 0, 1, -1, 1, shirt); m.box(0, -6, 0, 1, -6, 1, skin); }, S, [1, 0, 1]);
  const L = leg(), R = leg(); L.position.set(-0.21, 6 * S, 0); R.position.set(0.21, 6 * S, 0);
  const torso = partModel(m => { m.box(-2, 0, -1, 1, 5, 0, shirt); m.box(-2, 0, -1, 1, 0, 0, 0x3A2A1A); if (o.apron) m.box(-1, 0, 0, 0, 3, 0, o.apron); }, S, [0, 0, 0]);
  torso.position.set(0, 6 * S, 0.0);
  const head = partModel(m => {
    m.box(-2, 0, -2, 1, 3, 1, skin); m.box(-2, 3, -2, 1, 4, 1, hair); m.box(-2, 1, -2, 1, 3, -2, hair);
    m.set(-1, 2, 1, 0x222222); m.set(0, 2, 1, 0x222222); m.set(-1, 1, 2, 0xD99A76);
    if (o.long) { m.box(-2, 0, -2, -2, 3, 0, hair); m.box(1, 0, -2, 1, 3, 0, hair); }
    if (o.hat) { m.box(-3, 5, -3, 2, 5, 2, o.hat); m.box(-2, 6, -2, 1, 6, 1, o.hat); }
  }, S, [0, 0, 0]);
  head.position.set(0, 12 * S, 0);
  const la = arm(), ra = arm(); la.position.set(-0.63, 11.5 * S, 0); ra.position.set(0.63, 11.5 * S, 0);
  body.add(L, R, torso, head, la, ra);
  g.userData = { L, R, la, ra, head, body, phase: rand() * 10, moving: false, carry: null };
  g.traverse(o2 => { if (o2.isMesh) o2.castShadow = true; });
  return g;
}
function makeHorseCart() {
  const S = 0.25, g = new THREE.Group();
  const horse = partModel(m => {
    const B = 0x8A5A34, D = 0x3A2616;
    m.box(-2, 6, -5, 1, 9, 4, B);
    for (const [x, z] of [[-2, -5], [1, -5], [-2, 3], [1, 3]]) m.box(x, 0, z, x, 5, z + 1, (a, y) => (y < 1 ? D : B));
    m.box(-1, 9, 3, 0, 13, 5, B); m.box(-1, 12, 5, 0, 13, 8, B); m.set(-1, 12, 8, D); m.set(0, 12, 8, D);
    m.box(-1, 10, 2, 0, 14, 2, D); m.box(-1, 14, 3, 0, 14, 4, D); m.box(-1, 5, -7, 0, 9, -6, D);
  }, S, [0, 0, 0]);
  const cart = partModel(m => {
    m.box(-4, 4, -16, 3, 4, -7, C.plank); m.box(-4, 5, -16, 3, 6, -16, C.wood); m.box(-4, 5, -16, -4, 6, -7, C.wood); m.box(3, 5, -16, 3, 6, -7, C.wood);
    for (const x of [-5, 4]) for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (Math.abs(a) + Math.abs(b) <= 3) m.set(x, 3 + a, -11 + b, (a === 0 && b === 0) ? C.iron : (Math.abs(a) + Math.abs(b) >= 2 ? 0x4A3020 : C.wood));
    m.box(-2, 5, -7, -2, 5, -1, C.wood); m.box(1, 5, -7, 1, 5, -1, C.wood);
  }, S, [0, 0, 0]);
  g.add(horse, cart);
  const load = new THREE.Group(); load.position.set(0, 1.4, -2.9); g.add(load);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { horse, load, phase: 0, moving: false, cart: true };
  return g;
}
const _crateCache = {};
function makeCrate(col, small) {
  const key = col + (small ? 's' : '');
  if (!_crateCache[key]) {
    const m = new VoxelModel();
    if (small === 'parcel') { m.box(0, 0, 0, 3, 2, 3, (x, y, z) => ((x === 1 || z === 2) ? col : 0xC9A06A)); m.box(1, 3, 1, 2, 3, 2, col); }
    else if (small === 'scroll') { m.box(0, 0, 0, 3, 0, 4, 0xF3E7C9); m.box(1, 0, 1, 2, 0, 1, col); m.box(1, 0, 3, 2, 0, 3, 0xB8A580); m.box(0, 1, 0, 3, 1, 0, 0xD9C9A2); }
    else { m.box(0, 0, 0, 4, 4, 4, (x, y, z) => ((x % 4 === 0 && y % 4 === 0) || (x % 4 === 0 && z % 4 === 0) || (y % 4 === 0 && z % 4 === 0) ? 0x6E4A26 : ((y % 2) ? C.plank : 0x9A6838))); m.box(1, 1, 5, 3, 3, 5, col); m.set(2, 2, 6, col); }
    _crateCache[key] = m.build({ scale: small === 'scroll' ? 0.22 : 0.24, ox: small === 'scroll' ? 2 : 2.5, oz: small === 'scroll' ? 2.5 : 2.5 });
  }
  const g = _crateCache[key].clone();
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function makeShip() {
  const m = new VoxelModel();
  for (let x = -16; x <= 16; x++) {
    const t = Math.abs(x) / 16, hw = Math.round(5.5 * Math.sqrt(1 - t * t * t)), bottom = Math.round(t * t * 4);
    for (let z = -hw; z <= hw; z++) for (let y = bottom; y <= 7; y++) {
      const edge = Math.abs(z) === hw || y === bottom;
      if (edge || y === 6) m.set(x, y, z, y === 7 ? 0x5C3A1E : y >= 5 ? 0x2E5A7A : (y % 2 ? 0x6E4524 : 0x7E5230));
    }
    for (let z = -hw; z <= hw; z++) if (Math.abs(z) === hw) m.set(x, 8, z, 0x5C3A1E);
  }
  m.box(10, 8, -3, 15, 11, 3, 0x7E5230); m.box(11, 12, -3, 15, 12, 3, 0x5C3A1E);
  for (const [mx, h] of [[-6, 30], [4, 26]]) {
    m.box(mx, 7, 0, mx, h, 0, C.timber);
    for (let y = 12; y < h - 2; y++) { const w = Math.round(6 - (y - 12) * 0.12); for (let z = -w; z <= w; z++) m.set(mx + 1, y, z, (y % 6 === 0) ? 0xDAD2BE : 0xF4EEDC); }
    m.box(mx, h - 1, 0, mx + 4, h - 1, 0, (x) => 0x2EA043);
  }
  m.box(-20, 8, 0, -17, 8, 0, C.timber);
  const g = m.build({ scale: 0.4 });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------- movement over the road graph ----------------
World.nearestNode = function (x, z) {
  let best = null, bd = 1e9;
  for (const [k, v] of Object.entries(this.nodes)) { const d = Math.hypot(v.x - x, v.y - z); if (d < bd) { bd = d; best = k; } }
  return best;
};
World.route = function (from, to) {
  const dist = { [from]: 0 }, prev = {}, Q = new Set(Object.keys(this.nodes));
  while (Q.size) {
    let u = null, ud = Infinity;
    for (const q of Q) if ((dist[q] ?? Infinity) < ud) { ud = dist[q]; u = q; }
    if (u === null || u === to) break;
    Q.delete(u);
    for (const v of this.adj[u] || []) { const nd = ud + this.nodes[u].distanceTo(this.nodes[v]); if (nd < (dist[v] ?? Infinity)) { dist[v] = nd; prev[v] = u; } }
  }
  const path = [to]; let c = to; while (prev[c]) { c = prev[c]; path.unshift(c); }
  return path;
};
World.pathPoints = function (names) {
  const pts = [];
  for (let i = 0; i < names.length; i++) {
    const a = this.nodes[names[i]];
    if (i === 0) pts.push(a.clone());
    else {
      const p = this.nodes[names[i - 1]], L = p.distanceTo(a), n = Math.max(1, Math.ceil(L / 1.5));
      for (let k = 1; k <= n; k++) pts.push(p.clone().lerp(a, k / n));
    }
  }
  return pts;
};
/** Move an agent along roads to a node (or [x,z] after it). Returns a promise. */
World.goTo = function (agent, target, opts = {}) {
  const from = this.nearestNode(agent.position.x, agent.position.z);
  const names = this.route(from, target);
  const pts = this.pathPoints(names);
  pts.unshift(new THREE.Vector2(agent.position.x, agent.position.z));
  if (opts.end) pts.push(new THREE.Vector2(opts.end.x, opts.end.z ?? opts.end.y));
  return this.follow(agent, pts, opts.speed || 6);
};
World.follow = function (agent, pts, speed) {
  return new Promise(res => {
    if (agent.userData.mover) { const i = this.movers.indexOf(agent.userData.mover); if (i >= 0) { this.movers.splice(i, 1); agent.userData.mover.res(); } }
    const mv = { agent, pts, i: 1, speed, res }; agent.userData.mover = mv; agent.userData.moving = true; this.movers.push(mv);
  });
};
World.updateMovers = function (dt) {
  for (let k = this.movers.length - 1; k >= 0; k--) {
    const mv = this.movers[k], a = mv.agent;
    let step = mv.speed * dt;
    while (step > 0 && mv.i < mv.pts.length) {
      const t = mv.pts[mv.i], dx = t.x - a.position.x, dz = t.y - a.position.z, d = Math.hypot(dx, dz);
      if (d <= step) { a.position.x = t.x; a.position.z = t.y; step -= d; mv.i++; }
      else { a.position.x += dx / d * step; a.position.z += dz / d * step; step = 0;
        const want = Math.atan2(dx, dz); let diff = want - a.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); a.rotation.y += diff * Math.min(1, dt * 10); }
    }
    const gy = this.groundY(a.position.x, a.position.z);
    a.position.y = lerp(a.position.y, gy, Math.min(1, dt * 12));
    if (mv.i >= mv.pts.length) { this.movers.splice(k, 1); a.userData.moving = false; a.userData.mover = null; mv.res(); }
  }
};
World.animateAgent = function (a, dt, t) {
  const u = a.userData;
  if (u.cart) { if (u.moving) u.phase += dt * 10; u.horse.position.y = u.moving ? Math.abs(Math.sin(u.phase)) * 0.12 : 0; return; }
  const sp = u.moving ? 9 : 0;
  u.phase += dt * sp;
  const s = u.moving ? Math.sin(u.phase) * 0.7 : 0;
  u.L.rotation.x = s; u.R.rotation.x = -s;
  u.la.rotation.x = u.carry ? -1.2 : -s * 0.8; u.ra.rotation.x = u.carry ? -1.2 : s * 0.8;
  u.body.position.y = u.moving ? Math.abs(Math.cos(u.phase)) * 0.08 : (u.jump || 0);
  u.head.rotation.y = u.moving ? 0 : Math.sin(t * 0.7 + u.phase) * 0.3;
};

// ---------------- ambient life ----------------
World.buildLife = function (scene) {
  this.npcs = [];
  const looks = [
    { shirt: 0xB5533A, hat: 0xD9B45A }, { shirt: 0x4E8A4A, hair: 0x2A1A10, long: true }, { shirt: 0x8C5AB8, apron: 0xEDE3CC },
    { shirt: 0xD98A2E, hair: 0xC9A15A }, { shirt: 0x5A6878, hat: 0x6A3D1E }, { shirt: 0xC45A7A, long: true, hair: 0x6A2A10 },
    { shirt: 0x3E8A8A }, { shirt: 0x9A8A6A, hat: 0xD9B45A, skin: 0xB07A52 },
  ];
  const wanderNodes = Object.keys(this.nodes).filter(n => !n.startsWith('S6') && !n.startsWith('b'));
  looks.forEach((lk, i) => {
    const v = makeVillager(lk); const n = this.nodes[pick(wanderNodes)];
    v.position.set(n.x, this.groundY(n.x, n.y), n.y); scene.add(v);
    v.userData.wait = rr(0, 4); this.npcs.push(v);
  });
  this.wanderNodes = wanderNodes;
  // sheep
  this.sheep = [];
  const [x0, z0, x1, z1] = this.pasture;
  for (let i = 0; i < 7; i++) {
    const s = partModel(m => { m.box(-2, 2, -3, 1, 5, 3, 0xF2EFE6); m.box(-1, 3, 3, 0, 5, 5, 0x3A3530); for (const [x, z] of [[-2, -3], [1, -3], [-2, 2], [1, 2]]) m.box(x, 0, z, x, 1, z, 0x3A3530); }, 0.22, [0, 0, 0]);
    s.position.set(rr(x0 + 1, x1 - 1), 3, rr(z0 + 1, z1 - 1)); s.rotation.y = rr(0, 6);
    s.traverse(o => { if (o.isMesh) o.castShadow = true; });
    s.userData = { tx: s.position.x, tz: s.position.z, wait: rr(0, 5) }; scene.add(s); this.sheep.push(s);
  }
  // clouds
  this.clouds = [];
  this.cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const m = new VoxelModel(), n = ri(3, 6);
    for (let k = 0; k < n; k++) m.sphere(ri(-6, 6), ri(0, 2), ri(-3, 3), rr(2, 3.6), (x, y) => (y < 1 ? 0xDCE3EA : 0xFFFFFF), 0.8, 0.6);
    const g = m.build({ jitter: 0.02, cast: true });
    g.children[0].material = this.cloudMat;
    g.children[0].receiveShadow = false;
    g.position.set(rr(-140, 140), rr(112, 128), rr(-110, 110)); g.scale.setScalar(rr(1.4, 2.2));
    scene.add(g); this.clouds.push(g);
  }
  // birds
  this.birds = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: 0x2A2A30 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.7), mat);
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.35), mat), w2 = w1.clone();
    w1.geometry = w1.geometry.clone(); w1.geometry.translate(0.45, 0, 0); w2.geometry = w1.geometry.clone(); w2.geometry.translate(-0.9, 0, 0);
    b.add(body, w1, w2); b.userData = { w1, w2, r: rr(20, 60), cx: rr(-40, 40), cz: rr(-30, 30), h: rr(22, 32), sp: rr(0.15, 0.3) * (rand() < 0.5 ? 1 : -1), ph: rr(0, 6) };
    scene.add(b); this.birds.push(b);
  }
  // ship at harbour
  this.ship = makeShip();
  this.shipHome = new THREE.Vector3(91, SEA - 0.3, 7.6);
  this.ship.position.copy(this.shipHome); this.ship.rotation.y = Math.PI;
  scene.add(this.ship);
  // a small fishing boat
  this.boat = partModel(m => { m.box(-4, 0, -1, 4, 1, 1, 0x7E5230); m.box(-3, 2, 0, -3, 2, 0, 0x5C3A1E); m.box(0, 2, 0, 0, 9, 0, C.timber); m.box(1, 4, 0, 4, 8, 0, 0xF4EEDC); }, 0.4, [0, 0, 0]);
  scene.add(this.boat);
};

World.update = function (dt, t, night) {
  // water waves
  const pos = this.water.geometry.attributes.position, b = this.waterBase;
  for (let i = 0; i < pos.count; i++) {
    const x = b[i * 3], z = b[i * 3 + 2];
    pos.array[i * 3 + 1] = Math.sin(x * 0.35 + t * 1.3) * 0.09 + Math.cos(z * 0.42 + t * 1.1) * 0.08 + Math.sin((x + z) * 0.9 + t * 2.2) * 0.03;
  }
  pos.needsUpdate = true; this.water.geometry.computeVertexNormals();
  this.sails.rotation.z -= dt * this.sailSpeed;
  this.updateMovers(dt);
  // npcs wander
  for (const v of this.npcs) {
    this.animateAgent(v, dt, t);
    if (!v.userData.moving) {
      v.userData.wait -= dt;
      if (v.userData.wait < 0) { v.userData.wait = rr(3, 9); this.goTo(v, pick(this.wanderNodes), { speed: rr(2.4, 3.4) }); }
    }
  }
  for (const s of this.sheep) {
    const u = s.userData, dx = u.tx - s.position.x, dz = u.tz - s.position.z, d = Math.hypot(dx, dz);
    if (d > 0.1) { s.position.x += dx / d * dt * 0.8; s.position.z += dz / d * dt * 0.8; s.rotation.y = Math.atan2(dx, dz); s.position.y = this.groundY(s.position.x, s.position.z) + Math.abs(Math.sin(t * 8)) * 0.06; }
    else if ((u.wait -= dt) < 0) { const [x0, z0, x1, z1] = this.pasture; u.tx = rr(x0 + 1, x1 - 1); u.tz = rr(z0 + 1, z1 - 1); u.wait = rr(3, 10); }
  }
  for (const c of this.clouds) { c.position.x += dt * 1.2; if (c.position.x > 160) c.position.x = -160; }
  this.cloudMat.opacity = clamp((108 - camera.position.y) / 30, 0, 0.92);
  for (const c of this.clouds) c.visible = this.cloudMat.opacity > 0.02;
  for (const b of this.birds) {
    const u = b.userData, a = t * u.sp + u.ph;
    b.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.ph) * 2, u.cz + Math.sin(a) * u.r);
    b.rotation.y = -a + (u.sp > 0 ? 0 : Math.PI);
    const f = Math.sin(t * 12 + u.ph) * 0.6; u.w1.rotation.z = f; u.w2.rotation.z = -f;
  }
  if (!this.shipSailing) { this.ship.position.y = this.shipHome.y + Math.sin(t * 1.2) * 0.12; this.ship.rotation.z = Math.sin(t * 0.9) * 0.025; }
  const ba = t * 0.04;
  this.boat.position.set(-30 + Math.cos(ba) * 70, SEA - 0.1 + Math.sin(t * 1.5) * 0.1, 66 + Math.sin(ba) * 6);
  this.boat.rotation.y = -ba + Math.PI;
  this.lighthouseLight.intensity = night * 2.5;
};

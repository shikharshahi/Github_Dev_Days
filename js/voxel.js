/* Commit Village — voxel engine: mesher (culling + AO), noise, tweens, particles */
'use strict';

// ---------- seeded random + value noise ----------
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry(1337);
const rr = (a, b) => a + rand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(rand() * arr.length)];

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const s = t => t * t * (3 - 2 * t);
  const a = hash3(xi, 0, zi), b = hash3(xi + 1, 0, zi), c = hash3(xi, 0, zi + 1), d = hash3(xi + 1, 0, zi + 1);
  const u = s(xf), v = s(zf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); f *= 2; a *= 0.5; }
  return s / (1 - Math.pow(0.5, oct));
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

// ---------- Voxel model ----------
const _col = new THREE.Color();
class VoxelModel {
  constructor() { this.m = new Map(); this.g = new Map(); }
  static key(x, y, z) { return x + ',' + y + ',' + z; }
  set(x, y, z, col, glow) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (typeof col === 'function') col = col(x, y, z);
    const k = x + ',' + y + ',' + z;
    if (col == null) { this.m.delete(k); this.g.delete(k); return; }
    if (glow) { this.g.set(k, col); this.m.delete(k); } else { this.m.set(k, col); this.g.delete(k); }
  }
  has(x, y, z) { const k = x + ',' + y + ',' + z; return this.m.has(k) || this.g.has(k); }
  get(x, y, z) { const k = x + ',' + y + ',' + z; return this.m.get(k) ?? this.g.get(k); }
  box(x0, y0, z0, x1, y1, z1, col, glow) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
          this.set(x, y, z, typeof col === 'function' ? col(x, y, z) : col, glow);
  }
  hollow(x0, y0, z0, x1, y1, z1, col) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
      if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, typeof col === 'function' ? col(x, y, z) : col);
  }
  sphere(cx, cy, cz, r, col, rough = 0, sy = 1) {
    const R = Math.ceil(r + 1);
    for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) {
      const d = Math.sqrt(x * x + (y / sy) * (y / sy) + z * z) + (rough ? (hash3(cx + x, cy + y, cz + z) - 0.5) * rough : 0);
      if (d <= r) this.set(cx + x, cy + y, cz + z, typeof col === 'function' ? col(cx + x, cy + y, cz + z) : col);
    }
  }
  // stepped gable roof, ridge along X; covers x0..x1, z0..z1 footprint starting at height y
  gable(x0, z0, x1, z1, y, col, ridgeCol, over = 1, wallCol) {
    const depth = z1 - z0;
    for (let i = 0; ; i++) {
      const za = z0 - over + i, zb = z1 + over - i;
      if (za > zb) break;
      const top = za + 1 >= zb;
      for (let x = x0 - over; x <= x1 + over; x++) {
        this.set(x, y + i, za, top ? ridgeCol : col);
        this.set(x, y + i, zb, top ? ridgeCol : col);
      }
      // gable end walls
      if (wallCol) for (let z = za + 1; z < zb; z++) { this.set(x0, y + i, z, wallCol); this.set(x1, y + i, z, wallCol); }
      if (i > depth + 4) break;
    }
  }
  // hip/pyramid roof
  hip(x0, z0, x1, z1, y, col, ridgeCol, over = 1) {
    for (let i = 0; ; i++) {
      const xa = x0 - over + i, xb = x1 + over - i, za = z0 - over + i, zb = z1 + over - i;
      if (xa > xb || za > zb) break;
      const top = (xa + 1 >= xb) || (za + 1 >= zb);
      for (let x = xa; x <= xb; x++) for (let z = za; z <= zb; z++)
        if (top || x === xa || x === xb || z === za || z === zb) this.set(x, y + i, z, top ? ridgeCol : col);
    }
  }

  /** Build meshes. Voxel (x,y,z) occupies [x,x+1]x[y,y+1]x[z,z+1] scaled by s, shifted by -(ox,0,oz). */
  build(opts = {}) {
    const s = opts.scale ?? 1, ox = opts.ox ?? 0, oy = opts.oy ?? 0, oz = opts.oz ?? 0, jit = opts.jitter ?? 0.07;
    const group = new THREE.Group();
    const mats = [opts.material || VX.mat, VX.glowMat];
    [this.m, this.g].forEach((map, li) => {
      if (!map.size) return;
      const pos = [], nor = [], col = [], idx = [];
      const occ = (x, y, z) => this.has(x, y, z);
      for (const [k, c] of map) {
        const [x, y, z] = k.split(',').map(Number);
        _col.set(c);
        const j = 1 + (hash3(x, y, z) - 0.5) * 2 * jit;
        const r = _col.r * j, g = _col.g * j, b = _col.b * j;
        for (const F of FACES) {
          const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
          if (occ(nx, ny, nz)) continue;
          const base = pos.length / 3, ao = [];
          for (const [a, bb] of CORNERS) {
            const s1 = occ(nx + F.u[0] * a, ny + F.u[1] * a, nz + F.u[2] * a) ? 1 : 0;
            const s2 = occ(nx + F.v[0] * bb, ny + F.v[1] * bb, nz + F.v[2] * bb) ? 1 : 0;
            const cr = occ(nx + F.u[0] * a + F.v[0] * bb, ny + F.u[1] * a + F.v[1] * bb, nz + F.u[2] * a + F.v[2] * bb) ? 1 : 0;
            const o = (s1 && s2) ? 0 : 3 - (s1 + s2 + cr);
            ao.push(o);
            const shade = li ? 1 : AO_CURVE[o] * F.shade;
            const px = x + 0.5 + F.n[0] * 0.5 + (F.u[0] * a + F.v[0] * bb) * 0.5;
            const py = y + 0.5 + F.n[1] * 0.5 + (F.u[1] * a + F.v[1] * bb) * 0.5;
            const pz = z + 0.5 + F.n[2] * 0.5 + (F.u[2] * a + F.v[2] * bb) * 0.5;
            pos.push((px - ox) * s, (py - oy) * s, (pz - oz) * s);
            nor.push(F.n[0], F.n[1], F.n[2]);
            col.push(r * shade, g * shade, b * shade);
          }
          if (ao[0] + ao[2] >= ao[1] + ao[3]) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          else idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mats[li]);
      if (!li) { mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true; }
      group.add(mesh);
    });
    return group;
  }
}
const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], shade: 0.9 },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.9 },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], shade: 1.0 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.65 },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.95 },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], shade: 0.85 },
];

const VX = {
  mat: new THREE.MeshLambertMaterial({ vertexColors: true }),
  glowMat: new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x8899aa }),
};

// ---------- tweens (promise based) ----------
const Tween = {
  list: [], time: 0,
  add(dur, fn, ease = smooth) {
    return new Promise(res => this.list.push({ t: 0, dur, fn, ease, res }));
  },
  wait(sec) { return this.add(sec, () => {}, t => t); },
  update(dt) {
    this.time += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.ease(k), k);
      if (k >= 1) { this.list.splice(i, 1); tw.res(); }
    }
  },
};

// ---------- particles (instanced cubes) ----------
class Particles {
  constructor(scene, max = 1500) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.max = max; this.p = []; this.dummy = new THREE.Object3D();
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.c = new THREE.Color();
  }
  emit(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push({
      x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      life: o.life || 1, age: 0, size: o.size || 0.3, grow: o.grow || 0, g: o.g ?? 0, drag: o.drag ?? 0.98,
      color: new THREE.Color(o.color ?? 0xffffff), fade: o.fade ?? true, spin: rr(-3, 3),
    });
  }
  burst(x, y, z, n, color, spd = 6, opt = {}) {
    for (let i = 0; i < n; i++) {
      const th = rand() * Math.PI * 2, ph = Math.acos(rr(-1, 1)), s = spd * rr(0.5, 1);
      this.emit(Object.assign({
        x, y, z, vx: Math.sin(ph) * Math.cos(th) * s, vy: Math.cos(ph) * s + (opt.up || 0), vz: Math.sin(ph) * Math.sin(th) * s,
        life: rr(0.8, 1.6), size: rr(0.2, 0.45), g: -9, color: Array.isArray(color) ? pick(color) : color,
      }, opt));
    }
  }
  update(dt) {
    const d = this.dummy;
    let n = 0;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.age += dt;
      if (q.age >= q.life) { this.p.splice(i, 1); continue; }
      q.vy += q.g * dt; q.vx *= q.drag; q.vy *= q.drag; q.vz *= q.drag;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    }
    for (const q of this.p) {
      const k = q.age / q.life;
      const sz = Math.max(0.01, (q.size + q.grow * q.age) * (q.fade ? (1 - k * k) : 1));
      d.position.set(q.x, q.y, q.z); d.scale.setScalar(sz);
      d.rotation.set(q.age * q.spin, q.age * q.spin * 0.7, 0);
      d.updateMatrix();
      this.mesh.setMatrixAt(n, d.matrix);
      this.mesh.setColorAt(n, q.color);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ---------- tiny sound kit (WebAudio) ----------
const Sfx = {
  ctx: null, on: true,
  init() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } },
  tone(f, d = 0.12, type = 'sine', vol = 0.08, slide = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d + 0.02);
  },
  click() { this.tone(660, 0.06, 'triangle', 0.05); },
  good() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.07), i * 90)); },
  bad() { this.tone(220, 0.35, 'sawtooth', 0.05, 0.6); setTimeout(() => this.tone(180, 0.4, 'sawtooth', 0.05, 0.6), 160); },
  thud() { this.tone(110, 0.15, 'square', 0.05, 0.5); },
  chime() { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sine', 0.06), i * 110)); },
  pop() { this.tone(rr(500, 900), 0.08, 'sine', 0.05, 2); },
  hammer() { this.tone(1200, 0.05, 'square', 0.03, 0.3); },
};

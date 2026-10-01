/* Commit Village — renderer, sky & day/night, camera, input, main loop */
'use strict';

let renderer, scene, camera, sun, hemi, FX;
const SPEED = +(new URLSearchParams(location.search).get('speed') || 1); // ?speed=3 fast-forwards animations

// ---------------- Sky / day-night ----------------
const SKY_KEYS = [
  // hour, top, horizon, sunColor, sunInt, hemiInt, night
  [0, 0x050A1C, 0x101A38, 0x8FA6FF, 0.18, 0.22, 1],
  [5, 0x0B1430, 0x2A2C55, 0x8FA6FF, 0.2, 0.25, 1],
  [6.3, 0x3B5C9A, 0xF2A36B, 0xFFB070, 0.7, 0.45, 0.4],
  [8.5, 0x5FA2E0, 0xBFE0F2, 0xFFF1DA, 1.35, 0.75, 0],
  [15, 0x5FA2E0, 0xC6E3F0, 0xFFF1DA, 1.35, 0.75, 0],
  [17.3, 0x6A8FCC, 0xF7C58C, 0xFFC27A, 1.15, 0.65, 0],
  [18.6, 0x3F4C8A, 0xF0855A, 0xFF8A4A, 0.75, 0.45, 0.35],
  [19.8, 0x141C40, 0x3A3260, 0x8FA6FF, 0.25, 0.28, 0.9],
  [24, 0x050A1C, 0x101A38, 0x8FA6FF, 0.18, 0.22, 1],
];
const Sky = {
  time: 16.6, auto: true, night: 0,
  init() {
    const geo = new THREE.SphereGeometry(450, 32, 16);
    this.u = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } };
    this.dome = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vp; void main(){ float h = clamp(vp.y*1.6+0.05,0.0,1.0); gl_FragColor = vec4(mix(hor, top, pow(h,0.7)),1.0); }',
    }));
    scene.add(this.dome);
    const sp = [];
    for (let i = 0; i < 900; i++) { const th = rr(0, Math.PI * 2), ph = Math.acos(rr(0.05, 1)); sp.push(Math.sin(ph) * Math.cos(th) * 430, Math.cos(ph) * 430, Math.sin(ph) * Math.sin(th) * 430); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
    scene.add(this.stars);
    this.sunDisc = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 18), new THREE.MeshBasicMaterial({ color: 0xFFE8B0, fog: false }));
    this.moon = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0xDDE6FF, fog: false }));
    scene.add(this.sunDisc, this.moon);
  },
  sample(h) {
    let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= h) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], k = smooth(clamp((h - a[0]) / (b[0] - a[0]), 0, 1));
    const c = (x, y) => new THREE.Color(x).lerp(new THREE.Color(y), k);
    return { top: c(a[1], b[1]), hor: c(a[2], b[2]), sun: c(a[3], b[3]), si: lerp(a[4], b[4], k), hi: lerp(a[5], b[5], k), night: lerp(a[6], b[6], k) };
  },
  update(dt, target) {
    if (this.auto) { this.time = (this.time + dt * 24 / 480) % 24; $('#time').value = this.time; }
    const s = this.sample(this.time);
    this.night = s.night;
    this.u.top.value.copy(s.top); this.u.hor.value.copy(s.hor);
    scene.fog.color.copy(s.hor);
    const ang = (this.time - 6) / 12 * Math.PI, day = Math.sin(ang) > -0.08;
    const dir = new THREE.Vector3(Math.cos(ang) * 0.8, Math.max(Math.sin(ang), 0.12), 0.45).normalize();
    const mdir = new THREE.Vector3(-Math.cos(ang) * 0.8, Math.max(-Math.sin(ang), 0.15), -0.3).normalize();
    const L = day ? dir : mdir;
    sun.position.copy(target).addScaledVector(L, 120); sun.target.position.copy(target); sun.target.updateMatrixWorld();
    sun.color.copy(s.sun); sun.intensity = s.si;
    hemi.intensity = s.hi; hemi.color.set(0xCFE3FF).lerp(new THREE.Color(0x4A5A8A), s.night); hemi.groundColor.set(0x6B5A3A).lerp(new THREE.Color(0x101420), s.night);
    this.sunDisc.position.copy(camera.position).addScaledVector(dir, 400); this.sunDisc.visible = Math.sin(ang) > -0.1; this.sunDisc.lookAt(camera.position);
    this.sunDisc.material.color.copy(s.sun).lerp(new THREE.Color(0xFFFFFF), 0.3);
    this.moon.position.copy(camera.position).addScaledVector(mdir, 400); this.moon.visible = s.night > 0.2; this.moon.lookAt(camera.position);
    this.dome.position.copy(camera.position); this.stars.position.copy(camera.position);
    this.stars.material.opacity = clamp(s.night * 1.2 - 0.1, 0, 1);
    VX.glowMat.color.setRGB(lerp(0.62, 1.15, s.night), lerp(0.68, 1.0, s.night), lerp(0.74, 0.85, s.night));
    const h = Math.floor(this.time), m = Math.floor((this.time % 1) * 60);
    $('#clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },
};

// ---------------- Camera ----------------
const Cam = {
  target: null, cinematic: true,
  init() {
    this.t = new THREE.Vector3(-5, 4, 0); this.yaw = 0.6; this.pitch = 0.72; this.dist = 120;
    this.T = this.t.clone(); this.Y = this.yaw; this.P = this.pitch; this.D = this.dist;
  },
  follow(obj) { this.target = obj; if (obj && this.cinematic) this.D = clamp(this.D, 18, 40); },
  focus(p, d, yaw, force) { if (!this.cinematic && !force) return; this.target = null; this.T.copy(p); if (d) this.D = d; if (yaw != null) this.Y = yaw; },
  update(dt) {
    if (this.target && this.cinematic) { const p = new THREE.Vector3(); this.target.getWorldPosition(p); this.T.lerp(p.setY(p.y + 1), Math.min(1, dt * 4)); }
    const k = Math.min(1, dt * 3.2);
    this.t.lerp(this.T, k); this.yaw += (this.Y - this.yaw) * k; this.pitch += (this.P - this.pitch) * k; this.dist += (this.D - this.dist) * k;
    const cp = Math.cos(this.pitch);
    camera.position.set(this.t.x + Math.sin(this.yaw) * cp * this.dist, this.t.y + Math.sin(this.pitch) * this.dist, this.t.z + Math.cos(this.yaw) * cp * this.dist);
    camera.lookAt(this.t);
  },
  pan(dx, dz) {
    this.target = null;
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.T.addScaledVector(r, dx).addScaledVector(f, dz);
    this.T.x = clamp(this.T.x, -95, 110); this.T.z = clamp(this.T.z, -70, 70);
    this.T.y = Math.max(World.groundY(this.T.x, this.T.z), 3) + 1;
  },
};

// ---------------- input ----------------
function initInput() {
  const el = renderer.domElement, ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let drag = null, moved = 0; const touches = new Map(); let pinch = 0;
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId); touches.set(e.pointerId, [e.clientX, e.clientY]);
    drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; moved = 0;
    if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); }
  });
  el.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) { const [a, b] = [...touches.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); Cam.D = clamp(Cam.D * pinch / d, 10, 220); pinch = d; moved = 99; return; }
    if (!drag) { hover(e); return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) Cam.pan(-dx * Cam.dist * 0.0016, -dy * Cam.dist * 0.0022);
    else { Cam.Y -= dx * 0.0055; Cam.P = clamp(Cam.P + dy * 0.004, 0.12, 1.45); }
  });
  const up = e => {
    touches.delete(e.pointerId);
    if (drag && moved < 6 && Game.mode !== 'title') {
      ptr.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(World.pickables, true)[0];
      if (hit && hit.object.userData.site) { Sfx.click(); UI.inspect(hit.object.userData.site); }
    }
    drag = null;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); Cam.D = clamp(Cam.D * (1 + Math.sign(e.deltaY) * 0.1), 10, 220); }, { passive: false });
  let lastHover = 0;
  function hover(e) {
    const now = performance.now(); if (now - lastHover < 60) return; lastHover = now;
    ptr.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(World.pickables, true)[0];
    el.style.cursor = hit ? 'pointer' : 'grab';
  }
  const keys = {};
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; keys[e.key.toLowerCase()] = true; if (e.key === '`' || e.key === '/') { e.preventDefault(); $('#term').classList.remove('min'); $('#term-in').focus(); } });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  Cam.keys = keys;
}
function keyPan(dt) {
  const k = Cam.keys, s = Cam.dist * 0.9 * dt;
  let dx = 0, dz = 0;
  if (k.w || k.arrowup) dz += s; if (k.s || k.arrowdown) dz -= s; if (k.a || k.arrowleft) dx -= s; if (k.d || k.arrowright) dx += s;
  if (dx || dz) Cam.pan(dx, dz);
  if (k.q) Cam.Y += dt * 1.4; if (k.e) Cam.Y -= dt * 1.4;
}

// ---------------- boot ----------------
function boot() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  document.getElementById('app').appendChild(renderer.domElement);
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xC6E3F0, 140, 330);
  camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 1200);
  hemi = new THREE.HemisphereLight(0xCFE3FF, 0x6B5A3A, 0.7); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xFFF1DA, 1.3);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 1; sc.far = 320;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  Sky.init(); Cam.init();
  FX = new Particles(scene, 2200);

  World.build(scene);
  Stage.init(scene);
  Beacon.init(scene);
  UI.init();
  Git.reset(); Stage.refresh();
  initInput();

  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  $('#loading').classList.add('hide');
  // demo links: ?mode=story&step=3&time=21&cam=x,z,dist,yaw,pitch&clean
  const Q = new URLSearchParams(location.search);
  if (Q.get('time')) { Sky.time = +Q.get('time'); Sky.auto = false; }
  if (Q.get('mode')) Game.start(Q.get('mode'));
  if (Q.get('step') && Game.mode === 'story') Game.goStep(+Q.get('step'));
  if (Q.get('cam')) {
    const [x, z, d, y, p] = Q.get('cam').split(',').map(Number);
    Cam.T.set(x, World.groundY(x, z) + 1, z); Cam.t.copy(Cam.T);
    Cam.D = Cam.dist = d; Cam.Y = Cam.yaw = y; Cam.P = Cam.pitch = p;
  }
  if (Q.has('clean')) document.body.classList.add('clean');
  const clock = new THREE.Clock(); let smokeT = 0;
  let simT = 0;
  // window.__frame(dt, false) lets tests step the simulation while the tab is hidden
  const frame = window.__frame = (rawDt, draw = true) => {
    const dt = Math.min(rawDt, 0.05) * SPEED, t = (simT += dt);
    if (Game.mode === 'title') { Cam.Y += dt * 0.05; }
    keyPan(dt);
    Tween.update(dt);
    Cam.update(dt);
    Sky.update(dt, Cam.t);
    World.update(dt, t, Sky.night);
    Stage.update(dt, t);
    Beacon.update(t);
    // chimney smoke & fireflies
    smokeT += dt;
    if (smokeT > 0.22) {
      smokeT = 0;
      const sc2 = new THREE.Color(0xBFBFBF).lerp(new THREE.Color(0x3A3F4A), Sky.night);
      for (const p of World.smokers) FX.emit({ x: p.x + rr(-0.2, 0.2), y: p.y, z: p.z + rr(-0.2, 0.2), vx: 0.5 + rr(-0.2, 0.2), vy: 1.4, vz: rr(-0.2, 0.2), life: 4, size: 0.35, grow: 0.35, color: sc2, drag: 0.995 });
      if (Sky.night > 0.5) for (let i = 0; i < 3; i++) { const x = rr(-70, 70), z = rr(-45, 45), h = World.h(x, z); if (h >= 3) FX.emit({ x, y: h + rr(0.5, 2.5), z, vx: rr(-0.4, 0.4), vy: rr(-0.1, 0.2), vz: rr(-0.4, 0.4), life: 4, size: 0.14, color: 0xD8FF6A, fade: true, drag: 1 }); }
    }
    FX.update(dt);
    if (!draw) return;
    renderer.render(scene, camera);
    UI.update(camera);
  };
  renderer.setAnimationLoop(() => frame(clock.getDelta()));
}
window.addEventListener('load', () => setTimeout(() => {
  try { boot(); } catch (e) { console.error(e); document.getElementById('loading').innerHTML = '<p>Something went wrong building the village:<br><code>' + e.message + '</code></p>'; }
}, 50));

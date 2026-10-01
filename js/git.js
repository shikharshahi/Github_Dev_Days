/* Commit Village — Git model + choreography (every command becomes a scene) */
'use strict';

const SEAL = { main: 0x2F81F7, feature: 0x2EA043, alice: 0xD6409F, merge: 0x8957E5, fix: 0xE3B341 };
const FILE_POOL = [
  ['index.html', 0xE34C26], ['style.css', 0x563D7C], ['app.js', 0xF1E05A], ['README.md', 0x2F81F7],
  ['lanterns.js', 0xF1E05A], ['map.json', 0x6E7781], ['login.js', 0xF1E05A], ['app.test.js', 0x2EA043],
];

const Git = {
  commits: {}, local: {}, remote: {}, tracking: {}, head: 'main', working: [], staged: [],
  pr: null, ci: { state: 'idle', stage: null, target: null }, nextCIFails: false, fileIx: 0, deploys: 0,

  reset() {
    this.commits = {}; this.working = []; this.staged = []; this.pr = null; this.fileIx = 0; this.deploys = 0;
    this.ci = { state: 'idle', stage: null, target: null }; this.head = 'main'; this.nextCIFails = false;
    const c0 = this.mk('Found the village', 'you', [], 'main', ['README.md']);
    this.local = { main: c0 }; this.remote = { main: c0 }; this.tracking = { main: c0 };
  },
  id() { let s = ''; for (let i = 0; i < 7; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)]; return s; },
  mk(msg, author, parents, branch, files) {
    const id = this.id();
    this.commits[id] = { id, msg, author, parents, branch, files: files || [], seal: author === 'alice' ? SEAL.alice : parents.length > 1 ? SEAL.merge : branch === 'main' ? SEAL.main : SEAL.feature, n: Object.keys(this.commits).length };
    return id;
  },
  reach(id) { const s = new Set(), st = id ? [id] : []; while (st.length) { const c = st.pop(); if (s.has(c)) continue; s.add(c); st.push(...this.commits[c].parents); } return s; },
  isAnc(a, b) { return !a || this.reach(b).has(a); },
  diff(a, b) { const A = this.reach(a), B = this.reach(b); return [...A].filter(x => !B.has(x)).length; },
  history(id) { return [...this.reach(id)].map(c => this.commits[c]).sort((a, b) => a.n - b.n); },
  aheadBehind(br) { const l = this.local[br], t = this.tracking[br]; if (!t) return [this.history(l).length, 0]; return [this.diff(l, t), this.diff(t, l)]; },
  isFeature(b) { return b !== 'main'; },
  newFiles(n) {
    const out = [];
    for (let i = 0; i < n; i++) { const f = FILE_POOL[this.fileIx++ % FILE_POOL.length]; if (!this.working.find(w => w[0] === f[0]) && !out.find(w => w[0] === f[0])) out.push(f); }
    return out;
  },
};

// ---------------- actors & visuals ----------------
const Stage = {
  crates: [], busy: false,
  init(scene) {
    this.scene = scene;
    const home = World.nodes['home.door'];
    this.you = makeVillager({ shirt: 0x2F81F7, hat: 0x24292F, pants: 0x30363D });
    this.you.position.set(home.x, World.groundY(home.x, home.y), home.y); scene.add(this.you);
    const ad = World.nodes['alice.door'];
    this.alice = makeVillager({ shirt: 0xD6409F, hair: 0x6A2A10, long: true, pants: 0x3A2A4A });
    this.alice.position.set(ad.x, World.groundY(ad.x, ad.y), ad.y); this.alice.rotation.y = Math.PI; scene.add(this.alice);
    this.cart = makeHorseCart();
    this.cartHome = World.nodes['J0'].clone().add(new THREE.Vector2(0, 3.5));
    this.cart.position.set(this.cartHome.x, World.groundY(this.cartHome.x, this.cartHome.y), this.cartHome.y); this.cart.rotation.y = Math.PI / 2;
    scene.add(this.cart);
    // pigeon (fetch messenger)
    const pm = new THREE.MeshLambertMaterial({ color: 0xE8E8EE }), p = new THREE.Group();
    p.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.8), pm));
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.4), pm); p.add(w);
    const letter = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshLambertMaterial({ color: 0xF3E7C9 })); letter.position.y = -0.3; p.add(letter);
    p.userData.w = w; p.visible = false; scene.add(p); this.pigeon = p;
    // CI parcel
    this.parcel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xFFE08A }));
    this.parcel.visible = false; scene.add(this.parcel);
    this.prScroll = null;
  },
  update(dt, t) {
    World.animateAgent(this.you, dt, t); World.animateAgent(this.alice, dt, t); World.animateAgent(this.cart, dt, t);
    if (this.pigeon.visible) this.pigeon.userData.w.rotation.z = Math.sin(t * 20) * 0.6;
    if (this.parcel.visible) { this.parcel.rotation.y += dt * 2; }
    for (const c of this.crates) if (c.userData.bob) c.position.y = c.userData.by + Math.sin(t * 3 + c.userData.bob) * 0.05;
  },
  clearCrates() { for (const c of this.crates) this.scene.remove(c); this.crates = []; },
  add(obj, p) { obj.position.copy(p); this.scene.add(obj); this.crates.push(obj); return obj; },
  /** Rebuild the static visual state from the Git model */
  refresh() {
    this.clearCrates();
    const S = World.sites;
    // workbench parchments
    const wb = S.workshop.anchors.workbench;
    Git.working.forEach((f, i) => { const o = makeCrate(f[1], 'scroll'); o.rotation.y = S.workshop.rot + rr(-0.3, 0.3); this.add(o, wb.clone().addScaledVector(S.workshop.right, (i % 3) * 1.1 - 1.1).addScaledVector(S.workshop.fwd, Math.floor(i / 3) * 0.9 - 0.4)); });
    // staged parcels on pallet
    const pal = S.shed.anchors.pallet;
    Git.staged.forEach((f, i) => { const o = makeCrate(f[1], 'parcel'); o.scale.setScalar(1.6); this.add(o, pal.clone().addScaledVector(S.shed.right, (i % 3) * 1.2 - 1.2).addScaledVector(S.shed.fwd, Math.floor(i / 3) * 1.2)); });
    // local repo: vault crates
    const localIds = new Set(); for (const b of Object.keys(Git.local)) for (const c of Git.reach(Git.local[b])) localIds.add(c);
    const local = [...localIds].map(id => Git.commits[id]).sort((a, b) => a.n - b.n);
    const v = S.archive.anchors.vault;
    local.forEach((c, i) => {
      const col = i % 4, row = Math.floor(i / 4) % 3, lay = Math.floor(i / 12);
      const o = makeCrate(c.seal); o.rotation.y = S.archive.rot;
      this.add(o, v.clone().addScaledVector(S.archive.right, col * 1.35).addScaledVector(S.archive.fwd, row * 1.35).setY(v.y + lay * 1.25));
      o.userData.commit = c.id;
    });
    // remote: granary yard rows
    const g = S.granary, mainIds = Git.reach(Git.remote.main);
    const lane = (ids, anchor) => ids.forEach((c, i) => {
      const o = makeCrate(c.seal); o.rotation.y = g.rot;
      this.add(o, anchor.clone().addScaledVector(g.right, (i % 9) * 1.3).setY(anchor.y + Math.floor(i / 9) * 1.25));
    });
    lane([...mainIds].map(id => Git.commits[id]).sort((a, b) => a.n - b.n), g.anchors.yardMain);
    const featIds = new Set(); for (const [b, id] of Object.entries(Git.remote)) if (b !== 'main') for (const c of Git.reach(id)) if (!mainIds.has(c)) featIds.add(c);
    lane([...featIds].map(id => Git.commits[id]).sort((a, b) => a.n - b.n), g.anchors.yardFeat);
    // PR scroll on the petition board
    if (Git.pr) {
      const b = S.petition.anchors.board, o = makeCrate(Git.pr.state === 'merged' ? SEAL.merge : Git.pr.approved ? SEAL.feature : 0xE3B341, 'scroll');
      o.scale.setScalar(2.2); o.rotation.set(-Math.PI / 2, S.petition.rot, 0, 'YXZ');
      this.add(o, b.clone().addScaledVector(S.petition.right, 2.5));
    }
    UI.refresh();
  },
};

// ---------------- helpers ----------------
const wait = s => Tween.wait(s);
const door = n => World.nodes[n + '.door'];
const site = n => World.sites[n];
function say(who, text, dur = 2.6) { UI.bubble(who, text, dur); }
function sparkle(p, col = [0xFFE08A, 0xFFFFFF], n = 30, spd = 5) { FX.burst(p.x, p.y, p.z, n, col, spd, { g: -6 }); }
function carry(agent, obj) {
  if (agent.userData.carry) { agent.remove(agent.userData.carry); agent.userData.carry = null; }
  if (obj) { obj.position.set(0, 1.75, 0.45); agent.add(obj); agent.userData.carry = obj; }
}
function loadCart(objs) { const L = Stage.cart.userData.load; while (L.children.length) L.remove(L.children[0]); objs.slice(0, 6).forEach((o, i) => { o.position.set((i % 2) * 0.9 - 0.45, Math.floor(i / 4) * 1.1, (Math.floor(i / 2) % 2) * 1.0 - 0.5); L.add(o); }); }
async function cartTo(node, opts = {}) { Cam.follow(Stage.cart); await World.goTo(Stage.cart, node, { speed: opts.speed || 9, end: opts.end }); }
async function cartHome() { await World.goTo(Stage.cart, 'J0', { speed: 11, end: Stage.cartHome }); Stage.cart.rotation.y = Math.PI / 2; }
async function walk(agent, node, end, speed = 7) { Cam.follow(agent); await World.goTo(agent, node, { speed, end }); }
function faceTo(agent, p) { agent.rotation.y = Math.atan2(p.x - agent.position.x, p.z - agent.position.z); }
async function hammer(p, n = 6) { for (let i = 0; i < n; i++) { FX.burst(p.x, p.y + 0.3, p.z, 8, [0xFFC14D, 0xFF7A2F, 0xFFFFFF], 4, { life: 0.5, size: 0.15 }); Sfx.hammer(); Stage.you.userData.ra.rotation.x = -2.2; await wait(0.12); Stage.you.userData.ra.rotation.x = -0.4; await wait(0.12); } }

// ---------------- actions ----------------
const Act = {
  async edit() {
    if (Git.working.length >= 6) return UI.err('Your bench is full: stage (git add) what you have first.');
    const S = site('workshop');
    await walk(Stage.you, 'workshop.door', S.anchors.workbench.clone().addScaledVector(S.fwd, 1.6));
    faceTo(Stage.you, S.anchors.workbench);
    Cam.focus(S.anchors.workbench, 14);
    await hammer(S.anchors.workbench);
    const files = Git.newFiles(Git.head === 'main' ? 2 : 1);
    if (Git.ci.needsFix) { Git.ci.needsFix = false; files.length = 0; files.push(['app.test.js', 0x2EA043]); Git.fixReady = true; }
    Git.working.push(...files);
    Stage.refresh(); Sfx.pop();
    UI.term('edit', files.map(f => `  modified:   ${f[0]}`).join('\n'), 'Crafted ' + files.map(f => f[0]).join(', '));
    say(Stage.you, 'Crafted ' + files.map(f => f[0]).join(' & ') + '!');
  },
  async add() {
    if (!Git.working.length) return UI.err('Nothing to add: the workbench is empty. Craft a change in the Workshop first.');
    const W = site('workshop'), Sh = site('shed');
    await walk(Stage.you, 'workshop.door', W.anchors.workbench.clone().addScaledVector(W.fwd, 1.6));
    const files = Git.working.splice(0); Stage.refresh();
    carry(Stage.you, makeCrate(files[0][1], 'parcel'));
    await walk(Stage.you, 'shed.door', Sh.anchors.pallet.clone().addScaledVector(Sh.fwd, 2.2));
    carry(Stage.you, null);
    Git.staged.push(...files); Stage.refresh();
    sparkle(Sh.anchors.pallet, [0x2EA043, 0xFFFFFF], 25, 4); Sfx.good();
    UI.term('add', files.map(f => `  staged:     ${f[0]}`).join('\n'));
    say(Stage.you, 'Packed ' + files.length + ' file' + (files.length > 1 ? 's' : '') + ' into the crate.');
  },
  async commit(msg) {
    if (!Git.staged.length) return UI.err('Nothing staged to commit. Use git add to pack goods first.');
    msg = msg || UI.defaultMsg();
    const Sh = site('shed'), A = site('archive');
    await walk(Stage.you, 'shed.door', Sh.anchors.pallet.clone().addScaledVector(Sh.fwd, 2.2));
    const files = Git.staged.splice(0); Stage.refresh();
    const tmp = makeCrate(Git.head === 'main' ? SEAL.main : SEAL.feature); carry(Stage.you, tmp);
    await walk(Stage.you, 'archive.door', A.anchors.vault.clone().addScaledVector(A.fwd, -1.2).addScaledVector(A.right, 2));
    carry(Stage.you, null);
    const fix = Git.fixReady; Git.fixReady = false;
    const id = Git.mk(msg, 'you', [Git.local[Git.head]], Git.head, files.map(f => f[0]));
    if (fix) Git.commits[id].fix = true;
    Git.local[Git.head] = id;
    Stage.refresh();
    const top = Stage.crates.find(c => c.userData.commit === id);
    if (top) { sparkle(top.position.clone().add(new THREE.Vector3(0, 1, 0)), [0xE3B341, 0xFFFFFF, Git.commits[id].seal], 40, 5); }
    Sfx.thud(); setTimeout(() => Sfx.good(), 150);
    UI.term('commit', `[${Git.head} ${id}] ${msg}\n ${files.length} file${files.length > 1 ? 's' : ''} changed`);
    say(Stage.you, `Sealed crate ${id}!`);
  },
  async push() {
    const b = Git.head, l = Git.local[b], r = Git.remote[b];
    if (r === l) return UI.err('Everything up-to-date: the Granary already has all your crates.');
    const rejected = r && !Git.isAnc(r, l);
    const onRemote = new Set(); for (const id of Object.values(Git.remote)) for (const c of Git.reach(id)) onRemote.add(c);
    const ids = [...Git.reach(l)].filter(c => !onRemote.has(c));
    await walk(Stage.you, 'archive.door');
    loadCart(ids.map(id => makeCrate(Git.commits[id].seal)));
    say(Stage.you, rejected ? 'Off to the Town Hall…' : `Delivering ${ids.length} crate${ids.length > 1 ? 's' : ''}!`);
    await cartTo('granary.door', { end: rejected ? null : site('granary').anchors.yardMain.clone().addScaledVector(site('granary').fwd, 3.5) });
    if (rejected) {
      Sfx.bad(); FX.burst(Stage.cart.position.x, Stage.cart.position.y + 2.5, Stage.cart.position.z, 40, [0xE5534B, 0xFFFFFF], 5);
      say(Stage.cart, '✋ Rejected! The Granary has crates you don\'t have.', 3.5);
      UI.term('push', ` ! [rejected]        ${b} -> ${b} (fetch first)\nerror: failed to push some refs to 'origin'\nhint: Updates were rejected because the remote contains work that you do not\nhint: have locally. Integrate the remote changes (e.g. 'git pull') first.`, null, 'bad');
      await wait(1.2); loadCart([]); await cartHome(); Cam.follow(null);
      Game.emit('push-rejected'); return false;
    }
    Git.remote[b] = l; Git.tracking[b] = l;
    loadCart([]); Stage.refresh();
    sparkle(site('granary').anchors.yardMain.clone().setY(site('granary').y + 2), [0x2F81F7, 0xFFFFFF, 0x2EA043], 50, 6); Sfx.chime();
    UI.term('push', `To github.com:village/commit-village.git\n   ${(r || '0000000').slice(0, 7)}..${l}  ${b} -> ${b}`);
    Game.emit('pushed', b);
    const back = cartHome();
    if (Git.pr && Git.pr.state === 'open' && Git.pr.branch === b) { Git.pr.approved = false; runCI(l, false); }
    else if (b === 'main' && Game.mode === 'sandbox') runCI(l, true);
    await back; Cam.follow(null);
  },
  async fetch(silent) {
    const H = site('hall'), A = site('archive'), p = Stage.pigeon;
    const from = H.group.position.clone().setY(H.top - 4), to = A.anchors.vault.clone().setY(A.y + 6);
    p.visible = true; Cam.follow(p);
    await Tween.add(3.2, (k) => {
      p.position.lerpVectors(from, to, k); p.position.y += Math.sin(k * Math.PI) * 14;
      p.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    });
    p.visible = false; Cam.follow(null);
    const before = { ...Git.tracking };
    for (const [b, id] of Object.entries(Git.remote)) Git.tracking[b] = id;
    sparkle(to, [0xFFFFFF, 0xC9DCE6], 20, 3); Sfx.pop();
    const [ahead, behind] = Git.aheadBehind(Git.head);
    const lines = Object.entries(Git.remote).filter(([b, id]) => before[b] !== id).map(([b, id]) => `   ${(before[b] || '0000000').slice(0, 7)}..${id}  ${b} -> origin/${b}`);
    if (!silent) {
      UI.term('fetch', (lines.length ? 'From github.com:village/commit-village\n' + lines.join('\n') : '(already up to date)') + `\nYour branch is ${behind ? 'behind' : 'up to date with'} 'origin/${Git.head}'${behind ? ` by ${behind} commit${behind > 1 ? 's' : ''}` : ''}${ahead ? ` and ahead by ${ahead}` : ''}.`);
      say(Stage.you, behind ? `🕊️ News: origin/${Git.head} has ${behind} new crate${behind > 1 ? 's' : ''}!` : '🕊️ No news from Town Hall.');
    }
    Stage.refresh(); Game.emit('fetched');
  },
  async pull() {
    const b = Git.head;
    if (!Git.remote[b]) return UI.err(`There is no tracking information for '${b}'. Push it first (git push -u origin ${b}).`);
    await this.fetch(true);
    const l = Git.local[b], r = Git.tracking[b];
    if (Git.isAnc(r, l)) { UI.term('pull', 'Already up to date.'); say(Stage.you, 'Already up to date.'); Game.emit('pulled'); return; }
    const ids = [...Git.reach(r)].filter(c => !Git.reach(l).has(c));
    await World.goTo(Stage.cart, 'granary.door', { speed: 14 });
    loadCart(ids.map(id => makeCrate(Git.commits[id].seal)));
    say(Stage.cart, `Bringing ${ids.length} crate${ids.length > 1 ? 's' : ''} home…`);
    await cartTo('archive.door', { end: site('archive').anchors.vault.clone().addScaledVector(site('archive').fwd, 4) });
    let out;
    if (Git.isAnc(l, r)) { Git.local[b] = r; out = `Updating ${l}..${r}\nFast-forward`; }
    else { const m = Git.mk(`Merge branch '${b}' of origin`, 'you', [l, r], b); Git.local[b] = m; out = `Merge made by the 'ort' strategy.\n[${b} ${m}] Merge branch '${b}' of origin`; }
    loadCart([]); Stage.refresh();
    sparkle(site('archive').anchors.vault.clone().setY(site('archive').y + 2), [0xD6409F, 0xFFFFFF, 0x8957E5], 50, 6); Sfx.chime();
    UI.term('pull', out);
    await cartHome(); Cam.follow(null);
    Game.emit('pulled');
  },
  async branch(name) {
    name = name || (Git.local['feature/lanterns'] ? 'feature/' + (Object.keys(Git.local).length) : 'feature/lanterns');
    if (Git.local[name]) return this.switch(name);
    Git.local[name] = Git.local[Git.head]; Git.head = name;
    const F = site('feat');
    await walk(Stage.you, 'feat.door');
    sparkle(F.anchors.flag, [0x2EA043, 0xFFFFFF, 0x7EE787], 60, 6); Sfx.chime();
    UI.term('branch', `Switched to a new branch '${name}'`, null, null, `git switch -c ${name}`);
    say(Stage.you, `🌿 New road: ${name}`);
    Stage.refresh(); Game.emit('branched', name);
  },
  async switch(name) {
    name = name || (Git.head === 'main' ? Object.keys(Git.local).find(b => b !== 'main') : 'main');
    if (!name || !Git.local[name]) return UI.err('No other branch yet. Create one with git switch -c feature/lanterns.');
    Git.head = name;
    await walk(Stage.you, name === 'main' ? 'plaza' : 'feat.door');
    UI.term('switch', `Switched to branch '${name}'`, null, null, `git switch ${name}`);
    Stage.refresh(); Game.emit('switched', name);
  },
  async pr() {
    const b = Git.head;
    if (b === 'main') return UI.err('Open a Pull Request from a feature branch: switch to one first.');
    if (!Git.remote[b]) return UI.err(`The Granary doesn't know '${b}' yet: git push it first.`);
    if (Git.pr && Git.pr.state === 'open') return UI.err('A petition is already pinned on the board.');
    const P = site('petition');
    carry(Stage.you, makeCrate(0xE3B341, 'scroll'));
    await walk(Stage.you, 'petition.door', P.anchors.board.clone().addScaledVector(P.fwd, 2).setY(0));
    carry(Stage.you, null);
    Git.pr = { n: 1 + (Git.prCount = (Git.prCount || 0) + 1), branch: b, state: 'open', approved: false, ci: 'pending' };
    Stage.refresh(); Sfx.good();
    UI.term('pr', `Creating pull request for ${b} into main\nhttps://github.com/village/commit-village/pull/${Git.pr.n}`, null, null, `gh pr create --base main --head ${b}`);
    say(Stage.you, `📜 Petition #${Git.pr.n}: "Bring ${b} into main"`);
    Game.emit('pr-opened');
    runCI(Git.remote[b], false);
  },
  async review() {
    if (!Git.pr || Git.pr.state !== 'open') return UI.err('There is no open petition to review.');
    if (Git.pr.ci !== 'passed') return UI.err('Alice waits for the checks to pass before reviewing.');
    if (Git.pr.approved) return UI.err('Already approved, you can merge!');
    const P = site('petition'), spot = P.anchors.board.clone().addScaledVector(P.fwd, 2).addScaledVector(P.right, 2);
    say(Stage.alice, 'On my way to review!');
    await walk(Stage.alice, 'petition.door', spot, 9);
    faceTo(Stage.alice, P.anchors.board);
    await wait(1.0); say(Stage.alice, 'Looks great: approved ✅');
    Git.pr.approved = true; Stage.refresh();
    sparkle(P.anchors.board.clone().addScaledVector(P.right, 2.5), [0x2EA043, 0xFFFFFF], 50, 5); Sfx.chime();
    UI.term('review', `✓ alice approved these changes`, null, null, 'gh pr review --approve  (by alice)');
    Game.emit('approved');
    World.goTo(Stage.alice, 'alice.door', { speed: 5 }).then(() => { Stage.alice.rotation.y = Math.PI; });
    Cam.follow(null);
  },
  async merge() {
    const pr = Git.pr;
    if (!pr || pr.state !== 'open') return UI.err('No open petition to merge.');
    if (pr.ci !== 'passed') return UI.err('Checks have not passed yet: the mill must give a green lamp.');
    if (!pr.approved) return UI.err('A review is required: ask Alice to review first.');
    const G = site('granary');
    Cam.focus(G.anchors.yardMain.clone().addScaledVector(G.right, 4), 22);
    const m = Git.mk(`Merge pull request #${pr.n} from ${pr.branch}`, 'you', [Git.remote.main, Git.remote[pr.branch]], 'main');
    // feature crates hop over into the main lane
    const featCrates = Stage.crates.filter(c => c.position.distanceTo(G.anchors.yardFeat) < 14 && Math.abs(c.position.z - G.anchors.yardFeat.z) < 1.5 && Math.abs(c.position.x - G.anchors.yardFeat.x) < 14);
    await Promise.all(featCrates.map((c, i) => { const a = c.position.clone(), b = c.position.clone().addScaledVector(G.fwd, -(G.anchors.yardFeat.distanceTo(G.anchors.yardMain))); return wait(i * 0.15).then(() => Tween.add(0.8, k => { c.position.lerpVectors(a, b, k); c.position.y += Math.sin(k * Math.PI) * 2.5; })); }));
    Git.remote.main = m; pr.state = 'merged'; delete Git.remote[pr.branch];
    Stage.refresh();
    sparkle(G.anchors.yardMain.clone().addScaledVector(G.right, 4).setY(G.y + 2), [0x8957E5, 0xFFFFFF, 0xE3B341], 80, 7); Sfx.chime();
    UI.term('merge', `✓ Merged pull request #${pr.n} (${pr.branch} → main)\n✓ Deleted branch ${pr.branch} on origin`, null, null, `gh pr merge ${pr.n} --merge --delete-branch`);
    Game.emit('merged');
    await runCI(m, true);
  },
  async alice() {
    const G = site('granary');
    const crate = makeCrate(SEAL.alice); carry(Stage.alice, crate);
    say(Stage.alice, 'Pushing my map update to the Town Hall!');
    await walk(Stage.alice, 'granary.door', G.anchors.yardMain.clone().addScaledVector(G.fwd, 3), 8);
    carry(Stage.alice, null);
    const id = Git.mk('Add river map (by Alice)', 'alice', [Git.remote.main], 'main', ['map.json']);
    Git.remote.main = id; Stage.refresh();
    sparkle(G.anchors.yardMain.clone().setY(G.y + 2), [0xD6409F, 0xFFFFFF], 40, 5); Sfx.good();
    UI.term('alice', `alice: [main ${id}] Add river map\nalice: To github.com:village/commit-village.git  main -> main`, null, null, '(Alice runs) git push');
    Game.emit('alice-pushed');
    Cam.follow(null);
    World.goTo(Stage.alice, 'alice.door', { speed: 5 }).then(() => { Stage.alice.rotation.y = Math.PI; });
    if (Game.mode === 'sandbox') runCI(id, true);
  },
  async ci() { if (Git.ci.state === 'running') return UI.err('The mill is already running.'); await runCI(Git.remote[Git.head] || Git.remote.main, Git.head === 'main'); },
  async log() {
    const h = Git.history(Git.local[Git.head]).reverse();
    const tags = id => { const t = []; for (const [b, v] of Object.entries(Git.local)) if (v === id) t.push(b === Git.head ? `HEAD -> ${b}` : b); for (const [b, v] of Object.entries(Git.tracking)) if (v === id) t.push('origin/' + b); return t.length ? ` (${t.join(', ')})` : ''; };
    UI.term('log', h.map(c => `${c.parents.length > 1 ? '◆' : '●'} ${c.id}${tags(c.id)} ${c.msg}  <${c.author}>`).join('\n'));
    Cam.focus(site('archive').anchors.vault, 16);
  },
  async status() {
    const [a, bh] = Git.aheadBehind(Git.head);
    UI.term('status', `On branch ${Git.head}\n` + (Git.tracking[Git.head] ? `Your branch is ${a || bh ? `${a ? 'ahead of' : ''}${a && bh ? ' and ' : ''}${bh ? 'behind' : ''} 'origin/${Git.head}' (${a} ahead, ${bh} behind)` : `up to date with 'origin/${Git.head}'`}.\n` : '') +
      (Git.staged.length ? `Changes to be committed:\n${Git.staged.map(f => '    new file: ' + f[0]).join('\n')}\n` : '') +
      (Git.working.length ? `Changes not staged for commit:\n${Git.working.map(f => '    modified: ' + f[0]).join('\n')}\n` : '') +
      (!Git.staged.length && !Git.working.length ? 'nothing to commit, working tree clean' : ''));
  },
};

// ---------------- CI pipeline ----------------
const STAGES = ['mill', 'lint', 'test', 'forge'];
async function runCI(commitId, deploy) {
  if (Git.ci.state === 'running') return;
  const fail = Git.nextCIFails || (Game.mode === 'sandbox' && !deploy && Math.random() < 0.2 && !Git.commits[commitId].fix);
  Git.nextCIFails = false;
  Git.ci = { state: 'running', stage: 'mill', target: commitId, deploy };
  for (const s of STAGES) World.lamps[s].set(0x777777);
  World.lamps.harbor.set(0x777777);
  UI.refresh(); UI.toast('⚙️ The Actions Mill starts turning: checks are running…', 'info');
  const P = Stage.parcel; P.visible = true;
  P.material.color.set(0xFFE08A);
  const G = site('granary'); P.position.copy(G.anchors.yardMain).setY(G.y + 1.5);
  World.sailSpeed = 3;
  const prevFollow = Cam.target;
  const stationPt = n => { const s = site(n); return World.nodes[n + '.door']; };
  const hop = async (n) => {
    const d = stationPt(n), pts = World.pathPoints(World.route(World.nearestNode(P.position.x, P.position.z), n + '.door'));
    pts.unshift(new THREE.Vector2(P.position.x, P.position.z));
    Cam.follow(P);
    for (let i = 1; i < pts.length; i++) {
      const a = P.position.clone(), b = new THREE.Vector3(pts[i].x, World.groundY(pts[i].x, pts[i].y) + 1.5, pts[i].y);
      await Tween.add(a.distanceTo(b) / 16, k => P.position.lerpVectors(a, b, k), t => t);
    }
  };
  for (const s of STAGES) {
    Git.ci.stage = s; UI.refresh();
    await hop(s);
    World.lamps[s].set(0xF2CC60);
    const st = site(s);
    if (s === 'forge') { for (let i = 0; i < 6; i++) { FX.burst(P.position.x, P.position.y, P.position.z, 10, [0xFF7A2F, 0xFFC14D], 5, { life: 0.6, size: 0.18 }); Sfx.hammer(); await wait(0.22); } }
    else if (s === 'test') { for (let i = 0; i < 3; i++) { Sfx.tone(880 + i * 120, 0.08, 'triangle', 0.05); await wait(0.45); } }
    else await wait(1.0);
    if (s === 'test' && fail) {
      World.lamps[s].set(0xE5534B); P.material.color.set(0xE5534B);
      Sfx.bad(); FX.burst(st.anchors.bell.x, st.anchors.bell.y, st.anchors.bell.z, 60, [0xE5534B, 0xFFFFFF], 7);
      Git.ci.state = 'failed'; if (Git.pr && Git.pr.state === 'open') Git.pr.ci = 'failed';
      Git.ci.needsFix = true;
      UI.term('ci', `✗ test   1 failing\n  ✗ lanterns light up at dusk\n    expected lamp.brightness > 0 but got 0\n    at app.test.js:42`, null, 'bad', 'GitHub Actions · CI');
      UI.toast('🔔 The Test Watchtower rings the bell: a test failed! Fix it: edit → add → commit → push.', 'bad', 6);
      say(Stage.you, 'Oh no, a test failed! Let me fix it.', 3);
      World.sailSpeed = 0.4; await wait(1.2); P.visible = false; Cam.follow(null);
      UI.refresh(); Game.emit('ci-failed'); return false;
    }
    World.lamps[s].set(0x3FB950);
    UI.term('ci', `✓ ${{ mill: 'workflow triggered', lint: 'lint passed', test: 'tests passed (24/24)', forge: 'build succeeded' }[s]}`, null, 'good', 'GitHub Actions · CI');
  }
  Git.ci.state = 'passed'; Git.ci.stage = null;
  if (Git.pr && Git.pr.state === 'open') Git.pr.ci = 'passed';
  UI.toast('✅ All checks passed!', 'good'); Sfx.good();
  UI.refresh(); Game.emit('ci-passed');
  if (deploy) await deployShip(commitId);
  else { P.visible = false; World.sailSpeed = 0.4; Cam.follow(null); }
  return true;
}

async function deployShip(commitId) {
  const P = Stage.parcel, ship = World.ship;
  Git.ci.stage = 'deploy'; UI.refresh();
  const a = P.position.clone(), b = new THREE.Vector3(85, 4, 2), c = World.shipHome.clone().setY(5.5);
  Cam.follow(P);
  await Tween.add(1.6, k => P.position.lerpVectors(a, b, k), t => t);
  await Tween.add(0.8, k => { P.position.lerpVectors(b, c, k); P.position.y += Math.sin(k * Math.PI) * 3; });
  P.visible = false; World.lamps.harbor.set(0x3FB950);
  UI.toast('⛵ Deploying to production: the ship sets sail!', 'info');
  World.shipSailing = true; Cam.follow(ship);
  const s0 = ship.position.clone();
  Sfx.chime();
  await Tween.add(5, k => { ship.position.set(s0.x + k * k * 60, World.shipHome.y + Math.sin(k * 20) * 0.15, s0.z + k * 6); ship.rotation.z = Math.sin(k * 14) * 0.04; }, t => t);
  Git.deploys++; Git.ci.stage = null; Git.ci.deployed = commitId;
  UI.term('deploy', `🚀 Deployed ${commitId} to production\n   https://commit-village.example`, null, 'good', 'GitHub Actions · deploy');
  Game.emit('deployed');
  celebrate();
  Cam.focus(new THREE.Vector3(10, 4, 0), 95);
  await wait(3);
  ship.position.set(World.shipHome.x + 60, World.shipHome.y, World.shipHome.z);
  await Tween.add(4, k => ship.position.x = World.shipHome.x + (1 - k) * 60);
  World.shipSailing = false; World.sailSpeed = 0.4;
}

function celebrate() {
  const spots = [[-38, 0], [16, 0], [28, 10], [60, -5], [-23, -12], [6, 28]];
  for (let i = 0; i < 18; i++) setTimeout(() => {
    const [x, z] = pick(spots), y = rr(22, 34);
    FX.burst(x + rr(-6, 6), y, z + rr(-6, 6), 70, [pick([0xFF5D73, 0xFFD166, 0x6FE3FF, 0x9BFF7A, 0xC77DFF, 0xFFFFFF]), pick([0xFFFFFF, 0xFFE08A])], 11, { g: -4, life: rr(1.4, 2.2), size: 0.35, drag: 0.96 });
    Sfx.pop();
  }, i * 260);
  const all = [Stage.you, Stage.alice, ...World.npcs];
  let t0 = 0;
  Tween.add(5, k => { t0 = k * 5; for (const v of all) v.userData.jump = Math.abs(Math.sin(t0 * 8 + v.userData.phase)) * 0.5; }, t => t).then(() => all.forEach(v => v.userData.jump = 0));
}

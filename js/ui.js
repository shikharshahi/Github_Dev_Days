/* Commit Village — UI: story missions, terminal, HUD, labels, bubbles */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ACTIONS = {
  edit:   { icon: '✏️', label: 'Craft',      cmd: 'edit files',       tip: 'Change files in your Workshop (working directory)' },
  add:    { icon: '📦', label: 'Pack',       cmd: 'git add .',        tip: 'Stage changes: pack goods into a crate' },
  commit: { icon: '🔒', label: 'Seal',       cmd: 'git commit',       tip: 'Seal the crate into your local Archive' },
  push:   { icon: '🚚', label: 'Deliver',    cmd: 'git push',         tip: 'Cart your sealed crates over the bridge to GitHub' },
  fetch:  { icon: '🕊️', label: 'News',       cmd: 'git fetch',        tip: 'A pigeon brings news of new crates (no merge)' },
  pull:   { icon: '📥', label: 'Bring home', cmd: 'git pull',         tip: 'Fetch + merge the Town Hall\'s crates into yours' },
  branch: { icon: '🌿', label: 'New road',   cmd: 'git switch -c',    tip: 'Fork a new branch road' },
  switch: { icon: '🔀', label: 'Switch road', cmd: 'git switch',      tip: 'Walk to another branch' },
  pr:     { icon: '📜', label: 'Petition',   cmd: 'gh pr create',     tip: 'Open a Pull Request at the Petition Hall' },
  review: { icon: '👀', label: 'Review',     cmd: 'gh pr review',     tip: 'Ask Alice to review & approve' },
  merge:  { icon: '🤝', label: 'Merge',      cmd: 'gh pr merge',      tip: 'Merge the petition into main (needs ✅ checks + review)' },
  alice:  { icon: '👩', label: 'Alice pushes', cmd: '(teammate)',     tip: 'Simulate a teammate pushing to main' },
  log:    { icon: '📖', label: 'Ledger',     cmd: 'git log',          tip: 'Read the commit history' },
};
const CMD_TEXT = { edit: '# (editing files in your editor…)', add: 'git add .', fetch: 'git fetch origin', pull: 'git pull', log: 'git log --oneline --graph', status: 'git status' };

// ---------------- Story ----------------
const TOUR = [
  { at: [-40, 3, 0], d: 58, yaw: -0.5, t: '🏡 West of the river is <b>your village</b>: your own computer. Nothing here is shared until you send it.' },
  { at: [-12, 3, 0], d: 34, yaw: 0.3, t: '🌉 The <b>river</b> is the network. Every <code>push</code> and <code>pull</code> crosses this bridge.' },
  { at: [24, 6, 2], d: 52, yaw: 0.6, t: '🏛️ The <b>Town Hall</b> is GitHub (<code>origin</code>). The Granary stores everyone\'s pushed crates.' },
  { at: [8, 3, -20], d: 36, yaw: -0.2, t: '📜 The <b>Petition Hall</b> is where Pull Requests are pinned, reviewed and merged.' },
  { at: [58, 4, -2], d: 62, yaw: 0.2, t: '⚙️ <b>Pipeline Valley</b>: mill → inspector → watchtower → forge. This is CI (GitHub Actions).' },
  { at: [84, 4, 3], d: 40, yaw: 1.0, t: '⛵ The <b>Harbour</b> ships finished goods to the world. This is deployment (CD).' },
];
const STORY = [
  { title: 'Welcome to Commit Village', place: null, tour: true, need: [],
    story: 'Every Git command you learn today is something that <b>physically happens</b> in this village. Take the tour!',
    git: 'Git tracks snapshots of your project. GitHub is a shared place to store and review them.' },
  { title: 'Chapter 1 · The Workshop', place: 'workshop', need: ['edit'],
    story: 'You are a craftsperson. Go to your <b>Workshop</b> and make something new. Crafted parchments lie on the workbench.',
    git: 'Your <b>working directory</b> is just your files. Editing them changes nothing in Git yet: they are <i>modified</i>.', cmd: '# edit files in your editor' },
  { title: 'Chapter 2 · The Packing Shed', place: 'shed', need: ['add'],
    story: 'Carry the parchments to the <b>Packing Shed</b> and pack them for shipping. You choose what goes in the crate.',
    git: '<code>git add</code> moves changes into the <b>staging area</b>, a draft of your next commit.', cmd: 'git add .' },
  { title: 'Chapter 3 · The Archive', place: 'archive', need: ['commit'],
    story: 'Seal the crate with a wax seal and a label, and store it in your <b>Archive Cellar</b>. Sealed crates never change.',
    git: '<code>git commit</code> saves a permanent snapshot to your <b>local repository</b>, with a hash ID and a message.', cmd: 'git commit -m "Add lanterns"' },
  { title: 'Chapter 4 · Over the Bridge', place: 'hall', need: ['push'],
    story: 'Load your sealed crates on the cart and drive them across the bridge to the <b>Town Hall Granary</b>.',
    git: '<code>git push</code> uploads your commits to the <b>remote</b> (GitHub) so others can see them.', cmd: 'git push origin main' },
  { title: 'Chapter 5 · A Neighbour Pushes', place: 'alice', need: ['fetch', 'pull'], start: 'alice',
    story: 'Alice just delivered a crate to the Granary! Send a 🕊️ pigeon to get the <b>news</b>, then bring her crate <b>home</b>.',
    git: '<code>git fetch</code> downloads info about new commits. <code>git pull</code> = fetch + <b>merge</b> them into your branch.', cmd: 'git fetch → git pull' },
  { title: 'Chapter 6 · A Road of Your Own', place: 'feat', need: ['branch', 'edit', 'add', 'commit'],
    story: 'Build a side road to the <b>Feature Hut</b>, then craft, pack and seal a crate there. Main road stays untouched.',
    git: 'A <b>branch</b> is a separate line of work. <code>git switch -c feature/lanterns</code> creates it and moves you onto it.', cmd: 'git switch -c feature/lanterns' },
  { title: 'Chapter 7 · The Petition', place: 'petition', need: ['push', 'pr'], waitFor: 'ci-failed', startFn: () => { Git.nextCIFails = true; },
    story: 'Deliver your feature crates, then pin a <b>petition</b> at the Petition Hall asking to join them into main. Watch the mill!',
    git: 'A <b>Pull Request</b> proposes merging your branch. It triggers <b>CI</b>: automatic checks run on your code.', cmd: 'git push -u origin feature/lanterns → gh pr create' },
  { title: 'Chapter 8 · Fix the Failing Test', place: 'workshop', need: ['edit', 'add', 'commit', 'push'], waitFor: 'ci-passed',
    story: 'The Watchtower bell rang 🔔: a test failed! Go back, fix it, seal a new crate and deliver it. The mill re-runs checks.',
    git: 'Pushing new commits to a PR branch <b>updates the PR</b> and re-runs CI. Red ❌ → fix → green ✅.', cmd: 'edit → git add → git commit → git push' },
  { title: 'Chapter 9 · Review, Merge & Ship', place: 'petition', need: ['review', 'merge'], waitFor: 'deployed',
    story: 'Ask Alice to review your petition, then <b>merge</b> it. Main changes, so the pipeline runs and the ship <b>deploys</b>!',
    git: 'After approval + green checks, <b>merging</b> adds your branch to <code>main</code>. CD then deploys main to production.', cmd: 'gh pr review → gh pr merge' },
  { title: '🎉 You shipped it!', place: null, final: true, need: [] },
];

// ---------------- Game controller ----------------
const Game = {
  mode: 'title', step: 0, done: [], gotEvent: false, listeners: [],
  start(mode) {
    this.mode = mode; Git.reset(); Stage.refresh();
    $('#title').classList.add('hide'); $('#hud').classList.remove('hide');
    document.body.dataset.mode = mode;
    Sfx.init();
    if (mode === 'story') this.goStep(0); else { $('#mission').classList.add('hide'); UI.toast('🧪 Sandbox: every command is unlocked. Try breaking things!', 'info'); Cam.focus(new THREE.Vector3(-5, 4, 0), 110); Beacon.set(null); }
    UI.refresh();
  },
  goStep(i) {
    this.step = i; this.done = []; this.gotEvent = false; this.tourIx = -1;
    const s = STORY[i];
    $('#mission').classList.remove('hide');
    if (s.startFn) s.startFn();
    UI.renderMission();
    Beacon.set(s.place);
    if (s.place) { const S = World.sites[s.place]; Cam.focus(S.group ? S.group.position.clone().setY(S.y + 3) : new THREE.Vector3(S.x, 4, S.z), 34); }
    if (s.final) UI.finale();
    if (s.start === 'alice') this.run('alice', null, true);
    UI.refresh();
  },
  allowed(a) {
    if (this.mode !== 'story') return true;
    if (a === 'log' || a === 'status') return true;
    const s = STORY[this.step];
    return s.need[this.done.length] === a;
  },
  async run(a, arg, scripted) {
    if (Stage.busy) { UI.toast('⏳ Hold on, the villagers are still busy…', 'info', 1.6); return; }
    if (!scripted && !this.allowed(a)) {
      const s = STORY[this.step], next = s.need[this.done.length];
      UI.toast(next ? `🧭 Follow the mission: next step is <b>${ACTIONS[next].label}</b> (<code>${ACTIONS[next].cmd}</code>)` : (s.waitFor ? '⏳ Watch what happens next…' : '🧭 Press <b>Continue</b> on the mission card.'), 'info', 2.6);
      Sfx.bad(); return;
    }
    if (a === 'commit' && arg == null && !scripted) { UI.askCommit(); return; }
    Stage.busy = true; UI.refresh();
    let ok;
    try { ok = await Act[a](arg); } catch (e) { console.error(e); ok = false; }
    Stage.busy = false;
    if (ok !== false && this.mode === 'story' && !scripted) this.tick(a);
    UI.refresh();
  },
  tick(a) {
    const s = STORY[this.step];
    if (s.need[this.done.length] !== a) return;
    this.done.push(a); UI.renderMission();
    this.checkDone();
  },
  emit(ev, arg) {
    if (this.mode !== 'story') return;
    const s = STORY[this.step];
    if (s.waitFor === ev) { this.gotEvent = true; this.checkDone(); }
  },
  checkDone() {
    const s = STORY[this.step];
    if (this.done.length >= s.need.length && (!s.waitFor || this.gotEvent)) {
      Sfx.chime(); UI.renderMission(true);
      Beacon.set(null);
    }
  },
  next() {
    const s = STORY[this.step];
    if (s.tour) {
      this.tourIx++;
      if (this.tourIx < TOUR.length) { const T = TOUR[this.tourIx]; Cam.focus(new THREE.Vector3(...T.at), T.d, T.yaw, true); UI.renderMission(); return; }
    }
    if (this.step < STORY.length - 1) this.goStep(this.step + 1);
  },
};

// ---------------- Beacon (bobbing arrow over the mission target) ----------------
const Beacon = {
  init(scene) {
    const m = new VoxelModel();
    for (let y = 0; y < 4; y++) for (let x = -y; x <= y; x++) m.set(x, 4 - y, 0, 0xFFD24A, true);
    m.box(-1, 5, 0, 1, 8, 0, 0xFFD24A, true);
    this.g = m.build({ scale: 0.45, ox: 0.5, oz: 0.5 });
    this.g.children.forEach(c => c.material = new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3, 32), new THREE.MeshBasicMaterial({ color: 0xFFD24A, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    scene.add(this.g, this.ring); this.set(null);
  },
  set(name) {
    this.site = name ? World.sites[name] : null;
    this.g.visible = this.ring.visible = !!this.site;
    if (this.site) {
      const s = this.site, d = World.nodes[name + '.door'] || new THREE.Vector2(s.x, s.z);
      this.base = new THREE.Vector3(s.x, s.top + 2, s.z);
      this.ring.position.set(d.x, World.groundY(d.x, d.y) + 0.15, d.y);
    }
  },
  update(t) {
    if (!this.site) return;
    this.g.position.copy(this.base).setY(this.base.y + Math.sin(t * 3) * 0.8);
    this.g.rotation.y = t * 1.5;
    const k = (t * 0.8) % 1; this.ring.scale.setScalar(0.6 + k * 0.8); this.ring.material.opacity = 0.8 * (1 - k);
  },
};

// ---------------- UI ----------------
const UI = {
  labelsOn: true, bubbles: [],
  init() {
    // dock
    const dock = $('#dock');
    for (const [k, a] of Object.entries(ACTIONS)) {
      const b = document.createElement('button');
      b.className = 'act'; b.dataset.act = k; b.title = a.tip;
      b.innerHTML = `<span class="ic">${a.icon}</span><span class="lb">${a.label}</span><code>${a.cmd}</code>`;
      b.onclick = () => { Sfx.click(); Game.run(k); };
      dock.appendChild(b);
    }
    // labels
    const L = $('#labels');
    for (const s of Object.values(World.sites)) {
      const d = document.createElement('div'); d.className = 'label';
      d.innerHTML = `<b>${s.icon} ${esc(s.title)}</b><span>${esc(s.term)}</span>`;
      d.onclick = () => this.inspect(s.name);
      L.appendChild(d); s.label = d;
    }
    // terminal input
    const inp = $('#term-in'); this.hist = []; this.hi = 0;
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const v = inp.value.trim(); if (v) { this.hist.push(v); this.hi = this.hist.length; this.parse(v); } inp.value = ''; }
      else if (e.key === 'ArrowUp') { if (this.hi > 0) inp.value = this.hist[--this.hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { inp.value = this.hist[++this.hi] || ''; this.hi = Math.min(this.hi, this.hist.length); }
      e.stopPropagation();
    });
    // top bar
    $('#btn-codex').onclick = () => $('#codex').classList.toggle('hide');
    $('#codex .x').onclick = () => $('#codex').classList.add('hide');
    $('#btn-labels').onclick = e => { this.labelsOn = !this.labelsOn; e.currentTarget.classList.toggle('off', !this.labelsOn); };
    $('#btn-sound').onclick = e => { Sfx.on = !Sfx.on; e.currentTarget.textContent = Sfx.on ? '🔊' : '🔇'; };
    $('#btn-cam').onclick = e => { Cam.cinematic = !Cam.cinematic; e.currentTarget.classList.toggle('off', !Cam.cinematic); this.toast(Cam.cinematic ? '🎥 Cinematic camera on: it follows the action.' : '🎥 Free camera: you are in control.', 'info', 1.8); };
    $('#btn-menu').onclick = () => { if (confirm('Return to the title screen? Progress in this run will be lost.')) location.reload(); };
    $('#time').oninput = e => { Sky.time = +e.target.value; Sky.auto = false; $('#btn-auto').classList.add('off'); };
    $('#btn-auto').onclick = e => { Sky.auto = !Sky.auto; e.currentTarget.classList.toggle('off', !Sky.auto); };
    $('#btn-term').onclick = () => $('#term').classList.toggle('min');
    $('#info .x').onclick = () => $('#info').classList.add('hide');
    $('#m-next').onclick = () => { Sfx.click(); Game.next(); };
    $('#m-hint').onclick = () => this.hint();
    $('#m-show').onclick = () => { const s = STORY[Game.step]; if (s.place) { const S = World.sites[s.place]; Cam.focus(new THREE.Vector3(S.x, S.y + 3, S.z), 30, null, true); } };
    document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => Game.start(b.dataset.start));
    $('#commit-form').onsubmit = e => { e.preventDefault(); const v = $('#commit-msg').value.trim() || this.defaultMsg(); $('#commit-modal').classList.add('hide'); Game.run('commit', v); };
    $('#commit-cancel').onclick = () => $('#commit-modal').classList.add('hide');
    // codex table
    $('#codex-body').innerHTML = CODEX.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    this.termLine('<span class="dim">Commit Village terminal. Type real git commands here, e.g. </span><code>git status</code><span class="dim">, or </span><code>help</code>');
  },
  defaultMsg() {
    const opts = Git.ci.needsFix === false && Git.fixReady ? ['Fix lantern test'] : Git.head === 'main' ? ['Add village lanterns', 'Update README', 'Improve styles'] : ['Add lanterns that glow at dusk', 'Lantern controls'];
    return Git.commits && Object.values(Git.commits).some(c => c.msg === opts[0]) ? opts[1 % opts.length] : opts[0];
  },
  askCommit() {
    if (!Git.staged.length) { Game.run('commit', ''); return; }
    const m = $('#commit-modal'); m.classList.remove('hide');
    const i = $('#commit-msg'); i.value = ''; i.placeholder = Git.fixReady ? 'Fix lantern test' : this.defaultMsg(); setTimeout(() => i.focus(), 30);
    $('#commit-files').innerHTML = Git.staged.map(f => `<span class="chip" style="--c:#${f[1].toString(16).padStart(6, '0')}">${esc(f[0])}</span>`).join('');
  },
  parse(v) {
    this.termLine(`<span class="pr">${esc(Git.head)} $</span> ${esc(v)}`);
    const m = v.match(/^(\S+)\s*(\S*)\s*(.*)$/); if (!m) return;
    const [, a, b, rest] = m;
    const run = (act, arg) => { this.typed = v; Game.run(act, arg); };
    if (a === 'help') return this.termLine(`<span class="dim">Try:</span> git status · git add . · git commit -m "msg" · git push · git fetch · git pull · git switch -c feature/x · git switch main · git log · gh pr create · gh pr review --approve · gh pr merge · edit · clear`);
    if (a === 'clear') { $('#term-out').innerHTML = ''; return; }
    if (['edit', 'code', 'touch', 'vim', 'nano'].includes(a)) return run('edit');
    if (a === 'gh' && b === 'pr') { const s = rest.split(/\s+/)[0]; return run({ create: 'pr', review: 'review', merge: 'merge' }[s] || 'pr'); }
    if (a !== 'git') return this.termLine(`<span class="bad">${esc(a)}: command not found</span>. Type <code>help</code>.`);
    switch (b) {
      case 'add': return run('add');
      case 'commit': { const mm = rest.match(/-m\s+["']?([^"']+)["']?/); return mm ? run('commit', mm[1]) : run('commit'); }
      case 'push': return run('push');
      case 'fetch': return run('fetch');
      case 'pull': return run('pull');
      case 'status': return run('status');
      case 'log': return run('log');
      case 'switch': case 'checkout': {
        const mm = rest.match(/^-(c|b)\s+(\S+)/);
        if (mm) return run('branch', mm[2]);
        return rest ? run('switch', rest.trim()) : this.termLine('<span class="bad">fatal: missing branch name</span>');
      }
      case 'branch': if (!rest) return this.termLine(Object.keys(Git.local).map(x => (x === Git.head ? '* ' : '  ') + esc(x)).join('<br>')); return run('branch', rest.trim());
      case 'merge': return this.termLine('<span class="dim">In this village, merges happen through the Petition Hall (</span><code>gh pr merge</code><span class="dim">) or via </span><code>git pull</code>.');
      case 'clone': case 'init': return this.termLine('<span class="dim">Your village is already cloned from the Town Hall. Everything is set up!</span>');
      default: return this.termLine(`<span class="bad">git: '${esc(b)}' is not a git command in this village.</span> Type <code>help</code>.`);
    }
  },
  termLine(html, cls) { const o = $('#term-out'), d = document.createElement('div'); d.className = 'tl ' + (cls || ''); d.innerHTML = html; o.appendChild(d); o.scrollTop = o.scrollHeight; },
  term(key, out, summary, cls, cmdOverride) {
    const cmd = cmdOverride || (this.typed && key !== 'ci' && key !== 'deploy' && key !== 'alice' ? null : (key === 'commit' ? `git commit -m "${Git.commits[Git.local[Git.head]]?.msg || ''}"` : key === 'push' ? `git push origin ${Git.head}` : CMD_TEXT[key]));
    this.typed = null;
    if (cmd) this.termLine(`<span class="pr">${key === 'ci' || key === 'deploy' ? '⚙' : esc(Git.head) + ' $'}</span> ${esc(cmd)}`);
    if (out) this.termLine(esc(out).replace(/\n/g, '<br>'), cls);
    $('#term').classList.remove('min');
  },
  err(msg) { this.toast('⚠️ ' + msg, 'bad', 3.4); this.termLine('<span class="bad">' + esc(msg) + '</span>'); this.typed = null; Sfx.bad(); return false; },
  toast(html, kind = 'info', dur = 3) {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), dur * 1000); setTimeout(() => t.remove(), dur * 1000 + 500);
  },
  bubble(agent, text, dur) {
    for (const b of this.bubbles) if (b.agent === agent) b.el.remove();
    this.bubbles = this.bubbles.filter(b => b.agent !== agent);
    const el = document.createElement('div'); el.className = 'bubble'; el.textContent = text;
    $('#labels').appendChild(el);
    const b = { agent, el, until: performance.now() + dur * 1000 }; this.bubbles.push(b);
  },
  inspect(name) {
    const s = World.sites[name], I = $('#info');
    I.querySelector('.ttl').innerHTML = `${s.icon} ${esc(s.title)}`;
    I.querySelector('.term').textContent = s.term;
    I.querySelector('.desc').textContent = s.desc;
    const acts = I.querySelector('.acts'); acts.innerHTML = '';
    for (const a of (s.acts || [])) {
      if (!ACTIONS[a] || (a === 'alice' && Game.mode === 'story')) continue;
      const b = document.createElement('button'); b.className = 'mini'; b.innerHTML = `${ACTIONS[a].icon} ${ACTIONS[a].label} <code>${ACTIONS[a].cmd}</code>`;
      b.disabled = !Game.allowed(a); b.onclick = () => { I.classList.add('hide'); Game.run(a); };
      acts.appendChild(b);
    }
    if (s.name === 'mill' && Game.mode === 'sandbox') { const b = document.createElement('button'); b.className = 'mini'; b.innerHTML = '⚙️ Run checks'; b.onclick = () => { I.classList.add('hide'); Game.run('ci'); }; acts.appendChild(b); }
    I.classList.remove('hide');
    Cam.focus(new THREE.Vector3(s.x, (s.y || 3) + 3, s.z), 30, null, true);
  },
  hint() {
    const s = STORY[Game.step], next = s.need[Game.done.length];
    if (!next) return this.toast(s.waitFor ? '⏳ Just watch: the village is working.' : '👉 Press <b>Continue</b>.', 'info');
    this.toast(`💡 Click <b>${ACTIONS[next].icon} ${ACTIONS[next].label}</b> in the dock, click the glowing building, or type <code>${next === 'commit' ? 'git commit -m "msg"' : next === 'branch' ? 'git switch -c feature/lanterns' : next === 'pr' ? 'gh pr create' : next === 'review' ? 'gh pr review --approve' : next === 'merge' ? 'gh pr merge' : ACTIONS[next].cmd}</code>`, 'info', 5);
    const b = document.querySelector(`.act[data-act="${next}"]`); if (b) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 2400); }
  },
  renderMission(complete) {
    const s = STORY[Game.step], M = $('#mission');
    $('#m-step').textContent = s.final ? 'Complete' : `${Game.step + 1} / ${STORY.length - 1}`;
    $('#m-bar').style.width = (Game.step / (STORY.length - 1) * 100) + '%';
    $('#m-title').innerHTML = s.title;
    if (s.tour && Game.tourIx >= 0) { $('#m-story').innerHTML = TOUR[Game.tourIx].t; $('#m-git').innerHTML = `<span class="dim">Tour stop ${Game.tourIx + 1} of ${TOUR.length}</span>`; }
    else { $('#m-story').innerHTML = s.story || ''; $('#m-git').innerHTML = s.git ? `<div class="k">In Git</div>${s.git}${s.cmd ? `<pre>${esc(s.cmd)}</pre>` : ''}` : ''; }
    $('#m-checks').innerHTML = s.need.map((a, i) => `<li class="${i < Game.done.length ? 'done' : i === Game.done.length ? 'cur' : ''}"><span>${i < Game.done.length ? '✔' : ACTIONS[a].icon}</span>${ACTIONS[a].label} <code>${ACTIONS[a].cmd}</code></li>`).join('') +
      (s.waitFor ? `<li class="${Game.gotEvent ? 'done' : ''}"><span>${Game.gotEvent ? '✔' : '⏳'}</span>${{ 'ci-failed': 'Watch the pipeline run', 'ci-passed': 'Checks turn green', deployed: 'Ship deploys to production' }[s.waitFor]}</li>` : '');
    const ready = s.tour || complete || (!s.need.length && !s.waitFor);
    $('#m-next').disabled = !ready || s.final;
    $('#m-next').textContent = s.tour ? (Game.tourIx < TOUR.length - 1 ? (Game.tourIx < 0 ? 'Start tour ▶' : 'Next stop ▶') : 'Begin Chapter 1 ▶') : 'Continue ▶';
    M.classList.toggle('complete', !!complete);
    $('#m-show').style.display = s.place ? '' : 'none';
    $('#m-hint').style.display = s.need.length ? '' : 'none';
  },
  finale() {
    $('#finale').classList.remove('hide');
    $('#finale-stats').innerHTML = `<div><b>${Object.keys(Git.commits).length}</b>crates sealed</div><div><b>${Git.deploys}</b>deploys</div><div><b>${Git.prCount || 0}</b>petitions</div>`;
  },
  refresh() {
    if (!$('#hud')) return;
    const [ahead, behind] = Git.local[Git.head] ? Git.aheadBehind(Git.head) : [0, 0];
    $('#st-branch').textContent = Git.head;
    $('#st-branch').className = 'chip br ' + (Git.head === 'main' ? 'main' : 'feat');
    $('#st-work').textContent = Git.working.length; $('#st-stage').textContent = Git.staged.length;
    $('#st-local').textContent = Git.history(Git.local[Git.head]).length;
    $('#st-sync').innerHTML = !Git.tracking[Git.head] ? '<span class="dim">not pushed</span>' : (ahead || behind) ? `${ahead ? `<span class="up">↑${ahead}</span>` : ''} ${behind ? `<span class="down">↓${behind}</span>` : ''}` : '<span class="ok">✓ in sync</span>';
    const pr = Git.pr;
    $('#st-pr').innerHTML = !pr ? '<span class="dim">none</span>' : pr.state === 'merged' ? `<span class="merged">#${pr.n} merged</span>` : `<span class="open">#${pr.n} open</span> ${pr.approved ? '✅' : ''}`;
    const ci = Git.ci;
    $('#st-ci').innerHTML = ci.state === 'running' ? `<span class="run">● ${ci.stage === 'deploy' ? 'deploying' : ci.stage}</span>` : ci.state === 'failed' ? '<span class="bad">✗ failed</span>' : ci.state === 'passed' ? '<span class="ok">✓ passed</span>' : '<span class="dim">idle</span>';
    $('#pipe').innerHTML = ['mill', 'lint', 'test', 'forge', 'deploy'].map(s => {
      let c = '';
      if (ci.state === 'running') { const order = ['mill', 'lint', 'test', 'forge', 'deploy'], cur = order.indexOf(ci.stage), me = order.indexOf(s); c = me < cur ? 'ok' : me === cur ? 'run' : ''; }
      else if (ci.state === 'failed') c = s === 'test' ? 'bad' : ['mill', 'lint'].includes(s) ? 'ok' : '';
      else if (ci.state === 'passed') c = s === 'deploy' ? (ci.deployed === ci.target ? 'ok' : '') : 'ok';
      return `<i class="${c}" title="${s}"></i>`;
    }).join('');
    // ledger
    const h = Git.local[Git.head] ? Git.history(Git.local[Git.head]).reverse().slice(0, 7) : [];
    const tag = id => { const t = []; for (const [b, v] of Object.entries(Git.local)) if (v === id) t.push(`<span class="tag ${b === 'main' ? 'main' : 'feat'}">${b === Git.head ? 'HEAD→' : ''}${esc(b)}</span>`); for (const [b, v] of Object.entries(Git.remote)) if (v === id) t.push(`<span class="tag remote">origin/${esc(b)}</span>`); return t.join(''); };
    $('#ledger').innerHTML = h.map(c => `<li><i style="background:#${c.seal.toString(16).padStart(6, '0')}"></i><code>${c.id}</code> <span class="msg">${esc(c.msg)}</span>${tag(c.id)}</li>`).join('');
    // dock gating
    document.querySelectorAll('.act').forEach(b => {
      const a = b.dataset.act;
      b.classList.toggle('locked', !Game.allowed(a));
      b.classList.toggle('next', Game.mode === 'story' && STORY[Game.step].need[Game.done.length] === a);
      b.disabled = Stage.busy;
      b.style.display = (a === 'alice' || a === 'switch') && Game.mode === 'story' ? 'none' : '';
    });
  },
  update(camera) {
    const W = innerWidth, H = innerHeight, v = new THREE.Vector3();
    for (const s of Object.values(World.sites)) {
      const el = s.label; if (!el) continue;
      v.set(s.x, s.top + 1, s.z);
      const dist = v.distanceTo(camera.position);
      v.project(camera);
      const vis = this.labelsOn && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < 170;
      el.style.display = vis ? '' : 'none';
      if (vis) { el.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * W}px,${(-v.y * 0.5 + 0.5) * H}px) scale(${clamp(70 / dist, 0.62, 1.1)})`; el.style.opacity = clamp(1.6 - dist / 120, 0.35, 1); el.classList.toggle('target', Beacon.site === s); }
    }
    const now = performance.now();
    this.bubbles = this.bubbles.filter(b => { if (now > b.until) { b.el.remove(); return false; } return true; });
    for (const b of this.bubbles) {
      b.agent.getWorldPosition(v); v.y += b.agent.userData.cart ? 4.2 : 3.4; v.project(camera);
      b.el.style.display = v.z < 1 ? '' : 'none';
      b.el.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * W}px,${(-v.y * 0.5 + 0.5) * H}px)`;
    }
  },
};

const CODEX = [
  ['🔨 Workshop', 'Working directory', 'Where you edit files freely'],
  ['📜 Parchments on the bench', 'Modified files', 'Changed but not staged'],
  ['📦 Packing Shed', 'Staging area', '<code>git add</code> chooses what goes in'],
  ['🔒 Sealed crate', 'Commit', 'Snapshot + hash + message'],
  ['🗄️ Archive Cellar', 'Local repository', 'Your commits, on your machine'],
  ['🌊 River & bridge', 'Network', 'What push/pull cross'],
  ['🏛️ Town Hall', 'GitHub (origin)', 'The shared remote'],
  ['🌾 Granary lanes', 'origin/main, origin/feature', 'Remote branches'],
  ['🚚 Horse cart → Granary', 'git push', 'Upload your commits'],
  ['✋ Cart turned back', 'Rejected push', 'Remote has commits you lack: pull first'],
  ['🕊️ Pigeon', 'git fetch', 'Get news without merging'],
  ['📥 Cart brings crates home', 'git pull', 'fetch + merge'],
  ['👩 Alice\'s house', 'Teammate\'s clone', 'Others push to the same remote'],
  ['🌿 Side road + flag', 'Branch', 'Parallel line of work'],
  ['📜 Petition Hall', 'Pull Request', 'Propose merging a branch'],
  ['👀 Alice stamps it', 'Code review', 'Approve or request changes'],
  ['⚙️ Mill → 🔍 → 🧪 → 🔥', 'CI pipeline (Actions)', 'Lint, test, build on every PR'],
  ['🔔 Red lamp', 'Failing check', 'Fix, commit, push again'],
  ['🟣 Purple crate', 'Merge commit', 'Two roads joined'],
  ['⛵ Ship sails', 'Deploy (CD)', 'main goes to production'],
];

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'

type Building = { id: string; title: string; command: string; lesson: string; position: THREE.Vector3; color: number; size: THREE.Vector3 }

const buildings: Building[] = [
  { id: 'repo', title: 'Local Repository Workshop', command: 'git clone · git status · git add', lesson: 'Shelves hold the files in your local repository. Status inspects them; add selects what belongs in the next snapshot.', position: new THREE.Vector3(-12, 0, -7), color: 0x4d80a8, size: new THREE.Vector3(6, 4, 5) },
  { id: 'commit', title: 'Commit House', command: 'git commit', lesson: 'The archivist places glowing snapshot books on a timeline. A commit is a named checkpoint in project history.', position: new THREE.Vector3(-4, 0, -9), color: 0xb98243, size: new THREE.Vector3(5, 4, 4) },
  { id: 'branch', title: 'Branch Barn', command: 'git branch · git switch', lesson: 'Colored paths fork from main. A branch lets an experiment travel safely beside the shared path.', position: new THREE.Vector3(5, 0, -9), color: 0xb46d43, size: new THREE.Vector3(5, 4, 4) },
  { id: 'review', title: 'Pull Request Hall', command: 'pull request · review', lesson: 'Reviewers inspect a proposed branch here before the gate can open.', position: new THREE.Vector3(12, 0, -5), color: 0x895ba5, size: new THREE.Vector3(6, 4, 5) },
  { id: 'merge', title: 'Merge Gate', command: 'git merge', lesson: 'Two colored branch paths meet at this gate. Merge joins approved work into main.', position: new THREE.Vector3(11, 0, 5), color: 0x95603e, size: new THREE.Vector3(5, 4, 4) },
  { id: 'actions', title: 'GitHub Actions Workshop', command: 'GitHub Actions · CI', lesson: 'Tiny robots move work along a pipeline and run repeatable checks after every change.', position: new THREE.Vector3(3, 0, 9), color: 0x4d72ae, size: new THREE.Vector3(6, 4, 5) },
  { id: 'remote', title: 'Remote GitHub Keep', command: 'git push · git pull', lesson: 'Couriers carry commits between your local world and the remote GitHub keep.', position: new THREE.Vector3(-8, 0, 8), color: 0x4c8d83, size: new THREE.Vector3(5, 5, 5) },
]

const eyeHeight = 1.7

function label(text: string, color = '#ffe28a') {
  const canvas = document.createElement('canvas')
  canvas.width = 760
  canvas.height = 100
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Sprite()
  ctx.fillStyle = 'rgba(12,22,43,.9)'
  ctx.roundRect(4, 4, 752, 92, 18)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = '700 25px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(text, 380, 63)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }))
  sprite.scale.set(4.7, .62, 1)
  return sprite
}

function makeHouse(building: Building, scene: THREE.Scene) {
  const group = new THREE.Group()
  const wall = new THREE.Mesh(new THREE.BoxGeometry(building.size.x, building.size.y, building.size.z), new THREE.MeshStandardMaterial({ color: building.color, flatShading: true }))
  wall.position.y = building.size.y / 2
  wall.castShadow = true
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(building.size.x, building.size.z) * .7, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0x34405f, flatShading: true }))
  roof.position.y = building.size.y + 1
  roof.rotation.y = Math.PI / 4
  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, .15), new THREE.MeshStandardMaterial({ color: 0x392d2a }))
  door.position.set(0, .9, building.size.z / 2 + .08)
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x9de7ef, emissive: 0x194c55, emissiveIntensity: .6 })
  for (const x of [-building.size.x * .28, building.size.x * .28]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(1, .8, .12), windowMat)
    window.position.set(x, 2.1, building.size.z / 2 + .07)
    group.add(window)
  }
  const sign = label(`${building.title}  ·  ${building.command}`)
  sign.position.y = building.size.y + 2.3
  group.add(wall, roof, door, sign)
  group.position.copy(building.position)
  scene.add(group)
}

function addTree(scene: THREE.Scene, x: number, z: number, scale = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18 * scale, .3 * scale, 1.5 * scale, 7), new THREE.MeshStandardMaterial({ color: 0x70452d }))
  trunk.position.set(x, .75 * scale, z)
  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15 * scale), new THREE.MeshStandardMaterial({ color: 0x327353, flatShading: true }))
  crown.position.set(x, 2 * scale, z)
  scene.add(trunk, crown)
}

function addBook(scene: THREE.Scene, position: THREE.Vector3, color: number) {
  const book = new THREE.Mesh(new THREE.BoxGeometry(.35, .12, .5), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .5 }))
  book.position.copy(position)
  scene.add(book)
  return book
}

function App() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(0)
  const [ready, setReady] = useState(false)
  const [interior, setInterior] = useState<Building | null>(null)
  const [prompt, setPrompt] = useState('Click the world to capture the mouse · WASD to walk')
  const [objective, setObjective] = useState('Find the Local Repository Workshop')
  const [visited, setVisited] = useState<string[]>([])

  useEffect(() => {
    const timer = window.setInterval(() => setLoading((value) => {
      const next = Math.min(100, value + 20)
      if (next === 100) { window.clearInterval(timer); window.setTimeout(() => setReady(true), 150) }
      return next
    }), 100)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const container = sceneRef.current
    if (!container || !ready) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(interior ? 0x19233d : 0x8fd5ec)
    scene.fog = new THREE.Fog(scene.background, interior ? 12 : 28, interior ? 28 : 55)
    const camera = new THREE.PerspectiveCamera(70, 1, .08, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xdff8ff, 0x314d3f, 2.2))
    const sun = new THREE.DirectionalLight(0xffedc1, 2.8)
    sun.position.set(-15, 24, 10)
    sun.castShadow = true
    scene.add(sun)

    const player = new THREE.Object3D()
    player.position.set(0, eyeHeight, interior ? 4 : 5)
    scene.add(player)
    const obstacles: THREE.Box3[] = []
    const animated: { object: THREE.Object3D; start: THREE.Vector3; end: THREE.Vector3; speed: number }[] = []

    if (interior) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(16, .3, 10), new THREE.MeshStandardMaterial({ color: 0x6c806d }))
      floor.position.y = -.15
      const back = new THREE.Mesh(new THREE.BoxGeometry(16, 6, .3), new THREE.MeshStandardMaterial({ color: interior.color }))
      back.position.set(0, 3, -5)
      scene.add(floor, back)
      if (interior.id === 'commit') {
        const line = new THREE.Mesh(new THREE.BoxGeometry(9, .13, .2), new THREE.MeshStandardMaterial({ color: 0xffe28a }))
        line.position.set(0, 1.6, -3)
        scene.add(line)
        for (let i = 0; i < 6; i++) {
          const book = addBook(scene, new THREE.Vector3(-4 + i * 1.6, 1.9, -3), i === 5 ? 0xffe28a : 0x56b9e8)
          book.rotation.z = i % 2 ? .2 : -.2
        }
        scene.add(label('ARCHIVIST TIMELINE  ·  snapshot books = commits', '#ffe28a').translateX(0))
        scene.children.at(-1)!.position.set(0, 3.5, -3)
        const archivist = new THREE.Mesh(new THREE.CapsuleGeometry(.28, .75, 4, 8), new THREE.MeshStandardMaterial({ color: 0xf1c27d }))
        archivist.position.set(-3, 1, -1.5)
        scene.add(archivist)
        const movingBook = addBook(scene, new THREE.Vector3(-2.5, 1.8, -1.5), 0xa7f3d0)
        animated.push({ object: movingBook, start: new THREE.Vector3(-2.5, 1.8, -1.5), end: new THREE.Vector3(3, 1.9, -3), speed: .3 })
      } else if (interior.id === 'merge') {
        const branchA = new THREE.Mesh(new THREE.BoxGeometry(4, .15, .3), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }))
        const branchB = new THREE.Mesh(new THREE.BoxGeometry(4, .15, .3), new THREE.MeshStandardMaterial({ color: 0xec4899 }))
        branchA.position.set(-2, 1, -1.4); branchB.position.set(-2, 1, 1.4)
        branchA.rotation.y = .2; branchB.rotation.y = -.2
        const gate = new THREE.Mesh(new THREE.BoxGeometry(3, .18, .35), new THREE.MeshStandardMaterial({ color: 0xa7f3d0, emissive: 0x2c805d, emissiveIntensity: .5 }))
        gate.position.set(2, 1, 0)
        scene.add(branchA, branchB, gate)
        const mergeSign = label('PULL REQUEST  →  REVIEW  →  MERGE', '#a7f3d0')
        mergeSign.position.set(0, 3.5, -3)
        scene.add(mergeSign)
        const reviewBoard = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, .12), new THREE.MeshStandardMaterial({ color: 0x895ba5 }))
        reviewBoard.position.set(0, 2.2, -3)
        scene.add(reviewBoard)
      } else {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(4, .35, 1.2), new THREE.MeshStandardMaterial({ color: 0x29385e }))
        bench.position.set(0, 1, -2.4)
        scene.add(bench)
        const roomSign = label(`${interior.title}  ·  ${interior.command}`, '#ffe28a')
        roomSign.position.set(0, 3.5, -3)
        scene.add(roomSign)
      }
    } else {
      const ground = new THREE.Mesh(new THREE.BoxGeometry(38, .5, 26), new THREE.MeshStandardMaterial({ color: 0x72ae62, flatShading: true }))
      ground.position.y = -.25
      ground.receiveShadow = true
      scene.add(ground)
      const river = new THREE.Mesh(new THREE.BoxGeometry(3, .06, 26), new THREE.MeshStandardMaterial({ color: 0x4ea9d5, metalness: .2, roughness: .2 }))
      river.position.set(-.5, .04, 0)
      scene.add(river)
      const square = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, .08, 8), new THREE.MeshStandardMaterial({ color: 0xd7b77d }))
      square.position.y = .03
      scene.add(square)
      const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xc79e67 })
      const mainPath = new THREE.Mesh(new THREE.BoxGeometry(32, .05, 2), pathMaterial)
      mainPath.position.y = .06
      const crossPath = new THREE.Mesh(new THREE.BoxGeometry(2, .06, 23), pathMaterial)
      crossPath.position.y = .065
      scene.add(mainPath, crossPath)
      const keep = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 6, 8), new THREE.MeshStandardMaterial({ color: 0x526e9c, flatShading: true }))
      keep.position.set(-.5, 3, -1)
      const cloud = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), new THREE.MeshStandardMaterial({ color: 0xf2f7ff, emissive: 0x334c88, emissiveIntensity: .2 }))
      cloud.position.set(-.5, 7, -1)
      scene.add(keep, cloud, label('REMOTE GITHUB  ·  push / pull').translateX(-.5))
      scene.children.at(-1)!.position.set(-.5, 8.8, -1)
      buildings.forEach((building) => { makeHouse(building, scene); obstacles.push(new THREE.Box3().setFromCenterAndSize(building.position.clone().setY(1.5), building.size.clone().addScalar(1))) })
      ;[[-17, -11], [-17, 11], [17, -11], [17, 11], [14, 0], [-14, 0], [8, -11], [-9, 11], [14, 8], [-14, -8]].forEach(([x, z]) => addTree(scene, x, z))
      const timelineBooks = [new THREE.Vector3(-11, 2, -7), new THREE.Vector3(-4, 2, -9)].map((position, index) => addBook(scene, position, index ? 0xffe28a : 0x56b9e8))
      timelineBooks.forEach((book) => animated.push({ object: book, start: book.position.clone(), end: new THREE.Vector3(4, 1.2, 0), speed: .18 }))
    }

    let yaw = 0
    let pitch = 0
    let locked = false
    const keys = new Set<string>()
    const move = (event: Event) => {
      const directions: Record<string, [number, number]> = { forward: [0, -1], backward: [0, 1], left: [-1, 0], right: [1, 0] }
      const [x, z] = directions[(event as CustomEvent<string>).detail] ?? [0, 0]
      player.position.x += x * .9
      player.position.z += z * .9
    }
    const pointerlock = () => { locked = document.pointerLockElement === renderer.domElement; setPrompt(locked ? 'WASD move · mouse look · E enter · Escape release' : 'Click the world to capture the mouse') }
    const click = () => renderer.domElement.requestPointerLock()
    const mouse = (event: MouseEvent) => { if (locked) { yaw -= event.movementX * .0022; pitch = THREE.MathUtils.clamp(pitch - event.movementY * .0022, -1.2, 1.2) } }
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.tagName === 'BUTTON') return
      if (event.code === 'KeyE') {
        const near = !interior && buildings.find((building) => player.position.distanceTo(building.position) < 3.8)
        if (near) { setVisited((current) => current.includes(near.id) ? current : [...current, near.id]); setObjective(`Explore ${near.title}`); setInterior(near) }
        else if (interior) setInterior(null)
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); keys.add(event.code) }
    }
    const keyup = (event: KeyboardEvent) => keys.delete(event.code)
    renderer.domElement.addEventListener('click', click)
    renderer.domElement.addEventListener('mousemove', mouse)
    document.addEventListener('pointerlockchange', pointerlock)
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('gitquest-move', move)
    const resize = () => { const { width, height } = container.getBoundingClientRect(); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height) }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    let frame = 0
    let last = performance.now()
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate)
      const delta = Math.min((time - last) / 1000, .05); last = time
      const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
      const side = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
      const direction = new THREE.Vector3(side, 0, -forward).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      const next = player.position.clone().addScaledVector(direction, delta * 5)
      if (interior) { next.x = THREE.MathUtils.clamp(next.x, -7, 7); next.z = THREE.MathUtils.clamp(next.z, -4, 4) }
      else { next.x = THREE.MathUtils.clamp(next.x, -17, 17); next.z = THREE.MathUtils.clamp(next.z, -11, 11); if (!obstacles.some((box) => box.containsPoint(next))) player.position.copy(next) }
      player.position.y = eyeHeight
      camera.position.copy(player.position); camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch
      animated.forEach((item, index) => { const phase = (time * item.speed / 1000 + index * .17) % 1; item.object.position.lerpVectors(item.start, item.end, phase < .5 ? phase * 2 : (1 - phase) * 2) })
      renderer.render(scene, camera)
    }
    animate(performance.now())
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('click', click); renderer.domElement.removeEventListener('mousemove', mouse); document.removeEventListener('pointerlockchange', pointerlock); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('gitquest-move', move); renderer.dispose(); container.removeChild(renderer.domElement) }
  }, [ready, interior])

  if (!ready) return <main className="loading-screen"><div className="loading-mark">GH</div><p className="eyebrow">Github Village</p><h1>Preparing the world</h1><div className="loading-track" role="progressbar" aria-valuenow={loading} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${loading}%` }} /></div><strong>{loading}%</strong></main>
  const moveButton = (direction: string) => window.dispatchEvent(new CustomEvent('gitquest-move', { detail: direction }))
  return <main className="app-shell"><section className="world-card"><div ref={sceneRef} className="scene" role="img" aria-label={interior ? `${interior.title} interior` : 'First-person procedural Github Village'} tabIndex={0} /><div className="minimal-hud"><strong>{interior ? interior.title : objective}</strong><small>{interior ? `${interior.command} · ${interior.lesson}` : `${prompt} · ${visited.length}/${buildings.length} buildings explored`}</small></div><div className="scene-controls"><div className="d-pad" aria-label="Accessible movement controls"><button type="button" onClick={() => moveButton('forward')}>▲</button><button type="button" onClick={() => moveButton('left')}>◀</button><button type="button" onClick={() => moveButton('backward')}>▼</button><button type="button" onClick={() => moveButton('right')}>▶</button></div>{interior && <button type="button" className="interact-button exit-button" onClick={() => setInterior(null)}>Exit (E)</button>}</div></section></main>
}

export default App

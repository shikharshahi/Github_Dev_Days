import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'

type Building = {
  id: string
  title: string
  command: string
  lesson: string
  position: THREE.Vector3
  color: number
  size: THREE.Vector3
}

const buildings: Building[] = [
  { id: 'clone', title: 'Clone Cabin', command: 'git clone', lesson: 'A clone brings the shared repository into your local world.', position: new THREE.Vector3(-12, 0, -7), color: 0x4d80a8, size: new THREE.Vector3(6, 4, 5) },
  { id: 'repo', title: 'Local Repository Workshop', command: 'git status', lesson: 'Inspect files, then add the changes you want in your next snapshot.', position: new THREE.Vector3(-4, 0, -9), color: 0x638d70, size: new THREE.Vector3(5, 4, 4) },
  { id: 'branch', title: 'Branch Barn', command: 'git branch · git switch', lesson: 'Fork a safe path and switch between lines of work.', position: new THREE.Vector3(5, 0, -9), color: 0xb46d43, size: new THREE.Vector3(5, 4, 4) },
  { id: 'stage', title: 'Staging Forge', command: 'git add', lesson: 'Place selected changes in the staging area before committing them.', position: new THREE.Vector3(11, 0, -5), color: 0x895ba5, size: new THREE.Vector3(5, 4, 4) },
  { id: 'commit', title: 'Commit House', command: 'git commit', lesson: 'The archivist turns staged changes into a named checkpoint book.', position: new THREE.Vector3(11, 0, 2), color: 0xb98243, size: new THREE.Vector3(5, 4, 4) },
  { id: 'push', title: 'Courier Dock', command: 'git push', lesson: 'A courier carries your local commit to the remote GitHub keep.', position: new THREE.Vector3(7, 0, 8), color: 0x4c8d83, size: new THREE.Vector3(5, 4, 4) },
  { id: 'pull', title: 'Pull River Post', command: 'git pull', lesson: 'Bring the newest shared changes back down from the remote world.', position: new THREE.Vector3(0, 0, 9), color: 0x4d72ae, size: new THREE.Vector3(5, 4, 4) },
  { id: 'review', title: 'Pull Request Hall', command: 'pull request · review', lesson: 'Reviewers inspect a proposed branch before it reaches the merge gate.', position: new THREE.Vector3(-8, 0, 8), color: 0x895ba5, size: new THREE.Vector3(6, 4, 5) },
  { id: 'merge', title: 'Merge Manor', command: 'git merge', lesson: 'Two approved paths join the main line at the merge gate.', position: new THREE.Vector3(-13, 0, 1), color: 0x95603e, size: new THREE.Vector3(5, 4, 4) },
  { id: 'actions', title: 'Actions Workshop', command: 'GitHub Actions · CI', lesson: 'Robot workers run repeatable checks after every change.', position: new THREE.Vector3(-7, 0, -1), color: 0x4d72ae, size: new THREE.Vector3(5, 4, 4) },
]

const eyeHeight = 1.7
const worldBounds = { x: 17, z: 11 }

function makeLabel(text: string, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 760
  canvas.height = 100
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Sprite()
  ctx.fillStyle = 'rgba(12,22,43,.92)'
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

function addHouse(scene: THREE.Scene, building: Building, state: string, collision: THREE.Box3[]) {
  const group = new THREE.Group()
  const wallMaterial = new THREE.MeshStandardMaterial({ color: building.color, flatShading: true })
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x34405f, flatShading: true })
  const wallDepth = building.size.z / 2
  const sideWidth = (building.size.x - 1.5) / 2
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(sideWidth, building.size.y, building.size.z), wallMaterial)
  leftWall.position.x = -(building.size.x / 2 - sideWidth / 2)
  const rightWall = leftWall.clone()
  rightWall.position.x = -leftWall.position.x
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(building.size.x, building.size.y, .35), wallMaterial)
  backWall.position.set(0, building.size.y / 2, -wallDepth + .18)
  for (const wall of [leftWall, rightWall, backWall]) {
    wall.position.y = building.size.y / 2
    wall.castShadow = true
    group.add(wall)
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(building.size.x, building.size.z) * .7, 2.2, 4), roofMaterial)
  roof.position.y = building.size.y + 1
  roof.rotation.y = Math.PI / 4
  group.add(roof)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, .14), new THREE.MeshStandardMaterial({ color: 0x392d2a }))
  door.position.set(0, .95, wallDepth + .05)
  const portal = new THREE.Mesh(new THREE.TorusGeometry(.72, .08, 8, 16), new THREE.MeshStandardMaterial({ color: state === 'ACTIVE' ? 0xffe28a : state === 'COMPLETE' ? 0xa7f3d0 : 0x71809f, emissive: state === 'LOCKED' ? 0x000000 : 0x593f10, emissiveIntensity: .6 }))
  portal.rotation.x = Math.PI / 2
  portal.position.set(0, 1.8, wallDepth + .13)
  const label = makeLabel(`${state}  ·  ${building.title}  ·  ${building.command}`, state === 'ACTIVE' ? '#ffe28a' : state === 'COMPLETE' ? '#a7f3d0' : '#a8b3c7')
  label.position.y = building.size.y + 2.3
  group.add(door, portal, label)
  group.position.copy(building.position)
  scene.add(group)

  const y = 1.5
  collision.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(building.position.x - building.size.x / 2 + sideWidth / 2, y, building.position.z), new THREE.Vector3(sideWidth, building.size.y, building.size.z)))
  collision.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(building.position.x + building.size.x / 2 - sideWidth / 2, y, building.position.z), new THREE.Vector3(sideWidth, building.size.y, building.size.z)))
  collision.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(building.position.x, y, building.position.z - wallDepth + .18), new THREE.Vector3(building.size.x, building.size.y, .35)))
}

function addTree(scene: THREE.Scene, x: number, z: number) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, 1.5, 7), new THREE.MeshStandardMaterial({ color: 0x70452d }))
  trunk.position.set(x, .75, z)
  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15), new THREE.MeshStandardMaterial({ color: 0x327353, flatShading: true }))
  crown.position.set(x, 2, z)
  scene.add(trunk, crown)
}

function addBook(scene: THREE.Scene, position: THREE.Vector3, color: number) {
  const book = new THREE.Mesh(new THREE.BoxGeometry(.35, .12, .5), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .5 }))
  book.position.copy(position)
  scene.add(book)
  return book
}

function addInteriorActivity(scene: THREE.Scene, building: Building) {
  const sign = makeLabel(`${building.title}  ·  ${building.command}`, '#ffe28a')
  sign.position.set(0, 3.55, -3)
  scene.add(sign)
  const bright = (color: number) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .45, flatShading: true })
  if (building.id === 'clone') {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.6), bright(0x38bdf8))
    crate.position.set(0, .6, -1.8)
    scene.add(crate, makeLabel('REMOTE → LOCAL  ·  clone a copy', '#a7f3d0').translateY(2.4))
  } else if (building.id === 'repo') {
    for (let i = 0; i < 5; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(.75, .15, .5), bright(i % 2 ? 0xffe28a : 0x56b9e8))
      shelf.position.set(-2 + i, 1 + (i % 2) * .6, -2)
      scene.add(shelf)
    }
  } else if (building.id === 'branch') {
    for (const [x, z, color] of [[-2, -1.2, 0x38bdf8], [-1, 1.2, 0xec4899], [0, 0, 0xa7f3d0]] as const) {
      const path = new THREE.Mesh(new THREE.BoxGeometry(2.2, .14, .3), bright(color))
      path.position.set(x, 1, z)
      path.rotation.y = z < 0 ? .2 : z > 0 ? -.2 : 0
      scene.add(path)
    }
  } else if (building.id === 'stage') {
    const tray = new THREE.Mesh(new THREE.BoxGeometry(3.6, .2, 1.6), bright(0xffc857))
    tray.position.set(0, 1, -1.8)
    scene.add(tray, makeLabel('WORKTREE → STAGING AREA  ·  git add', '#ffe28a').translateY(2.4))
  } else if (building.id === 'commit') {
    const timeline = new THREE.Mesh(new THREE.BoxGeometry(8, .12, .2), bright(0xffe28a))
    timeline.position.set(0, 1.4, -2)
    scene.add(timeline)
    for (let i = 0; i < 6; i++) scene.add(addBook(scene, new THREE.Vector3(-3.5 + i * 1.4, 1.75, -2), i === 5 ? 0xffe28a : 0x56b9e8))
    const archivist = new THREE.Mesh(new THREE.CapsuleGeometry(.28, .75, 4, 8), bright(0xf1c27d))
    archivist.position.set(-3, 1, -1.1)
    scene.add(archivist, makeLabel('CHECKPOINT TIMELINE  ·  snapshot books', '#ffe28a').translateY(2.4))
  } else if (building.id === 'push' || building.id === 'pull') {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(4, .25, 1), bright(building.id === 'push' ? 0x38bdf8 : 0x22c55e))
    dock.position.set(0, 1, -2)
    scene.add(dock, makeLabel(building.id === 'push' ? 'LOCAL → REMOTE  ·  courier push' : 'REMOTE → LOCAL  ·  courier pull', '#a7f3d0').translateY(2.4))
  } else if (building.id === 'review') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, .14), bright(0xec4899))
    board.position.set(0, 2, -2.5)
    scene.add(board, makeLabel('PULL REQUEST  ·  REVIEW NOTES', '#ffd1ec').translateY(2.4))
  } else if (building.id === 'merge') {
    for (const [z, color] of [[-1, 0x38bdf8], [1, 0xec4899]] as const) {
      const path = new THREE.Mesh(new THREE.BoxGeometry(3.8, .15, .3), bright(color))
      path.position.set(-1.8, 1, z)
      path.rotation.y = z < 0 ? .2 : -.2
      scene.add(path)
    }
    const gate = new THREE.Mesh(new THREE.BoxGeometry(3, .2, .35), bright(0xa7f3d0))
    gate.position.set(2, 1, 0)
    scene.add(gate, makeLabel('TWO BRANCHES  →  MERGE INTO MAIN', '#a7f3d0').translateY(2.4))
  } else {
    for (let i = 0; i < 3; i++) {
      const robot = new THREE.Mesh(new THREE.BoxGeometry(.5, .7, .5), bright(0xa7f3d0))
      robot.position.set(-1.5 + i * 1.5, .55, -1.8)
      scene.add(robot)
    }
    const belt = new THREE.Mesh(new THREE.BoxGeometry(5, .16, .5), bright(0x536dfe))
    belt.position.set(0, .2, -1.8)
    scene.add(belt, makeLabel('CI PIPELINE  ·  test → build → ship', '#a7f3d0').translateY(2.4))
  }
}

function App() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(0)
  const [ready, setReady] = useState(false)
  const [interior, setInterior] = useState<Building | null>(null)
  const [prompt, setPrompt] = useState('Click the world to capture the mouse · WASD to walk')
  const [visited, setVisited] = useState<string[]>([])
  const [doorwayPosition, setDoorwayPosition] = useState<[number, number] | null>(null)

  const activeIndex = buildings.findIndex((building) => !visited.includes(building.id))
  const activeBuilding = buildings[Math.max(activeIndex, 0)]

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xdff8ff, 0x314d3f, 2.2))
    const sun = new THREE.DirectionalLight(0xffedc1, 2.8)
    sun.position.set(-15, 24, 10)
    scene.add(sun)
    const player = new THREE.Object3D()
    player.position.set(interior ? 0 : doorwayPosition?.[0] ?? 0, eyeHeight, interior ? 3.2 : doorwayPosition?.[1] ?? 4.7)
    scene.add(player)
    const obstacles: THREE.Box3[] = []
    const animated: { object: THREE.Object3D; start: THREE.Vector3; end: THREE.Vector3; speed: number }[] = []

    if (interior) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(16, .3, 10), new THREE.MeshStandardMaterial({ color: 0x6c806d }))
      floor.position.y = -.15
      const back = new THREE.Mesh(new THREE.BoxGeometry(16, 6, .3), new THREE.MeshStandardMaterial({ color: interior.color }))
      back.position.set(0, 3, -5)
      scene.add(floor, back)
      addInteriorActivity(scene, interior)
    } else {
      const ground = new THREE.Mesh(new THREE.BoxGeometry(38, .5, 26), new THREE.MeshStandardMaterial({ color: 0x72ae62, flatShading: true }))
      ground.position.y = -.25
      scene.add(ground)
      const river = new THREE.Mesh(new THREE.BoxGeometry(3, .06, 26), new THREE.MeshStandardMaterial({ color: 0x4ea9d5 }))
      river.position.set(-.5, .04, 0)
      const mainPath = new THREE.Mesh(new THREE.BoxGeometry(32, .05, 2), new THREE.MeshStandardMaterial({ color: 0xc79e67 }))
      mainPath.position.y = .06
      const crossPath = new THREE.Mesh(new THREE.BoxGeometry(2, .06, 23), new THREE.MeshStandardMaterial({ color: 0xc79e67 }))
      crossPath.position.y = .065
      scene.add(river, mainPath, crossPath)
      const square = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, .08, 8), new THREE.MeshStandardMaterial({ color: 0xd7b77d }))
      square.position.y = .03
      scene.add(square)
      buildings.forEach((building, index) => addHouse(scene, building, visited.includes(building.id) ? 'COMPLETE' : index === activeIndex ? 'ACTIVE' : 'LOCKED', obstacles))
      ;[[-17, -11], [-17, 11], [17, -11], [17, 11], [14, 0], [-14, 0], [8, -11], [-9, 11], [14, 8], [-14, -8]].forEach(([x, z]) => addTree(scene, x, z))
      const route = new THREE.Mesh(new THREE.TorusGeometry(1, .08, 8, 24), new THREE.MeshStandardMaterial({ color: 0xffe28a, emissive: 0xffa31a, emissiveIntensity: .7 }))
      route.rotation.x = Math.PI / 2
      route.position.copy(activeBuilding.position).setY(.25)
      scene.add(route)
      const githubKeep = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 6, 8), new THREE.MeshStandardMaterial({ color: 0x526e9c, flatShading: true }))
      githubKeep.position.set(-.5, 3, -1)
      scene.add(githubKeep, makeLabel('REMOTE GITHUB KEEP  ·  push / pull', '#a7f3d0'))
      scene.children.at(-1)!.position.set(-.5, 8.5, -1)
    }

    let yaw = 0
    let pitch = 0
    let locked = false
    const keys = new Set<string>()
    const pointerlock = () => { locked = document.pointerLockElement === renderer.domElement; setPrompt(locked ? 'WASD move · mouse look · E enter · Escape release' : 'Click the world to capture the mouse · WASD to walk') }
    const click = () => renderer.domElement.requestPointerLock()
    const mouse = (event: MouseEvent) => { if (locked) { yaw -= event.movementX * .0022; pitch = THREE.MathUtils.clamp(pitch - event.movementY * .0022, -1.2, 1.2) } }
    const tryMove = (movement: THREE.Vector3) => {
      const next = player.position.clone().add(movement)
      if (interior) {
        next.x = THREE.MathUtils.clamp(next.x, -7, 7)
        next.z = THREE.MathUtils.clamp(next.z, -4, 4)
        player.position.copy(next)
        return
      }
      next.x = THREE.MathUtils.clamp(next.x, -worldBounds.x, worldBounds.x)
      next.z = THREE.MathUtils.clamp(next.z, -worldBounds.z, worldBounds.z)
      if (!obstacles.some((box) => box.containsPoint(next))) player.position.copy(next)
    }
    const accessibleMove = (event: Event) => {
      const directions: Record<string, [number, number]> = { forward: [0, -1], backward: [0, 1], left: [-1, 0], right: [1, 0] }
      const [x, z] = directions[(event as CustomEvent<string>).detail] ?? [0, 0]
      tryMove(new THREE.Vector3(x * .9, 0, z * .9))
    }
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.tagName === 'BUTTON') return
      if (event.code === 'KeyE') {
        if (interior) { setInterior(null); return }
        const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw))
        const near = buildings.find((building, index) => {
          if (index > activeIndex) return false
          const portal = new THREE.Vector3(building.position.x, eyeHeight, building.position.z + building.size.z / 2 + .2)
          const toPortal = portal.clone().sub(player.position).setY(0)
          return toPortal.length() < 2.2 && forward.dot(toPortal.normalize()) > .65
        })
        if (near) {
          const portalZ = near.position.z + near.size.z / 2 + .2
          setDoorwayPosition([near.position.x, portalZ])
          setVisited((current) => current.includes(near.id) ? current : [...current, near.id])
          setInterior(near)
        }
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); keys.add(event.code) }
    }
    const keyup = (event: KeyboardEvent) => keys.delete(event.code)
    renderer.domElement.addEventListener('click', click)
    renderer.domElement.addEventListener('mousemove', mouse)
    document.addEventListener('pointerlockchange', pointerlock)
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('gitquest-move', accessibleMove)
    const resize = () => { const { width, height } = container.getBoundingClientRect(); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height) }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    let frame = 0
    let last = performance.now()
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate)
      const delta = Math.min((time - last) / 1000, .05)
      last = time
      const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
      const side = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
      const direction = new THREE.Vector3(side, 0, -forward).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      tryMove(direction.multiplyScalar(delta * 5))
      player.position.y = eyeHeight
      camera.position.copy(player.position)
      camera.rotation.order = 'YXZ'
      camera.rotation.y = yaw
      camera.rotation.x = pitch
      animated.forEach((item, index) => {
        const phase = (time * item.speed / 1000 + index * .17) % 1
        item.object.position.lerpVectors(item.start, item.end, phase < .5 ? phase * 2 : (1 - phase) * 2)
      })
      renderer.render(scene, camera)
    }
    animate(performance.now())
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('click', click)
      renderer.domElement.removeEventListener('mousemove', mouse)
      document.removeEventListener('pointerlockchange', pointerlock)
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('gitquest-move', accessibleMove)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [activeBuilding, activeIndex, doorwayPosition, interior, ready, visited])

  if (!ready) return <main className="loading-screen"><div className="loading-mark">GH</div><p className="eyebrow">Github Village</p><h1>Preparing the world</h1><div className="loading-track" role="progressbar" aria-valuenow={loading} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${loading}%` }} /></div><strong>{loading}%</strong></main>
  const moveButton = (direction: string) => window.dispatchEvent(new CustomEvent('gitquest-move', { detail: direction }))
  return <main className="app-shell"><section className="world-card"><div ref={sceneRef} className="scene" role="img" aria-label={interior ? `${interior.title} interior with interactive lesson props` : 'First-person procedural Github Village with route markers'} tabIndex={0} /><div className="minimal-hud"><strong>{interior ? interior.title : activeIndex < 0 ? 'Village complete' : `Objective: ${activeBuilding.title}`}</strong><small>{interior ? `${interior.command} · ${interior.lesson} · E to exit` : `${prompt} · ${visited.length}/${buildings.length} complete`}</small></div><div className="scene-controls"><div className="d-pad" aria-label="Accessible movement controls"><button type="button" onClick={() => moveButton('forward')}>▲</button><button type="button" onClick={() => moveButton('left')}>◀</button><button type="button" onClick={() => moveButton('backward')}>▼</button><button type="button" onClick={() => moveButton('right')}>▶</button></div>{interior && <button type="button" className="interact-button exit-button" onClick={() => setInterior(null)}>Exit (E)</button>}</div></section></main>
}

export default App

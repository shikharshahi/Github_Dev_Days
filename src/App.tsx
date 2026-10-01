import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'

type Station = {
  command: string
  title: string
  analogy: string
  lesson: string
  palette: { wall: number; roof: number; trim: number }
  position: [number, number]
  rotation: number
}

const stations: Station[] = [
  { command: 'git clone', title: 'Clone Cabin', analogy: 'Pack a copy of the shared village into your local backpack.', lesson: 'Clone downloads a repository so you can work on it locally.', palette: { wall: 0xe8c28f, roof: 0x315b78, trim: 0xf7e2b5 }, position: [-9, -6], rotation: 0.1 },
  { command: 'git status', title: 'Status Cottage', analogy: 'Check your backpack before setting out.', lesson: 'Status shows changed, staged, and untracked files.', palette: { wall: 0xa7c9b1, roof: 0x356859, trim: 0xe9f3df }, position: [-3, -7], rotation: -0.15 },
  { command: 'git branch', title: 'Branch Barn', analogy: 'Grow a safe side path for your experiment.', lesson: 'A branch is an independent line of work.', palette: { wall: 0xd9985f, roof: 0x7b3f35, trim: 0xffdfb8 }, position: [4, -7], rotation: 0.12 },
  { command: 'git switch', title: 'Switch Bridge', analogy: 'Cross from one path to another.', lesson: 'Switch changes the branch you are currently working on.', palette: { wall: 0x9db8d0, roof: 0x3f4e7a, trim: 0xe4f0ff }, position: [10, -5], rotation: -0.1 },
  { command: 'git add', title: 'Staging Forge', analogy: 'Choose which materials belong in your next bundle.', lesson: 'Add moves selected changes into the staging area.', palette: { wall: 0xd9b3d1, roof: 0x703f78, trim: 0xffe3f6 }, position: [11, 2], rotation: 1.5 },
  { command: 'git commit', title: 'Commit Cottage', analogy: 'Carve a named checkpoint into the timeline.', lesson: 'A commit records a snapshot with a message.', palette: { wall: 0xd9c77d, roof: 0x7c5b31, trim: 0xfff0b2 }, position: [7, 7], rotation: 0.2 },
  { command: 'git push / pull', title: 'Remote Dock', analogy: 'Send your work up, and bring shared discoveries back down.', lesson: 'Push uploads commits; pull fetches and integrates remote changes.', palette: { wall: 0x8ebcc2, roof: 0x2d5d62, trim: 0xdff9f4 }, position: [-1, 7], rotation: -0.1 },
  { command: 'pull request', title: 'Pull Request Hall', analogy: 'Ask the village to inspect your path before it joins main.', lesson: 'A pull request proposes branch changes for discussion and review.', palette: { wall: 0xc7a4d4, roof: 0x5c3c78, trim: 0xf3ddff }, position: [-9, 6], rotation: 0.1 },
  { command: 'review', title: 'Review Lookout', analogy: 'Leave helpful notes from a high view of the work.', lesson: 'Reviews improve code quality before a pull request is merged.', palette: { wall: 0xbed39b, roof: 0x42633f, trim: 0xf1f9d8 }, position: [-13, 1], rotation: -1.4 },
  { command: 'merge', title: 'Merge Manor', analogy: 'Open the gate and join an approved path with main.', lesson: 'Merge combines completed branch history into another branch.', palette: { wall: 0xd7a18d, roof: 0x743d40, trim: 0xffdfd1 }, position: [-7, -1], rotation: 0.2 },
  { command: 'GitHub Actions', title: 'Actions Workshop', analogy: 'Let tiny robot builders test every change automatically.', lesson: 'GitHub Actions runs repeatable CI/CD workflows from events.', palette: { wall: 0x9fb5e4, roof: 0x354b8d, trim: 0xe7edff }, position: [0, 1], rotation: -0.15 },
]

const villageBounds = { x: 15.5, z: 10 }

function createLabel(text: string, accent: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 620
  canvas.height = 112
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Sprite()
  context.fillStyle = 'rgba(22, 32, 51, .92)'
  context.roundRect(4, 4, 612, 104, 18)
  context.fill()
  context.strokeStyle = accent
  context.lineWidth = 5
  context.stroke()
  context.fillStyle = '#ffffff'
  context.font = '700 28px system-ui'
  context.textAlign = 'center'
  context.fillText(text, 310, 69)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }))
  sprite.scale.set(3.5, 0.63, 1)
  return sprite
}

function addTree(scene: THREE.Scene, x: number, z: number, scale = 1) {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 1.15 * scale, 7), new THREE.MeshStandardMaterial({ color: 0x765038, flatShading: true }))
  trunk.position.y = 0.58 * scale
  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 * scale, 0), new THREE.MeshStandardMaterial({ color: 0x3a8a62, flatShading: true }))
  crown.position.y = 1.55 * scale
  group.add(trunk, crown)
  group.position.set(x, 0, z)
  scene.add(group)
}

function createHouse(station: Station) {
  const house = new THREE.Group()
  const wallMaterial = new THREE.MeshStandardMaterial({ color: station.palette.wall, flatShading: true })
  const trimMaterial = new THREE.MeshStandardMaterial({ color: station.palette.trim, flatShading: true })
  const roofMaterial = new THREE.MeshStandardMaterial({ color: station.palette.roof, flatShading: true })
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.65, 2.4), wallMaterial)
  walls.position.y = 0.85
  walls.castShadow = true
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.35, 4), roofMaterial)
  roof.position.y = 2.35
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.9, 0.1), new THREE.MeshStandardMaterial({ color: 0x493426 }))
  door.position.set(0, 0.45, 1.24)
  const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.6 }))
  doorKnob.position.set(0.13, 0.48, 1.32)
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x84d9ed, emissive: 0x17384b, emissiveIntensity: 0.35 })
  const windowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.48, 0.08), windowMaterial)
  const windowRight = windowLeft.clone()
  windowLeft.position.set(-0.87, 1.05, 1.23)
  windowRight.position.set(0.87, 1.05, 1.23)
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.45), trimMaterial)
  awning.position.set(0, 1.7, 1.22)
  const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshStandardMaterial({ color: 0xffdc73, emissive: 0xffa31a, emissiveIntensity: 0.8 }))
  lamp.position.set(0.74, 1.46, 1.3)
  const label = createLabel(`${station.title}  ·  ${station.command}`, `#${station.palette.trim.toString(16).padStart(6, '0')}`)
  label.position.y = 3.5
  house.add(walls, roof, door, doorKnob, windowLeft, windowRight, awning, lamp, label)
  house.position.set(station.position[0], 0, station.position[1])
  house.rotation.y = station.rotation
  return house
}

function addInteriorLesson(station: Station, scene: THREE.Scene) {
  const accent = station.palette.trim
  const material = new THREE.MeshStandardMaterial({ color: accent, flatShading: true })
  const dark = new THREE.MeshStandardMaterial({ color: 0x243251, flatShading: true })
  if (station.command === 'git commit') {
    const timeline = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.18), material)
    timeline.position.set(0, 1.4, -2)
    scene.add(timeline)
    ;[-2.8, -1.4, 0, 1.4, 2.8].forEach((x, index) => {
      const checkpoint = new THREE.Mesh(new THREE.OctahedronGeometry(0.38), new THREE.MeshStandardMaterial({ color: index === 4 ? 0xffe28a : accent, emissive: accent, emissiveIntensity: 0.2 }))
      checkpoint.position.set(x, 1.65, -2)
      scene.add(checkpoint)
    })
    const sign = createLabel('COMMIT TIMELINE  ·  checkpoint → message → history', '#ffe28a')
    sign.position.set(0, 3.1, -2)
    scene.add(sign)
  } else if (station.command === 'merge') {
    const branchA = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.35), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }))
    const branchB = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.35), new THREE.MeshStandardMaterial({ color: 0xec4899 }))
    branchA.position.set(-2, 1, -1)
    branchB.position.set(-2, 1, 1)
    branchA.rotation.y = 0.18
    branchB.rotation.y = -0.18
    const merged = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 0.35), material)
    merged.position.set(2.1, 1, 0)
    merged.rotation.y = Math.PI / 2
    scene.add(branchA, branchB, merged)
    ;[-2.8, -1.5, 2.5].forEach((x, index) => {
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshStandardMaterial({ color: index === 2 ? 0xa7f3d0 : 0xffe28a, emissive: 0x312a58, emissiveIntensity: 0.3 }))
      node.position.set(x, 1.3, index === 1 ? 0 : index === 0 ? -1 : 0)
      scene.add(node)
    })
    const sign = createLabel('PR → REVIEW → MERGE  ·  two paths, one main line', '#a7f3d0')
    sign.position.set(0, 3.1, -2)
    scene.add(sign)
  } else {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 0.35, 1.2), dark)
    desk.position.set(0, 0.95, -1.4)
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.7, 0.12), material)
    board.position.set(0, 2.1, -2)
    scene.add(desk, board)
    const sign = createLabel(`${station.title}  ·  ${station.command}`, '#ffe28a')
    sign.position.set(0, 3.25, -2)
    scene.add(sign)
  }
}

function App() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [visited, setVisited] = useState<string[]>([])
  const [focused, setFocused] = useState(false)
  const [nearbyCommand, setNearbyCommand] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [interiorStation, setInteriorStation] = useState<Station | null>(null)
  const activeIndex = stations.findIndex((station) => !visited.includes(station.command))
  const objectiveStation = stations[Math.max(activeIndex, 0)]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLoadingProgress((current) => {
        const next = Math.min(current + 20, 100)
        if (next === 100) {
          window.clearInterval(timer)
          window.setTimeout(() => setReady(true), 180)
        }
        return next
      })
    }, 120)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const container = sceneRef.current
    if (!container || !ready) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x9bdcf1)
    scene.fog = new THREE.Fog(0x9bdcf1, 22, 45)
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xe8f8ff, 0x45644a, 2.4))
    const sun = new THREE.DirectionalLight(0xfff0c2, 3)
    sun.position.set(-10, 18, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)

    if (interiorStation) {
      scene.background = new THREE.Color(0x18223e)
      scene.fog = new THREE.Fog(0x18223e, 12, 24)
      const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x5f765f, flatShading: true }))
      floor.position.y = -0.25
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 0.3), new THREE.MeshStandardMaterial({ color: interiorStation.palette.wall, flatShading: true }))
      backWall.position.set(0, 2.25, -3.8)
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 8), new THREE.MeshStandardMaterial({ color: interiorStation.palette.wall, flatShading: true }))
      sideWall.position.set(-5.8, 2.25, 0)
      scene.add(floor, backWall, sideWall)
      addInteriorLesson(interiorStation, scene)
      const player = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.15, 0.58), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x304b87, emissiveIntensity: 0.3 }))
      player.position.set(0, 0.65, 2.5)
      scene.add(player)
      const keys = new Set<string>()
      const keydown = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null
        if (target && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)) return
        if (event.code === 'Escape' || event.code === 'KeyE') {
          setInteriorStation(null)
          return
        }
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
          event.preventDefault()
          keys.add(event.code)
        }
      }
      const keyup = (event: KeyboardEvent) => keys.delete(event.code)
      const accessibleMove = (event: Event) => {
        const direction = (event as CustomEvent<string>).detail
        const moves: Record<string, [number, number]> = { forward: [0, -1], backward: [0, 1], left: [-1, 0], right: [1, 0] }
        const [x, z] = moves[direction] ?? [0, 0]
        player.position.x = THREE.MathUtils.clamp(player.position.x + x * 1.1, -4.8, 4.8)
        player.position.z = THREE.MathUtils.clamp(player.position.z + z * 1.1, -2.8, 3.2)
      }
      window.addEventListener('keydown', keydown)
      window.addEventListener('keyup', keyup)
      window.addEventListener('gitquest-move', accessibleMove)
      const resize = () => {
        const { width, height } = container.getBoundingClientRect()
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }
      const observer = new ResizeObserver(resize)
      observer.observe(container)
      resize()
      let animation = 0
      let lastTime = performance.now()
      const animate = (time: number) => {
        animation = requestAnimationFrame(animate)
        const delta = Math.min((time - lastTime) / 1000, 0.05)
        lastTime = time
        const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
        const side = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
        player.position.x = THREE.MathUtils.clamp(player.position.x + side * delta * 4, -4.8, 4.8)
        player.position.z = THREE.MathUtils.clamp(player.position.z - forward * delta * 4, -2.8, 3.2)
        const target = player.position.clone().add(new THREE.Vector3(0, 0.8, 0))
        camera.position.lerp(target.clone().add(new THREE.Vector3(0, 3.7, 6.5)), 1 - Math.pow(0.001, delta))
        camera.lookAt(target)
        renderer.render(scene, camera)
      }
      animate(performance.now())
      return () => {
        cancelAnimationFrame(animation)
        observer.disconnect()
        window.removeEventListener('keydown', keydown)
        window.removeEventListener('keyup', keyup)
        window.removeEventListener('gitquest-move', accessibleMove)
        renderer.dispose()
        container.removeChild(renderer.domElement)
      }
    }

    const ground = new THREE.Mesh(new THREE.BoxGeometry(34, 0.55, 22), new THREE.MeshStandardMaterial({ color: 0x78b568, flatShading: true }))
    ground.position.y = -0.3
    ground.receiveShadow = true
    scene.add(ground)
    const square = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xdabf87, flatShading: true }))
    square.position.y = 0.03
    scene.add(square)
    const paths = [
      new THREE.Mesh(new THREE.BoxGeometry(30, 0.05, 1.8), new THREE.MeshStandardMaterial({ color: 0xdabf87 })),
      new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 18), new THREE.MeshStandardMaterial({ color: 0xdabf87 })),
    ]
    paths[0].position.y = 0.04
    paths[1].position.y = 0.045
    scene.add(...paths)

    const monument = new THREE.Group()
    const monumentBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true }))
    const octocat = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), new THREE.MeshStandardMaterial({ color: 0xf5f7fb, emissive: 0x304b87, emissiveIntensity: 0.2, flatShading: true }))
    octocat.position.y = 1.1
    monument.add(monumentBase, octocat)
    const monumentLabel = createLabel('GITHUB VILLAGE  ·  start here', '#a7f3d0')
    monumentLabel.position.y = 2.75
    monument.add(monumentLabel)
    monument.position.y = 0.2
    scene.add(monument)

    const garden = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x5d9c59 }))
    garden.position.set(0, 0.08, 0)
    scene.add(garden)
    stations.forEach((station, index) => {
      const house = createHouse(station)
      const state = visited.includes(station.command) ? 'DONE' : index === activeIndex ? 'ACTIVE' : 'LOCKED'
      const stateColor = state === 'DONE' ? '#a7f3d0' : state === 'ACTIVE' ? '#ffe28a' : '#a8b3c7'
      const stateLabel = createLabel(`${state}  ·  ${station.title}`, stateColor)
      stateLabel.position.set(station.position[0], 4.15, station.position[1])
      scene.add(house, stateLabel)
    })
    ;[[-15, -9], [-15, 9], [15, -9], [15, 9], [14, 0], [-14, 0], [5, -9], [-3, 9], [12, 8], [-12, -8]].forEach(([x, z]) => addTree(scene, x, z, 0.9))

    const player = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x304b87, emissiveIntensity: 0.3 }))
    player.position.set(0, 0.7, 4.5)
    player.castShadow = true
    scene.add(player)
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8), new THREE.MeshBasicMaterial({ color: 0xfff09b }))
    marker.position.y = 1.8
    player.add(marker)

    const keys = new Set<string>()
    let yaw = 0
    let cameraDistance = 9
    let dragging = false
    let lastPointerX = 0
    const movePlayer = (direction: string) => {
      const moves: Record<string, [number, number]> = { forward: [0, -1], backward: [0, 1], left: [-1, 0], right: [1, 0] }
      const [x, z] = moves[direction] ?? [0, 0]
      player.position.x = THREE.MathUtils.clamp(player.position.x + x * 1.2, -villageBounds.x, villageBounds.x)
      player.position.z = THREE.MathUtils.clamp(player.position.z + z * 1.2, -villageBounds.z, villageBounds.z)
    }
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)) return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault()
        keys.add(event.code)
        setFocused(true)
      }
      if (event.code === 'KeyE') {
        const nearest = stations.find((station, index) => index <= activeIndex && Math.hypot(player.position.x - station.position[0], player.position.z - station.position[1]) < 2.7)
        if (nearest) {
          setVisited((current) => current.includes(nearest.command) ? current : [...current, nearest.command])
        }
      }
    }
    const keyup = (event: KeyboardEvent) => keys.delete(event.code)
    const pointerDown = (event: PointerEvent) => { dragging = true; lastPointerX = event.clientX }
    const pointerMove = (event: PointerEvent) => { if (dragging) { yaw -= (event.clientX - lastPointerX) * 0.008; lastPointerX = event.clientX } }
    const pointerUp = () => { dragging = false }
    const wheel = (event: WheelEvent) => { cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.01, 6, 13) }
    const accessibleMove = (event: Event) => movePlayer((event as CustomEvent<string>).detail)
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('gitquest-move', accessibleMove)
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    renderer.domElement.addEventListener('pointerleave', pointerUp)
    renderer.domElement.addEventListener('wheel', wheel)
    const resize = () => {
      const { width, height } = container.getBoundingClientRect()
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    let animation = 0
    let lastTime = performance.now()
    const animate = (time: number) => {
      animation = requestAnimationFrame(animate)
      const delta = Math.min((time - lastTime) / 1000, 0.05)
      lastTime = time
      const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
      const side = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
      const direction = new THREE.Vector3(side, 0, -forward).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      player.position.addScaledVector(direction, delta * 5)
      player.position.x = THREE.MathUtils.clamp(player.position.x, -villageBounds.x, villageBounds.x)
      player.position.z = THREE.MathUtils.clamp(player.position.z, -villageBounds.z, villageBounds.z)
      if (direction.lengthSq() > 0) player.rotation.y = Math.atan2(direction.x, direction.z)
      const target = player.position.clone().add(new THREE.Vector3(0, 0.7, 0))
      const cameraOffset = new THREE.Vector3(Math.sin(yaw) * cameraDistance, 5.5, Math.cos(yaw) * cameraDistance)
      camera.position.lerp(target.clone().add(cameraOffset), 1 - Math.pow(0.001, delta))
      camera.lookAt(target)
      marker.rotation.y += delta * 2
      const nearest = stations.find(({ position }) => Math.hypot(player.position.x - position[0], player.position.z - position[1]) < 2.7)
      setNearbyCommand((current) => current === (nearest?.command ?? null) ? current : nearest?.command ?? null)
      renderer.render(scene, camera)
    }
    animate(performance.now())
    return () => {
      cancelAnimationFrame(animation)
      observer.disconnect()
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('gitquest-move', accessibleMove)
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointerleave', pointerUp)
      renderer.domElement.removeEventListener('wheel', wheel)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [activeIndex, ready, visited, interiorStation])

  const interact = () => {
    const station = stations.find((item) => item.command === nearbyCommand)
    if (!station || stations.findIndex((item) => item.command === station.command) > activeIndex) return
    setVisited((current) => current.includes(station.command) ? current : [...current, station.command])
    setInteriorStation(station)
  }
  const moveWithButton = (direction: string) => {
    window.dispatchEvent(new CustomEvent('gitquest-move', { detail: direction }))
    setFocused(true)
  }

  if (!ready) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">GH</div>
        <p className="eyebrow">GitQuest · GitHub Village</p>
        <h1>Preparing the village</h1>
        <p>Placing houses, paths, lanterns, and learning objectives…</p>
        <div className="loading-track" role="progressbar" aria-valuenow={loadingProgress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${loadingProgress}%` }} />
        </div>
        <strong>{loadingProgress}% ready</strong>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="world-card">
        <header className="hud">
          <div className="objective" aria-live="polite"><span>{interiorStation ? 'INSIDE' : 'NEXT HOUSE'}</span><strong>{interiorStation ? interiorStation.title : activeIndex < 0 ? 'Village complete' : objectiveStation.title}</strong><small>{interiorStation ? `${interiorStation.command} · E / Esc to exit` : activeIndex < 0 ? 'All houses explored' : objectiveStation.command}</small></div>
        </header>
        <div ref={sceneRef} className="scene" role="img" aria-label={interiorStation ? `${interiorStation.title} interior with a procedural GitHub lesson display.` : 'GitHub Village with a central monument, winding paths, and themed learning houses.'} tabIndex={0} onFocus={() => setFocused(true)} />
        <div className="scene-controls">
          <p>{interiorStation ? `Inside ${interiorStation.title}: explore the lesson props. Press E or Escape to leave.` : focused ? 'Active houses glow gold. Walk to one and press E.' : 'Click the village to focus keyboard movement.'}</p>
          <div className="d-pad" aria-label="Accessible movement controls">
            <button type="button" onClick={() => moveWithButton('forward')} aria-label="Move forward">▲</button>
            <button type="button" onClick={() => moveWithButton('left')} aria-label="Move left">◀</button>
            <button type="button" onClick={() => moveWithButton('backward')} aria-label="Move backward">▼</button>
            <button type="button" onClick={() => moveWithButton('right')} aria-label="Move right">▶</button>
          </div>
          {interiorStation ? <button type="button" className="interact-button exit-button" onClick={() => setInteriorStation(null)}>Exit to village</button> : <button type="button" className="interact-button" onClick={interact} disabled={!nearbyCommand}>{nearbyCommand ? `Enter: ${nearbyCommand}` : 'Walk near an active house'}</button>}
        </div>
      </section>
    </main>
  )
}

export default App
